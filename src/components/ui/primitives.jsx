import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'
import { cn } from '../../lib/utils'

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  className,
  icon: Icon,
  ...props
}) {
  const sizes = {
    sm: 'h-9 px-3 text-[12.5px] gap-1.5',
    md: 'h-11 px-4 text-[13.5px] gap-2',
    lg: 'h-13 px-6 text-[15px] gap-2.5 h-13',
    xl: 'h-14 px-7 text-[15px] gap-2.5',
  }
  const variants = {
    primary:
      'bg-lime text-ink-950 hover:bg-lime-glow shadow-glow font-semibold',
    dark: 'bg-ink-700 text-white hover:bg-ink-600 hairline font-medium',
    ghost: 'bg-transparent text-zinc-200 hover:bg-white/5 hairline font-medium',
    danger: 'bg-red-500/15 text-red-300 hover:bg-red-500/25 border border-red-500/20 font-medium',
    limeGhost: 'bg-lime/10 text-lime hover:bg-lime/16 border border-lime/20 font-semibold',
  }
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center rounded-xl transition-all duration-200 disabled:opacity-40 disabled:pointer-events-none active:scale-[0.98]',
        sizes[size],
        variants[variant],
        className
      )}
      {...props}
    >
      {Icon && <Icon size={size === 'sm' ? 14 : 16} strokeWidth={2.2} />}
      {children}
    </button>
  )
}

export function Field({ label, hint, children, className }) {
  return (
    <label className={cn('block space-y-1.5', className)}>
      {label && (
        <div className="flex items-baseline justify-between">
          <span className="text-[11px] uppercase tracking-[0.16em] text-zinc-500 font-medium">{label}</span>
          {hint && <span className="text-[11px] text-zinc-600">{hint}</span>}
        </div>
      )}
      {children}
    </label>
  )
}

export function Input({ className, ...props }) {
  return (
    <input
      className={cn(
        'w-full h-11 rounded-xl bg-ink-900 hairline px-3.5 text-[13.5px] text-zinc-100 placeholder:text-zinc-600 outline-none focus:ring-2 focus:ring-lime/30 focus:border-lime/40',
        className
      )}
      {...props}
    />
  )
}

export function Textarea({ className, ...props }) {
  return (
    <textarea
      className={cn(
        'w-full rounded-xl bg-ink-900 hairline px-3.5 py-2.5 text-[13.5px] text-zinc-100 placeholder:text-zinc-600 outline-none focus:ring-2 focus:ring-lime/30 min-h-[88px] resize-y',
        className
      )}
      {...props}
    />
  )
}

export function Toggle({ checked, onChange, label }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex items-center justify-between gap-3 w-full text-left"
    >
      {label && <span className="text-[13px] text-zinc-300">{label}</span>}
      <span
        className={cn(
          'relative h-6 w-11 rounded-full transition-colors',
          checked ? 'bg-lime' : 'bg-ink-600'
        )}
      >
        <span
          className={cn(
            'absolute top-0.5 h-5 w-5 rounded-full bg-ink-950 transition-all',
            checked ? 'left-5' : 'left-0.5'
          )}
        />
      </span>
    </button>
  )
}

export function Segment({ value, onChange, options }) {
  return (
    <div className="flex p-1 rounded-xl bg-ink-900 hairline">
      {options.map((o) => (
        <button
          key={o.id}
          onClick={() => onChange(o.id)}
          className={cn(
            'flex-1 h-8 rounded-lg text-[12px] font-medium transition-all',
            value === o.id ? 'bg-ink-700 text-white' : 'text-zinc-500 hover:text-zinc-300'
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function Meter({ value, label, color = '#53FC18' }) {
  return (
    <div>
      <div className="flex justify-between text-[10px] uppercase tracking-wider text-zinc-500 mb-1">
        <span>{label}</span>
        <span className="text-zinc-300 tabular-nums">{value}</span>
      </div>
      <div className="h-1.5 rounded-full bg-ink-600 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${value}%`, background: color }}
        />
      </div>
    </div>
  )
}

export function ScoreBadge({ score, size = 'md' }) {
  const tone = score >= 92 ? 'text-lime' : score >= 86 ? 'text-lime-glow' : 'text-amber-300'
  return (
    <div
      className={cn(
        'rounded-xl border border-white/10 bg-black/40 backdrop-blur-md text-center',
        size === 'lg' ? 'px-3 py-2' : 'px-2 py-1'
      )}
    >
      <div className={cn('font-semibold tabular-nums leading-none', tone, size === 'lg' ? 'text-2xl' : 'text-base')}>
        {score}
      </div>
      <div className="text-[9px] tracking-[0.18em] text-zinc-500 mt-1">VIRAL</div>
    </div>
  )
}

export function Modal({ open, onClose, title, children, wide }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[70] flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
          <motion.div
            initial={{ y: 16, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 12, opacity: 0 }}
            className={cn('relative glass rounded-3xl p-6 shadow-card w-full', wide ? 'max-w-4xl' : 'max-w-lg')}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">{title}</h3>
              <button onClick={onClose} className="h-8 w-8 rounded-lg hover:bg-white/5 grid place-items-center">
                <X size={16} />
              </button>
            </div>
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export function Empty({ title, body, action }) {
  return (
    <div className="text-center py-16 px-6">
      <div className="mx-auto mb-4 h-12 w-12 rounded-2xl bg-ink-700 grid place-items-center text-zinc-500">∅</div>
      <h3 className="text-lg font-semibold">{title}</h3>
      <p className="text-sm text-zinc-500 mt-1 max-w-sm mx-auto">{body}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}

export function StatusPill({ status }) {
  const map = {
    queued: 'bg-zinc-500/15 text-zinc-300',
    analyzing: 'bg-sky-500/15 text-sky-300',
    analyzed: 'bg-violet-500/15 text-violet-300',
    editing: 'bg-amber-500/15 text-amber-200',
    rendering: 'bg-amber-500/15 text-amber-200',
    complete: 'bg-lime/15 text-lime',
    edited: 'bg-lime/15 text-lime',
    failed: 'bg-red-500/15 text-red-300',
    ready: 'bg-lime/15 text-lime',
    processing: 'bg-sky-500/15 text-sky-300',
    exported: 'bg-white/10 text-white',
  }
  return (
    <span className={cn('px-2 py-0.5 rounded-md text-[10px] uppercase tracking-wider font-medium', map[status] || map.queued)}>
      {status}
    </span>
  )
}
