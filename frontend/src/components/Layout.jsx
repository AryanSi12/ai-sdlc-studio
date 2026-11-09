import { Link, Outlet, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import Sidebar from './Sidebar'
import CommandPalette from './CommandPalette'
import { useApiHealth } from '../hooks/useApiHealth'
import { getApiUrl } from '../lib/api'
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion'
import { Search, FilePlus2, FolderKanban, Inbox, Activity } from 'lucide-react'
import { useState } from 'react'

function breadcrumb(pathname) {
  if (pathname === '/') return [{ to: '/', label: 'New Run' }]
  if (pathname.startsWith('/projects/') && pathname.includes('/docs/')) {
    return [{ to: '/projects', label: 'Projects' }, { to: pathname.split('/docs/')[0], label: 'Project' }, { label: 'Document' }]
  }
  if (pathname.startsWith('/projects/')) return [{ to: '/projects', label: 'Projects' }, { label: 'Overview' }]
  if (pathname.startsWith('/projects')) return [{ label: 'Projects' }]
  if (pathname.startsWith('/inbox')) return [{ label: 'Inbox' }]
  if (pathname.startsWith('/activity')) return [{ label: 'Activity' }]
  return [{ label: 'Studio' }]
}

export default function Layout() {
  const location = useLocation()
  const apiOk = useApiHealth()
  const reduced = usePrefersReducedMotion()
  const apiHost = getApiUrl() ? getApiUrl().replace(/^https?:\/\//, '') : 'same origin'
  const crumbs = breadcrumb(location.pathname)
  const [, setPaletteTick] = useState(0)

  return (
    <div className="flex h-dvh max-h-dvh overflow-hidden bg-canvas text-ink">
      <div className="hidden h-full shrink-0 md:flex">
        <Sidebar />
      </div>
      <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        {/* Pinned top bar — NOT inside the scroll container, so it never mid-page overlaps */}
        <header className="relative z-40 flex h-14 shrink-0 items-center justify-between gap-3 border-b border-zinc-200/90 bg-white/95 px-4 shadow-[0_1px_0_rgba(255,255,255,0.8)] backdrop-blur-xl sm:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <nav aria-label="Breadcrumb" className="hidden items-center gap-1.5 text-xs text-zinc-500 sm:flex">
              {crumbs.map((c, i) => (
                <span key={i} className="flex items-center gap-1.5">
                  {i > 0 && <span className="text-zinc-300">/</span>}
                  {c.to ? <Link to={c.to} className="hover:text-indigo-600">{c.label}</Link> : <span className="font-medium text-zinc-800">{c.label}</span>}
                </span>
              ))}
            </nav>
            <span
              className={[
                'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium',
                apiOk === true && 'border-emerald-200 bg-emerald-50 text-emerald-700',
                apiOk === false && 'border-rose-200 bg-rose-50 text-rose-700',
                apiOk === null && 'border-zinc-200 bg-zinc-50 text-zinc-500',
              ].filter(Boolean).join(' ')}
            >
              <span className={['h-1.5 w-1.5 rounded-full', apiOk === true && 'animate-pulse bg-emerald-500', apiOk === false && 'bg-rose-500', apiOk === null && 'bg-zinc-400'].filter(Boolean).join(' ')} />
              {apiOk === true ? 'API live' : apiOk === false ? 'API offline' : 'Checking…'}
            </span>
            <span className="hidden truncate text-[11px] text-zinc-400 lg:inline">{apiHost}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true, bubbles: true }))
                setPaletteTick((n) => n + 1)
              }}
              className="hidden items-center gap-2 rounded-xl border border-zinc-200 bg-white px-2.5 py-1.5 text-xs text-zinc-500 shadow-sm transition hover:border-zinc-300 sm:inline-flex"
            >
              <Search className="h-3.5 w-3.5" />
              Search
              <kbd className="rounded border border-zinc-200 bg-zinc-50 px-1.5 py-0.5 text-[10px] font-semibold text-zinc-500">⌘K</kbd>
            </button>
            <span className="rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs font-medium text-zinc-700 shadow-sm">
              Aryan Singh
            </span>
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden p-4 pb-24 sm:p-8 md:pb-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={reduced ? false : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduced ? undefined : { opacity: 0, y: -6 }}
              transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {/* Mobile bottom tab bar — always reachable */}
      <nav
        className="fixed inset-x-0 bottom-0 z-50 border-t border-zinc-200 bg-white/95 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-1 backdrop-blur-xl md:hidden"
        aria-label="Mobile navigation"
      >
        <div className="mx-auto grid max-w-lg grid-cols-4 gap-1">
          {[
            ['/', 'New', FilePlus2],
            ['/projects', 'Projects', FolderKanban],
            ['/inbox', 'Inbox', Inbox],
            ['/activity', 'Activity', Activity],
          ].map(([to, label, Icon]) => {
            const active = to === '/' ? location.pathname === '/' : location.pathname.startsWith(to)
            return (
              <Link
                key={to}
                to={to}
                className={`flex flex-col items-center gap-0.5 rounded-xl px-2 py-2 text-[11px] font-semibold transition ${
                  active ? 'bg-indigo-50 text-indigo-700' : 'text-zinc-500 hover:bg-zinc-50 hover:text-zinc-800'
                }`}
              >
                <Icon className="h-5 w-5" aria-hidden />
                {label}
              </Link>
            )
          })}
        </div>
      </nav>

      <CommandPalette />
    </div>
  )
}
