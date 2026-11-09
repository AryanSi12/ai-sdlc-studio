import { Link, Outlet, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import Sidebar from './Sidebar'
import { useApiHealth } from '../hooks/useApiHealth'
import { getApiUrl } from '../lib/api'
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion'

export default function Layout() {
  const location = useLocation()
  const apiOk = useApiHealth()
  const reduced = usePrefersReducedMotion()
  const apiHost = getApiUrl() ? getApiUrl().replace(/^https?:\/\//, '') : 'same origin'

  return (
    <div className="flex min-h-screen bg-canvas text-ink">
      <div className="hidden md:flex">
        <Sidebar />
      </div>
      <main className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-zinc-200/80 bg-white/75 px-4 backdrop-blur-xl sm:px-8">
          <div className="flex items-center gap-3 text-xs text-zinc-500">
            <span className="hidden max-w-[14rem] truncate sm:inline">{apiHost}</span>
            <span
              className={[
                'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-medium',
                apiOk === true && 'border-emerald-200 bg-emerald-50 text-emerald-700',
                apiOk === false && 'border-rose-200 bg-rose-50 text-rose-700',
                apiOk === null && 'border-zinc-200 bg-zinc-50 text-zinc-500',
              ]
                .filter(Boolean)
                .join(' ')}
            >
              <span
                className={[
                  'h-1.5 w-1.5 rounded-full',
                  apiOk === true && 'animate-pulse bg-emerald-500',
                  apiOk === false && 'bg-rose-500',
                  apiOk === null && 'bg-zinc-400',
                ]
                  .filter(Boolean)
                  .join(' ')}
              />
              {apiOk === true ? 'API live' : apiOk === false ? 'API offline' : 'Checking…'}
            </span>
          </div>
          <span className="rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs font-medium text-zinc-700 shadow-sm">
            Aryan Singh
          </span>
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
    </div>
  )
}
