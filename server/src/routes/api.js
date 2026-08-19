import fs from 'node:fs'
import path from 'node:path'
import { Router } from 'express'
import multer from 'multer'
import { config } from '../config.js'
import { createSession, ensureDevUser, ownProject, requireUser, sessionCookie } from '../auth.js'
import { kickAuth } from './kickAuth.js'
import { db, now, q, touchJob, uid } from '../db.js'
import { healthPayload } from '../health.js'
import { cancelQueueJob, enqueueProject, enqueueRegen } from '../queue.js'
import { sources } from '../services/source/index.js'
import { storage } from '../services/storage/index.js'
import { killJobProcesses } from '../proc.js'

const upload = multer({
  dest: path.join(config.tmpDir, 'uploads'),
  limits: { fileSize: config.maxUploadSize },
})

export const api = Router()

api.get('/health', async (_req, res) => {
  res.json(await healthPayload())
})

api.use(kickAuth)

api.post('/auth/session', (req, res) => {
  const user = ensureDevUser()
  const session = createSession(user.id)
  res.setHeader('Set-Cookie', sessionCookie(session.token, req))
  res.json({ user: { id: user.id, email: user.email }, ...session })
})

api.get('/config', requireUser, async (_req, res) => {
  res.json(await healthPayload())
})

api.post('/projects', requireUser, (req, res) => {
  const sourceUrl = String(req.body?.sourceUrl || '').trim()
  const parsed = sources.parse(sourceUrl)
  if (!parsed || parsed.invalid) {
    res.status(400).json({
      error: 'INVALID_URL',
      message: "We couldn't recognize this Kick URL or media source. Check the link and try again.",
    })
    return
  }
  const active = q.activeJobs.get(req.user.id).n
  if (active >= config.maxJobsPerUser) {
    res.status(429).json({
      error: 'RATE_LIMIT',
      message: `Maximum concurrent jobs is ${config.maxJobsPerUser}.`,
    })
    return
  }
  const projectId = uid('prj')
  const jobId = uid('job')
  const ts = now()
  q.insertProject.run({
    id: projectId,
    user_id: req.user.id,
    source_url: sourceUrl,
    source_kind: parsed.kind || parsed.provider,
    streamer: parsed.handle || null,
    title: null,
    thumbnail_key: null,
    duration: null,
    status: 'QUEUED',
    clip_count: Math.min(config.maxClips, Math.max(1, Number(req.body?.clipCount) || 3)),
    clip_length: req.body?.clipLength || 'auto',
    style_id: req.body?.styleId || 'viral',
    metadata_json: JSON.stringify({ parsed }),
    created_at: ts,
    updated_at: ts,
  })
  q.insertJob.run({
    id: jobId,
    project_id: projectId,
    parent_id: null,
    kind: 'process',
    status: 'QUEUED',
    progress: 0,
    current_step: 'QUEUED',
    step_index: 0,
    total_steps: 14,
    message: 'Queued',
    error_code: null,
    error: null,
    attempt: 0,
    cancel_requested: 0,
    pid: null,
    created_at: ts,
    updated_at: ts,
  })
  enqueueProject(jobId).catch((e) => {
    touchJob(q.getJob.get(jobId), {
      status: 'FAILED',
      error: e.message,
      error_code: 'QUEUE_ERROR',
      message: e.message,
    })
  })
  res.status(202).json({ projectId, jobId, status: 'QUEUED' })
})

