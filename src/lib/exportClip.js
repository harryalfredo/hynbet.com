import { downloadBlob } from './utils'

export async function exportStill(node, name = 'hynbet-clip.png') {
  const w = 1080
  const h = 1920
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  await paintComposition(ctx, node, w, h)
  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      downloadBlob(blob, name)
      resolve(blob)
    }, 'image/png')
  })
}

export async function paintComposition(ctx, model, w, h) {
  const {
    frames = ['/demo/stream-frame-01.jpg'],
    headline = 'VIRAL MOMENT',
    headlineSettings = {},
    branding = {},
    captions = [],
    captionStyle = {},
    videoSettings = {},
    t = 0,
    duration = 12,
  } = model

  const img = await loadImage(frames[Math.floor(t / 2.4) % frames.length])
  ctx.fillStyle = '#050505'
  ctx.fillRect(0, 0, w, h)

  ctx.save()
  ctx.filter = `blur(${videoSettings.blur || 22}px) saturate(${videoSettings.saturate || 0.72}) brightness(${1 - (videoSettings.darken || 0.42)})`
  const scale = 2.15 + (videoSettings.kenBurns ? Math.sin(t / 5) * 0.06 : 0)
  drawCover(ctx, img, w, h, scale)
  ctx.restore()

  const vg = ctx.createRadialGradient(w / 2, h / 2, w * 0.15, w / 2, h / 2, w * 0.78)
  vg.addColorStop(0, 'rgba(0,0,0,0)')
  vg.addColorStop(1, `rgba(0,0,0,${videoSettings.vignette || 0.55})`)
  ctx.fillStyle = vg
  ctx.fillRect(0, 0, w, h)

  const vw = w * 0.84
  const vh = vw * (9 / 16)
  const vx = (w - vw) / 2
  const vy = h * 0.28
  ctx.save()
  roundRect(ctx, vx, vy, vw, vh, 10)
  ctx.clip()
  const z = videoSettings.zoom || 1.06
  drawCover(ctx, img, vw, vh, z, vx, vy, videoSettings.reframeX || 0, videoSettings.reframeY || 0)
  ctx.restore()

  if (headlineSettings.background !== 'rgba(0,0,0,0.0)') {
    const cardW = w * 0.88
    const cardX = (w - cardW) / 2
    const cardY = h * ((headlineSettings.y || 4.6) / 100)
    const cardH = h * 0.145
    ctx.save()
    ctx.shadowColor = headlineSettings.shadow ? 'rgba(0,0,0,0.45)' : 'transparent'
    ctx.shadowBlur = headlineSettings.shadow ? 24 : 0
    ctx.shadowOffsetY = 8
    ctx.fillStyle = headlineSettings.background || '#fff'
    roundRect(ctx, cardX, cardY, cardW, cardH, headlineSettings.radius || 18)
    ctx.fill()
    ctx.restore()
    ctx.fillStyle = headlineSettings.color || '#0a0a0a'
    ctx.font = `700 ${headlineSettings.size || 54}px "Bebas Neue", Impact, sans-serif`
    ctx.textAlign = headlineSettings.align || 'center'
    ctx.textBaseline = 'middle'
    wrapFill(ctx, String(headline).toUpperCase(), w / 2, cardY + cardH / 2, cardW - 64, (headlineSettings.size || 54) + 6)
  }

  const active = captions.filter((c) => t >= c.from && t <= c.to + 0.12)
  if (active.length && model.captionOn !== false) {
    const line = active.map((c) => c.text).slice(-4).join(' ')
    ctx.font = `800 40px Outfit, Inter, sans-serif`
    ctx.textAlign = 'center'
    ctx.lineWidth = 10
    ctx.strokeStyle = '#111'
    ctx.fillStyle = captionStyle.highlight || '#fff'
    const cy = h * 0.74
    ctx.strokeText(line.toUpperCase(), w / 2, cy)
    ctx.fillText(line.toUpperCase(), w / 2, cy)
  }

  if (branding.enabled !== false) {
    const bh = h * ((branding.height || 8.6) / 100)
    ctx.fillStyle = branding.color || '#050505'
    ctx.fillRect(0, h - bh, w, bh)
    ctx.fillStyle = '#53FC18'
    const pad = 28
    const bw = 168
    const bhx = 46
    const by = h - bh / 2 - bhx / 2
    roundRect(ctx, pad, by, bw, bhx, 5)
    ctx.fill()
    ctx.fillStyle = '#081405'
    ctx.font = '800 26px Outfit, sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(branding.left || 'KICK', pad + bw / 2, h - bh / 2 + 1)
    ctx.fillStyle = '#f4f4f5'
    ctx.font = '700 22px Outfit, sans-serif'
    ctx.textAlign = 'right'
    ctx.fillText(branding.right || 'KICK.COM', w - pad, h - bh / 2 + 1)
  }

  ctx.fillStyle = 'rgba(255,255,255,0.12)'
  ctx.fillRect(0, 0, w * Math.min(1, t / Math.max(duration, 1)), 6)
}

