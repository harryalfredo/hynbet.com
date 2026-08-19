import { Queue, UnrecoverableError, Worker } from 'bullmq'
import IORedis from 'ioredis'
import { config } from './config.js'
import { logger } from './logger.js'
import { processProjectJob, regenerateClip } from './jobs/pipeline.js'
import { setJobTouchHook } from './db.js'

setJobTouchHook(publishJobProgress)

let connection = null
const queues = new Map()
const workers = []
let heartbeatTimer = null
let shuttingDown = false

export const QUEUE_NAMES = {
  process: 'hynbet-projects',
  analysis: 'hynbet-analysis',
  transcription: 'hynbet-transcription',
  render: 'hynbet-render',
  export: 'hynbet-export',
}

const WORKER_HEARTBEAT_KEY = 'hynbet:worker:heartbeat'
const JOB_KEY = (id) => `hynbet:job:${id}`

export function redisConfigured() {
  return Boolean(config.redisUrl && String(config.redisUrl).trim())
}

export function redisClientOptions() {
  const url = config.redisUrl || process.env.REDIS_URL || ''
  const opts = {
    maxRetriesPerRequest: null,
    enableReadyCheck: true,
    lazyConnect: true,
  }
  if (url.startsWith('rediss://')) {
    opts.tls = { rejectUnauthorized: process.env.REDIS_TLS_REJECT_UNAUTHORIZED !== '0' }
  }
  return opts
}

export function redisConnection() {
  if (!redisConfigured()) throw new Error('REDIS_URL is not set')
  if (!connection) {
    connection = new IORedis(config.redisUrl, redisClientOptions())
    connection.on('error', (err) => {
      logger.warn('Redis disconnected', { error: err.message })
    })
    connection.on('connect', () => {
      logger.info('Redis connected')
    })
  }
  return connection
}

export function getQueue(name = QUEUE_NAMES.process) {
  if (!queues.has(name)) {
    queues.set(
      name,
      new Queue(name, {
        connection: redisConnection(),
        defaultJobOptions: {
          attempts: config.maxRetries,
          backoff: { type: 'exponential', delay: Number(process.env.JOB_BACKOFF_MS) || 4000 },
          removeOnComplete: { age: config.jobRetentionSec, count: 200 },
          removeOnFail: { age: config.jobRetentionSec, count: 200 },
        },
      })
    )
  }
  return queues.get(name)
}

export function getProjectQueue() {
  return getQueue(QUEUE_NAMES.process)
}

export async function publishJobProgress(jobRow) {
  if (!jobRow?.id || !redisConfigured()) return
  try {
    const r = redisConnection()
    if (r.status !== 'ready' && r.status !== 'connecting') await r.connect().catch(() => {})
    const payload = {
      jobId: jobRow.id,
      projectId: jobRow.project_id || '',
      status: String(jobRow.status || ''),
      progress: String(jobRow.progress ?? 0),
      stage: String(jobRow.message || jobRow.current_step || ''),
      currentStep: String(jobRow.current_step || ''),
      updatedAt: String(jobRow.updated_at || new Date().toISOString()),
      attempt: String(jobRow.attempt ?? 0),
      error: String(jobRow.error || ''),
    }
    await r.hset(JOB_KEY(jobRow.id), payload)
    await r.expire(JOB_KEY(jobRow.id), config.jobRetentionSec)
    await r.publish(`hynbet:events:${jobRow.id}`, JSON.stringify(payload))
  } catch (e) {
    logger.warn('job progress publish failed', { error: e.message, jobId: jobRow.id })
  }
}

export async function readJobProgress(jobId) {
  if (!redisConfigured()) return null
  try {
    const r = redisConnection()
    if (r.status !== 'ready' && r.status !== 'connecting') await r.connect().catch(() => {})
    const data = await r.hgetall(JOB_KEY(jobId))
    return data && Object.keys(data).length ? data : null
  } catch {
    return null
  }
}

export async function enqueueProject(jobId, extra = {}) {
  logger.info('job created', { jobId, queue: QUEUE_NAMES.process })
  await getQueue(QUEUE_NAMES.process).add(
    'process',
    { jobId, kind: 'process', ...extra },
    { jobId, attempts: config.maxRetries }
  )
}

export async function enqueueAnalysis(jobId, extra = {}) {
  logger.info('job created', { jobId, queue: QUEUE_NAMES.analysis })
  await getQueue(QUEUE_NAMES.analysis).add('analysis', { jobId, kind: 'analysis', ...extra }, { jobId })
}

export async function enqueueTranscription(jobId, extra = {}) {
  logger.info('job created', { jobId, queue: QUEUE_NAMES.transcription })
  await getQueue(QUEUE_NAMES.transcription).add('transcription', { jobId, kind: 'transcription', ...extra }, { jobId })
}

export async function enqueueRegen(clipId, opts) {
  const id = `regen_${clipId}`
  logger.info('job created', { jobId: id, queue: QUEUE_NAMES.render })
  await getQueue(QUEUE_NAMES.render).add('render', { clipId, opts, kind: 'render' }, { jobId: id })
  return id
}

export async function enqueueExport(clipId, opts = {}) {
  const id = `export_${clipId}_${Date.now()}`
  logger.info('job created', { jobId: id, queue: QUEUE_NAMES.export })
  await getQueue(QUEUE_NAMES.export).add('export', { clipId, opts, kind: 'export' }, { jobId: id })
  return id
}