api.post('/projects/upload', requireUser, upload.single('file'), async (req, res) => {
  if (!req.file) {
    res.status(400).json({ error: 'INVALID_URL', message: 'No file uploaded.' })
    return
  }
  const dest = path.join(config.dataDir, 'uploads', `${uid('up')}.mp4`)
  fs.mkdirSync(path.dirname(dest), { recursive: true })
  fs.renameSync(req.file.path, dest)
  const sourceUrl = `file://${dest}`
  const projectId = uid('prj')
  const jobId = uid('job')
  const ts = now()
  q.insertProject.run({
    id: projectId,
    user_id: req.user.id,
    source_url: sourceUrl,
    source_kind: 'local-file',
    streamer: 'upload',
    title: req.file.originalname || 'uploaded media',
    thumbnail_key: null,
    duration: null,
    status: 'QUEUED',
    clip_count: Math.min(config.maxClips, Math.max(1, Number(req.body?.clipCount) || 3)),
    clip_length: req.body?.clipLength || 'auto',
    style_id: req.body?.styleId || 'viral',
    metadata_json: JSON.stringify({ kind: 'upload', note: 'User-uploaded authorized media. Not a Kick source.' }),
    created_at: ts,
    updated_at: ts,
  })
  q.insertJob.run({
    id: jobId,
    project_id: projectId,
    parent_id: null,
    kind: 'process',
    status: 'QUEUED',
    progress: 0,
    current_step: 'QUEUED',
    step_index: 0,
    total_steps: 14,
    message: 'Queued',
    error_code: null,
    error: null,
    attempt: 0,
    cancel_requested: 0,
    pid: null,
    created_at: ts,
    updated_at: ts,
  })
  await enqueueProject(jobId)
  res.status(202).json({ projectId, jobId, status: 'QUEUED' })
})

api.get('/projects', requireUser, (req, res) => {
  const rows = q.listProjects.all(req.user.id)
  res.json({
    projects: rows.map(serializeProject),
  })
})

api.get('/projects/:id', requireUser, ownProject, (req, res) => {
  const job = q.latestJob.get(req.project.id, 'process')
  res.json({
    project: serializeProject(req.project),
    job: job ? serializeJob(job) : null,
  })
})

api.get('/projects/:id/status', requireUser, ownProject, (req, res) => {
  const job = q.latestJob.get(req.project.id, 'process')
  res.json(job ? serializeJob(job) : { status: req.project.status })
})

api.get('/projects/:id/moments', requireUser, ownProject, (req, res) => {
  const rows = q.listMoments.all(req.project.id)
  res.json({
    moments: rows.map((m) => ({
      id: m.id,
      start: m.start,
      end: m.end,
      hook: m.hook,
      reason: m.reason,
      viralScore: m.viral_score,
      scores: JSON.parse(m.scores_json || '{}'),
      rank: m.rank,
    })),
  })
})

api.get('/projects/:id/clips', requireUser, ownProject, (req, res) => {
  res.json({ clips: q.listClips.all(req.project.id).map(serializeClip) })
})

api.get('/projects/:id/transcript', requireUser, ownProject, (req, res) => {
  const t = q.getTranscript.get(req.project.id)
  if (!t) {
    res.status(404).json({ error: 'NOT_FOUND', message: 'Transcript not ready.' })
    return
  }
  res.json({
    text: t.text,
    segments: JSON.parse(t.segments_json || '[]'),
    words: JSON.parse(t.words_json || '[]'),
  })
})

api.post('/projects/:id/process', requireUser, ownProject, (req, res) => {
  if (req.body?.clipCount) q.patchProject({ id: req.project.id, clip_count: Number(req.body.clipCount) })
  if (req.body?.clipLength) q.patchProject({ id: req.project.id, clip_length: String(req.body.clipLength) })
  if (req.body?.styleId) q.patchProject({ id: req.project.id, style_id: String(req.body.styleId) })
  const jobId = uid('job')
  const ts = now()
  q.insertJob.run({
    id: jobId,
    project_id: req.project.id,
    parent_id: null,
    kind: 'process',
    status: 'QUEUED',
    progress: 0,
    current_step: 'QUEUED',
    step_index: 0,
    total_steps: 14,
    message: 'Re-queued',
    error_code: null,
    error: null,
    attempt: 0,
    cancel_requested: 0,
    pid: null,
    created_at: ts,
    updated_at: ts,
  })
  q.patchProject({ id: req.project.id, status: 'QUEUED' })
  enqueueProject(jobId)
  res.status(202).json({ projectId: req.project.id, jobId, status: 'QUEUED' })
})

