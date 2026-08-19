const TOKEN_KEY = 'hynbet_session'

export function getToken() {
  return localStorage.getItem(TOKEN_KEY) || ''
}

export async function ensureSession() {
  if (getToken()) return getToken()
  const res = await fetch('/api/auth/session', { method: 'POST' })
  if (!res.ok) throw new Error('Could not start a studio session')
  const data = await res.json()
  localStorage.setItem(TOKEN_KEY, data.token)
  return data.token
}

async function req(path, opts = {}) {
  await ensureSession()
  const headers = { ...(opts.headers || {}), 'X-Session-Token': getToken() }
  if (opts.body && !(opts.body instanceof FormData) && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json'
  }
  const res = await fetch(path, { ...opts, headers })
  const text = await res.text()
  let data = null
  try {
    data = text ? JSON.parse(text) : null
  } catch {
    data = { message: text }
  }
  if (!res.ok) {
    const err = new Error(data?.message || res.statusText)
    err.code = data?.error || 'FAILED'
    err.status = res.status
    err.payload = data
    throw err
  }
  return data
}

export const api = {
  health: () => fetch('/api/health').then((r) => r.json()),
  createProject: (body) => req('/api/projects', { method: 'POST', body: JSON.stringify(body) }),
  upload: async (file, extra = {}) => {
    const fd = new FormData()
    fd.append('file', file)
    Object.entries(extra).forEach(([k, v]) => fd.append(k, v))
    return req('/api/projects/upload', { method: 'POST', body: fd })
  },
  projects: () => req('/api/projects'),
  project: (id) => req(`/api/projects/${id}`),
  status: (id) => req(`/api/projects/${id}/status`),
  moments: (id) => req(`/api/projects/${id}/moments`),
  clips: (id) => req(`/api/projects/${id}/clips`),
  allClips: () => req('/api/clips'),
  transcript: (id) => req(`/api/projects/${id}/transcript`),
  job: (id) => req(`/api/jobs/${id}`),
  cancel: (id) => req(`/api/jobs/${id}/cancel`, { method: 'POST' }),
  regenerate: (id, body) => req(`/api/clips/${id}/regenerate`, { method: 'POST', body: JSON.stringify(body || {}) }),
  clip: (id) => req(`/api/clips/${id}`),
  reprocess: (id, body) => req(`/api/projects/${id}/process`, { method: 'POST', body: JSON.stringify(body || {}) }),
  kickStatus: () => req('/api/auth/kick/status'),
  kickDisconnect: () => req('/api/auth/kick/disconnect', { method: 'POST' }),
  mediaUrl: (path) => {
    if (!path) return ''
    const join = path.includes('?') ? '&' : '?'
    return `${path}${join}token=${encodeURIComponent(getToken())}`
  },
}

export function subscribeJob(jobId, onEvent) {
  const url = `/api/jobs/${jobId}/events?token=${encodeURIComponent(getToken())}`
  const es = new EventSource(url)
  es.onmessage = (ev) => {
    try {
      onEvent(JSON.parse(ev.data))
    } catch {
      /* ignore */
    }
  }
  es.onerror = () => {
    /* browser retries; caller also polls */
  }
  return () => es.close()
}
