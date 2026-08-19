import { clsx } from 'clsx'

export const cn = (...a) => clsx(a)

export const uid = (p = 'id') =>
  `${p}_${Math.random().toString(36).slice(2, 8)}${Date.now().toString(36).slice(-4)}`

export const clamp = (n, a, b) => Math.min(b, Math.max(a, n))

export const lerp = (a, b, t) => a + (b - a) * t

export const hashStr = (s) => {
  let h = 2166136261
  for (let i = 0; i < String(s).length; i++) {
    h ^= String(s).charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

export const seeded = (seed) => {
  let s = hashStr(seed) || 1
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 4294967296
  }
}

export const pick = (rng, arr) => arr[Math.floor(rng() * arr.length)]

export const pad = (n) => String(Math.floor(n)).padStart(2, '0')

export const fmtTime = (sec = 0) => {
  const s = Math.max(0, Math.floor(sec))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const r = s % 60
  return h > 0 ? `${pad(h)}:${pad(m)}:${pad(r)}` : `${pad(m)}:${pad(r)}`
}

export const parseTime = (str) => {
  const p = String(str).split(':').map(Number)
  if (p.some((n) => Number.isNaN(n))) return 0
  if (p.length === 3) return p[0] * 3600 + p[1] * 60 + p[2]
  if (p.length === 2) return p[0] * 60 + p[1]
  return p[0] || 0
}

export const fmtDur = (sec = 0) => {
  const s = Math.max(0, Math.floor(sec))
  if (s < 60) return `${s}s`
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  if (h) return `${h}h ${m}m`
  return `${m}m ${s % 60}s`
}

export const fmtDate = (iso) => {
  try {
    return new Date(iso).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  } catch {
    return iso
  }
}

export const fmtRel = (iso) => {
  const d = Date.now() - new Date(iso).getTime()
  const m = Math.floor(d / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const days = Math.floor(h / 24)
  if (days < 7) return `${days}d ago`
  return fmtDate(iso)
}

export const downloadBlob = (blob, name) => {
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = name
  a.click()
  setTimeout(() => URL.revokeObjectURL(a.href), 2500)
}

export const fileToDataUrl = (file) =>
  new Promise((res, rej) => {
    const r = new FileReader()
    r.onload = () => res(r.result)
    r.onerror = rej
    r.readAsDataURL(file)
  })
