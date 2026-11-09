import { useEffect, useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { FolderKanban, FilePlus2, Inbox, Activity, Sparkles } from 'lucide-react'
import { listApprovals, listNeedsInput } from '../lib/api'

const LINKS = [
  { to: '/', label: 'New Run', icon: FilePlus2, end: true },
  { to: '/projects', label: 'Projects', icon: FolderKanban },
  { to: '/inbox', label: 'Inbox', icon: Inbox },
  { to: '/activity', label: 'Activity', icon: Activity },
]

export default function Sidebar() {
  const [badge, setBadge] = useState(0)
  const location = useLocation()

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const [a, n] = await Promise.all([listApprovals('pending'), listNeedsInput()])
        if (!cancelled) setBadge((a?.length || 0) + (n?.length || 0))
      } catch {
        if (!cancelled) setBadge(0)
      }
    }
    load()
    const t = setInterval(load, 12000)
    return () => { cancelled = true; clearInterval(t) }
  }, [])

  function isActive(to, end) {
    if (end) return location.pathname === '/'
    return location.pathname === to || location.pathname.startsWith(to + '/')
  }

  return (
    <aside className="flex h-full w-60 shrink-0 flex-col border-r border-zinc-200/80 bg-white/95 backdrop-blur-xl">
      <div className="flex items-center gap-3 border-b border-zinc-200/80 px-5 py-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-lg shadow-indigo-200/60">
          <Sparkles className="h-4 w-4 text-white" aria-hidden />
        </div>
        <div>
          <div className="text-sm font-semibold tracking-tight text-zinc-900">AI SDLC Studio</div>
          <div className="text-[11px] text-zinc-500">Bot pipeline</div>
        </div>
      </div>

      <nav className="flex flex-1 flex-col gap-1 p-3" aria-label="Primary">
        {LINKS.map(({ to, label, icon: Icon, end }) => {
          const active = isActive(to, end)
          return (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={`relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                active ? 'text-indigo-700' : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              {active && (
                <motion.span
                  layoutId="nav-pill"
                  className="absolute inset-0 rounded-xl bg-gradient-to-r from-indigo-50 to-violet-50 shadow-sm ring-1 ring-indigo-100"
                  transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                />
              )}
              <Icon className="relative z-10 h-4 w-4 shrink-0 opacity-80" aria-hidden />
              <span className="relative z-10 flex-1">{label}</span>
              {label === 'Inbox' && badge > 0 && (
                <span className="relative z-10 rounded-full bg-indigo-600 px-2 py-0.5 text-[10px] font-semibold text-white">{badge}</span>
              )}
            </NavLink>
          )
        })}
      </nav>

      <div className="border-t border-zinc-200/80 p-4">
        <div className="rounded-xl bg-gradient-to-br from-indigo-50 to-violet-50 p-3 ring-1 ring-indigo-100/80">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-indigo-500">Tip</div>
          <p className="mt-1 text-xs leading-relaxed text-zinc-600">Describe an idea — Requirement Gatherer will quiz you into a full PRD.</p>
        </div>
      </div>
    </aside>
  )
}
