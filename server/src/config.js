import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { envString, loadServerEnv } from './env.js'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
loadServerEnv()

const num = (k, d) => {
  const v = Number(process.env[k])
  return Number.isFinite(v) ? v : d
}

export const config = {
  root,
  env: process.env.NODE_ENV || 'development',
  port: Number.parseInt(process.env.PORT, 10) || 8787,
  host: '0.0.0.0',
  devMode: process.env.DEV_MODE === 'true',
  allowLocalSample: process.env.ALLOW_LOCAL_SAMPLE !== 'false',
  databaseUrl: process.env.DATABASE_URL || `sqlite:///${path.join(root, 'data', 'hynbet.db')}`,
  redisUrl: process.env.REDIS_URL || '',
  workerConcurrency: Math.max(1, num('WORKER_CONCURRENCY', 1)),
  ffmpeg: process.env.FFMPEG_PATH || 'ffmpeg',
  ffprobe: process.env.FFPROBE_PATH || 'ffprobe',
  maxVideoDuration: num('MAX_VIDEO_DURATION', 14400),
  maxUploadSize: num('MAX_UPLOAD_SIZE', 2147483648),
  maxClips: num('MAX_CLIPS_PER_PROJECT', 10),
  maxJobsPerUser: num('MAX_CONCURRENT_JOBS_PER_USER', 2),
  maxRetries: num('JOB_MAX_RETRIES', 3),
  dataDir: process.env.DATA_DIR || '/home/user/data',
  storageDir: process.env.STORAGE_DIR || '/home/user/data/storage',
  tmpDir: process.env.TMP_DIR || '/home/user/data/tmp',
  devSamplePath: process.env.DEV_SAMPLE_PATH || '/home/user/data/samples/dev-conversation.mp4',
  storage: {
    endpoint: process.env.STORAGE_ENDPOINT || '',
    accessKey: process.env.STORAGE_ACCESS_KEY || '',
    secretKey: process.env.STORAGE_SECRET_KEY || '',
    bucket: process.env.STORAGE_BUCKET || '',
    publicUrl: process.env.STORAGE_PUBLIC_URL || '',
  },
  kick: {
    clientId: envString('KICK_CLIENT_ID'),
    clientSecret: envString('KICK_CLIENT_SECRET'),
    redirectUri: envString(
      'KICK_REDIRECT_URI',
      'https://hynbetcom-production-56c5.up.railway.app/api/auth/kick/callback'
    ),
    apiBase: envString('KICK_API_BASE', 'https://api.kick.com'),
    idBase: envString('KICK_ID_BASE', 'https://id.kick.com'),
    authorizedMediaUrl: envString('KICK_AUTHORIZED_MEDIA_URL'),
  },
  ai: {
    apiKey: process.env.AI_API_KEY || '',
    base: process.env.AI_API_BASE || 'https://api.openai.com/v1',
    transcribeModel: process.env.AI_TRANSCRIBE_MODEL || 'whisper-1',
    chatModel: process.env.AI_CHAT_MODEL || 'gpt-4o-mini',
  },
  sessionSecret: process.env.SESSION_SECRET || 'dev-secret',
  sessionTtlDays: num('SESSION_TTL_DAYS', 14),
}

export function sqlitePath() {
  const u = config.databaseUrl
  if (u.startsWith('sqlite:///')) return u.replace('sqlite:///', '/')
  if (u.startsWith('sqlite://')) return u.replace('sqlite://', '')
  return path.join(config.dataDir, 'hynbet.db')
}

for (const d of [config.dataDir, config.storageDir, config.tmpDir, path.dirname(config.devSamplePath)]) {
  fs.mkdirSync(d, { recursive: true })
}
