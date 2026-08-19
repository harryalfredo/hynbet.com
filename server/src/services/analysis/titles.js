import { config } from '../../config.js'

function wordsOf(text) {
  return String(text || '')
    .replace(/[^\w\s'?]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function takePhrase(text, max = 8) {
  const w = wordsOf(text).split(' ').filter(Boolean)
  if (!w.length) return 'THE MOMENT FROM THIS CLIP'
  const idx = w.findIndex((x) => /asked|wait|what|leave|said|look|cannot|can't|happened/i.test(x))
  const start = idx >= 0 ? idx : 0
  return w.slice(start, start + max).join(' ').toUpperCase()
}

export function titlesFromTranscript(text) {
  const clean = wordsOf(text)
  const phrase = takePhrase(clean, 9)
  const short = takePhrase(clean, 5)
  const q = clean.includes('?') ? takePhrase(clean.split('?')[0], 8) : phrase
  const out = [phrase, short, q].filter(Boolean)
  const uniq = [...new Set(out.map((s) => s.replace(/\s+/g, ' ').trim()))]
  while (uniq.length < 3) uniq.push(phrase)
  return uniq.slice(0, 5)
}

export async function generateTitles(excerpt) {
  const fallback = titlesFromTranscript(excerpt)
  if (!config.ai.apiKey) return fallback
  try {
    const res = await fetch(`${config.ai.base}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.ai.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: config.ai.chatModel,
        temperature: 0.4,
        messages: [
          {
            role: 'system',
            content:
              'Write 4 short uppercase social headlines from ONLY the transcript. Do not invent people, quotes, or events. No accusations. Return JSON {"titles":[...]}',
          },
          { role: 'user', content: excerpt.slice(0, 1200) },
        ],
      }),
    })
    if (!res.ok) return fallback
    const data = await res.json()
    const raw = data.choices?.[0]?.message?.content || ''
    const parsed = JSON.parse(raw.replace(/```json|```/g, '').trim())
    const titles = (parsed.titles || []).map((t) => String(t).trim()).filter(Boolean)
    return titles.length ? titles.slice(0, 5) : fallback
  } catch {
    return fallback
  }
}
