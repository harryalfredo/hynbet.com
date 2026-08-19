import fs from 'node:fs'
import path from 'node:path'
import { config } from '../config.js'
import { isCancelled, now, q, touchJob, uid } from '../db.js'
import { logger } from '../logger.js'
import { killJobProcesses } from '../proc.js'
import { detectMoments, refineWithLLM } from '../services/analysis/moments.js'
import { generateTitles } from '../services/analysis/titles.js'
import { buildAss } from '../services/analysis/captions.js'
import {
  cutSegment,
  detectSilence,
  extractAudio,
  ffprobe,
  loudnessTimeline,
  sceneTimes,
  thumbnail,
  verifyMedia,
} from '../services/media/ffmpeg.js'
import { renderViralKick } from '../services/render/renderer.js'
import { AuthorizedHttpProvider } from '../services/source/http.js'
import { sources } from '../services/source/index.js'
import { storage } from '../services/storage/index.js'
import { transcribeWav } from '../services/transcribe/index.js'

const STEPS = [
  'QUEUED',
  'FETCHING_SOURCE',
  'DOWNLOADING',
  'PROBING_VIDEO',
  'EXTRACTING_AUDIO',
  'TRANSCRIBING',
  'ANALYZING',
  'DETECTING_MOMENTS',
  'GENERATING_TITLES',
  'GENERATING_CAPTIONS',
  'GENERATING_CLIPS',
  'RENDERING',
  'UPLOADING',
  'COMPLETED',
]

function assertNotCancelled(jobId) {
  if (isCancelled(jobId)) {
    throw Object.assign(new Error('Cancelled'), { code: 'CANCELLED' })
  }
}

function stepProgress(index) {
  return Math.round((index / (STEPS.length - 1)) * 100)
}

