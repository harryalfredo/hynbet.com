import { Queue, UnrecoverableError, Worker } from 'bullmq'
import IORedis from 'ioredis'
import { config } from './config.js'
import { logger } from './logger.js'
import { processProjectJob, regenerateClip } from './jobs/pipeline.js'

let connection = null
let projectQueue = null
let worker = null

export function redisConnection() {
  if (!config.redisUrl) {
    throw new Error('REDIS_URL is not set')
  }
  if (!connection) {
    connection = new IORedis(config.redisUrl, {
      maxRetriesPerRequest: null,
      enableReadyCheck: true,
      lazyConnect: true,
    })
    connection.on('error', (err) => {
      logger.warn('redis error', { error: err.message })
    })
  }
  return connection
}

export function getProjectQueue() {
  if (!projectQueue) {
    projectQueue = new Queue('hynbet-projects', { connection: redisConnection() })
  }
  return projectQueue
}

export async function enqueueProject(jobId) {
  await getProjectQueue().add(
    'process',
    { jobId },
    {
      jobId,
      attempts: config.maxRetries,
      backoff: { type: 'exponential', delay: 4000 },
      removeOnComplete: 100,
      removeOnFail: 100,
    }
  )
}

export async function enqueueRegen(clipId, opts) {
  const id = `regen_${clipId}_${Date.now()}`
  await getProjectQueue().add('regen', { clipId, opts }, { jobId: id, attempts: 2 })
  return id
}

export async function cancelQueueJob(jobId) {
  try {
    const job = await getProjectQueue().getJob(jobId)
    if (job) await job.remove()
  } catch {
    /* already running */
  }
}

export function startWorker() {
  if (worker) return worker
  if (!config.redisUrl) {
    logger.warn('REDIS_URL unset — HTTP server is up; background jobs disabled until Redis is configured')
    return null
  }
  worker = new Worker(
    'hynbet-projects',
    async (job) => {
      if (job.name === 'regen') {
        logger.info('regen start', { clipId: job.data.clipId })
        return regenerateClip(job.data.clipId, job.data.opts || {})
      }
      logger.info('worker start', { jobId: job.data.jobId })
      try {
        await processProjectJob(job.data.jobId)
      } catch (e) {
        const fatal = ['SOURCE_ACCESS_ERROR', 'INVALID_URL', 'CANCELLED'].includes(e.code)
        if (fatal) throw new UnrecoverableError(e.message)
        throw e
      }
    },
    { connection: redisConnection(), concurrency: config.workerConcurrency }
  )
  worker.on('failed', (job, err) => {
    logger.error('worker failed', { id: job?.id, error: err.message })
  })
  logger.info('BullMQ worker listening', { concurrency: config.workerConcurrency })
  return worker
}

export async function pingRedis() {
  if (!config.redisUrl) return 'unset'
  try {
    const conn = redisConnection()
    const pong = await Promise.race([
      (async () => {
        if (conn.status !== 'ready' && conn.status !== 'connecting') {
          await conn.connect()
        }
        return conn.ping()
      })(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('redis ping timeout')), 1200)),
    ])
    return pong === 'PONG' ? 'ok' : 'error'
  } catch {
    return 'error'
  }
}
