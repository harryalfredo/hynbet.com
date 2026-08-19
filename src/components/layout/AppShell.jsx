import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  Clapperboard,
  LayoutDashboard,
  Library,
  Settings2,
  Sparkles,
  SwatchBook,
  Plus,
  Bell,
  Search,
} from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import KickConnect from '../kick/KickConnect'
import { useAppStore } from '../../store/useAppStore'
import { cn } from '../../lib/utils'

const NAV = [
  { to: '/new', label: 'New clip', icon: Plus },
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/library', label: 'Library', icon: Library },
  { to: '/templates', label: 'Templates', icon: Clapperboard },
  { to: '/brand', label: 'Brand kit', icon: SwatchBook },
  { to: '/settings', label: 'AI settings', icon: Settings2 },
]

export default function AppShell({ children }) {
  const content = children ?? <Outlet />
  const loc = useLocation()
  const nav = useNavigate()
  const user = useAppStore((s) => s.user)
  const toasts = useAppStore((s) => s.toasts)
  const dismiss = useAppStore((s) => s.dismissToast)
  const hideChrome = loc.pathname.startsWith('/analyze')
  const live = null

  return (
    <div className="min-h-screen bg-ink-950 text-zinc-100">
      <div className="pointer-events-none fixed inset-0 bg-grid bg-[size:56px_56px] opacity-40" />
      <div className="pointer-events-none fixed -top-40 left-1/3 h-[520px] w-[520px] rounded-full bg-lime/10 blur-[140px]" />
      <div className="pointer-events-none fixed bottom-0 right-0 h-[420px] w-[420px] rounded-full bg-violet/10 blur-[140px]" />

      {!hideChrome && (
        <aside className="fixed left-0 top-0 z-40 hidden h-screen w-[232px] flex-col border-r border-white/[0.06] bg-ink-950/80 backdrop-blur-xl md:flex">
          <button onClick={() => nav('/')} className="flex items-center gap-2.5 px-5 h-[72px]">
            <img src="/brand/logo-mark.png" alt="" className="h-9 w-9 rounded-xl" />
            <div className="text-left">
              <div className="text-[13px] font-semibold tracking-[0.18em]">HYNBET</div>
              <div className="text-[10px] text-zinc-500 tracking-[0.16em]">CLIP STUDIO</div>
            </div>
          </button>
          <nav className="px-3 space-y-1 mt-2">
            {NAV.map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-2.5 h-10 px-3 rounded-xl text-[13px] transition-colors',
                    isActive ? 'bg-lime/10 text-lime' : 'text-zinc-400 hover:text-white hover:bg-white/[0.04]'
                  )
                }
              >
                <n.icon size={16} />
                {n.label}
              </NavLink>
            ))}
          </nav>
          <div className="mt-auto p-3">
            <div className="rounded-2xl p-3 hairline bg-ink-850">
              <div className="flex items-center gap-2 text-lime text-[11px] font-medium">
                <Sparkles size={13} /> Pro workspace
              </div>
              <p className="text-[11px] text-zinc-500 mt-1 leading-relaxed">
                Authorized Kick sources only. Quality over volume.
              </p>
            </div>
          </div>
        </aside>
      )}

      {!hideChrome && (
        <nav className="fixed bottom-0 inset-x-0 z-40 md:hidden border-t border-white/10 bg-ink-950/90 backdrop-blur-xl flex justify-around py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
          {NAV.slice(0, 5).map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              className={({ isActive }) =>
                cn('flex flex-col items-center gap-0.5 text-[10px]', isActive ? 'text-lime' : 'text-zinc-500')
              }
            >
              <n.icon size={16} />
              {n.label}
            </NavLink>
          ))}
        </nav>
      )}

      <div className={cn(!hideChrome && 'md:pl-[232px] pb-16 md:pb-0')}>
        {!hideChrome && (
          <header className="sticky top-0 z-30 h-[72px] flex items-center justify-between px-5 border-b border-white/[0.06] bg-ink-950/70 backdrop-blur-xl">
            <div className="flex items-center gap-2 text-zinc-500 text-[13px]">
              <Search size={15} />
              <span className="hidden sm:inline">Paste a Kick URL from New clip — or open a project.</span>
            </div>
            <div className="flex items-center gap-3">
              {live && (
                <button
                  onClick={() => nav(live.status === 'editing' ? `/project/${live.id}/style` : `/analyze/${live.id}`)}
                  className="hidden sm:flex items-center gap-2 h-9 px-3 rounded-full bg-lime/10 text-lime text-[12px]"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-lime animate-pulse" />
                  {live.status} · {live.progress || 0}%
                </button>
              )}
              <button className="h-9 w-9 rounded-xl hairline grid place-items-center text-zinc-400 hover:text-white">
                <Bell size={16} />
              </button>
              <div className="flex items-center gap-2 pl-2">
                <div className="h-8 w-8 rounded-full bg-lime text-ink-950 grid place-items-center text-[11px] font-bold">
                  {user.initials}
                </div>
                <div className="hidden sm:block">
                  <div className="text-[12px] font-medium leading-none">{user.name}</div>
                  <div className="text-[10px] text-zinc-500 mt-0.5">{user.plan}</div>
                </div>
              </div>
            </div>
          </header>
        )}
        <main className="relative z-10">{content}</main>
      </div>

      <div className="fixed bottom-5 right-5 z-[60] space-y-2 w-[320px]">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              onClick={() => dismiss(t.id)}
              className="glass rounded-2xl px-4 py-3 cursor-pointer"
            >
              <div className="text-[13px] font-medium">{t.title}</div>
              {t.body && <div className="text-[12px] text-zinc-400 mt-0.5">{t.body}</div>}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  )
}
