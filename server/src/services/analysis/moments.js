import { config } from '../../config.js'
import { logger } from '../../logger.js'

export const SCORE_WEIGHTS = {
  hook: 0.2,
  payoff: 0.2,
  emotion: 0.15,
  surprise: 0.15,
  clarity: 0.1,
  audioEnergy: 0.1,
  visualInterest: 0.1,
}

const HOOKISH = /\b(wait|what|no way|oh my|are you|did you|look|hold on|stop|seriously|asked|leave|permission|insane|unreal|bro|chat)\b/i
const EMOTION = /\b(love|hate|cry|sad|angry|scared|shock|unbelievable|cannot believe|can't believe|quiet|silent)\b/i
const SURPRISE = /\b(what|unexpected|didn't expect|did not|no one|nobody|wild|crazy|asked)\b/i

function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n))
}

function energyIn(timeline, start, end) {
  const pts = timeline.filter((p) => p.t >= start && p.t <= end && Number.isFinite(p.rms))
  if (!pts.length) return { avg: -40, peak: -40, spike: 0 }
  const rms = pts.map((p) => p.rms)
  const avg = rms.reduce((s, x) => s + x, 0) / rms.length
  const peak = Math.max(...rms)
  const spike = peak - avg
  return {
    avg: Number.isFinite(avg) ? avg : -40,
    peak: Number.isFinite(peak) ? peak : -40,
    spike: Number.isFinite(spike) ? spike : 0,
  }
}

function scenesIn(scenes, start, end) {
  return scenes.filter((t) => t >= start && t <= end).length
}

function windowText(segments, start, end) {
  return segments
    .filter((s) => s.end >= start && s.start <= end)
    .map((s) => s.text)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function findSetup(segments, t, maxLookback = 8) {
  const before = segments.filter((s) => s.end <= t && s.start >= t - maxLookback)
  if (!before.length) return Math.max(0, t - 5)
  return before[0].start
}

function findPayoff(segments, t, maxLookahead = 10) {
  const after = segments.filter((s) => s.start >= t && s.end <= t + maxLookahead)
  if (!after.length) return t + 4
  return after.at(-1).end
}

function scoreWindow({ text, energy, scenes, duration }) {
  const words = text.split(/\s+/).filter(Boolean)
  const hook = clamp((HOOKISH.test(text) ? 78 : 52) + (text.includes('?') ? 10 : 0) + Math.min(12, words.length), 40, 98)
  const payoff = clamp(60 + (/\b(that is the|that's the|moment|clip|happened|again)\b/i.test(text) ? 20 : 0) + (energy.spike > 6 ? 10 : 0), 40, 98)
  const emotion = clamp((EMOTION.test(text) ? 80 : 55) + (energy.peak > -18 ? 8 : 0), 40, 98)
  const surprise = clamp((SURPRISE.test(text) ? 82 : 50) + (energy.spike > 8 ? 10 : 0), 40, 98)
  const clarity = clamp(90 - Math.abs(duration - 28) * 1.2 + (words.length > 6 ? 4 : -10), 40, 98)
  const audioEnergy = clamp(50 + energy.spike * 3 + (energy.peak + 40), 40, 98)
  const visualInterest = clamp(55 + scenes * 8, 40, 98)
  const scores = {
    hook: Math.round(hook),
    payoff: Math.round(payoff),
    emotion: Math.round(emotion),
    surprise: Math.round(surprise),
    clarity: Math.round(clarity),
    audioEnergy: Math.round(audioEnergy),
    visualInterest: Math.round(visualInterest),
  }
  const viral =
    scores.hook * SCORE_WEIGHTS.hook +
    scores.payoff * SCORE_WEIGHTS.payoff +
    scores.emotion * SCORE_WEIGHTS.emotion +
    scores.surprise * SCORE_WEIGHTS.surprise +
    scores.clarity * SCORE_WEIGHTS.clarity +
    scores.audioEnergy * SCORE_WEIGHTS.audioEnergy +
    scores.visualInterest * SCORE_WEIGHTS.visualInterest
  return { scores, viralScore: Math.round(Number.isFinite(viral) ? viral : 60) }
}

export function detectMoments({ transcript, energy, scenes, duration, clipLength = 'auto', maxClips = 5 }) {
  const segments = transcript.segments || []
  if (!segments.length) {
    throw Object.assign(new Error('Transcript has no timestamped segments'), { code: 'AI_ANALYSIS_ERROR' })
  }

  const candidates = []
  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i]
    const peak = (seg.start + seg.end) / 2
    let start = findSetup(segments, seg.start, 8)
    let end = findPayoff(segments, seg.end, 9)
    if (clipLength !== 'auto' && Number(clipLength) > 0) {
      const target = Number(clipLength)
      const mid = (start + end) / 2
      start = Math.max(0, mid - target / 2)
      end = Math.min(duration, start + target)
    } else {
      if (end - start < 8) end = Math.min(duration, start + 12)
      if (end - start > 75) end = start + 60
    }
    start = Math.max(0, start)
    end = Math.min(duration, end)
    const text = windowText(segments, start, end)
    if (text.split(/\s+/).length < 4) continue
    const e = energyIn(energy, start, end)
    const sc = scenesIn(scenes, start, end)
    const scored = scoreWindow({ text, energy: e, scenes: sc, duration: end - start })
    const reasonBits = []
    if (HOOKISH.test(text)) reasonBits.push('conversational hook')
    if (SURPRISE.test(text)) reasonBits.push('surprise language')
    if (e.spike > 6) reasonBits.push('audio energy spike')
    if (sc > 0) reasonBits.push('visual change')
    if (!reasonBits.length) reasonBits.push('complete spoken beat with context')
    candidates.push({
      start: +start.toFixed(2),
      end: +end.toFixed(2),
      hook: text.split(/[.!?]/)[0].slice(0, 140),
      reason: reasonBits.join(', '),
      text,
      ...scored,
    })
  }

  candidates.sort((a, b) => b.viralScore - a.viralScore)
  const picked = []
  for (const c of candidates) {
    if (picked.some((p) => Math.abs(p.start - c.start) < 6)) continue
    if (c.viralScore < 55) continue
    picked.push(c)
    if (picked.length >= Math.max(maxClips * 2, maxClips)) break
  }

  picked.sort((a, b) => b.viralScore - a.viralScore)
  return picked.slice(0, Math.max(maxClips, 1)).map((c, i) => ({ ...c, rank: i + 1 }))
}

export async function refineWithLLM(moments) {
  if (!config.ai.apiKey) return moments
  try {
    const payload = moments.map((m) => ({
      start: m.start,
      end: m.end,
      text: m.text,
      viralScore: m.viralScore,
    }))
    const res = await fetch(`${config.ai.base}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.ai.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: config.ai.chatModel,
        temperature: 0.2,
        messages: [
          {
            role: 'system',
            content:
              'You rank short video moments. Only use the provided transcript. Do not invent events. Return JSON array with start, reason (one sentence from the transcript evidence).',
          },
          { role: 'user', content: JSON.stringify(payload) },
        ],
      }),
    })
    if (!res.ok) return moments
    const data = await res.json()
    const text = data.choices?.[0]?.message?.content || ''
    const json = JSON.parse(text.replace(/```json|```/g, '').trim())
    if (!Array.isArray(json)) return moments
    return moments.map((m) => {
      const hit = json.find((j) => Math.abs(j.start - m.start) < 1)
      return hit?.reason ? { ...m, reason: hit.reason } : m
    })
  } catch (e) {
    logger.warn('LLM refine skipped', { error: e.message })
    return moments
  }
}
