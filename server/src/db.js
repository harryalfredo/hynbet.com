import fs from 'node:fs'
import path from 'node:path'
import Database from 'better-sqlite3'
import { sqlitePath } from './config.js'

const file = sqlitePath()
fs.mkdirSync(path.dirname(file), { recursive: true })
export const db = new Database(file)
db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id)
);
CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  source_url TEXT NOT NULL,
  source_kind TEXT,
  streamer TEXT,
  title TEXT,
  thumbnail_key TEXT,
  duration REAL,
  status TEXT NOT NULL,
  clip_count INTEGER DEFAULT 5,
  clip_length TEXT DEFAULT 'auto',
  style_id TEXT DEFAULT 'viral',
  metadata_json TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id)
);
CREATE TABLE IF NOT EXISTS jobs (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  parent_id TEXT,
  kind TEXT NOT NULL,
  status TEXT NOT NULL,
  progress INTEGER DEFAULT 0,
  current_step TEXT,
  step_index INTEGER DEFAULT 0,
  total_steps INTEGER DEFAULT 13,
  message TEXT,
  error_code TEXT,
  error TEXT,
  attempt INTEGER DEFAULT 0,
  cancel_requested INTEGER DEFAULT 0,
  pid INTEGER,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (project_id) REFERENCES projects(id)
);
CREATE TABLE IF NOT EXISTS transcripts (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL UNIQUE,
  text TEXT,
  segments_json TEXT,
  words_json TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (project_id) REFERENCES projects(id)
);
CREATE TABLE IF NOT EXISTS moments (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  start REAL NOT NULL,
  end REAL NOT NULL,
  hook TEXT,
  reason TEXT,
  viral_score REAL,
  scores_json TEXT,
  rank INTEGER,
  created_at TEXT NOT NULL,
  FOREIGN KEY (project_id) REFERENCES projects(id)
);
CREATE TABLE IF NOT EXISTS clips (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  moment_id TEXT,
  job_id TEXT,
  start REAL,
  end REAL,
  duration REAL,
  title TEXT,
  titles_json TEXT,
  template TEXT,
  caption_style TEXT,
  status TEXT NOT NULL,
  storage_key TEXT,
  thumb_key TEXT,
  source_key TEXT,
  caption_key TEXT,
  width INTEGER,
  height INTEGER,
  error TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (project_id) REFERENCES projects(id)
);
CREATE TABLE IF NOT EXISTS events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  job_id TEXT NOT NULL,
  status TEXT,
  progress INTEGER,
  message TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_jobs_project ON jobs(project_id);
CREATE INDEX IF NOT EXISTS idx_clips_project ON clips(project_id);
CREATE INDEX IF NOT EXISTS idx_moments_project ON moments(project_id);
CREATE INDEX IF NOT EXISTS idx_events_job ON events(job_id);
CREATE TABLE IF NOT EXISTS kick_oauth_states (
  state TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  code_verifier TEXT NOT NULL,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS kick_connections (
  user_id TEXT PRIMARY KEY,
  kick_user_id TEXT,
  username TEXT,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  token_type TEXT,
  scope TEXT,
  expires_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id)
);
`)

export const now = () => new Date().toISOString()

export function uid(prefix = 'id') {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`
}

