function ts(sec) {
  const s = Math.max(0, sec)
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const r = s % 60
  const whole = Math.floor(r)
  const cs = Math.round((r - whole) * 100)
  const pad = (n, w = 2) => String(n).padStart(w, '0')
  return `${pad(h)}:${pad(m)}:${pad(whole)}.${pad(cs)}`
}

export function buildAss({ words = [], segments = [], start, end, style = 'bold-viral' }) {
  const localWords = (words || [])
    .map((w) => ({ ...w, start: w.start - start, end: w.end - start }))
    .filter((w) => w.end > 0 && w.start < end - start && w.text)
  const localSegs = (segments || [])
    .map((s) => ({ ...s, start: s.start - start, end: s.end - start }))
    .filter((s) => s.end > 0 && s.start < end - start)

  const primary = style === 'gaming' ? '&H0000FFFF' : '&H0000FF53'
  const outline = style === 'minimal' ? 0 : 3

  const header = `[Script Info]
ScriptType: v4.00+
PlayResX: 1080
PlayResY: 1920
WrapStyle: 0

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Alignment, BorderStyle, Outline, Shadow, MarginL, MarginR, MarginV
Style: Default,Liberation Sans,54,${primary},&H00FFFFFF,&H00000000,&H80000000,-1,0,2,1,${outline},0,70,70,430
Style: Active,Liberation Sans,54,&H0000FF53,&H00FFFFFF,&H00000000,&H80000000,-1,0,2,1,${outline},0,70,70,430

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
`

  const events = []
  if (localWords.length) {
    const lineSize = 4
    for (let i = 0; i < localWords.length; i += lineSize) {
      const chunk = localWords.slice(i, i + lineSize)
      const from = Math.max(0, chunk[0].start)
      const to = Math.max(from + 0.2, chunk.at(-1).end)
      const text = chunk
        .map((w, idx) => {
          const token = escapeAss(w.text.toUpperCase())
          return idx === 0 ? `{\\c&H0000FF53&}${token}{\\c&H00FFFFFF&}` : token
        })
        .join(' ')
      events.push(`Dialogue: 0,${ts(from)},${ts(to)},Default,,0,0,0,,${text}`)
    }
  } else {
    for (const s of localSegs) {
      const from = Math.max(0, s.start)
      const to = Math.max(from + 0.2, s.end)
      events.push(`Dialogue: 0,${ts(from)},${ts(to)},Default,,0,0,0,,${escapeAss(s.text.toUpperCase())}`)
    }
  }
  return header + events.join('\n') + '\n'
}

function escapeAss(s) {
  return String(s).replace(/[{}\\]/g, '')
}

export function srtFromSegments(segments, start, end) {
  const local = segments
    .map((s) => ({ ...s, start: s.start - start, end: s.end - start }))
    .filter((s) => s.end > 0 && s.start < end - start)
  return local
    .map((s, i) => {
      const a = toSrt(Math.max(0, s.start))
      const b = toSrt(Math.max(0.2, s.end))
      return `${i + 1}\n${a} --> ${b}\n${s.text}\n`
    })
    .join('\n')
}

function toSrt(sec) {
  const s = Math.max(0, sec)
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const r = s % 60
  const whole = Math.floor(r)
  const ms = Math.round((r - whole) * 1000)
  const pad = (n, w = 2) => String(n).padStart(w, '0')
  return `${pad(h)}:${pad(m)}:${pad(whole)},${String(ms).padStart(3, '0')}`
}
