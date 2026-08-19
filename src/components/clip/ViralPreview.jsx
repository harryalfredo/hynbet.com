import { useEffect, useMemo, useState } from 'react'
import { CAPTION_STYLES } from '../../data/catalog'
import { cn } from '../../lib/utils'

export default function ViralPreview({
  clip,
  stream,
  playing = true,
  scale = 1,
  width = 320,
  showSafe = false,
  className,
  time: controlledTime,
  onTime,
  styleOverride,
}) {
  const duration = clip?.duration || 12
  const [t, setT] = useState(0)
  const time = playing ? t : controlledTime ?? t

  useEffect(() => {
    setT(0)
  }, [clip?.id])

  useEffect(() => {
    if (!playing && controlledTime != null) setT(controlledTime)
  }, [controlledTime, playing])

  useEffect(() => {
    if (!playing) return undefined
    let raf
    let last = performance.now()
    const loop = (now) => {
      const dt = (now - last) / 1000
      last = now
      setT((v) => {
        const n = v + dt
        const wrapped = n > duration ? 0 : n
        onTime?.(wrapped)
        return wrapped
      })
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [playing, duration, onTime])

  const frames = stream?.frames || ['/demo/stream-frame-01.jpg']
  const frame = frames[Math.floor(time / 2.3) % frames.length]
  const hs = clip?.headlineSettings || {}
  const vs = clip?.videoSettings || {}
  const br = clip?.branding || {}
  const styleId = styleOverride || 'viral'
  const capStyle = CAPTION_STYLES.find((c) => c.id === (clip?.captionStyle || 'bold-viral')) || CAPTION_STYLES[0]

  const words = clip?.captions || []
  const live = words.filter((w) => time >= w.from && time <= w.to + 0.05)
  const spoken = words.filter((w) => time >= w.from)
  const last = spoken[spoken.length - 1]
  const line = useMemo(() => {
    if (!spoken.length) return []
    const window = spoken.slice(-4)
    return window
  }, [spoken.length, last?.id])

  const h = Math.round(width * (16 / 9))
  const isCine = styleId === 'cinematic'
  const isNews = styleId === 'news'
  const isClean = styleId === 'clean'
  const isMeme = styleId === 'meme'
  const isGame = styleId === 'gaming'
  const isPod = styleId === 'podcast'

  const zoomPulse =
    (vs.punch || clip?.effects?.punchIns) && last?.emphasis
      ? 1.08
      : vs.zoom || 1.05

  return (
    <div
      className={cn('relative select-none', className)}
      style={{ width, height: h, transform: `scale(${scale})`, transformOrigin: 'top center' }}
    >
      <div className="absolute inset-0 overflow-hidden bg-black shadow-phone rounded-[22px] ring-1 ring-white/10">
        <img
          src={frame}
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
          style={{
            filter: `blur(${vs.blur ?? 22}px) saturate(${vs.saturate ?? 0.72}) brightness(${1 - (vs.darken ?? 0.42)})`,
            transform: vs.kenBurns !== false ? undefined : 'scale(1.2)',
            animation: vs.kenBurns !== false ? 'ken 14s ease-in-out infinite alternate' : 'none',
          }}
        />
        <div
          className="absolute inset-0"
          style={{
            background: `radial-gradient(circle at 50% 42%, transparent 20%, rgba(0,0,0,${vs.vignette ?? 0.55}) 78%)`,
          }}
        />

        {isCine && <div className="absolute inset-x-0 top-0 h-[7%] bg-black" />}
        {isCine && <div className="absolute inset-x-0 bottom-0 h-[7%] bg-black" />}

        {!isCine && (
          <div
            className="absolute left-1/2 -translate-x-1/2 z-20"
            style={{
              top: `${hs.y ?? 4.6}%`,
              width: '88%',
            }}
          >
            <div
              className="px-3 py-2.5 text-center"
              style={{
                background: isNews ? '#f4f4f5' : hs.background || '#fff',
                color: hs.color || '#0a0a0a',
                borderRadius: hs.radius ?? 16,
                boxShadow: hs.shadow !== false ? '0 10px 28px rgba(0,0,0,0.38)' : 'none',
              }}
            >
              {isNews && (
                <div className="text-[8px] font-semibold tracking-[0.22em] text-red-600 mb-0.5">LIVE CLIP</div>
              )}
              <div
                className="clip-headline"
                style={{
                  fontFamily: hs.font || 'Bebas Neue',
                  fontSize: Math.max(15, (hs.size || 54) * (width / 380)),
                  fontWeight: hs.weight || 700,
                  textAlign: hs.align || 'center',
                  color: hs.color || '#0a0a0a',
                }}
              >
                {String(clip?.headline || 'AI GENERATED HEADLINE').toUpperCase()}
                {hs.emoji && clip?.emoji ? ` ${clip.emoji}` : ''}
              </div>
            </div>
          </div>
        )}

        <div
          className="absolute left-1/2 -translate-x-1/2 overflow-hidden z-10"
          style={{
            top: isCine ? '18%' : '26%',
            width: isClean ? '90%' : '84%',
            aspectRatio: '16 / 9',
            borderRadius: isClean ? 4 : 10,
            boxShadow: '0 20px 50px rgba(0,0,0,0.45)',
            transform: `translateX(calc(-50% + ${(vs.reframeX || 0) * 0.4}px))`,
          }}
        >
          <img
            src={frame}
            alt=""
            className="w-full h-full object-cover"
            style={{
              transform: `scale(${zoomPulse}) translate(${vs.reframeX || 0}%, ${vs.reframeY || 0}%)`,
              transformOrigin: 'center center',
              transition: 'transform 280ms ease',
            }}
          />
          {isMeme && last?.emphasis && (
            <div className="absolute inset-0 ring-4 ring-yellow-300/70 pointer-events-none" />
          )}
        </div>

        {clip?.captionOn !== false && line.length > 0 && (
          <div
            className="absolute left-1/2 -translate-x-1/2 z-20 w-[88%] text-center"
            style={{ top: isPod ? '78%' : '70%' }}
          >
            <div className="flex flex-wrap justify-center gap-x-1 gap-y-0.5">
              {line.map((w) => {
                const on = live.some((l) => l.id === w.id) || w === last
                return (
                  <span
                    key={w.id}
                    className="inline-block animate-caption uppercase"
                    style={{
                      fontWeight: capStyle.weight,
                      fontSize: Math.max(11, (capStyle.size || 36) * (width / 520)),
                      color: on ? capStyle.highlight : capStyle.fill,
                      WebkitTextStroke: capStyle.stroke === 'transparent' ? '0' : `${width < 280 ? 2 : 3}px ${capStyle.stroke}`,
                      paintOrder: 'stroke fill',
                      textShadow: '0 2px 10px rgba(0,0,0,0.55)',
                    }}
                  >
                    {w.text}
                    {w.emoji ? ` ${w.emoji}` : ''}
                  </span>
                )
              })}
            </div>
          </div>
        )}

        {isGame && (
          <div className="absolute top-[22%] right-[7%] z-20 text-[18px] rotate-6 drop-shadow">⚡</div>
        )}

        {br.enabled !== false && !isCine && (
          <div
            className="absolute inset-x-0 bottom-0 z-30 flex items-center justify-between px-3"
            style={{
              height: `${br.height || 8.8}%`,
              background: br.color || '#050505',
            }}
          >
            <span className="kick-block text-[10px]">{br.left || 'KICK'}</span>
            <span className="text-[9px] font-semibold tracking-[0.14em] text-zinc-100">
              {br.right || `KICK.COM/${(stream?.handle || 'STREAMER').toUpperCase()}`}
            </span>
          </div>
        )}

        {showSafe && <div className="absolute inset-0 safe-zone pointer-events-none z-40" />}

        <div className="absolute top-0 left-0 right-0 h-[2px] bg-white/10 z-40">
          <div className="h-full bg-lime" style={{ width: `${(time / duration) * 100}%` }} />
        </div>
      </div>
    </div>
  )
}

export function PhoneBezel({ children, width = 320, label }) {
  const h = Math.round(width * (16 / 9)) + 18
  return (
    <div className="relative" style={{ width: width + 16 }}>
      <div className="absolute -inset-3 rounded-[32px] bg-gradient-to-b from-white/10 to-white/0 pointer-events-none" />
      <div className="relative rounded-[28px] bg-[#0b0b10] p-1.5 ring-1 ring-white/10 shadow-phone">
        <div className="absolute top-2 left-1/2 -translate-x-1/2 h-3.5 w-20 rounded-full bg-black/80 z-50" />
        {children}
      </div>
      {label && <div className="mt-3 text-center text-[11px] tracking-[0.2em] uppercase text-zinc-500">{label}</div>}
    </div>
  )
}
