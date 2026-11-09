import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { BOTS, botById, formatTime, botColorClasses } from '../data/constants'
import { listEvents } from '../lib/api'
import { PageSkeleton } from '../components/Skeleton'
import EmptyState from '../components/EmptyState'
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion'

export default function ActivityLog() {
  const [botFilter, setBotFilter] = useState('all')
  const [events, setEvents] = useState([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const reduced = usePrefersReducedMotion()

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    ;(async () => {
      try {
        const data = await listEvents({ bot: botFilter === 'all' ? undefined : botFilter })
        if (!cancelled) { setEvents(data); setError('') }
      } catch (err) {
        if (!cancelled) setError(err.message)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [botFilter])

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">Activity</h1>
          <p className="mt-1 text-sm text-zinc-500">Audit trail across all projects.</p>
        </div>
        <select
          id="bot-filter"
          value={botFilter}
          onChange={(e) => setBotFilter(e.target.value)}
          className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none"
          aria-label="Filter by bot"
        >
          <option value="all">All bots</option>
          {BOTS.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
      </div>

      {error && <div role="alert" className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{error}</div>}
      {loading ? <PageSkeleton /> : events.length === 0 ? (
        <EmptyState title="No events" description="Bot actions will show up here." action={<Link to="/" className="text-sm font-semibold text-indigo-600">Start a run →</Link>} />
      ) : (
        <div className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm">
          <ol className="relative ml-3 border-l border-zinc-200">
            {events.map((ev, i) => {
              const bot = botById(ev.bot)
              const colors = botColorClasses[bot?.color || 'violet']
              return (
                <motion.li
                  key={ev.id}
                  initial={reduced ? false : { opacity: 0, x: -4 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: Math.min(i, 10) * 0.03 }}
                  className="relative pb-5 pl-6 last:pb-0"
                >
                  <span className={`absolute -left-1.5 top-1.5 h-3 w-3 rounded-full border-2 border-white ${colors.dot}`} />
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium ${colors.bg} ${colors.text} ${colors.border}`}>
                      <img src={bot?.image} alt="" className="h-3.5 w-3.5 rounded" width={14} height={14} />
                      {bot?.name}
                    </span>
                    <Link to={`/projects/${ev.project_id}`} className="text-xs font-medium text-indigo-600 hover:underline">{ev.project_name}</Link>
                    <span className="ml-auto text-[11px] text-zinc-400">{formatTime(ev.created_at)}</span>
                  </div>
                  <div className="mt-1.5 text-sm font-medium text-zinc-900">{ev.action}</div>
                </motion.li>
              )
            })}
          </ol>
        </div>
      )}
    </div>
  )
}
