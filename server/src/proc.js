import { spawn } from 'node:child_process'
import { logger } from './logger.js'

const running = new Map()

export function killJobProcesses(jobId) {
  const set = running.get(jobId)
  if (!set) return
  for (const child of set) {
    try {
      child.kill('SIGTERM')
    } catch {
      /* ignore */
    }
  }
}

export function runCmd(cmd, args, { cwd, timeout = 0, jobId, onProgress } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, {
      cwd,
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    if (jobId) {
      if (!running.has(jobId)) running.set(jobId, new Set())
      running.get(jobId).add(child)
    }
    let stdout = ''
    let stderr = ''
    child.stdout.on('data', (b) => {
      const s = b.toString()
      stdout += s
      if (onProgress) onProgress(s, 'stdout')
    })
    child.stderr.on('data', (b) => {
      const s = b.toString()
      stderr += s
      if (onProgress) onProgress(s, 'stderr')
    })
    const timer =
      timeout > 0
        ? setTimeout(() => {
            child.kill('SIGKILL')
            reject(Object.assign(new Error('PROCESS_TIMEOUT'), { code: 'PROCESS_TIMEOUT', stderr }))
          }, timeout)
        : null
    child.on('error', (err) => {
      if (timer) clearTimeout(timer)
      if (jobId) running.get(jobId)?.delete(child)
      reject(err)
    })
    child.on('close', (code) => {
      if (timer) clearTimeout(timer)
      if (jobId) running.get(jobId)?.delete(child)
      if (code === 0) resolve({ stdout, stderr, code })
      else {
        const err = Object.assign(new Error(`${cmd} exited ${code}`), {
          code: 'PROCESS_FAILED',
          exitCode: code,
          stderr: stderr.slice(-4000),
        })
        logger.warn('process failed', { cmd, exit: code, jobId })
        reject(err)
      }
    })
  })
}

export function parseFfmpegTime(chunk) {
  const m = /out_time_ms=(\d+)/.exec(chunk) || /time=(\d+):(\d+):(\d+(?:\.\d+)?)/.exec(chunk)
  if (!m) return null
  if (m[1] && m[0].startsWith('out_time')) return Number(m[1]) / 1e6
  return Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3])
}
