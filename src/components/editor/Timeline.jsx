import { cn, fmtTime } from '../../lib/utils'

const LANES = [
  { id: 'video', label: 'Video', color: '#53FC18' },
  { id: 'captions', label: 'Captions', color: '#7dd3fc' },
  { id: 'headline', label: 'Headline', color: '#fafafa' },
  { id: 'effects', label: 'Effects', color: '#a78bfa' },
  { id: 'audio', label: 'Audio', color: '#fbbf24' },
]

export default function Timeline({ clip, time, onTime, onTrim }) {
  const dur = Math.max(clip?.duration || 1, 1)
  const start = clip?.start || 0
  const end = clip?.end || start + dur

  const setFromEvent = (e) => {
    const r = e.currentTarget.getBoundingClientRect()
    const p = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width))
    onTime?.(p * dur)
  }

  return (
    <div className="rounded-2xl bg-ink-850 hairline p-3">
      <div className="flex items-center justify-between mb-2 text-[11px] text-zinc-500">
        <span className="tracking-[0.16em] uppercase">Timeline</span>
        <span className="font-mono text-zinc-300">
          {fmtTime(time)} / {fmtTime(dur)} · source {fmtTime(start)}–{fmtTime(end)}
        </span>
      </div>
      <div className="timeline-grid rounded-xl overflow-hidden bg-ink-900">
        {LANES.map((ln) => (
          <div key={ln.id} className="flex items-stretch border-b border-white/5 last:border-0">
            <div className="w-20 shrink-0 px-2 py-2 text-[10px] uppercase tracking-wider text-zinc-500">{ln.label}</div>
            <div className="relative flex-1 h-10 cursor-pointer" onClick={setFromEvent}>
              <div
                className="absolute top-1.5 bottom-1.5 rounded-md opacity-80"
                style={{
                  left: ln.id === 'video' ? '0%' : ln.id === 'headline' ? '0%' : '6%',
                  width: ln.id === 'effects' ? '70%' : ln.id === 'captions' ? '88%' : '100%',
                  background: ln.color,
                  opacity: 0.28,
                }}
              />
              {ln.id === 'captions' &&
                (clip?.captions || []).slice(0, 12).map((c) => (
                  <div
                    key={c.id}
                    className="absolute top-2 h-6 rounded-sm bg-sky-300/40"
                    style={{
                      left: `${(c.from / dur) * 100}%`,
                      width: `${Math.max(1.2, ((c.to - c.from) / dur) * 100)}%`,
                    }}
                  />
                ))}
              {ln.id === 'effects' && clip?.effects?.punchIns && (
                <div className="absolute top-2 left-[35%] w-[8%] h-6 rounded-sm bg-violet-400/50" />
              )}
            </div>
          </div>
        ))}
        <div
          className="pointer-events-none absolute"
          style={{ display: 'none' }}
        />
      </div>
      <div className="relative h-8 mt-2 cursor-pointer" onClick={setFromEvent}>
        <div className="absolute inset-x-0 top-3 h-1.5 rounded-full bg-ink-600" />
        <div
          className="absolute top-3 h-1.5 rounded-full bg-lime"
          style={{ width: `${(time / dur) * 100}%` }}
        />
        <div
          className="absolute top-1.5 h-4 w-4 -ml-2 rounded-full bg-lime shadow-glow"
          style={{ left: `${(time / dur) * 100}%` }}
        />
      </div>
      <div className="grid grid-cols-2 gap-3 mt-2">
        <label className="text-[11px] text-zinc-500">
          In
          <input
            className="mt-1 w-full h-9 rounded-lg bg-ink-900 hairline px-2 font-mono text-[12px]"
            value={fmtTime(start)}
            onChange={(e) => {
              const v = e.target.value.split(':').map(Number)
              const sec = v.length === 3 ? v[0] * 3600 + v[1] * 60 + v[2] : v[0] * 60 + (v[1] || 0)
              onTrim?.({ start: sec })
            }}
          />
        </label>
        <label className="text-[11px] text-zinc-500">
          Out
          <input
            className="mt-1 w-full h-9 rounded-lg bg-ink-900 hairline px-2 font-mono text-[12px]"
            value={fmtTime(end)}
            onChange={(e) => {
              const v = e.target.value.split(':').map(Number)
              const sec = v.length === 3 ? v[0] * 3600 + v[1] * 60 + v[2] : v[0] * 60 + (v[1] || 0)
              onTrim?.({ end: sec })
            }}
          />
        </label>
      </div>
    </div>
  )
}
