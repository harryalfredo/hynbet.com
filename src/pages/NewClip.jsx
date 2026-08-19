import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ShieldCheck, Link2, FlaskConical } from 'lucide-react'
import { Button, Field } from '../components/ui/primitives'
import { api } from '../lib/api'
import { cn } from '../lib/utils'

export default function NewClip() {
  const nav = useNavigate()
  const [url, setUrl] = useState('')
  const [err, setErr] = useState('')
  const [count, setCount] = useState(3)
  const [length, setLength] = useState('auto')
  const [busy, setBusy] = useState(false)

  const submit = async (sourceUrl) => {
    setBusy(true)
    setErr('')
    try {
      const res = await api.createProject({
        sourceUrl,
        clipCount: count,
        clipLength: length,
        styleId: 'viral',
      })
      nav(`/analyze/${res.projectId}?job=${res.jobId}`)
    } catch (e) {
      setErr(e.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-12">
      <div className="text-[11px] tracking-[0.22em] uppercase text-zinc-500">Step 1</div>
      <h1 className="text-4xl font-semibold mt-2">Add a Kick stream</h1>
      <p className="text-zinc-400 mt-2 max-w-2xl">
        This creates a real backend job. Progress is reported by the worker, not a timer.
      </p>
      <div className="mt-8 rounded-3xl p-5 md:p-7 glass">
        <Field label="Paste Kick stream / VOD URL">
          <div className={cn('flex gap-2 p-2 rounded-2xl bg-ink-900 hairline', err && 'ring-1 ring-red-400/40')}>
            <div className="hidden sm:grid h-11 w-11 place-items-center text-zinc-500">
              <Link2 size={16} />
            </div>
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && submit(url)}
              placeholder="https://kick.com/..."
              className="flex-1 bg-transparent outline-none text-[15px]"
            />
            <Button disabled={busy || !url} onClick={() => submit(url)}>
              Analyze & create clips
            </Button>
          </div>
        </Field>
        {err && <p className="mt-3 text-sm text-red-300">{err}</p>}
        <div className="grid md:grid-cols-2 gap-8 mt-8">
          <div>
            <div className="text-[11px] uppercase tracking-wider text-zinc-500 mb-2">Number of clips</div>
            <div className="flex flex-wrap gap-2">
              {[1, 3, 5, 10].map((n) => (
                <button
                  key={n}
                  onClick={() => setCount(n)}
                  className={cn('h-10 px-3 rounded-xl text-[13px] hairline', count === n && 'bg-lime text-ink-950 border-transparent')}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
          <div>
            <div className="text-[11px] uppercase tracking-wider text-zinc-500 mb-2">Clip length</div>
            <div className="flex flex-wrap gap-2">
              {['auto', 15, 30, 45, 60, 90].map((n) => (
                <button
                  key={n}
                  onClick={() => setLength(n)}
                  className={cn('h-10 px-3 rounded-xl text-[13px] hairline', length === n && 'bg-lime text-ink-950 border-transparent')}
                >
                  {n === 'auto' ? 'Auto' : `${n}s`}
                </button>
              ))}
            </div>
          </div>
        </div>
        <Button className="mt-6" variant="limeGhost" icon={FlaskConical} disabled={busy} onClick={() => submit('dev://sample')}>
          Run development sample
        </Button>
      </div>
      <p className="mt-6 text-[12px] text-zinc-600 flex gap-2 max-w-2xl">
        <ShieldCheck size={14} className="shrink-0 mt-0.5" />
        Kick URLs without authorized media return SOURCE_ACCESS_ERROR. They will not produce fake clips.
      </p>
    </div>
  )
}