api.get('/jobs/:id', requireUser, (req, res) => {
  const job = q.getJob.get(req.params.id)
  if (!job) {
    res.status(404).json({ error: 'NOT_FOUND', message: 'Job not found.' })
    return
  }
  const project = q.getProject.get(job.project_id)
  if (project.user_id !== req.user.id) {
    res.status(403).json({ error: 'FORBIDDEN', message: 'Not your job.' })
    return
  }
  res.json(serializeJob(job))
})

api.get('/jobs/:id/events', requireUser, (req, res) => {
  const job = q.getJob.get(req.params.id)
  if (!job) {
    res.status(404).end()
    return
  }
  const project = q.getProject.get(job.project_id)
  if (project.user_id !== req.user.id) {
    res.status(403).end()
    return
  }
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  let lastId = 0
  const tick = () => {
    const fresh = q.getJob.get(job.id)
    const evs = q.listEvents.all(job.id, lastId)
    for (const e of evs) {
      lastId = e.id
      res.write(`data: ${JSON.stringify({ jobId: job.id, ...serializeJob(fresh), event: e })}\n\n`)
    }
    if (['COMPLETED', 'FAILED', 'CANCELLED'].includes(fresh.status)) {
      res.write(`data: ${JSON.stringify({ jobId: job.id, ...serializeJob(fresh), done: true })}\n\n`)
      clearInterval(timer)
      res.end()
    }
  }
  const timer = setInterval(tick, 700)
  tick()
  req.on('close', () => clearInterval(timer))
})

api.post('/jobs/:id/cancel', requireUser, async (req, res) => {
  const job = q.getJob.get(req.params.id)
  if (!job) {
    res.status(404).json({ error: 'NOT_FOUND', message: 'Job not found.' })
    return
  }
  const project = q.getProject.get(job.project_id)
  if (project.user_id !== req.user.id) {
    res.status(403).json({ error: 'FORBIDDEN', message: 'Not your job.' })
    return
  }
  db.prepare('UPDATE jobs SET cancel_requested = 1, status = CASE WHEN status = ? THEN ? ELSE status END, updated_at = ? WHERE id = ?').run(
    'QUEUED',
    'CANCELLED',
    now(),
    job.id
  )
  killJobProcesses(job.id)
  await cancelQueueJob(job.id)
  res.json({ ok: true, status: 'CANCELLED' })
})

api.get('/clips', requireUser, (req, res) => {
  res.json({ clips: q.listAllClips.all(req.user.id).map(serializeClip) })
})

api.get('/clips/:id', requireUser, (req, res) => {
  const clip = q.getClip.get(req.params.id)
  if (!clip) return res.status(404).json({ error: 'NOT_FOUND', message: 'Clip not found.' })
  const project = q.getProject.get(clip.project_id)
  if (project.user_id !== req.user.id) return res.status(403).json({ error: 'FORBIDDEN', message: 'Not your clip.' })
  res.json({ clip: serializeClip(clip), project: serializeProject(project) })
})

api.post('/clips/:id/regenerate', requireUser, async (req, res) => {
  const clip = q.getClip.get(req.params.id)
  if (!clip) return res.status(404).json({ error: 'NOT_FOUND', message: 'Clip not found.' })
  const project = q.getProject.get(clip.project_id)
  if (project.user_id !== req.user.id) return res.status(403).json({ error: 'FORBIDDEN', message: 'Not your clip.' })
  q.updateClip.run({
    ...clip,
    status: 'RENDERING',
    error: null,
    updated_at: now(),
  })
  const queueId = await enqueueRegen(clip.id, {
    template: req.body?.template,
    captionStyle: req.body?.captionStyle,
    title: req.body?.title,
  })
  res.status(202).json({ ok: true, queueId, clipId: clip.id, status: 'RENDERING' })
})

