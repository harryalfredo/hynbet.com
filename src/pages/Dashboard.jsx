import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, FolderOpen } from 'lucide-react'
import { api } from '../lib/api'
import KickConnect from '../components/kick/KickConnect'
import { Button, Empty, StatusPill } from '../components/ui/primitives'
import { fmtRel } from '../lib/utils'

export default function Dashboard() {
  const nav = useNavigate()
  const [projects, setProjects] = useState([])
  const [err, setErr] = useState('')

  useEffect(() => {
    api
      .projects()
      .then((d) => setProjects(d.projects || []))
      .catch((e) => setErr(e.message))
  }, [])

  return (
    <div className="px-6 py-8 max-w-[1400px] mx-auto">
      <div className="flex items-end justify-between">
        <div>
          <div className="text-[11px] tracking-[0.2em] uppercase text-zinc-500">Workspace</div>
          <h1 className="text-3xl font-semibold mt-1">Recent projects</h1>
        </div>
        <Button icon={Plus} onClick={() => nav('/new')}>New clip</Button>
      </div>
      <div className="mt-6">
        <KickConnect prominent />
      </div>
      {err && <p className="mt-4 text-red-300">{err}</p>}
      {projects.length === 0 ? (
        <Empty
          title="No projects yet"
          body="Paste a Kick URL or run the development sample. Nothing here is hardcoded."
          action={<Button onClick={() => nav('/new')}>Add a stream</Button>}
        />
      ) : (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4 mt-8">
          {projects.map((p) => (
            <article key={p.id} className="rounded-3xl overflow-hidden hairline bg-ink-850">
              <div className="relative aspect-video bg-black">
                {p.thumbnailUrl && <img src={api.mediaUrl(p.thumbnailUrl)} alt="" className="w-full h-full object-cover" />}
                <div className="absolute top-3 left-3">
                  <StatusPill status={String(p.status).toLowerCase()} />
                </div>
              </div>
              <div className="p-4">
                <div className="text-[14px]">{p.title || p.sourceUrl}</div>
                <div className="mt-2 text-[11px] text-zinc-500">
                  {p.streamer || p.sourceKind} · {fmtRel(p.updatedAt)} · {p.duration ? `${Math.round(p.duration)}s` : '—'}
                </div>
                <Button
                  size="sm"
                  className="mt-4"
                  icon={FolderOpen}
                  onClick={() => {
                    if (p.status === 'COMPLETED') nav(`/project/${p.id}/results`)
                    else if (p.status === 'FAILED' || p.status === 'CANCELLED') nav(`/analyze/${p.id}`)
                    else nav(`/analyze/${p.id}`)
                  }}
                >
                  Open project
                </Button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  )
}
