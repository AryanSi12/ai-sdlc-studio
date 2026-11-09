import { Link, Outlet, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import Sidebar from './Sidebar'
import CommandPalette from './CommandPalette'
import { useApiHealth } from '../hooks/useApiHealth'
import { getApiUrl } from '../lib/api'
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion'
import { Search } from 'lucide-react'
import { useEffect, useState } from 'react'

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
  const [paletteTick, setPaletteTick] = useState(0)

  useEffect(() => {
    // force remount hint only — palette listens globally
  }, [paletteTick])

  return (
    <div className="flex min-h-screen bg-canvas text-ink">
      <div className="hidden md:flex">
        <Sidebar />
      </div>
      <main className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-14 items-center justify-between gap-3 border-b border-zinc-200/80 bg-white/75 px-4 backdrop-blur-xl sm:px-8">
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

        <div className="flex gap-2 overflow-x-auto border-b border-zinc-200 bg-white/90 px-3 py-2 md:hidden" aria-label="Mobile navigation">
          {[
            ['/', 'New'],
            ['/projects', 'Projects'],
            ['/inbox', 'Inbox'],
            ['/activity', 'Activity'],
          ].map(([to, label]) => (
            <Link
              key={to}
              to={to}
              className={`shrink-0 rounded-full border px-3 py-1 text-xs font-medium transition ${
                location.pathname === to || (to !== '/' && location.pathname.startsWith(to))
                  ? 'border-indigo-200 bg-indigo-50 text-indigo-700'
                  : 'border-zinc-200 text-zinc-600'
              }`}
            >
              {label}
            </Link>
          ))}
        </div>

        <div className="flex-1 overflow-auto p-4 sm:p-8">
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
      <CommandPalette />
    </div>
  )
}
