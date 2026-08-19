import { useEffect, useState } from 'react'
import { api } from '../lib/api'

export default function Settings() {
  const [h, setH] = useState(null)
  useEffect(() => {
    api.health().then(setH)
  }, [])
  if (!h) return <div className="p-10 text-zinc-500">Checking services…</div>
  return (
    <div className="px-6 py-8 max-w-3xl mx-auto">
      <h1 className="text-3xl font-semibold">System status</h1>
      <p className="text-zinc-400 text-sm mt-1">Live health from `/api/health`. Missing services are listed — nothing is faked.</p>
      <div className="mt-6 rounded-3xl hairline bg-ink-850 divide-y divide-white/5">
        {Object.entries(h).filter(([k]) => typeof h[k] !== 'object').map(([k, v]) => (
          <div key={k} className="flex justify-between px-5 py-3 text-sm">
            <span className="text-zinc-400">{k}</span>
            <span className="font-mono">{String(v)}</span>
          </div>
        ))}
      </div>
      {h.notes && (
        <div className="mt-6 space-y-3 text-sm text-zinc-400">
          <p>{h.notes.kick}</p>
          <p>{h.notes.ai}</p>
        </div>
      )}
      <pre className="mt-6 text-[12px] text-zinc-500 whitespace-pre-wrap rounded-2xl hairline p-4">
{`Kick OAuth (values never returned):
  KICK_CLIENT_ID configured       ${h.kickClientIdConfigured ? 'yes' : 'no'}
  KICK_CLIENT_SECRET configured   ${h.kickClientSecretConfigured ? 'yes' : 'no'}
  KICK_REDIRECT_URI configured    ${h.kickRedirectUriConfigured ? 'yes' : 'no'}

Connecting Kick does not unlock VOD file download.`}
      </pre>
    </div>
  )
}
