import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowRight, ShieldCheck, Link2, FlaskConical, Upload } from 'lucide-react'
import KickConnect from '../components/kick/KickConnect'
import { Button } from '../components/ui/primitives'
import { api } from '../lib/api'
import { useAppStore } from '../store/useAppStore'

export default function Landing() {
  const nav = useNavigate()
  const toast = useAppStore((s) => s.toast)
  const health = useAppStore((s) => s.health)
  const loadHealth = useAppStore((s) => s.loadHealth)
  const [url, setUrl] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    loadHealth()
  }, [loadHealth])

  const submit = async (sourceUrl) => {
    setBusy(true)
    setErr('')
    try {
      const res = await api.createProject({ sourceUrl, clipCount: 3, clipLength: 'auto', styleId: 'viral' })
      nav(`/analyze/${res.projectId}?job=${res.jobId}`)
    } catch (e) {
      setErr(e.message)
      toast({ title: e.code || 'Error', body: e.message })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="min-h-screen bg-ink-950 text-zinc-100 overflow-x-hidden">
      <div className="pointer-events-none fixed inset-0 bg-grid bg-[size:64px_64px] opacity-50" />
      <div className="pointer-events-none fixed top-[-20%] left-[20%] h-[640px] w-[640px] rounded-full bg-lime/12 blur-[160px]" />

      <header className="relative z-20 flex items-center justify-between px-6 md:px-10 h-20">
        <div className="flex items-center gap-3">
          <img src="/brand/logo-mark.png" alt="HYNBET" className="h-10 w-10 rounded-2xl" />
          <div>
            <div className="text-[13px] font-semibold tracking-[0.22em]">HYNBET</div>
            <div className="text-[10px] text-zinc-500 tracking-[0.2em]">AI CLIP STUDIO</div>
          </div>
        </div>
          <div className="flex items-center gap-3">
          <KickConnect />
          <button onClick={() => nav('/dashboard')} className="text-[13px] text-zinc-400 hover:text-white">
            Open studio
          </button>
          <Button onClick={() => document.getElementById('paste')?.focus()}>
            Create clips <ArrowRight size={16} />
          </Button>
        </div>
      </header>

      <section className="relative z-10 max-w-4xl mx-auto px-6 pt-10 pb-20">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <div className="inline-flex items-center gap-2 rounded-full hairline bg-white/[0.03] px-3 py-1 text-[11px] tracking-[0.18em] uppercase text-zinc-400 mb-6">
            <span className="h-1.5 w-1.5 rounded-full bg-lime animate-pulse" />
            Real FFmpeg pipeline · no mock clips
          </div>
          <h1 className="text-[44px] md:text-[68px] leading-[0.92] font-semibold tracking-tight">
            TURN KICK STREAMS
            <br />
            <span className="text-lime">INTO VIRAL CLIPS</span>
          </h1>
          <p className="mt-6 text-[17px] text-zinc-400 max-w-2xl leading-relaxed">
            Paste a supported Kick URL. The API creates a job, the worker probes, transcribes, ranks moments,
            and renders real 1080×1920 MP4s with FFmpeg.
          </p>
        </motion.div>

        <div className="mt-10 rounded-3xl glass p-5 md:p-7">
          <div className="text-[11px] uppercase tracking-[0.2em] text-zinc-500 mb-3">Paste Kick stream / VOD URL</div>
          <div className={`flex flex-col sm:flex-row gap-2 p-2 rounded-2xl bg-ink-900 hairline ${err ? 'ring-1 ring-red-400/40' : ''}`}>
            <div className="hidden sm:grid h-11 w-11 place-items-center text-zinc-500">
              <Link2 size={16} />
            </div>
            <input
              id="paste"
              value={url}
              onChange={(e) => {
                setUrl(e.target.value)
                setErr('')
              }}
              onKeyDown={(e) => e.key === 'Enter' && !busy && submit(url)}
              placeholder="https://kick.com/..."
              className="flex-1 bg-transparent outline-none text-[15px] placeholder:text-zinc-600"
            />
            <Button onClick={() => submit(url)} disabled={busy || !url}>
              {busy ? 'Queuing…' : 'Analyze & create clips'}
            </Button>
          </div>
          {err && <p className="mt-3 text-sm text-red-300">{err}</p>}
          <p className="mt-4 text-[12px] text-zinc-600 flex gap-2">
            <ShieldCheck size={14} className="shrink-0 mt-0.5" />
            Official Kick Public API is used for channel metadata when credentials are set. Kick does not
            expose VOD media bytes. Without an authorized media source the job fails honestly — it will not invent clips.
          </p>

          <div className="mt-6">
            <KickConnect prominent />
          </div>

          <div className="mt-6 flex flex-wrap gap-2">
            <Button
              variant="limeGhost"
              icon={FlaskConical}
              disabled={busy}
              onClick={() => submit('dev://sample')}
            >
              Run development sample
            </Button>
            <label className="inline-flex">
              <input
                type="file"
                accept="video/mp4,video/*"
                className="hidden"
                onChange={async (e) => {
                  const f = e.target.files?.[0]
                  if (!f) return
                  setBusy(true)
                  try {
                    const res = await api.upload(f, { clipCount: 3, clipLength: 'auto' })
                    nav(`/analyze/${res.projectId}?job=${res.jobId}`)
                  } catch (er) {
                    setErr(er.message)
                  } finally {
                    setBusy(false)
                  }
                }}
              />
              <span className="inline-flex">
                <Button variant="ghost" icon={Upload} disabled={busy} type="button">
                  Upload authorized MP4
                </Button>
              </span>
            </label>
          </div>
        </div>

        {health && (
          <div className="mt-8 grid sm:grid-cols-5 gap-2 text-[11px]">
            {['database', 'redis', 'ffmpeg', 'storage', 'ai'].map((k) => (
              <div key={k} className="rounded-xl hairline bg-ink-850 px-3 py-2">
                <div className="uppercase tracking-wider text-zinc-500">{k}</div>
                <div className={health[k] === 'ok' || health[k] === 'local' ? 'text-lime' : 'text-amber-300'}>
                  {health[k]}
                </div>
              </div>
            ))}
          </div>
        )}
        {health?.kick === 'missing' && (
          <p className="mt-3 text-[12px] text-zinc-500">
            Kick OAuth unset (KICK_CLIENT_ID / KICK_CLIENT_SECRET). Channel metadata calls are skipped until configured.
          </p>
        )}
      </section>
    </div>
  )
}