api.get('/clips/:id/stream', requireUser, (req, res) => sendMedia(req, res, 'storage_key', 'video/mp4'))
api.get('/clips/:id/thumb', requireUser, (req, res) => sendMedia(req, res, 'thumb_key', 'image/jpeg'))
api.get('/clips/:id/download', requireUser, (req, res) => {
  const clip = q.getClip.get(req.params.id)
  if (!clip || clip.status !== 'COMPLETED' || !clip.storage_key || !storage.exists(clip.storage_key)) {
    res.status(409).json({ error: 'RENDER_ERROR', message: 'Download is available only after a verified render.' })
    return
  }
  const project = q.getProject.get(clip.project_id)
  if (project.user_id !== req.user.id) return res.status(403).json({ error: 'FORBIDDEN', message: 'Not your clip.' })
  const abs = storage.abs(clip.storage_key)
  res.setHeader('Content-Type', 'video/mp4')
  res.setHeader('Content-Disposition', `attachment; filename="hynbet_${clip.id}.mp4"`)
  fs.createReadStream(abs).pipe(res)
})

function sendMedia(req, res, field, type) {
  const clip = q.getClip.get(req.params.id)
  if (!clip) return res.status(404).end()
  const project = q.getProject.get(clip.project_id)
  if (project.user_id !== req.user.id) return res.status(403).end()
  const key = clip[field]
  if (!key || !storage.exists(key)) return res.status(404).end()
  const abs = storage.abs(key)
  const stat = fs.statSync(abs)
  res.setHeader('Content-Type', type)
  res.setHeader('Content-Length', stat.size)
  fs.createReadStream(abs).pipe(res)
}

function serializeProject(p) {
  return {
    id: p.id,
    sourceUrl: p.source_url,
    sourceKind: p.source_kind,
    streamer: p.streamer,
    title: p.title,
    duration: p.duration,
    status: p.status,
    clipCount: p.clip_count,
    clipLength: p.clip_length,
    styleId: p.style_id,
    thumbnailUrl: p.thumbnail_key ? `/api/media/${encodeURIComponent(p.thumbnail_key)}` : null,
    metadata: JSON.parse(p.metadata_json || '{}'),
    createdAt: p.created_at,
    updatedAt: p.updated_at,
  }
}

function serializeJob(j) {
  return {
    jobId: j.id,
    projectId: j.project_id,
    status: j.status,
    progress: j.progress,
    message: j.message,
    currentStep: j.current_step,
    current_step: j.current_step,
    stepIndex: j.step_index,
    totalSteps: j.total_steps,
    error: j.error,
    errorCode: j.error_code,
    attempt: j.attempt,
  }
}

function serializeClip(c) {
  return {
    id: c.id,
    projectId: c.project_id,
    momentId: c.moment_id,
    start: c.start,
    end: c.end,
    duration: c.duration,
    title: c.title,
    titles: JSON.parse(c.titles_json || '[]'),
    template: c.template,
    status: c.status,
    width: c.width,
    height: c.height,
    streamUrl: c.status === 'COMPLETED' && c.storage_key ? `/api/clips/${c.id}/stream` : null,
    thumbUrl: c.thumb_key && c.status === 'COMPLETED' ? `/api/clips/${c.id}/thumb` : null,
    downloadUrl: c.status === 'COMPLETED' && c.storage_key ? `/api/clips/${c.id}/download` : null,
    streamer: c.streamer,
    projectTitle: c.project_title,
    createdAt: c.created_at,
  }
}

api.get('/media/:encoded', requireUser, (req, res) => {
  const key = decodeURIComponent(req.params.encoded)
  if (!storage.exists(key)) return res.status(404).end()
  const abs = storage.abs(key)
  const ext = path.extname(abs).toLowerCase()
  res.setHeader('Content-Type', ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' : ext === '.mp4' ? 'video/mp4' : 'application/octet-stream')
  fs.createReadStream(abs).pipe(res)
})
