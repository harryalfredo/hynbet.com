const KICK_RE =
  /^(https?:\/\/)?(www\.)?(kick\.com)\/([A-Za-z0-9_]+)(?:\/(videos?|clips?)\/([A-Za-z0-9_-]+))?\/?(\?.*)?$/i

export function parseKickUrl(raw) {
  const url = String(raw || '').trim()
  if (!url) return { ok: false, code: 'empty', message: 'Paste a Kick stream or VOD link to begin.' }
  if (!/kick\.com/i.test(url)) {
    return {
      ok: false,
      code: 'invalid',
      message: "We couldn't recognize this Kick URL. Please check the link and try again.",
    }
  }
  const clean = url.startsWith('http') ? url : `https://${url}`
  let parsed
  try {
    parsed = new URL(clean)
  } catch {
    return {
      ok: false,
      code: 'invalid',
      message: "We couldn't recognize this Kick URL. Please check the link and try again.",
    }
  }
  if (!/(^|\.)kick\.com$/i.test(parsed.hostname)) {
    return {
      ok: false,
      code: 'invalid',
      message: "We couldn't recognize this Kick URL. Please check the link and try again.",
    }
  }
  const parts = parsed.pathname.split('/').filter(Boolean)
  const reserved = new Set(['video', 'videos', 'clip', 'clips', 'category', 'categories', 'browse', 'search', 'login', 'signup'])
  const handle = parts[0]
  if (!handle || reserved.has(handle.toLowerCase()) || !/^[A-Za-z0-9_]+$/.test(handle)) {
    return {
      ok: false,
      code: 'invalid',
      message: "We couldn't recognize this Kick URL. Please check the link and try again.",
    }
  }
  const kind = /video/i.test(parts[1] || '') ? 'vod' : /clip/i.test(parts[1] || '') ? 'clip' : 'channel'
  return {
    ok: true,
    url: `https://kick.com/${handle}${parts[1] ? `/${parts[1]}` : ''}${parts[2] ? `/${parts[2]}` : ''}`,
    handle: handle.toLowerCase(),
    displayHandle: handle,
    kind,
    videoId: parts[2] || null,
  }
}

export function isLikelyPublic(handle) {
  const blocked = new Set(['admin', 'mod', 'internal', 'private'])
  return !blocked.has(handle.toLowerCase())
}
