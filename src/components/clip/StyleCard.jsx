import { Check } from 'lucide-react'
import { cn } from '../../lib/utils'

function Mini({ id }) {
  const frame =
    id === 'podcast' || id === 'clean'
      ? '/demo/stream-frame-03.jpg'
      : id === 'news'
        ? '/demo/stream-frame-04.jpg'
        : '/demo/stream-frame-01.jpg'
  return (
    <div className="relative aspect-[9/16] w-full overflow-hidden rounded-xl bg-black">
      <img src={frame} alt="" className="absolute inset-0 w-full h-full object-cover scale-150 blur-md brightness-50" />
      {id !== 'cinematic' && (
        <div
          className={cn(
            'absolute left-[8%] right-[8%] top-[6%] rounded-md px-1 py-1 text-center',
            id === 'news' ? 'bg-zinc-100' : id === 'cinematic' ? 'bg-transparent' : 'bg-white'
          )}
        >
          <div className={cn('clip-headline text-[7px] leading-none', id === 'news' ? 'text-black' : 'text-black')}>
            {id === 'news' ? 'WHAT WAS SAID NEXT' : id === 'meme' ? 'WAIT FOR IT 😭' : 'THE ROOM WENT SILENT'}
          </div>
        </div>
      )}
      <div className="absolute left-[10%] right-[10%] top-[30%] aspect-video overflow-hidden rounded-[4px]">
        <img src={frame} alt="" className={cn('w-full h-full object-cover', id === 'meme' || id === 'gaming' ? 'scale-110' : '')} />
      </div>
      <div className="absolute left-2 right-2 top-[68%] text-center">
        <div
          className={cn(
            'text-[6px] font-extrabold uppercase tracking-wide',
            id === 'gaming' ? 'text-cyan-300' : id === 'meme' ? 'text-yellow-300' : 'text-white'
          )}
          style={{ WebkitTextStroke: '1px #111' }}
        >
          {id === 'podcast' ? 'so you are telling me' : 'look at this'}
        </div>
      </div>
      {id !== 'cinematic' && (
        <div className="absolute inset-x-0 bottom-0 h-[11%] bg-black flex items-center justify-between px-1.5">
          <span className="kick-block text-[5px]">KICK</span>
          <span className="text-[5px] tracking-widest text-white">KICK.COM</span>
        </div>
      )}
      {id === 'cinematic' && (
        <>
          <div className="absolute inset-x-0 top-0 h-[8%] bg-black" />
          <div className="absolute inset-x-0 bottom-0 h-[8%] bg-black" />
        </>
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent pointer-events-none" />
    </div>
  )
}

export default function StyleCard({ style, selected, onSelect }) {
  return (
    <button
      onClick={onSelect}
      className={cn(
        'group text-left rounded-3xl p-3 transition-all hairline bg-ink-850 hover:-translate-y-0.5',
        selected && 'lime-ring bg-lime/[0.04]'
      )}
    >
      <Mini id={style.id} />
      <div className="pt-3 px-1 pb-1">
        <div className="flex items-center justify-between">
          <div className="text-[10px] tracking-[0.2em] text-zinc-500">STYLE {style.number}</div>
          {selected && (
            <span className="h-5 w-5 rounded-full bg-lime text-ink-950 grid place-items-center">
              <Check size={12} strokeWidth={3} />
            </span>
          )}
        </div>
        <div className="text-[16px] font-semibold mt-0.5">{style.name}</div>
        <p className="text-[12px] text-zinc-500 mt-1 leading-relaxed">{style.blurb}</p>
        <div className="mt-2 flex gap-1.5">
          <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-white/5 text-zinc-400">{style.tag}</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-white/5 text-zinc-400">{style.intensity}</span>
        </div>
      </div>
    </button>
  )
}
