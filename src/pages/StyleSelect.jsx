import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Sparkles } from 'lucide-react'
import { STYLE_PRESETS, EDIT_STAGES } from '../data/catalog'
import { useAppStore } from '../store/useAppStore'
import StyleCard from '../components/clip/StyleCard'
import { Button } from '../components/ui/primitives'
import { AnimatePresence, motion } from 'framer-motion'

export default function StyleSelect() {
  const { id } = useParams()
  const nav = useNavigate()
  const project = useAppStore((s) => s.projects.find((p) => p.id === id))
  const setStyle = useAppStore((s) => s.setStyle)
  const autoEdit = useAppStore((s) => s.autoEditProject)
  const [busy, setBusy] = useState(false)

  if (!project) return null

  const run = () => {
    setBusy(true)
    autoEdit(id, () => nav(`/project/${id}/editor`))
  }

  const stageIdx = Math.max(0, EDIT_STAGES.findIndex((s) => s.id === project.stage))

  return (
    <div className="px-6 py-8 max-w-[1400px] mx-auto">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <div className="text-[11px] tracking-[0.2em] uppercase text-zinc-500">Step 3</div>
          <h1 className="text-3xl font-semibold mt-1">Choose your edit style</h1>
          <p className="text-zinc-400 text-sm mt-1">Viral Kick is the primary template. Every card has a living preview.</p>
        </div>
        <Button size="lg" icon={Sparkles} onClick={run} disabled={busy}>
          Auto edit
        </Button>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-8">
        {STYLE_PRESETS.map((s) => (
          <StyleCard
            key={s.id}
            style={s}
            selected={project.styleId === s.id}
            onSelect={() => {
              setStyle(id, s.id)
              if (s.id === 'custom') nav('/templates?from=' + id)
            }}
          />
        ))}
      </div>

      <AnimatePresence>
        {(busy || project.status === 'editing') && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 z-50 bg-ink-950/80 backdrop-blur-md grid place-items-center px-6"
          >
            <div className="max-w-md w-full">
              <div className="text-lime text-[11px] tracking-[0.22em]">AI EDITING YOUR CLIP</div>
              <h2 className="text-3xl font-semibold mt-2">Composing the 9:16.</h2>
              <div className="mt-6 h-1.5 rounded-full bg-ink-700 overflow-hidden">
                <div className="h-full bg-lime transition-all" style={{ width: `${project.progress || 8}%` }} />
              </div>
              <ol className="mt-6 space-y-2">
                {EDIT_STAGES.map((s, i) => (
                  <li key={s.id} className={`text-sm ${i <= stageIdx ? 'text-white' : 'text-zinc-600'}`}>
                    {s.label}
                  </li>
                ))}
              </ol>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
