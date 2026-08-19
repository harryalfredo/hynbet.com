import fs from 'node:fs'
import path from 'node:path'
import { config } from '../../config.js'
import { runCmd } from '../../proc.js'
import { ffmpegProgressHandler, verifyMedia } from '../media/ffmpeg.js'
import { getTemplate } from './templates.js'

const FONT = '/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf'
const FONT_FALLBACK = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'

function fontFile() {
  return fs.existsSync(FONT) ? FONT : FONT_FALLBACK
}

export async function createHeadlinePng(text, outPath, tpl) {
  const wrapped = wrapHeadline(text, 18)
  await runCmd('convert', [
    '-size',
    '980x240',
    `xc:${tpl.headlineBg}`,
    '-fill',
    tpl.headlineFg,
    '-font',
    fontFile(),
    '-pointsize',
    wrapped.length > 28 ? '46' : '56',
    '-gravity',
    'center',
    '-annotate',
    '+0+0',
    wrapped,
    '(',
    '+clone',
    '-alpha',
    'extract',
    '-draw',
    'fill black roundrectangle 0,0 979,239 32,32',
    ')',
    '-alpha',
    'off',
    '-compose',
    'CopyOpacity',
    '-composite',
    outPath,
  ])
}

export async function createBarPng(left, right, outPath) {
  await runCmd('convert', [
    '-size',
    '1080x160',
    'xc:#050505',
    '-font',
    fontFile(),
    '-pointsize',
    '36',
    '-fill',
    '#53FC18',
    '-gravity',
    'west',
    '-annotate',
    '+40+0',
    left || 'KICK',
    '-fill',
    '#F4F4F5',
    '-gravity',
    'east',
    '-annotate',
    '+40+0',
    right || '',
    outPath,
  ])
}

function wrapHeadline(text, width) {
  const words = String(text || 'CLIP')
    .toUpperCase()
    .split(/\s+/)
    .filter(Boolean)
  const lines = []
  let cur = ''
  for (const w of words) {
    const next = cur ? `${cur} ${w}` : w
    if (next.length > width && cur) {
      lines.push(cur)
      cur = w
    } else cur = next
  }
  if (cur) lines.push(cur)
  return lines.slice(0, 3).join('\n')
}

export async function renderViralKick({
  input,
  output,
  assPath,
  headline,
  handle,
  templateId = 'viral',
  duration,
  jobId,
  onProgress,
}) {
  const tpl = getTemplate(templateId)
  const dir = path.dirname(output)
  const headPng = path.join(dir, 'headline.png')
  const barPng = path.join(dir, 'bar.png')
  await createHeadlinePng(headline, headPng, tpl)
  if (tpl.bar) {
    await createBarPng('KICK', `KICK.COM/${String(handle || 'STREAM').toUpperCase()}`, barPng)
  }

  const dark = 1 - (tpl.darken || 0.18)
  const blur = tpl.blur || 22
  const inputs = ['-y', '-i', input, '-loop', '1', '-i', headPng]
  if (tpl.bar) inputs.push('-loop', '1', '-i', barPng)

  const captionFilter =
    assPath && fs.existsSync(assPath) ? `,ass=${assPath.replace(/\\/g, '/').replace(/:/g, '\\:')}` : ''

  const graph = tpl.bar
    ? `[0:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,gblur=sigma=${blur},eq=brightness=-0.08:saturation=0.72:gamma=${dark}[bg];` +
      `[0:v]scale=1008:-2:force_original_aspect_ratio=decrease[main];` +
      `[bg][main]overlay=(W-w)/2:(H-h)/2[base];` +
      `[base][1:v]overlay=(W-w)/2:70[withhead];` +
      `[withhead][2:v]overlay=0:H-h[v0];` +
      `[v0]format=yuv420p${captionFilter}[vout]`
    : `[0:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,gblur=sigma=${blur},eq=brightness=-0.12:saturation=0.65[bg];` +
      `[0:v]scale=1008:-2:force_original_aspect_ratio=decrease[main];` +
      `[bg][main]overlay=(W-w)/2:(H-h)/2[base];` +
      `[base][1:v]overlay=(W-w)/2:80[v0];` +
      `[v0]format=yuv420p${captionFilter}[vout]`

  await runCmd(
    config.ffmpeg,
    [
      ...inputs,
      '-filter_complex',
      graph,
      '-map',
      '[vout]',
      '-map',
      '0:a?',
      '-c:v',
      'libx264',
      '-preset',
      'veryfast',
      '-crf',
      '19',
      '-pix_fmt',
      'yuv420p',
      '-c:a',
      'aac',
      '-b:a',
      '192k',
      '-ar',
      '48000',
      '-af',
      'loudnorm=I=-16:TP=-1.5:LRA=11',
      '-shortest',
      '-movflags',
      '+faststart',
      '-progress',
      'pipe:1',
      output,
    ],
    {
      jobId,
      timeout: 30 * 60 * 1000,
      onProgress: ffmpegProgressHandler(duration || 30, (r) => onProgress?.(r)),
    }
  )

  return verifyMedia(output, { expectVertical: true })
}
