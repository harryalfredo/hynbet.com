import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { DEFAULT_LAYOUT, LAYOUT_ELEMENTS } from '../data/catalog'
import { useAppStore } from '../store/useAppStore'
import { Button, Field, Input } from '../components/ui/primitives'
import { cn } from '../lib/utils'

export default function Templates() {
  const nav = useNavigate()
  const templates = useAppStore((s) => s.templates)
  const save = useAppStore((s) => s.saveTemplate)
  const del = useAppStore((s) => s.deleteTemplate)
  const toast = useAppStore((s) => s.toast)
  const [name, setName] = useState('Viral Kick News')
  const [layout, setLayout] = useState(DEFAULT_LAYOUT)
  const [sel, setSel] = useState('headline')
  const [drag, setDrag] = useState(null)

  const active = layout[sel]

  const onPointer = (e, id) => {
    const canvas = e.currentTarget.parentElement.getBoundingClientRect()
    const start = { x: e.clientX, y: e.clientY, ox: layout[id].x, oy: layout[id].y }
    setSel(id)
    setDrag({ id, start, canvas })
  }

  const move = (e) => {
    if (!drag) return
    const dx = ((e.clientX - drag.start.x) / drag.canvas.width) * 100
    const dy = ((e.clientY - drag.start.y) / drag.canvas.height) * 100
    setLayout((l) => ({
      ...l,
      [drag.id]: {
        ...l[drag.id],
        x: Math.min(100 - l[drag.id].w, Math.max(0, drag.start.ox + dx)),
        y: Math.min(100 - l[drag.id].h, Math.max(0, drag.start.oy + dy)),
      },
    }))
  }

  const patch = (p) => setLayout((l) => ({ ...l, [sel]: { ...l[sel], ...p } }))

  const previewEls = useMemo(() => LAYOUT_ELEMENTS.filter((el) => layout[el.id]?.on), [layout])

  return (
    <div className="px-6 py-8 max-w-[1400px] mx-auto">
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-3xl font-semibold">Custom template builder</h1>
          <p className="text-zinc-400 text-sm mt-1">Drag layers on the 9:16 canvas. Save and reuse.</p>
        </div>
        <div className="flex gap-2">
          <Field>
            <Input value={name} onChange={(e) => setName(e.target.value)} className="w-56" />
          </Field>
          <Button
            onClick={() => {
              save({ name, styleId: 'custom', layout })
              toast({ title: 'Template saved', body: name, tone: 'ok' })
            }}
          >
            Save template
          </Button>
        </div>
      </div>

      <div className="mt-8 grid lg:grid-cols-[220px_1fr_280px] gap-5 items-start">
        <div className="rounded-3xl hairline bg-ink-850 p-3 space-y-1">
          <div className="text-[11px] tracking-widest uppercase text-zinc-500 px-2 py-2">Layers</div>
          {LAYOUT_ELEMENTS.map((el) => (
            <button
              key={el.id}
              onClick={() => setSel(el.id)}
              className={cn(
                'w-full flex items-center justify-between h-9 px-2 rounded-lg text-[13px]',
                sel === el.id ? 'bg-ink-700' : 'hover:bg-white/5'
              )}
            >
              <span>{el.label}</span>
              <input
                type="checkbox"
                checked={layout[el.id].on}
                onChange={(e) =>
                  setLayout((l) => ({ ...l, [el.id]: { ...l[el.id], on: e.target.checked } }))
                }
              />
            </button>
          ))}
        </div>

        <div className="flex justify-center">
          <div
            className="relative bg-black rounded-[24px] overflow-hidden ring-1 ring-white/10 shadow-phone"
            style={{ width: 320, height: 568 }}
            onMouseMove={move}
            onMouseUp={() => setDrag(null)}
            onMouseLeave={() => setDrag(null)}
          >
            <img src="/demo/stream-frame-01.jpg" alt="" className="absolute inset-0 w-full h-full object-cover blur-xl brightness-50 scale-125" />
            {previewEls.map((el) => {
              const b = layout[el.id]
              return (
                <div
                  key={el.id}
                  onMouseDown={(e) => onPointer(e, el.id)}
                  className={cn(
                    'absolute border border-white/30 bg-white/5 cursor-move text-[9px] uppercase tracking-wider text-white/80 flex items-center justify-center',
                    sel === el.id && 'border-lime text-lime'
                  )}
                  style={{ left: `${b.x}%`, top: `${b.y}%`, width: `${b.w}%`, height: `${b.h}%` }}
                >
                  {el.id === 'video' && (
                    <img src="/demo/stream-frame-01.jpg" alt="" className="w-full h-full object-cover pointer-events-none" />
                  )}
                  {el.id === 'headline' && (
                    <div className="bg-white text-black clip-headline text-[11px] px-2 py-1 rounded-md w-[92%] text-center">
                      CUSTOM HEADLINE
                    </div>
                  )}
                  {el.id === 'bar' && <div className="absolute inset-0 bg-black" />}
                  {el.id !== 'video' && el.id !== 'headline' && el.label}
                </div>
              )
            })}
          </div>
        </div>

        <div className="rounded-3xl hairline bg-ink-850 p-4 space-y-3">
          <div className="text-[11px] tracking-widest uppercase text-zinc-500">{sel}</div>
          {['x', 'y', 'w', 'h'].map((k) => (
            <label key={k} className="block text-[11px] text-zinc-500">
              {k.toUpperCase()} · {Math.round(active[k])}
              <input
                type="range"
                className="range w-full mt-1"
                min={0}
                max={100}
                value={active[k]}
                onChange={(e) => patch({ [k]: Number(e.target.value) })}
              />
            </label>
          ))}
        </div>
      </div>

      <div className="mt-10">
        <h2 className="text-lg font-semibold">Saved templates</h2>
        <div className="grid sm:grid-cols-3 gap-3 mt-3">
          {templates.map((t) => (
            <div key={t.id} className="rounded-2xl hairline bg-ink-850 p-4">
              <div className="font-medium">{t.name}</div>
              <div className="text-[12px] text-zinc-500 mt-1">{t.styleId}</div>
              <div className="flex gap-2 mt-3">
                <Button size="sm" variant="ghost" onClick={() => setLayout(t.layout || DEFAULT_LAYOUT)}>
                  Load
                </Button>
                <Button size="sm" variant="danger" onClick={() => del(t.id)}>
                  Delete
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
