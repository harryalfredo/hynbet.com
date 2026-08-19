import { spawnSync } from 'node:child_process'
import { config } from './config.js'
import { db } from './db.js'
import { publicKickStatus } from './env.js'
import { pingRedis } from './queue.js'
import { storage } from './services/storage/index.js'
import { transcriptionHealth } from './services/transcribe/index.js'

export async function healthPayload() {
  let database = 'ok'
  try {
    db.prepare('SELECT 1').get()
  } catch {
    database = 'error'
  }
  let ffmpeg = 'ok'
  try {
    const r = spawnSync(config.ffmpeg, ['-version'], { encoding: 'utf8' })
    if (r.status !== 0) ffmpeg = 'error'
  } catch {
    ffmpeg = 'error'
  }
  const redis = await pingRedis()
  const storageStatus = await storage.ping()
  const ai = await transcriptionHealth()
  const kick = publicKickStatus()
  return {
    database,
    redis,
    storage: storageStatus,
    ffmpeg,
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