export const q = {
  getUser: db.prepare('SELECT * FROM users WHERE id = ?'),
  getUserByEmail: db.prepare('SELECT * FROM users WHERE email = ?'),
  insertUser: db.prepare('INSERT INTO users (id, email, created_at) VALUES (?, ?, ?)'),
  insertSession: db.prepare('INSERT INTO sessions (token, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)'),
  getSession: db.prepare('SELECT * FROM sessions WHERE token = ?'),
  insertProject: db.prepare(`INSERT INTO projects
    (id, user_id, source_url, source_kind, streamer, title, thumbnail_key, duration, status, clip_count, clip_length, style_id, metadata_json, created_at, updated_at)
    VALUES (@id,@user_id,@source_url,@source_kind,@streamer,@title,@thumbnail_key,@duration,@status,@clip_count,@clip_length,@style_id,@metadata_json,@created_at,@updated_at)`),
  getProject: db.prepare('SELECT * FROM projects WHERE id = ?'),
  listProjects: db.prepare('SELECT * FROM projects WHERE user_id = ? ORDER BY created_at DESC'),
  updateProject: db.prepare('UPDATE projects SET status=@status, streamer=@streamer, title=@title, duration=@duration, thumbnail_key=@thumbnail_key, metadata_json=@metadata_json, updated_at=@updated_at WHERE id=@id'),
  patchProject: (fields) => {
    const keys = Object.keys(fields).filter((k) => k !== 'id')
    const sql = `UPDATE projects SET ${keys.map((k) => `${k}=@${k}`).join(', ')}, updated_at=@updated_at WHERE id=@id`
    return db.prepare(sql).run({ ...fields, updated_at: now() })
  },
  insertJob: db.prepare(`INSERT INTO jobs
    (id, project_id, parent_id, kind, status, progress, current_step, step_index, total_steps, message, error_code, error, attempt, cancel_requested, pid, created_at, updated_at)
    VALUES (@id,@project_id,@parent_id,@kind,@status,@progress,@current_step,@step_index,@total_steps,@message,@error_code,@error,@attempt,@cancel_requested,@pid,@created_at,@updated_at)`),
  getJob: db.prepare('SELECT * FROM jobs WHERE id = ?'),
  latestJob: db.prepare('SELECT * FROM jobs WHERE project_id = ? AND kind = ? ORDER BY created_at DESC LIMIT 1'),
  findActiveByUserSource: db.prepare(`SELECT j.*, p.source_url FROM jobs j JOIN projects p ON p.id = j.project_id
    WHERE p.user_id = ? AND p.source_url = ? AND j.status IN ('QUEUED','FETCHING_SOURCE','DOWNLOADING','PROBING_VIDEO')
    ORDER BY j.created_at DESC LIMIT 1`),
  activeJobs: db.prepare("SELECT COUNT(*) AS n FROM jobs WHERE project_id IN (SELECT id FROM projects WHERE user_id = ?) AND status NOT IN ('COMPLETED','FAILED','CANCELLED')"),
  updateJob: db.prepare(`UPDATE jobs SET status=@status, progress=@progress, current_step=@current_step, step_index=@step_index, message=@message, error_code=@error_code, error=@error, attempt=@attempt, cancel_requested=@cancel_requested, pid=@pid, updated_at=@updated_at WHERE id=@id`),
  insertEvent: db.prepare('INSERT INTO events (job_id, status, progress, message, created_at) VALUES (?, ?, ?, ?, ?)'),
  listEvents: db.prepare('SELECT * FROM events WHERE job_id = ? AND id > ? ORDER BY id ASC'),
  insertTranscript: db.prepare('INSERT OR REPLACE INTO transcripts (id, project_id, text, segments_json, words_json, created_at) VALUES (?, ?, ?, ?, ?, ?)'),
  getTranscript: db.prepare('SELECT * FROM transcripts WHERE project_id = ?'),
  deleteMoments: db.prepare('DELETE FROM moments WHERE project_id = ?'),
  insertMoment: db.prepare(`INSERT INTO moments (id, project_id, start, end, hook, reason, viral_score, scores_json, rank, created_at)
    VALUES (@id,@project_id,@start,@end,@hook,@reason,@viral_score,@scores_json,@rank,@created_at)`),
  listMoments: db.prepare('SELECT * FROM moments WHERE project_id = ? ORDER BY rank ASC, viral_score DESC'),
  getMoment: db.prepare('SELECT * FROM moments WHERE id = ?'),
  insertClip: db.prepare(`INSERT INTO clips (id, project_id, moment_id, job_id, start, end, duration, title, titles_json, template, caption_style, status, storage_key, thumb_key, source_key, caption_key, width, height, error, created_at, updated_at)
    VALUES (@id,@project_id,@moment_id,@job_id,@start,@end,@duration,@title,@titles_json,@template,@caption_style,@status,@storage_key,@thumb_key,@source_key,@caption_key,@width,@height,@error,@created_at,@updated_at)`),
  updateClip: db.prepare(`UPDATE clips SET status=@status, title=@title, titles_json=@titles_json, template=@template, caption_style=@caption_style, storage_key=@storage_key, thumb_key=@thumb_key, source_key=@source_key, caption_key=@caption_key, duration=@duration, width=@width, height=@height, error=@error, updated_at=@updated_at WHERE id=@id`),
  getClip: db.prepare('SELECT * FROM clips WHERE id = ?'),
  listClips: db.prepare('SELECT * FROM clips WHERE project_id = ? ORDER BY created_at ASC'),
  listAllClips: db.prepare(`SELECT c.*, p.streamer, p.title AS project_title FROM clips c JOIN projects p ON p.id = c.project_id WHERE p.user_id = ? ORDER BY c.created_at DESC`),
  insertOauthState: db.prepare(
    'INSERT INTO kick_oauth_states (state, user_id, code_verifier, created_at, expires_at) VALUES (?, ?, ?, ?, ?)'
  ),
  getOauthState: db.prepare('SELECT * FROM kick_oauth_states WHERE state = ?'),
  deleteOauthState: db.prepare('DELETE FROM kick_oauth_states WHERE state = ?'),
  deleteExpiredOauthStates: db.prepare('DELETE FROM kick_oauth_states WHERE expires_at < ?'),
  getKickConnection: db.prepare('SELECT * FROM kick_connections WHERE user_id = ?'),
  upsertKickConnection: db.prepare(`INSERT INTO kick_connections
    (user_id, kick_user_id, username, access_token, refresh_token, token_type, scope, expires_at, created_at, updated_at)
    VALUES (@user_id, @kick_user_id, @username, @access_token, @refresh_token, @token_type, @scope, @expires_at, @created_at, @updated_at)
    ON CONFLICT(user_id) DO UPDATE SET
      kick_user_id=excluded.kick_user_id,
      username=excluded.username,
      access_token=excluded.access_token,
      refresh_token=excluded.refresh_token,
      token_type=excluded.token_type,
      scope=excluded.scope,
      expires_at=excluded.expires_at,
      updated_at=excluded.updated_at`),
  deleteKickConnection: db.prepare('DELETE FROM kick_connections WHERE user_id = ?'),
}

let jobTouchHook = null
export function setJobTouchHook(fn) {
  jobTouchHook = fn
}

export function touchJob(job, patch) {
  const next = {
    id: job.id,
    status: patch.status ?? job.status,
    progress: patch.progress ?? job.progress,
    current_step: patch.current_step ?? job.current_step,
    step_index: patch.step_index ?? job.step_index,
    message: patch.message ?? job.message,
    error_code: patch.error_code ?? job.error_code,
    error: patch.error ?? job.error,
    attempt: patch.attempt ?? job.attempt,
    cancel_requested: patch.cancel_requested ?? job.cancel_requested,
    pid: patch.pid ?? job.pid,
    updated_at: now(),
  }
  q.updateJob.run(next)
  q.insertEvent.run(job.id, next.status, next.progress, next.message, now())
  const merged = { ...job, ...next }
  if (jobTouchHook) {
    Promise.resolve(jobTouchHook(merged)).catch(() => {})
  }
  return merged
}

export function isCancelled(jobId) {
  const j = q.getJob.get(jobId)
  return !j || j.cancel_requested === 1 || j.status === 'CANCELLED'
}