function drawCover(ctx, img, w, h, scale = 1, ox = 0, oy = 0, rx = 0, ry = 0) {
  const ir = img.width / img.height
  const cr = w / h
  let dw, dh
  if (ir > cr) {
    dh = h * scale
    dw = dh * ir
  } else {
    dw = w * scale
    dh = dw / ir
  }
  const x = ox + (w - dw) / 2 + (rx / 100) * w
  const y = oy + (h - dh) / 2 + (ry / 100) * h
  ctx.drawImage(img, x, y, dw, dh)
}

function roundRect(ctx, x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2)
  ctx.beginPath()
  ctx.moveTo(x + rr, y)
  ctx.arcTo(x + w, y, x + w, y + h, rr)
  ctx.arcTo(x + w, y + h, x, y + h, rr)
  ctx.arcTo(x, y + h, x, y, rr)
  ctx.arcTo(x, y, x + w, y, rr)
  ctx.closePath()
}

function wrapFill(ctx, text, x, y, maxW, lh) {
  const words = text.split(' ')
  const lines = []
  let cur = ''
  words.forEach((wd) => {
    const test = cur ? cur + ' ' + wd : wd
    if (ctx.measureText(test).width > maxW && cur) {
      lines.push(cur)
      cur = wd
    } else cur = test
  })
  if (cur) lines.push(cur)
  const start = y - ((lines.length - 1) * lh) / 2
  lines.forEach((ln, i) => ctx.fillText(ln, x, start + i * lh))
}

const imgCache = new Map()
function loadImage(src) {
  if (imgCache.has(src)) return imgCache.get(src)
  const p = new Promise((res, rej) => {
    const im = new Image()
    im.crossOrigin = 'anonymous'
    im.onload = () => res(im)
    im.onerror = rej
    im.src = src
  })
  imgCache.set(src, p)
  return p
}

export async function recordComposition(model, seconds = 6, onProgress) {
  const w = 1080
  const h = 1920
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  const stream = canvas.captureStream(30)
  const mime = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
    ? 'video/webm;codecs=vp9'
    : 'video/webm'
  const rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 8_000_000 })
  const chunks = []
  rec.ondataavailable = (e) => e.data.size && chunks.push(e.data)
  const done = new Promise((resolve) => {
    rec.onstop = () => resolve(new Blob(chunks, { type: mime }))
  })
  rec.start()
  const fps = 30
  const total = Math.round(seconds * fps)
  for (let i = 0; i <= total; i++) {
    const t = (i / fps) * (model.duration || seconds)
    await paintComposition(ctx, { ...model, t }, w, h)
    onProgress?.(i / total)
    await new Promise((r) => setTimeout(r, 1000 / fps))
  }
  rec.stop()
  return done
}

export function filenameFor(clip, streamer, ext = 'webm') {
  const h = (streamer?.handle || 'clip').replace(/[^a-z0-9]/gi, '')
  return `hynbet_${h}_${clip.rank}_${clip.viralScore}.${ext}`
}
