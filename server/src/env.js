import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const workspaceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')

/** Values that must never live in the Arena workspace snapshot. */
export const SECRET_ENV_NAMES = Object.freeze([
  'KICK_CLIENT_SECRET',
  'AI_API_KEY',
  'STORAGE_SECRET_KEY',
  'STORAGE_ACCESS_KEY',
  'SESSION_SECRET',
])

const SECRET_SET = new Set(SECRET_ENV_NAMES)

function parseEnvText(text) {
  const out = {}
  for (const line of String(text).split('\n')) {
    const t = line.trim()
    if (!t || t.startsWith('#') || !t.includes('=')) continue
    const i = t.indexOf('=')
    const k = t.slice(0, i).trim()
    let v = t.slice(i + 1).trim()
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1)
    }
    if (k) out[k] = v
  }
  return out
}

function applyEnv(map, { allowSecrets, overwrite = false }) {
  for (const [k, v] of Object.entries(map)) {
    if (!allowSecrets && SECRET_SET.has(k)) continue
    if (!overwrite && process.env[k] !== undefined) continue
    process.env[k] = v
  }
}

function loadFile(filePath, opts) {
  if (!filePath || !fs.existsSync(filePath)) return false
  applyEnv(parseEnvText(fs.readFileSync(filePath, 'utf8')), opts)
  return true
}

function isOutsideWorkspace(filePath) {
  const resolved = path.resolve(filePath)
  const root = workspaceRoot.endsWith(path.sep) ? workspaceRoot : workspaceRoot + path.sep
  return !resolved.startsWith(root) && resolved !== workspaceRoot
}

/** Workspace .env: non-secrets only. Real secrets only from process env or an external file. */
export function loadServerEnv() {
  loadFile(path.join(workspaceRoot, '.env'), { allowSecrets: false, overwrite: false })

  const external = process.env.HYNBET_SECRETS_FILE
  if (external) {
    if (!isOutsideWorkspace(external)) {
      throw new Error(
        'HYNBET_SECRETS_FILE must be outside the workspace (not under /home/user). Arena snapshots this directory.'
      )
    }
    loadFile(external, { allowSecrets: true, overwrite: false })
  }
}

export function envString(name, fallback = '') {
  const v = process.env[name]
  return v == null || v === '' ? fallback : v
}

export function envFlag(name) {
  return Boolean(process.env[name] && String(process.env[name]).trim())
}

export function secretSource(name) {
  if (!envFlag(name)) return 'unset'
  if (process.env.HYNBET_SECRETS_FILE) return 'external-file-or-process-env'
  return 'process-env'
}

export function publicKickStatus() {
  return {
    kickClientIdConfigured: envFlag('KICK_CLIENT_ID'),
    kickClientSecretConfigured: envFlag('KICK_CLIENT_SECRET'),
    kickRedirectUriConfigured: envFlag('KICK_REDIRECT_URI'),
    secretSource: secretSource('KICK_CLIENT_SECRET'),
  }
}
