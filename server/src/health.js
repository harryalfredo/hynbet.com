import { spawnSync } from 'node:child_process'
import { config } from './config.js'
import { db } from './db.js'
import { publicKickStatus } from './env.js'
import { canRunMediaBin } from './lib/mediaBins.js'
import { pingRedis, redisConfigured, workerHeartbeatFresh } from './queue.js'
import { storage } from './services/storage/index.js'
import { transcriptionHealth } from './services/transcribe/index.js'

export async function healthPayload() {
  let database = 'ok'
  try {
    db.prepare('SELECT 1').get()
  } catch {
    database = 'error'
  }
  const ffmpegOk = canRunMediaBin(config.ffmpeg)
  const ffmpeg = ffmpegOk ? 'ok' : 'error'
  let ffmpegVersion = null
  if (ffmpegOk) {
    const r = spawnSync(config.ffmpeg, ['-version'], { encoding: 'utf8' })
    ffmpegVersion = String(r.stdout || '').split('\n')[0] || null
  }
  const redis = await pingRedis()
  const workerAlive = await workerHeartbeatFresh()
  const storageStatus = await storage.ping()
  const ai = await transcriptionHealth()
  const kick = publicKickStatus()
  return {
    database,
    redis,
    redisConfigured: redisConfigured(),
    redisConnected: redis === 'ok',
    worker: workerAlive ? 'ok' : redis === 'ok' ? 'offline' : redis === 'unset' ? 'unset' : 'error',
    queue: redis === 'ok' ? 'connected' : redis,
    storage: storageStatus,
    ffmpeg,
    ffmpegPath: ffmpegOk ? config.ffmpeg : null,
    ffmpegVersion,
    ai,
    kick:
      kick.kickClientIdConfigured && kick.kickClientSecretConfigured && kick.kickRedirectUriConfigured
        ? 'configured'
        : 'missing',
    kickClientIdConfigured: kick.kickClientIdConfigured,
    kickClientSecretConfigured: kick.kickClientSecretConfigured,
    kickRedirectUriConfigured: kick.kickRedirectUriConfigured,
    storageDriver: storage.kind(),
    devMode: config.devMode,
    devSample: config.allowLocalSample,
    kickVodMedia: false,
    notes: {
      kick:
        'OAuth uses official Kick OAuth 2.1 + PKCE. Connecting Kick does not grant VOD file download. Public API has no VOD media endpoint.',
      ai: config.ai.apiKey
        ? 'AI_API_KEY present — OpenAI-compatible Whisper + chat.'
        : 'No AI_API_KEY — local Whisper tiny.en will be used for transcription.',
    },
  }
}
