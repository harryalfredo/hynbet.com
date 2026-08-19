import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Download, RefreshCw, Pencil } from 'lucide-react'
import { api } from '../lib/api'
import { Button, ScoreBadge, StatusPill } from '../components/ui/primitives'
import { fmtTime } from '../lib/utils'

export default function Results() {
  const { id } = useParams()
  const nav = useNavigate()
  const [project, setProject] = useState(null)
  const [moments, setMoments] = useState([])
  const [clips, setClips] = useState([])
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(null)

  const load = async () => {
    try {
      const [p, m, c] = await Promise.all([api.project(id), api.moments(id), api.clips(id)])
      setProject(p.project)
      setMoments(m.moments || [])
      setClips(c.clips || [])
    } catch (e) {
      setErr(e.message)
    }
  }

  useEffect(() => {
    load()
    const t = setInterval(load, 4000)
    return () => clearInterval(t)
  }, [id])

  if (err) return <div className="p-10 text-red-300">{err}</div>
  if (!project) return <div className="p-10 text-zinc-500">Loading project…</div>

  return (
    <div className="px-6 py-8 max-w-[1400px] mx-auto">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-[11px] tracking-[0.2em] uppercase text-zinc-500">
            {project.sourceKind === 'dev-sample' ? 'DEV SAMPLE · not from Kick' : project.streamer}
          </div>
          <h1 className="text-3xl font-semibold mt-1">{project.title || 'Processed project'}</h1>
          <p className="text-zinc-400 text-sm mt-1">
            {clips.length} rendered MP4s · {moments.length} ranked moments · {project.status}
          </p>
        </div>
        <Button variant="ghost" onClick={() => nav('/dashboard')}>Dashboard</Button>
      </div>

      <div className="mt-8 grid lg:grid-cols-2 gap-5">
        {clips.map((c) => (
          <article key={c.id} className="rounded-3xl hairline bg-ink-850 overflow-hidden">
            {c.streamUrl ? (
              <video
                className="w-full bg-black max-h-[540px] object-contain"
                controls
                playsInline
                poster={api.mediaUrl(c.thumbUrl)}
                src={api.mediaUrl(c.streamUrl)}
              />
            ) : (
              <div className="aspect-[9/16] max-h-[360px] grid place-items-center text-zinc-500">Waiting for render…</div>
            )}
            <div className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-[11px] text-zinc-500">{fmtTime(c.duration)} · {c.width}×{c.height}</div>
                  <h2 className="text-lg font-semibold leading-tight mt-1">{c.title}</h2>
                </div>
                <ScoreBadge score={moments.find((m) => m.id === c.momentId)?.viralScore || 0} />
              </div>
              <div className="mt-2">
                <StatusPill status={c.status.toLowerCase()} />
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {c.downloadUrl && (
                  <a href={api.mediaUrl(c.downloadUrl)}>
                    <Button size="sm" icon={Download}>Download</Button>
                  </a>
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  icon={RefreshCw}
                  disabled={busy === c.id}
                  onClick={async () => {
                    setBusy(c.id)
                    try {
                      await api.regenerate(c.id, {})
                    } finally {
                      setBusy(null)
                    }
                  }}
                >
                  Regenerate
                </Button>
                <Button size="sm" variant="ghost" icon={Pencil} onClick={() => nav(`/project/${id}/editor/${c.id}`)}>
                  Edit
                </Button>
              </div>
            </div>
          </article>
        ))}
      </div>

      <h2 className="text-xl font-semibold mt-12">Detected moments</h2>
      <div className="mt-4 space-y-3">
        {moments.map((m) => (
          <div key={m.id} className="rounded-2xl hairline bg-ink-850 p-4 grid md:grid-cols-[80px_1fr] gap-4">
            <ScoreBadge score={m.viralScore} size="lg" />
            <div>
              <div className="text-[11px] text-zinc-500">#{m.rank} · {fmtTime(m.start)} → {fmtTime(m.end)}</div>
              <div className="font-medium mt-1">{m.hook}</div>
              <p className="text-sm text-zinc-400 mt-1">{m.reason}</p>
              <div className="mt-2 flex flex-wrap gap-3 text-[11px] text-zinc-500">
                {Object.entries(m.scores || {}).map(([k, v]) => (
                  <span key={k}>{k} {v}</span>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
