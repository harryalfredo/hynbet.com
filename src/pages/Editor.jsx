import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Download, RefreshCw } from 'lucide-react'
import { api } from '../lib/api'
import { Button, Field, Textarea } from '../components/ui/primitives'

export default function Editor() {
  const { id, clipId } = useParams()
  const nav = useNavigate()
  const [data, setData] = useState(null)
  const [title, setTitle] = useState('')
  const [template, setTemplate] = useState('viral')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  const load = async () => {
    const d = await api.clip(clipId)
    setData(d)
    setTitle(d.clip.title || '')
    setTemplate(d.clip.template || 'viral')
  }

  useEffect(() => {
    load().catch((e) => setErr(e.message))
  }, [clipId])

  if (err) return <div className="p-10 text-red-300">{err}</div>
  if (!data) return <div className="p-10 text-zinc-500">Loading clip…</div>
  const c = data.clip

  return (
    <div className="px-6 py-8 max-w-6xl mx-auto grid lg:grid-cols-[1fr_320px] gap-8">
      <div>
        {c.streamUrl ? (
          <video className="w-full max-h-[80vh] bg-black rounded-3xl" controls playsInline src={api.mediaUrl(c.streamUrl)} poster={api.mediaUrl(c.thumbUrl)} />
        ) : (
          <div className="aspect-[9/16] max-h-[70vh] grid place-items-center hairline rounded-3xl">Render not complete</div>
        )}
      </div>
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold">Edit / regenerate</h1>
        <p className="text-sm text-zinc-500">Reuses the stored moment and transcript. Does not re-download the stream.</p>
        <Field label="Headline">
          <Textarea value={title} onChange={(e) => setTitle(e.target.value)} />
        </Field>
        <Field label="Template">
          <select className="w-full h-10 rounded-xl bg-ink-900 hairline px-3" value={template} onChange={(e) => setTemplate(e.target.value)}>
            {['viral', 'clean', 'news', 'meme', 'gaming', 'podcast', 'cinematic'].map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </Field>
        <div className="flex flex-col gap-2">
          {c.titles?.map((t) => (
            <button key={t} onClick={() => setTitle(t)} className="text-left rounded-xl hairline px-3 py-2 text-sm hover:bg-white/5">
              {t}
            </button>
          ))}
        </div>
        <Button
          icon={RefreshCw}
          disabled={busy}
          onClick={async () => {
            setBusy(true)
            try {
              await api.regenerate(c.id, { title, template })
              setTimeout(load, 2500)
            } catch (e) {
              setErr(e.message)
            } finally {
              setBusy(false)
            }
          }}
        >
          {busy ? 'Queuing render…' : 'Regenerate this moment'}
        </Button>
        {c.downloadUrl && (
          <a href={api.mediaUrl(c.downloadUrl)}>
            <Button variant="ghost" icon={Download} className="w-full">Download MP4</Button>
          </a>
        )}
        <Button variant="ghost" onClick={() => nav(`/project/${id}/results`)}>Back to results</Button>
      </div>
    </div>
  )
}
