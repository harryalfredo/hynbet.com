import fs from 'node:fs'
import { config } from '../../config.js'
import { parseFfmpegTime, runCmd } from '../../proc.js'

export async function ffprobe(file) {
  const { stdout } = await runCmd(config.ffprobe, [
    '-v',
    'quiet',
    '-print_format',
    'json',
    '-show_format',
    '-show_streams',
    file,
  ])
  const data = JSON.parse(stdout)
  const v = (data.streams || []).find((s) => s.codec_type === 'video')
  const a = (data.streams || []).find((s) => s.codec_type === 'audio')
  const duration = Number(data.format?.duration || v?.duration || 0)
  return {
    raw: data,
    duration,
    width: v ? Number(v.width) : 0,
    height: v ? Number(v.height) : 0,
    fps: v?.avg_frame_rate && v.avg_frame_rate.includes('/')
      ? Number(v.avg_frame_rate.split('/')[0]) / Number(v.avg_frame_rate.split('/')[1] || 1)
      : Number(v?.r_frame_rate || 0),
    vcodec: v?.codec_name || null,
    acodec: a?.codec_name || null,
    bitrate: Number(data.format?.bit_rate || 0),
    audioSampleRate: a ? Number(a.sample_rate || 0) : 0,
    audioChannels: a ? Number(a.channels || 0) : 0,
    streams: (data.streams || []).length,
    hasVideo: Boolean(v),
    hasAudio: Boolean(a),
    size: Number(data.format?.size || 0),
  }
}

export async function extractAudio(input, output, jobId) {
  await runCmd(
    config.ffmpeg,
    ['-y', '-i', input, '-vn', '-ac', '1', '-ar', '16000', '-c:a', 'pcm_s16le', output],
    { jobId, timeout: 30 * 60 * 1000 }
  )
  if (!fs.existsSync(output) || fs.statSync(output).size < 100) {
    throw Object.assign(new Error('Audio extract produced an empty file'), { code: 'VIDEO_DECODE_ERROR' })
  }
}

export async function cutSegment(input, output, start, duration, jobId) {
  const ss = Math.max(0, start)
  await runCmd(
    config.ffmpeg,
    [
      '-y',
      '-ss',
      ss.toFixed(3),
      '-i',
      input,
      '-t',
      Math.max(0.4, duration).toFixed(3),
      '-map',
      '0:v:0',
      '-map',
      '0:a?',
      '-c:v',
      'libx264',
      '-preset',
      'veryfast',
      '-crf',
      '20',
      '-c:a',
      'aac',
      '-b:a',
      '160k',
      '-movflags',
      '+faststart',
      output,
    ],
    { jobId, timeout: 20 * 60 * 1000 }
  )
}

export async function thumbnail(input, output, at = 1) {
  await runCmd(config.ffmpeg, [
    '-y',
    '-ss',
    String(Math.max(0, at)),
    '-i',
    input,
    '-frames:v',
    '1',
    '-q:v',
    '3',
    output,
  ])
}

export async function detectSilence(wav) {
  const { stderr } = await runCmd(config.ffmpeg, [
    '-i',
    wav,
    '-af',
    'silencedetect=noise=-32dB:d=0.45',
    '-f',
    'null',
    '-',
  ]).catch((e) => ({ stderr: e.stderr || '' }))
  const text = stderr || ''
  const starts = [...text.matchAll(/silence_start:\s*([0-9.]+)/g)].map((m) => Number(m[1]))
  const ends = [...text.matchAll(/silence_end:\s*([0-9.]+)/g)].map((m) => Number(m[1]))
  const ranges = []
  const n = Math.min(starts.length, ends.length)
  for (let i = 0; i < n; i++) ranges.push({ start: starts[i], end: ends[i], dur: ends[i] - starts[i] })
  return ranges
}

export async function loudnessTimeline(wav, duration) {
  const { stderr } = await runCmd(config.ffmpeg, [
    '-i',
    wav,
    '-af',
    'astats=metadata=1:reset=1,ametadata=print:key=lavfi.astats.Overall.RMS_level',
    '-f',
    'null',
    '-',
  ]).catch((e) => ({ stderr: e.stderr || '' }))
  const pts = [...(stderr || '').matchAll(/pts_time:([0-9.]+)[\s\S]{0,120}?RMS_level=([-\d.]+|inf|-inf)/g)]
  if (pts.length) {
    return pts.map((m) => ({ t: Number(m[1]), rms: m[2].includes('inf') ? -80 : Number(m[2]) }))
  }
  const step = Math.max(0.5, duration / 200)
  const bins = []
  for (let t = 0; t < duration; t += step) bins.push({ t, rms: -30 })
  return bins
}

export async function sceneTimes(input) {
  const { stderr } = await runCmd(config.ffmpeg, [
    '-i',
    input,
    '-filter:v',
    'select=gt(scene\\,0.32),showinfo',
    '-f',
    'null',
    '-',
  ]).catch((e) => ({ stderr: e.stderr || '' }))
  return [...(stderr || '').matchAll(/pts_time:([0-9.]+)/g)].map((m) => Number(m[1]))
}

export async function sampleFrame(input, output, at) {
  await thumbnail(input, output, at)
}

export function ffmpegProgressHandler(duration, onRatio) {
  return (chunk) => {
    const t = parseFfmpegTime(chunk)
    if (t != null && duration > 0) onRatio(Math.min(0.99, t / duration))
  }
}

export async function verifyMedia(file, { expectVertical = false } = {}) {
  if (!fs.existsSync(file) || fs.statSync(file).size < 1000) {
    throw Object.assign(new Error('Output file missing or empty'), { code: 'RENDER_ERROR' })
  }
  const meta = await ffprobe(file)
  if (!meta.hasVideo || meta.duration <= 0) {
    throw Object.assign(new Error('Output has no playable video'), { code: 'RENDER_FAILED' })
  }
  if (expectVertical && (meta.width !== 1080 || meta.height !== 1920)) {
    throw Object.assign(new Error(`Expected 1080x1920, got ${meta.width}x${meta.height}`), {
      code: 'RENDER_FAILED',
    })
  }
  return meta
}
