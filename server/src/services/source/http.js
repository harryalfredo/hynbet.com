import fs from 'node:fs'
import { pipeline } from 'node:stream/promises'
import { createWriteStream } from 'node:fs'

const ALLOWED = new Set(['http:', 'https:'])

export class AuthorizedHttpProvider {
  id = 'authorized-http'

  parse(url) {
    const u = String(url || '').trim()
    if (!/^https?:\/\//i.test(u)) return null
    if (/kick\.com/i.test(u)) return null
    try {
      const parsed = new URL(u)
      if (!ALLOWED.has(parsed.protocol)) return null
      return { kind: 'authorized-http', url: parsed.toString() }
    } catch {
      return null
    }
  }

  async resolve(url) {
    const parsed = this.parse(url)
    if (!parsed) throw Object.assign(new Error('Invalid media URL'), { code: 'INVALID_URL' })
    const head = await fetch(parsed.url, { method: 'HEAD' }).catch(() => null)
    const type = head?.headers.get('content-type') || ''
    if (head && head.ok && type && !/video|octet-stream|mpegurl/i.test(type)) {
      throw Object.assign(new Error('URL is not a media file.'), { code: 'SOURCE_ACCESS_ERROR' })
    }
    return {
      provider: this.id,
      kind: 'authorized-http',
      streamer: 'upload',
      title: parsed.url.split('/').pop() || 'authorized media',
      thumbnail: null,
      duration: null,
      mediaUrl: parsed.url,
      note: 'Direct authorized media URL provided by the user.',
    }
  }

  async download(mediaUrl, dest, onProgress) {
    const res = await fetch(mediaUrl)
    if (!res.ok) {
      throw Object.assign(new Error(`Media download failed (${res.status})`), {
        code: 'MEDIA_DOWNLOAD_ERROR',
      })
    }
    const total = Number(res.headers.get('content-length') || 0)
    let received = 0
    const nodeStream = res.body
    if (!nodeStream) throw Object.assign(new Error('Empty media body'), { code: 'MEDIA_DOWNLOAD_ERROR' })
    const file = createWriteStream(dest)
    const reader = nodeStream.getReader()
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      received += value.byteLength
      file.write(Buffer.from(value))
      if (total && onProgress) onProgress(received / total)
    }
    await new Promise((r, j) => file.end((e) => (e ? j(e) : r())))
    if (!fs.existsSync(dest) || fs.statSync(dest).size < 1000) {
      throw Object.assign(new Error('Downloaded media is empty'), { code: 'MEDIA_DOWNLOAD_ERROR' })
    }
  }
}
