import fs from 'node:fs'
import path from 'node:path'
import { config } from '../../config.js'
import { logger } from '../../logger.js'

export async function transcribeWav(wavPath) {
  if (config.ai.apiKey) {
    try {
      return await transcribeOpenAI(wavPath)
    } catch (e) {
      logger.warn('OpenAI transcription failed', { error: e.message })
      throw Object.assign(new Error(e.message || 'Transcription provider failed'), {
        code: 'TRANSCRIPTION_ERROR',
      })
    }
  }
  try {
    return await transcribeLocal(wavPath)
  } catch (e) {
    logger.warn('Local transcription failed', { error: e.message })
    throw Object.assign(
      new Error(
        'No transcription provider available. Set AI_API_KEY for Whisper, or allow the local Whisper model to download on first run. ' +
          (e.message || '')
      ),
      { code: 'TRANSCRIPTION_ERROR' }
    )
  }
}

async function transcribeOpenAI(wavPath) {
  const buf = fs.readFileSync(wavPath)
  const form = new FormData()
  form.append('file', new Blob([buf], { type: 'audio/wav' }), 'audio.wav')
  form.append('model', config.ai.transcribeModel)
  form.append('response_format', 'verbose_json')
  form.append('timestamp_granularities[]', 'word')
  form.append('timestamp_granularities[]', 'segment')
  const res = await fetch(`${config.ai.base}/audio/transcriptions`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${config.ai.apiKey}` },
    body: form,
  })
  if (!res.ok) {
    const t = await res.text()
    throw new Error(`Whisper API ${res.status}: ${t.slice(0, 300)}`)
  }
  const data = await res.json()
  const segments = (data.segments || []).map((s) => ({
    start: Number(s.start),
    end: Number(s.end),
    text: String(s.text || '').trim(),
  }))
  const words = (data.words || []).map((w) => ({
    start: Number(w.start),
    end: Number(w.end),
    text: String(w.word || w.text || '').trim(),
  }))
  return { text: data.text || segments.map((s) => s.text).join(' '), segments, words, provider: 'openai-whisper' }
}

let localPipeline = null

async function transcribeLocal(wavPath) {
  const { pipeline, env } = await import('@xenova/transformers')
  env.allowLocalModels = true
  env.cacheDir = path.join(config.dataDir, 'models')
  if (!localPipeline) {
    logger.info('Loading local Whisper tiny.en (first run downloads the model)')
    localPipeline = await pipeline('automatic-speech-recognition', 'Xenova/whisper-tiny.en')
  }
  const audio = readWavMono16(wavPath)
  const result = await localPipeline(audio, {
    return_timestamps: 'word',
    chunk_length_s: 30,
    stride_length_s: 5,
    sampling_rate: 16000,
  })
  const chunks = result.chunks || []
  const words = chunks.map((c) => ({
    start: Number(c.timestamp?.[0] ?? 0),
    end: Number(c.timestamp?.[1] ?? 0),
    text: String(c.text || '').trim(),
  }))
  const segments = wordsToSegments(words)
  const text = (result.text || segments.map((s) => s.text).join(' ')).trim()
  if (!text) {
    throw new Error('Local Whisper returned empty text')
  }
  return { text, segments, words, provider: 'xenova-whisper-tiny.en' }
}

function readWavMono16(file) {
  const buf = fs.readFileSync(file)
  let offset = 12
  let dataStart = 44
  let sr = 16000
  while (offset + 8 <= buf.length) {
    const id = buf.toString('ascii', offset, offset + 4)
    const size = buf.readUInt32LE(offset + 4)
    if (id === 'fmt ') sr = buf.readUInt16LE(offset + 12) === 1 ? buf.readUInt32LE(offset + 12) : sr
    if (id === 'data') {
      dataStart = offset + 8
      break
    }
    offset += 8 + size
  }
  const samples = Math.floor((buf.length - dataStart) / 2)
  const out = new Float32Array(samples)
  for (let i = 0; i < samples; i++) out[i] = buf.readInt16LE(dataStart + i * 2) / 32768
  if (sr !== 16000) {
    /* still usable; whisper resamples internally in many builds */
  }
  return out
}

function wordsToSegments(words) {
  const segs = []
  let cur = []
  for (const w of words) {
    cur.push(w)
    const dur = (cur.at(-1).end || 0) - (cur[0].start || 0)
    if (cur.length >= 14 || dur > 6 || /[.!?]$/.test(w.text)) {
      segs.push({
        start: cur[0].start,
        end: cur.at(-1).end,
        text: cur.map((x) => x.text).join(' ').replace(/\s+/g, ' ').trim(),
      })
      cur = []
    }
  }
  if (cur.length) {
    segs.push({
      start: cur[0].start,
      end: cur.at(-1).end,
      text: cur.map((x) => x.text).join(' ').replace(/\s+/g, ' ').trim(),
    })
  }
  return segs
}

export async function transcriptionHealth() {
  if (config.ai.apiKey) return 'ok'
  try {
    await import('@xenova/transformers')
    return 'local'
  } catch {
    return 'missing'
  }
}
