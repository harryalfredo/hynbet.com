import { config } from '../../config.js'

const KICK_RE =
  /^(https?:\/\/)?(www\.)?kick\.com\/([A-Za-z0-9_]+)(?:\/(videos?|clips?)\/([A-Za-z0-9_-]+))?\/?(\?.*)?$/i

export class KickProvider {
  id = 'kick'
  token = null
  tokenExp = 0

  parse(url) {
    const raw = String(url || '').trim()
    if (!raw) return null
    const clean = raw.startsWith('http') ? raw : `https://${raw}`
    let u
    try {
      u = new URL(clean)
    } catch {
      return null
    }
    if (!/(^|\.)kick\.com$/i.test(u.hostname)) return null
    const m = clean.match(KICK_RE)
    if (!m) return { invalid: true }
    const reserved = new Set(['video', 'videos', 'clip', 'clips', 'category', 'browse', 'search', 'login'])
    if (reserved.has(m[3].toLowerCase())) return { invalid: true }
    return {
      kind: m[4] && /clip/i.test(m[4]) ? 'clip' : m[4] ? 'vod' : 'channel',
      handle: m[3].toLowerCase(),
      videoId: m[5] || null,
      url: `https://kick.com/${m[3]}${m[4] ? `/${m[4]}` : ''}${m[5] ? `/${m[5]}` : ''}`,
    }
  }

  async appToken() {
    if (!config.kick.clientId || !config.kick.clientSecret) return null
    if (this.token && Date.now() < this.tokenExp - 30_000) return this.token
    const body = new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: config.kick.clientId,
      client_secret: config.kick.clientSecret,
    })
    const res = await fetch(`${config.kick.idBase}/oauth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    })
    if (!res.ok) {
      throw Object.assign(new Error('Kick OAuth client-credentials failed'), {
        code: 'SOURCE_ACCESS_ERROR',
      })
    }
    const data = await res.json()
    this.token = data.access_token
    this.tokenExp = Date.now() + Number(data.expires_in || 3600) * 1000
    return this.token
  }

  async officialChannel(slug) {
    const token = await this.appToken()
    if (!token) return null
    const url = `${config.kick.apiBase}/public/v1/channels?slug=${encodeURIComponent(slug)}`
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
    if (!res.ok) return null
    const json = await res.json()
    const ch = Array.isArray(json.data) ? json.data[0] : json.data
    return ch || null
  }

  async resolve(url) {
    const parsed = this.parse(url)
    if (!parsed || parsed.invalid) {
      throw Object.assign(new Error("We couldn't recognize this Kick URL. Please check the link and try again."), {
        code: 'INVALID_URL',
      })
    }

    let channel = null
    if (config.kick.clientId && config.kick.clientSecret) {
      try {
        channel = await this.officialChannel(parsed.handle)
      } catch (e) {
        throw Object.assign(new Error(e.message || 'Kick API error'), { code: 'SOURCE_ACCESS_ERROR' })
      }
    }

    const authorizedMedia =
      config.kick.authorizedMediaUrl ||
      (channel?.stream?.url && channel?.stream?.is_live ? null : null)

    if (!authorizedMedia) {
      const missingCreds = !config.kick.clientId || !config.kick.clientSecret
      const msg = missingCreds
        ? 'Kick credentials are not configured (KICK_CLIENT_ID / KICK_CLIENT_SECRET). The official Kick Public API can return channel metadata but does not provide VOD media bytes. Provide authorized media (upload or DEV sample) or configure Kick OAuth plus an authorized media source.'
        : `Kick channel ${parsed.handle} was ${channel ? 'resolved via the official API' : 'not returned by the official API'}, but Kick Public API does not expose downloadable VOD media. This stream cannot currently be imported. Use an authorized export/upload, or the development sample.`
      const err = Object.assign(new Error(msg), { code: 'SOURCE_ACCESS_ERROR' })
      err.meta = {
        handle: parsed.handle,
        kind: parsed.kind,
        kickConfigured: !missingCreds,
        channel: channel
          ? {
              slug: channel.slug,
              title: channel.stream_title,
              live: channel.stream?.is_live || false,
              thumbnail: channel.stream?.thumbnail || channel.banner_picture || null,
            }
          : null,
      }
      throw err
    }

    return {
      provider: this.id,
      kind: parsed.kind,
      streamer: parsed.handle,
      title: channel?.stream_title || `${parsed.handle} on Kick`,
      thumbnail: channel?.stream?.thumbnail || null,
      duration: null,
      mediaUrl: authorizedMedia,
      official: Boolean(channel),
    }
  }
}
