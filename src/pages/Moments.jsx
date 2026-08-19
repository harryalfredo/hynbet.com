import { useNavigate, useParams } from 'react-router-dom'
import { Play, Pencil, Sparkles } from 'lucide-react'
import { useAppStore } from '../store/useAppStore'
import { Button, Meter, ScoreBadge, StatusPill } from '../components/ui/primitives'
import { CLIP_COUNTS, CLIP_LENGTHS } from '../data/catalog'
import { qualityGate } from '../lib/ai'
import { cn, fmtDur } from '../lib/utils'
import ViralPreview from '../components/clip/ViralPreview'
import { useState } from 'react'

export default function Moments() {
  const { id } = useParams()
  const nav = useNavigate()
  const project = useAppStore((s) => s.projects.find((p) => p.id === id))
  const clips = useAppStore((s) => s.clips.filter((c) => c.projectId === id).sort((a, b) => a.rank - b.rank))
  const update = useAppStore((s) => s.updateProject)
  const [preview, setPreview] = useState(null)

  if (!project) return null

  const shown = clips.slice(0, project.clipCount || clips.length)

  return (
    <div className="px-6 py-8 max-w-[1400px] mx-auto">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <div className="text-[11px] tracking-[0.2em] uppercase text-zinc-500">Step 2 · Best-moment detection</div>
          <h1 className="text-3xl font-semibold mt-1">{shown.length} clips found</h1>
          <p className="text-zinc-400 text-sm mt-1">
            {project.name} · {project.title} · {fmtDur(project.duration)}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={() => nav(`/project/${id}/style`)}>Continue to styles</Button>
          <Button icon={Sparkles} onClick={() => nav(`/project/${id}/style`)}>Choose edit style</Button>
        </div>
      </div>

      <div className="mt-6 grid md:grid-cols-2 gap-4">
        <div className="rounded-2xl hairline bg-ink-850 p-4">
          <div className="text-[11px] uppercase tracking-wider text-zinc-500 mb-2">Number of clips</div>
          <div className="flex flex-wrap gap-2">
            {CLIP_COUNTS.map((n) => (
              <Chip key={n} on={project.clipCount === n} onClick={() => update(id, { clipCount: n })}>
                {n}
              </Chip>
            ))}
          </div>
        </div>
        <div className="rounded-2xl hairline bg-ink-850 p-4">
          <div className="text-[11px] uppercase tracking-wider text-zinc-500 mb-2">Clip length</div>
          <div className="flex flex-wrap gap-2">
            {CLIP_LENGTHS.map((n) => (
              <Chip key={n.id} on={project.clipLength === n.id} onClick={() => update(id, { clipLength: n.id })}>
                {n.label}
              </Chip>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-6 space-y-3">
        {shown.map((c) => (
          <div key={c.id} className="rounded-3xl hairline bg-ink-850/80 p-4 md:p-5 grid lg:grid-cols-[88px_1fr_auto] gap-4 items-center">
            <ScoreBadge score={c.viralScore} size="lg" />
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-zinc-500 text-sm">#{c.rank}</span>
                <span className="text-[11px] px-2 py-0.5 rounded-md bg-white/5">{c.emoji} {c.typeLabel}</span>
                <StatusPill status={c.status} />
                {qualityGate(c).pass ? (
                  <span className="text-[10px] uppercase tracking-wider text-lime">Hook · context · payoff</span>
                ) : (
                  <span className="text-[10px] uppercase tracking-wider text-amber-300">{qualityGate(c).reasons[0]}</span>
                )}
              </div>
              <h3 className="text-lg font-medium mt-1">{c.description}</h3>
              <p className="text-[13px] text-zinc-500 mt-1">{c.hook}</p>
              <div className="mt-3 grid sm:grid-cols-5 gap-3">
                <Meter value={c.metrics.hook} label="Hook" />
                <Meter value={c.metrics.emotion} label="Emotion" />
                <Meter value={c.metrics.conversation} label="Conversation" />
                <Meter value={c.metrics.reaction} label="Reaction" />
                <Meter value={c.metrics.context} label="Context" />
              </div>
              <div className="mt-3 flex flex-wrap gap-4 text-[12px] text-zinc-400 font-mono">
                <span>Duration {fmtDur(c.duration)}</span>
                <span>Suggested {c.suggested}</span>
              </div>
            </div>
            <div className="flex lg:flex-col gap-2">
              <Button size="sm" icon={Pencil} onClick={() => nav(`/project/${id}/editor/${c.id}`)}>
                Edit clip
              </Button>
              <Button size="sm" variant="ghost" icon={Play} onClick={() => setPreview(c)}>
                Preview
              </Button>
            </div>
          </div>
        ))}
      </div>

      {preview && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm grid place-items-center p-6" onClick={() => setPreview(null)}>
          <div onClick={(e) => e.stopPropagation()}>
            <ViralPreview clip={preview} stream={project} width={320} playing />
            <div className="text-center mt-3 text-sm text-zinc-400">{preview.headline}</div>
          </div>
        </div>
      )}
    </div>
  )
}

function Chip({ on, children, onClick }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'h-9 px-3 rounded-xl text-[13px] hairline',
        on ? 'bg-lime text-ink-950 border-transparent' : 'hover:bg-white/5'
      )}
    >
      {children}
    </button>
  )
}