export async function processProjectJob(jobId) {
  const started = Date.now()
  let job = q.getJob.get(jobId)
  if (!job) throw new Error('Job not found')
  const project = q.getProject.get(job.project_id)
  const work = path.join(config.tmpDir, jobId)
  fs.mkdirSync(work, { recursive: true })

  const set = (status, message, extra = {}) => {
    const idx = Math.max(0, STEPS.indexOf(status))
    job = touchJob(job, {
      status,
      current_step: status,
      step_index: idx,
      total_steps: STEPS.length,
      progress: extra.progress ?? stepProgress(idx),
      message,
      error: extra.error ?? null,
      error_code: extra.error_code ?? null,
    })
    q.patchProject({ id: project.id, status })
    logger.stage(jobId, status, extra.done || 'STARTED', { msg: message, projectId: project.id })
  }

  try {
    set('FETCHING_SOURCE', 'Resolving source')
    assertNotCancelled(jobId)
    let resolved
    try {
      resolved = await sources.resolve(project.source_url, { project, job })
    } catch (e) {
      throw Object.assign(e, { code: e.code || 'SOURCE_ACCESS_ERROR' })
    }

    q.updateProject.run({
      id: project.id,
      status: 'DOWNLOADING',
      streamer: resolved.streamer || project.streamer,
      title: resolved.title || project.title,
      duration: project.duration,
      thumbnail_key: project.thumbnail_key,
      metadata_json: JSON.stringify({
        provider: resolved.provider,
        kind: resolved.kind,
        note: resolved.note || null,
        official: resolved.official || false,
      }),
      updated_at: now(),
    })

    set('DOWNLOADING', 'Obtaining media')
    assertNotCancelled(jobId)
    const sourcePath = path.join(work, 'source.mp4')
    if (resolved.mediaPath) {
      fs.copyFileSync(resolved.mediaPath, sourcePath)
    } else if (resolved.mediaUrl) {
      const http = new AuthorizedHttpProvider()
      await http.download(resolved.mediaUrl, sourcePath, (r) => {
        touchJob(job, { progress: Math.round(8 + r * 8), message: `Downloading media ${Math.round(r * 100)}%` })
      })
    } else {
      throw Object.assign(new Error('No authorized media source'), { code: 'SOURCE_ACCESS_ERROR' })
    }

    set('PROBING_VIDEO', 'Reading media metadata')
    const meta = await ffprobe(sourcePath)
    if (!meta.hasVideo) throw Object.assign(new Error('No video stream'), { code: 'VIDEO_DECODE_ERROR' })
    if (meta.duration > config.maxVideoDuration) {
      throw Object.assign(new Error(`Duration ${meta.duration}s exceeds MAX_VIDEO_DURATION`), {
        code: 'SOURCE_ACCESS_ERROR',
      })
    }
    q.updateProject.run({
      id: project.id,
      status: 'PROBING_VIDEO',
      streamer: resolved.streamer,
      title: resolved.title,
      duration: meta.duration,
      thumbnail_key: project.thumbnail_key,
      metadata_json: JSON.stringify({ provider: resolved.provider, kind: resolved.kind, probe: meta, note: resolved.note }),
      updated_at: now(),
    })

    const poster = path.join(work, 'poster.jpg')
    await thumbnail(sourcePath, poster, Math.min(2, meta.duration / 4))
    await storage.putFile(`projects/${project.id}/source/poster.jpg`, poster)
    q.patchProject({ id: project.id, thumbnail_key: `projects/${project.id}/source/poster.jpg`, duration: meta.duration })

    set('EXTRACTING_AUDIO', 'Extracting mono 16 kHz audio')
    const wav = path.join(work, 'audio.wav')
    await extractAudio(sourcePath, wav, jobId)
    await storage.putFile(`projects/${project.id}/audio/audio.wav`, wav)

    set('TRANSCRIBING', 'Transcribing speech with timestamps')
    const transcript = await transcribeWav(wav)
    q.insertTranscript.run(
      uid('tr'),
      project.id,
      transcript.text,
      JSON.stringify(transcript.segments || []),
      JSON.stringify(transcript.words || []),
      now()
    )
    fs.writeFileSync(path.join(work, 'transcript.json'), JSON.stringify(transcript, null, 2))

    set('ANALYZING', 'Measuring audio energy and scene changes')
    const [silence, energy, scenes] = await Promise.all([
      detectSilence(wav),
      loudnessTimeline(wav, meta.duration),
      sceneTimes(sourcePath),
    ])
    fs.writeFileSync(
      path.join(work, 'analysis.json'),
      JSON.stringify({ silence, energyCount: energy.length, scenes }, null, 2)
    )

    set('DETECTING_MOMENTS', 'Ranking candidate moments')
    let moments = detectMoments({
      transcript,
      energy,
      scenes,
      duration: meta.duration,
      clipLength: project.clip_length,
      maxClips: project.clip_count || 5,
    })
    moments = await refineWithLLM(moments)
    q.deleteMoments.run(project.id)
    moments.forEach((m, i) => {
      q.insertMoment.run({
        id: uid('mom'),
        project_id: project.id,
        start: m.start,
        end: m.end,
        hook: m.hook,
        reason: m.reason,
        viral_score: m.viralScore,
        scores_json: JSON.stringify(m.scores),
        rank: i + 1,
        created_at: now(),
      })
    })
    const stored = q.listMoments.all(project.id)
    if (!stored.length) {
      throw Object.assign(new Error('No usable moments passed the quality gate'), { code: 'AI_ANALYSIS_ERROR' })
    }

    set('GENERATING_TITLES', 'Writing headlines from transcript evidence')
    const titled = []
    for (const m of stored.slice(0, project.clip_count || 5)) {
      const titles = await generateTitles(m.hook + ' ' + (moments.find((x) => x.start === m.start)?.text || ''))
      titled.push({ moment: m, titles, title: titles[0] })
    }

    set('GENERATING_CAPTIONS', 'Building timed captions')
    const captioned = titled.map((row, i) => {
      const ass = buildAss({
        words: transcript.words,
        segments: transcript.segments,
        start: row.moment.start,
        end: row.moment.end,
        style: 'bold-viral',
      })
      const assPath = path.join(work, `clip_${i}.ass`)
      fs.writeFileSync(assPath, ass)
      return { ...row, assPath }
    })

    set('GENERATING_CLIPS', 'Cutting source segments')
    const cuts = []
    for (let i = 0; i < captioned.length; i++) {
      assertNotCancelled(jobId)
      const row = captioned[i]
      const raw = path.join(work, `clip_${i}_raw.mp4`)
      await cutSegment(sourcePath, raw, row.moment.start, row.moment.end - row.moment.start, jobId)
      await verifyMedia(raw)
      cuts.push({ ...row, raw })
    }

    set('RENDERING', 'Compositing 9:16 Viral Kick template')
    const rendered = []
    for (let i = 0; i < cuts.length; i++) {
      assertNotCancelled(jobId)
      const row = cuts[i]
      const finalPath = path.join(work, `clip_${i}_final.mp4`)
      const probe = await renderViralKick({
        input: row.raw,
        output: finalPath,
        assPath: row.assPath,
        headline: row.title,
        handle: resolved.streamer || 'dev',
        templateId: project.style_id || 'viral',
        duration: row.moment.end - row.moment.start,
        jobId,
        onProgress: (r) => {
          const base = stepProgress(STEPS.indexOf('RENDERING'))
          touchJob(job, {
            progress: Math.min(92, base + Math.round((r * 12) / cuts.length + (i * 12) / cuts.length)),
            message: `Rendering clip ${i + 1}/${cuts.length}`,
          })
        },
      })
      const thumb = path.join(work, `clip_${i}.jpg`)
      await thumbnail(finalPath, thumb, Math.min(1.2, probe.duration / 3))
      rendered.push({ ...row, finalPath, thumb, probe })
    }

    set('UPLOADING', 'Storing verified outputs')
    for (let i = 0; i < rendered.length; i++) {
      const row = rendered[i]
      const videoKey = `projects/${project.id}/renders/clip_${i}.mp4`
      const thumbKey = `projects/${project.id}/renders/clip_${i}.jpg`
      const srcKey = `projects/${project.id}/clips/clip_${i}_raw.mp4`
      const capKey = `projects/${project.id}/clips/clip_${i}.ass`
      await storage.putFile(videoKey, row.finalPath)
      await storage.putFile(thumbKey, row.thumb)
      await storage.putFile(srcKey, row.raw)
      await storage.putFile(capKey, row.assPath)
      const checks = {
        source: fs.existsSync(row.raw),
        render: storage.exists(videoKey),
        thumb: storage.exists(thumbKey),
        duration: row.probe.duration > 0,
        dims: row.probe.width === 1080 && row.probe.height === 1920,
      }
      if (!Object.values(checks).every(Boolean)) {
        throw Object.assign(new Error('Quality control failed: ' + JSON.stringify(checks)), {
          code: 'RENDER_FAILED',
        })
      }
      q.insertClip.run({
        id: uid('clip'),
        project_id: project.id,
        moment_id: row.moment.id,
        job_id: jobId,
        start: row.moment.start,
        end: row.moment.end,
        duration: row.probe.duration,
        title: row.title,
        titles_json: JSON.stringify(row.titles),
        template: project.style_id || 'viral',
        caption_style: 'bold-viral',
        status: 'COMPLETED',
        storage_key: videoKey,
        thumb_key: thumbKey,
        source_key: srcKey,
        caption_key: capKey,
        width: 1080,
        height: 1920,
        error: null,
        created_at: now(),
        updated_at: now(),
      })
    }

    set('COMPLETED', 'Clips ready', { progress: 100, done: 'COMPLETE' })
    q.patchProject({ id: project.id, status: 'COMPLETED' })
    logger.stage(jobId, 'COMPLETED', 'COMPLETE', {
      duration: ((Date.now() - started) / 1000).toFixed(1),
      projectId: project.id,
    })
  } catch (e) {
    if (e.code === 'CANCELLED' || isCancelled(jobId)) {
      killJobProcesses(jobId)
      touchJob(job, { status: 'CANCELLED', message: 'Cancelled', progress: job.progress, error_code: 'CANCELLED' })
      q.patchProject({ id: project.id, status: 'CANCELLED' })
      return
    }
    logger.stage(jobId, job.current_step || 'FAILED', 'FAILED', { error: e.message, projectId: project.id })
    const attempt = (job.attempt || 0) + 1
    const transient = ['STORAGE_ERROR', 'PROCESS_TIMEOUT', 'TRANSCRIPTION_ERROR'].includes(e.code)
    if (transient && attempt < config.maxRetries && e.code !== 'INVALID_URL') {
      touchJob(job, {
        status: 'QUEUED',
        attempt,
        message: `Retry ${attempt}/${config.maxRetries}: ${e.message}`,
        error: e.message,
        error_code: e.code || 'FAILED',
      })
      throw e
    }
    touchJob(job, {
      status: 'FAILED',
      message: e.message,
      error: e.message,
      error_code: e.code || 'FAILED',
      attempt,
    })
    q.patchProject({ id: project.id, status: 'FAILED' })
    throw e
  } finally {
    try {
      fs.rmSync(work, { recursive: true, force: true })
    } catch {
      /* keep */
    }
  }
}

