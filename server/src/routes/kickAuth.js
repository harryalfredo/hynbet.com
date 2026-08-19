import { Router } from 'express'
import { createSession, ensureDevUser, requireUser, sessionCookie, userFromRequest } from '../auth.js'
import { config } from '../config.js'
import { now, q } from '../db.js'
import { logger } from '../logger.js'
import {
  authorizeUrl,
  createPkce,
  decryptSecret,
  encryptSecret,
  exchangeCode,
  fetchKickUser,
  kickConfigured,
  refreshAccessToken,
  revokeToken,
} from '../services/kick/oauth.js'

export const kickAuth = Router()

function appOrigin() {
  if (process.env.PUBLIC_APP_URL) return process.env.PUBLIC_APP_URL.replace(/\/$/, '')
  return config.kick.redirectUri.replace(/\/api\/auth\/kick\/callback\/?$/, '') || 'https://hynbetcom-production-56c5.up.railway.app'
}

function dashboardRedirect(res, params = {}) {
  const url = new URL('/dashboard', appOrigin())
  Object.entries(params).forEach(([k, v]) => {
    if (v != null && v !== '') url.searchParams.set(k, String(v))
  })
  res.redirect(302, `${url.pathname}${url.search}`)
}

function persistTokens(userId, tokens, profile) {
  const expiresAt = tokens.expires_in
    ? new Date(Date.now() + Number(tokens.expires_in) * 1000).toISOString()
    : null
  q.upsertKickConnection.run({
    user_id: userId,
    kick_user_id: profile.userId || null,
    username: profile.username || null,
    access_token: encryptSecret(tokens.access_token),
    refresh_token: tokens.refresh_token ? encryptSecret(tokens.refresh_token) : null,
    token_type: tokens.token_type || 'Bearer',
    scope: tokens.scope || '',
    expires_at: expiresAt,
    created_at: now(),
    updated_at: now(),
  })
}

async function validAccessToken(userId) {
  const row = q.getKickConnection.get(userId)
  if (!row) return { row: null, access: null }
  let access = decryptSecret(row.access_token)
  const refresh = row.refresh_token ? decryptSecret(row.refresh_token) : ''
  const exp = row.expires_at ? new Date(row.expires_at).getTime() : 0
  if (exp && Date.now() > exp - 30_000) {
    if (!refresh) return { row, access: null, expired: true }
    try {
      const tokens = await refreshAccessToken(refresh)
      const profile = { userId: row.kick_user_id, username: row.username }
      persistTokens(userId, tokens, profile)
      access = tokens.access_token
    } catch {
      return { row, access: null, expired: true }
    }
  }
  return { row, access }
}

kickAuth.get('/auth/kick', (req, res) => {
  if (!kickConfigured()) {
    if (req.headers.accept?.includes('application/json')) {
      res.status(503).json({
        error: 'KICK_NOT_CONFIGURED',
        message: 'Kick OAuth is not configured. Set KICK_CLIENT_ID, KICK_CLIENT_SECRET, and KICK_REDIRECT_URI.',
      })
      return
    }
    dashboardRedirect(res, { kick_error: 'KICK_NOT_CONFIGURED' })
    return
  }

  let user = userFromRequest(req)
  if (!user) {
    user = ensureDevUser()
    const session = createSession(user.id)
    res.setHeader('Set-Cookie', sessionCookie(session.token, req))
  }

  q.deleteExpiredOauthStates.run(now())
  const pkce = createPkce()
  const expires = new Date(Date.now() + 10 * 60 * 1000).toISOString()
  q.insertOauthState.run(pkce.state, user.id, pkce.verifier, now(), expires)
  logger.info('Kick OAuth start', { userId: user.id })
  res.redirect(302, authorizeUrl({ state: pkce.state, challenge: pkce.challenge }))
})

kickAuth.get('/auth/kick/callback', async (req, res) => {
  const { code, state, error, error_description: errorDescription } = req.query

  if (error) {
    logger.warn('Kick OAuth denied', { error })
    dashboardRedirect(res, { kick_error: error === 'access_denied' ? 'DENIED' : 'KICK_OAUTH_ERROR' })
    return
  }
  if (!code || !state) {
    dashboardRedirect(res, { kick_error: 'INVALID_CALLBACK' })
    return
  }

  q.deleteExpiredOauthStates.run(now())
  const pending = q.getOauthState.get(String(state))
  if (!pending) {
    dashboardRedirect(res, { kick_error: 'INVALID_CALLBACK' })
    return
  }
  q.deleteOauthState.run(String(state))

  try {
    const tokens = await exchangeCode({ code: String(code), verifier: pending.code_verifier })
    const profile = await fetchKickUser(tokens.access_token)
    persistTokens(pending.user_id, tokens, profile)
    logger.info('Kick OAuth connected', { userId: pending.user_id, kickUserId: profile.userId })
    dashboardRedirect(res, { kick: 'connected' })
  } catch (e) {
    logger.warn('Kick OAuth callback failed', { error: e.message, code: e.code })
    dashboardRedirect(res, { kick_error: e.code || 'KICK_OAUTH_ERROR' })
  }
})

kickAuth.get('/auth/kick/status', requireUser, async (req, res) => {
  try {
    const { row, access, expired } = await validAccessToken(req.user.id)
    if (!row) {
      res.json({ connected: false })
      return
    }
    if (!access) {
      res.json({ connected: false, error: expired ? 'TOKEN_EXPIRED' : 'REVOKED' })
      return
    }
    try {
      const profile = await fetchKickUser(access)
      if (profile.username && profile.username !== row.username) {
        q.upsertKickConnection.run({
          ...row,
          username: profile.username,
          kick_user_id: profile.userId,
          updated_at: now(),
        })
      }
      res.json({
        connected: true,
        username: profile.username,
        userId: profile.userId,
      })
    } catch (e) {
      if (e.code === 'TOKEN_EXPIRED') {
        res.json({ connected: false, error: 'TOKEN_EXPIRED' })
        return
      }
      res.json({
        connected: true,
        username: row.username || '',
        userId: row.kick_user_id || '',
      })
    }
  } catch (e) {
    res.status(502).json({ error: 'KICK_API_ERROR', message: e.message, connected: false })
  }
})

kickAuth.post('/auth/kick/disconnect', requireUser, async (req, res) => {
  const row = q.getKickConnection.get(req.user.id)
  if (row) {
    try {
      const access = decryptSecret(row.access_token)
      const refresh = row.refresh_token ? decryptSecret(row.refresh_token) : ''
      await revokeToken(access, 'access_token')
      if (refresh) await revokeToken(refresh, 'refresh_token')
    } catch (e) {
      logger.warn('Kick disconnect revoke error', { error: e.message })
    }
    q.deleteKickConnection.run(req.user.id)
  }
  res.json({ connected: false })
})
