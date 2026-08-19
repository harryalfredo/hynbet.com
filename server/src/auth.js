import crypto from 'node:crypto'
import { config } from './config.js'
import { now, q, uid } from './db.js'

export function ensureDevUser() {
  let user = q.getUserByEmail.get('studio@hynbet.local')
  if (!user) {
    const id = uid('usr')
    q.insertUser.run(id, 'studio@hynbet.local', now())
    user = q.getUser.get(id)
  }
  return user
}

export function createSession(userId) {
  const token = crypto.randomBytes(24).toString('hex')
  const created = new Date()
  const expires = new Date(created.getTime() + config.sessionTtlDays * 86400000)
  q.insertSession.run(token, userId, created.toISOString(), expires.toISOString())
  return { token, expiresAt: expires.toISOString() }
}

export function sessionCookie(token, req) {
  const secure = req?.secure || req?.headers?.['x-forwarded-proto'] === 'https' || config.env === 'production'
  const maxAge = config.sessionTtlDays * 86400
  return `hynbet_session=${token}; Path=/; SameSite=Lax; Max-Age=${maxAge}${secure ? '; Secure' : ''}`
}

export function userFromRequest(req) {
  const header = req.headers['x-session-token'] || ''
  const query = req.query?.token || ''
  const cookie = String(req.headers.cookie || '')
    .split(';')
    .map((s) => s.trim())
    .find((s) => s.startsWith('hynbet_session='))
  const token = header || query || (cookie ? cookie.split('=')[1] : '')
  if (!token) return null
  const session = q.getSession.get(token)
  if (!session) return null
  if (new Date(session.expires_at) < new Date()) return null
  return q.getUser.get(session.user_id)
}

export function requireUser(req, res, next) {
  const user = userFromRequest(req)
  if (!user) {
    res.status(401).json({ error: 'UNAUTHORIZED', message: 'Sign in required.' })
    return
  }
  req.user = user
  next()
}

export function ownProject(req, res, next) {
  const project = q.getProject.get(req.params.id || req.params.projectId)
  if (!project) {
    res.status(404).json({ error: 'NOT_FOUND', message: 'Project not found.' })
    return
  }
  if (project.user_id !== req.user.id) {
    res.status(403).json({ error: 'FORBIDDEN', message: 'Not your project.' })
    return
  }
  req.project = project
  next()
}

const hits = new Map()
export function rateLimit(req, res, next) {
  const key = req.user?.id || req.ip
  const nowMs = Date.now()
  const window = hits.get(key) || []
  const recent = window.filter((t) => nowMs - t < 60_000)
  if (recent.length > 40) {
    res.status(429).json({ error: 'RATE_LIMIT', message: 'Too many requests. Slow down.' })
    return
  }
  recent.push(nowMs)
  hits.set(key, recent)
  next()
}
