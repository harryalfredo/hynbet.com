import fs from 'node:fs'
import path from 'node:path'
import { config } from '../../config.js'

const DEV_URLS = new Set(['dev://sample', 'local://sample', 'hynbet://dev-sample'])

export class LocalSampleProvider {
  id = 'local-sample'

  parse(url) {
    const u = String(url || '').trim()
    if (DEV_URLS.has(u)) return { kind: 'dev-sample', url: u }
    if (u.startsWith('file://') && config.devMode) {
      return { kind: 'local-file', url: u, file: u.replace('file://', '') }
    }
    return null
  }

  async resolve(url) {
    if (!config.allowLocalSample && !config.devMode) {
      throw Object.assign(new Error('Local sample ingestion is disabled.'), {
        code: 'SOURCE_ACCESS_ERROR',
      })
    }
    const parsed = this.parse(url)
    if (parsed.kind === 'local-file') {
      const file = path.resolve(parsed.file)
      if (!file.startsWith(config.dataDir) && !config.devMode) {
        throw Object.assign(new Error('Local file path is not allowed.'), { code: 'SOURCE_ACCESS_ERROR' })
      }
      if (!fs.existsSync(file)) {
        throw Object.assign(new Error('Local media file not found.'), { code: 'MEDIA_DOWNLOAD_ERROR' })
      }
      return {
        provider: this.id,
        kind: 'local-file',
        streamer: 'local',
        title: path.basename(file),
        thumbnail: null,
        duration: null,
        mediaPath: file,
        note: 'Development local file. Not a Kick source.',
      }
    }
    const file = config.devSamplePath
    if (!fs.existsSync(file)) {
      throw Object.assign(new Error('Dev sample is missing. Run: node server/scripts/make-dev-sample.js'), {
        code: 'MEDIA_DOWNLOAD_ERROR',
      })
    }
    return {
      provider: this.id,
      kind: 'dev-sample',
      streamer: 'hynbet-dev',
      title: 'DEV SAMPLE — local conversation (not from Kick)',
      thumbnail: null,
      duration: null,
      mediaPath: file,
      note: 'Development/testing sample generated on this machine. Not a Kick VOD.',
    }
  }
}
