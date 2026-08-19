import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Unplug } from 'lucide-react'
import { api, ensureSession } from '../../lib/api'
import { Button } from '../ui/primitives'

const ERRORS = {
  DENIED: 'Kick authorization was denied.',
  INVALID_CALLBACK: 'The Kick callback was invalid or expired. Try connecting again.',
  TOKEN_EXPIRED: 'The Kick session expired. Connect Kick again.',
  REVOKED: 'Kick access was revoked.',
  KICK_NOT_CONFIGURED: 'Kick OAuth is not configured on the server.',
  KICK_OAUTH_ERROR: 'Kick returned an OAuth error.',
  KICK_API_ERROR: 'Kick API error while reading your profile.',
}

export default function KickConnect({ prominent = false }) {
  const [params, setParams] = useSearchParams()
  const [status, setStatus] = useState(null)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')

  const load = async () => {
    try {
      const s = await api.kickStatus()
      setStatus(s)
      if (s.error && ERRORS[s.error]) setMsg(ERRORS[s.error])
    } catch (e) {
      setStatus({ connected: false })
      setMsg(e.message || 'Could not read Kick status.')
    }
  }

  useEffect(() => {
    load()
    const err = params.get('kick_error')
    const ok = params.get('kick')
    if (err) {
      setMsg(ERRORS[err] || `Kick sign-in failed (${err}).`)
      params.delete('kick_error')
      setParams(params, { replace: true })
    } else if (ok === 'connected') {
      setMsg('')
      params.delete('kick')
      setParams(params, { replace: true })
    }
  }, [])

  const connect = async () => {
    setBusy(true)
    setMsg('')
    try {
      await ensureSession()
      window.location.href = '/api/auth/kick'
    } catch (e) {
      setBusy(false)
      setMsg(e.message || 'Could not start Kick sign-in.')
    }
  }

  const disconnect = async () => {
    setBusy(true)
    try {
      await api.kickDisconnect()
      setStatus({ connected: false })
      setMsg('')
    } catch (e) {
      setMsg(e.message || 'Could not disconnect Kick.')
    } finally {
      setBusy(false)
    }
  }

  if (status?.connected) {
    return (
      <div className={prominent ? 'rounded-3xl glass p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3' : 'flex items-center gap-2'}>
        <div>
          <div className="text-lime text-[12px] font-semibold tracking-wide">✓ KICK CONNECTED</div>
          <div className="text-sm text-zinc-300 mt-0.5">@{status.username || status.userId}</div>
        </div>
        <Button size="sm" variant="ghost" icon={Unplug} disabled={busy} onClick={disconnect}>
          Disconnect Kick
        </Button>
      </div>
    )
  }

  return (
    <div className={prominent ? 'rounded-3xl glass p-5' : ''}>
      <Button size={prominent ? 'lg' : 'md'} disabled={busy} onClick={connect}>
        {busy ? 'Redirecting…' : 'Connect Kick'}
      </Button>
      {msg && <p className="text-[12px] text-red-300 mt-2">{msg}</p>}
    </div>
  )
}
