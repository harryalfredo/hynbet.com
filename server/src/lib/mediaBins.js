import { spawnSync } from 'node:child_process'

function isWindowsPath(p) {
  return /^[A-Za-z]:[\\/]/.test(p) || String(p).includes('\\')
}

export function canRunMediaBin(cmd) {
  if (!cmd || isWindowsPath(cmd)) return false
  try {
    const r = spawnSync(cmd, ['-version'], { encoding: 'utf8' })
    const out = `${r.stdout || ''}${r.stderr || ''}`
    return r.status === 0 && /ffmpeg version|ffprobe version/i.test(out)
  } catch {
    return false
  }
}

export function resolveMediaBin(name, envName) {
  const fromEnv = process.env[envName]
  const candidates = [fromEnv, name, `/usr/bin/${name}`, `/usr/local/bin/${name}`].filter(Boolean)
  for (const c of candidates) {
    if (canRunMediaBin(c)) return c
  }
  if (fromEnv && !isWindowsPath(fromEnv)) return fromEnv
  return name
}