export async function regenerateClip(clipId, opts = {}) {
  const clip = q.getClip.get(clipId)
  if (!clip) throw Object.assign(new Error('Clip not found'), { code: 'NOT_FOUND' })
  const project = q.getProject.get(clip.project_id)
  const moment = clip.moment_id ? q.getMoment.get(clip.moment_id) : null
  const transcript = q.getTranscript.get(project.id)
  if (!moment || !transcript) {
    throw Object.assign(new Error('Cannot regenerate without stored moment/transcript'), { code: 'AI_ANALYSIS_ERROR' })
  }
  const work = path.join(config.tmpDir, `regen_${clipId}`)
  fs.mkdirSync(work, { recursive: true })
  const sourceKey = clip.source_key
  if (!sourceKey || !storage.exists(sourceKey)) {
    throw Object.assign(new Error('Raw clip source missing'), { code: 'RENDER_ERROR' })
  }
  const raw = path.join(work, 'raw.mp4')
  fs.copyFileSync(storage.abs(sourceKey), raw)
  const words = JSON.parse(transcript.words_json || '[]')
  const segments = JSON.parse(transcript.segments_json || '[]')
  const titles = opts.title
    ? [opts.title]
    : await generateTitles(moment.hook || transcript.text.slice(0, 400))
  const title = titles[0]
  const ass = buildAss({
    words,
    segments,
    start: clip.start,
    end: clip.end,
    style: opts.captionStyle || clip.caption_style || 'bold-viral',
  })
  const assPath = path.join(work, 'captions.ass')
  fs.writeFileSync(assPath, ass)
  const finalPath = path.join(work, 'final.mp4')
  const probe = await renderViralKick({
    input: raw,
    output: finalPath,
    assPath,
    headline: title,
    handle: project.streamer || 'dev',
    templateId: opts.template || clip.template || 'viral',
    duration: clip.duration,
  })
  const thumb = path.join(work, 'thumb.jpg')
  await thumbnail(finalPath, thumb, 1)
  const videoKey = `projects/${project.id}/renders/${clip.id}_${Date.now()}.mp4`
  const thumbKey = `projects/${project.id}/renders/${clip.id}_${Date.now()}.jpg`
  await storage.putFile(videoKey, finalPath)
  await storage.putFile(thumbKey, thumb)
  q.updateClip.run({
    id: clip.id,
    status: 'COMPLETED',
    title,
    titles_json: JSON.stringify(titles),
    template: opts.template || clip.template,
    caption_style: opts.captionStyle || clip.caption_style,
    storage_key: videoKey,
    thumb_key: thumbKey,
    source_key: clip.source_key,
    caption_key: clip.caption_key,
    duration: probe.duration,
    width: 1080,
    height: 1920,
    error: null,
    updated_at: now(),
  })
  fs.rmSync(work, { recursive: true, force: true })
  return q.getClip.get(clip.id)
}
