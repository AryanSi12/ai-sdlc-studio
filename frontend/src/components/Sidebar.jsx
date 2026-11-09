import { useEffect, useState } from 'react'
import { NavLink } from 'react-router-dom'
import { FolderKanban, FilePlus2, Inbox, Activity, Bot } from 'lucide-react'
import { listApprovals, listNeedsInput } from '../lib/api'

const LINKS = [
  { to: '/', label: 'New Run', icon: FilePlus2, end: true },
  { to: '/projects', label: 'Projects', icon: FolderKanban },
  { to: '/inbox', label: 'Inbox', icon: Inbox },
  { to: '/activity', label: 'Activity', icon: Activity },
]

export default function Sidebar() {
  const [badge, setBadge] = useState(0)

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

  return (
    <aside className="flex w-60 shrink-0 flex-col border-r border-slate-200 bg-white">
      <div className="flex items-center gap-3 border-b border-slate-200 px-5 py-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 shadow-md shadow-indigo-200">
          <Bot className="h-4.5 w-4.5 text-white" aria-hidden />
        </div>
        <div>
          <div className="text-sm font-semibold tracking-tight text-slate-900">AI SDLC Studio</div>
          <div className="text-[11px] text-slate-500">Pipeline console</div>
        </div>
      </div>

      <nav className="flex flex-1 flex-col gap-1 p-3" aria-label="Primary">
        {LINKS.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              [
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition',
                isActive
                  ? 'bg-indigo-50 text-indigo-700 shadow-sm ring-1 ring-indigo-100'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900',
              ].join(' ')
            }
          >
            <Icon className="h-4 w-4 shrink-0 opacity-80" aria-hidden />
            <span className="flex-1">{label}</span>
            {label === 'Inbox' && badge > 0 && (
              <span className="rounded-full bg-indigo-600 px-2 py-0.5 text-[10px] font-semibold text-white">{badge}</span>
            )}
          </NavLink>
        ))}
      </nav>
    </aside>
  )
}
