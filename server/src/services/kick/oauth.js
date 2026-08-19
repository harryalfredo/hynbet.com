import crypto from 'node:crypto'
import { config } from '../../config.js'
import { logger } from '../../logger.js'

export const KICK_SCOPES = ['user:read', 'channel:read']

export function kickConfigured() {
  return Boolean(config.kick.clientId && config.kick.clientSecret && config.kick.redirectUri)
}

export function createPkce() {
  const verifier = crypto.randomBytes(32).toString('base64url')
  const challenge = crypto.createHash('sha256').update(verifier).digest('base64url')
  const state = crypto.randomBytes(24).toString('base64url')
  return { verifier, challenge, state }
}

export function authorizeUrl({ state, challenge }) {
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: config.kick.clientId,
    redirect_uri: config.kick.redirectUri,
    scope: KICK_SCOPES.join(' '),
    code_challenge: challenge,
    code_challenge_method: 'S256',
    state,
  })
  return `${config.kick.idBase}/oauth/authorize?${params.toString()}`
}

async function tokenRequest(body) {
  const res = await fetch(`${config.kick.idBase}/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
    body,
  })
  const text = await res.text()
  let data = {}
  try {
    data = text ? JSON.parse(text) : {}
  } catch {
    data = { error: text.slice(0, 200) }
  }
  if (!res.ok) {
    logger.warn('Kick token endpoint failed', { status: res.status, error: data.error || data.message })
    const err = new Error(data.error_description || data.error || data.message || `Kick token error ${res.status}`)
    err.code = 'KICK_OAUTH_ERROR'
    err.status = res.status
    throw err
  }
  if (!data.access_token) {
    const err = new Error('Kick token response missing access_token')
    err.code = 'KICK_OAUTH_ERROR'
    throw err
  }
  return data
}

export async function exchangeCode({ code, verifier }) {
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    client_id: config.kick.clientId,
    client_secret: config.kick.clientSecret,
    redirect_uri: config.kick.redirectUri,
    code_verifier: verifier,
    code,
  })
  return tokenRequest(body)
}

export async function refreshAccessToken(refreshToken) {
  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    client_id: config.kick.clientId,
    client_secret: config.kick.clientSecret,
    refresh_token: refreshToken,
  })
  return tokenRequest(body)
}

export async function revokeToken(token, hint = 'access_token') {
  if (!token) return
  const url = new URL(`${config.kick.idBase}/oauth/revoke`)
  url.searchParams.set('token', token)
  url.searchParams.set('token_hint_type', hint)
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  })
  if (!res.ok) {
    logger.warn('Kick revoke failed', { status: res.status, hint })
  }
}

export async function fetchKickUser(accessToken) {
  const res = await fetch(`${config.kick.apiBase}/public/v1/users`, {
    headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' },
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const err = new Error(data.message || `Kick users API ${res.status}`)
    err.code = res.status === 401 ? 'TOKEN_EXPIRED' : 'KICK_API_ERROR'
    err.status = res.status
    throw err
  }
  const user = Array.isArray(data.data) ? data.data[0] : data.data
  if (!user) {
    const err = new Error('Kick returned no user profile')
    err.code = 'KICK_API_ERROR'
    throw err
  }
  return {
    userId: String(user.user_id ?? user.id ?? ''),
    username: user.name || user.username || user.slug || '',
    profilePicture: user.profile_picture || null,
  }
}

export async function fetchOwnChannel(accessToken) {
  const res = await fetch(`${config.kick.apiBase}/public/v1/channels`, {
    headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' },
  })
  if (!res.ok) return null
  const data = await res.json().catch(() => ({}))
  const ch = Array.isArray(data.data) ? data.data[0] : data.data
  return ch || null
}

function encKey() {
  return crypto.createHash('sha256').update(`${config.sessionSecret}|kick-oauth-tokens`).digest()
}

export function encryptSecret(plain) {
  if (!plain) return ''
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv('aes-256-gcm', encKey(), iv)
  const enc = Buffer.concat([cipher.update(String(plain), 'utf8'), cipher.final()])
  return Buffer.concat([iv, cipher.getAuthTag(), enc]).toString('base64url')
}

export function decryptSecret(packed) {
  if (!packed) return ''
  const buf = Buffer.from(packed, 'base64url')
  const iv = buf.subarray(0, 12)
  const tag = buf.subarray(12, 28)
  const data = buf.subarray(28)
  const decipher = crypto.createDecipheriv('aes-256-gcm', encKey(), iv)
  decipher.setAuthTag(tag)
  return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8')
}
