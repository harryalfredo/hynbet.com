import { KickProvider } from './kick.js'
import { LocalSampleProvider } from './local.js'
import { AuthorizedHttpProvider } from './http.js'

export class SourceResolver {
  constructor() {
    this.providers = [new LocalSampleProvider(), new KickProvider(), new AuthorizedHttpProvider()]
  }

  parse(url) {
    for (const p of this.providers) {
      const parsed = p.parse(url)
      if (parsed) return { provider: p.id, ...parsed }
    }
    return null
  }

  pick(url) {
    for (const p of this.providers) {
      if (p.parse(url)) return p
    }
    return null
  }

  async resolve(url, ctx) {
    const p = this.pick(url)
    if (!p) {
      throw Object.assign(new Error("We couldn't recognize this source URL."), {
        code: 'INVALID_URL',
      })
    }
    return p.resolve(url, ctx)
  }
}

export const sources = new SourceResolver()