export async function cancelQueueJob(jobId) {
  const names = Object.values(QUEUE_NAMES)
  for (const name of names) {
    try {
      const q = getQueue(name)
      const job = await q.getJob(jobId)
      if (!job) continue
      const state = await job.getState()
      if (state === 'waiting' || state === 'delayed' || state === 'paused') {
        await job.remove()
        logger.info('job cancelled', { jobId, queue: name, state })
      } else if (state === 'active') {
        try {
          await job.updateData({ ...(job.data || {}), cancelRequested: true })
        } catch {
          /* pipeline polls SQLite cancel flag */
        }
        logger.info('job cancel requested', { jobId, queue: name, state })
      }
    } catch (e) {
      logger.warn('cancel queue lookup failed', { error: e.message, jobId })
    }
  }
}

async function handleJob(job) {
  if (shuttingDown) throw new Error('worker shutting down')
  const kind = job.name || job.data?.kind
  logger.info('job started', { jobId: job.data?.jobId || job.id, kind, attempt: job.attemptsMade })
  if (kind === 'regen' || kind === 'render' || kind === 'export') {
    return regenerateClip(job.data.clipId, job.data.opts || {})
  }
  try {
    await processProjectJob(job.data.jobId)
    logger.info('job completed', { jobId: job.data.jobId })
  } catch (e) {
    const fatal = ['SOURCE_ACCESS_ERROR', 'INVALID_URL', 'CANCELLED', 'NOT_FOUND'].includes(e.code)
    logger.info(fatal ? 'job failed' : 'job retried', { jobId: job.data.jobId, error: e.message, code: e.code })
    if (fatal) throw new UnrecoverableError(e.message)
    throw e
  }
}

function startHeartbeat() {
  if (heartbeatTimer) return
  const beat = async () => {
    if (!redisConfigured()) return
    try {
      const r = redisConnection()
      if (r.status !== 'ready' && r.status !== 'connecting') await r.connect().catch(() => {})
      await r.set(WORKER_HEARTBEAT_KEY, String(Date.now()), 'EX', 20)
    } catch (e) {
      logger.warn('worker heartbeat failed', { error: e.message })
    }
  }
  beat()
  heartbeatTimer = setInterval(beat, 8000)
}

export function startWorker() {
  if (workers.length) return workers[0]
  if (!redisConfigured()) {
    logger.warn('REDIS_URL unset — worker not started')
    return null
  }
  const names = Object.values(QUEUE_NAMES)
  for (const name of names) {
    const w = new Worker(name, handleJob, {
      connection: redisConnection(),
      concurrency: config.workerConcurrency,
    })
    w.on('failed', (job, err) => {
      logger.error('job failed', { id: job?.id, error: err.message })
    })
    w.on('completed', (job) => {
      logger.info('job completed', { id: job?.id, name: job?.name })
    })
    workers.push(w)
  }
  startHeartbeat()
  logger.info('worker started', { concurrency: config.workerConcurrency, queues: names })
  return workers[0]
}

export async function workerHeartbeatFresh() {
  if (!redisConfigured()) return false
  try {
    const r = redisConnection()
    if (r.status !== 'ready' && r.status !== 'connecting') await r.connect().catch(() => {})
    const v = await r.get(WORKER_HEARTBEAT_KEY)
    return Boolean(v)
  } catch {
    return false
  }
}

export async function pingRedis() {
  if (!redisConfigured()) return 'unset'
  try {
    const conn = redisConnection()
    const pong = await Promise.race([
      (async () => {
        if (conn.status !== 'ready' && conn.status !== 'connecting') await conn.connect()
        return conn.ping()
      })(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('redis ping timeout')), 1500)),
    ])
    return pong === 'PONG' ? 'ok' : 'error'
  } catch {
    return 'error'
  }
}

export async function redisRateLimit(key, limit, windowSec = 60) {
  if (!redisConfigured()) return { ok: true, remaining: limit, backend: 'none' }
  const r = redisConnection()
  if (r.status !== 'ready' && r.status !== 'connecting') await r.connect().catch(() => {})
  const k = `hynbet:rl:${key}`
  const n = await r.incr(k)
  if (n === 1) await r.expire(k, windowSec)
  return { ok: n <= limit, remaining: Math.max(0, limit - n), backend: 'redis' }
}

export async function stopWorkers() {
  shuttingDown = true
  if (heartbeatTimer) {
    clearInterval(heartbeatTimer)
    heartbeatTimer = null
  }
  logger.info('worker stopped')
  for (const w of workers) {
    try {
      await w.close()
    } catch {
      /* ignore */
    }
  }
  workers.length = 0
  for (const q of queues.values()) {
    try {
      await q.close()
    } catch {
      /* ignore */
    }
  }
  queues.clear()
  if (connection) {
    try {
      await connection.quit()
    } catch {
      try {
        connection.disconnect()
      } catch {
        /* ignore */
      }
    }
    connection = null
  }
}

export function shouldRunInlineWorker() {
  if (process.env.HYNBET_RUN_WORKER === '1') return true
  if (process.env.HYNBET_RUN_WORKER === '0') return false
  return config.env !== 'production'
}
