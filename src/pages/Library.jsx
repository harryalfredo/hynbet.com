import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Download } from 'lucide-react'
import { api } from '../lib/api'
import { Button, Empty, StatusPill } from '../components/ui/primitives'
import { fmtTime } from '../lib/utils'

export default function Library() {
  const nav = useNavigate()
  const [clips, setClips] = useState([])
  const [q, setQ] = useState('')

  useEffect(() => {
    api.allClips().then((d) => setClips(d.clips || [])).catch(() => setClips([]))
  }, [])

  const rows = clips.filter((c) => {
    const s = q.toLowerCase()
    return !s || (c.title || '').toLowerCase().includes(s) || (c.streamer || '').toLowerCase().includes(s)
  })

  return (
    <div className="px-6 py-8 max-w-[1400px] mx-auto">
      <h1 className="text-3xl font-semibold">Clip library</h1>
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search clips..."
        className="mt-5 w-full max-w-md h-11 rounded-xl bg-ink-850 hairline px-3 text-sm"
      />
      {rows.length === 0 ? (
        <Empty title="No rendered clips" body="Run a job first. Library only lists verified MP4s." action={<Button onClick={() => nav('/new')}>New clip</Button>} />
      ) : (
        <div className="mt-6 grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {rows.map((c) => (
            <article key={c.id} className="rounded-3xl hairline bg-ink-850 overflow-hidden">
              {c.thumbUrl && <img src={api.mediaUrl(c.thumbUrl)} alt="" className="w-full aspect-video object-cover" />}
              <div className="p-4">
                <StatusPill status={String(c.status).toLowerCase()} />
                <div className="font-medium mt-2">{c.title}</div>
                <div className="text-[11px] text-zinc-500 mt-1">{c.streamer} · {fmtTime(c.duration)}</div>
                <div className="mt-3 flex gap-2">
                  <Button size="sm" onClick={() => nav(`/project/${c.projectId}/results`)}>Open</Button>
                  {c.downloadUrl && (
                    <a href={api.mediaUrl(c.downloadUrl)}>
                      <Button size="sm" variant="ghost" icon={Download}>Download</Button>
                    </a>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  )
}
