import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { botById, formatTime, STAGE_UI } from '../data/constants'
import { listProjects } from '../lib/api'
import StatusBadge from '../components/StatusBadge'
import { PageSkeleton } from '../components/Skeleton'
import EmptyState from '../components/EmptyState'
import { ArrowUpRight } from 'lucide-react'

export default function Projects() {
  const [projects, setProjects] = useState([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const data = await listProjects()
        if (!cancelled) setProjects(data)
      } catch (err) {
        if (!cancelled) setError(err.message)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [])

  if (loading) return <PageSkeleton />

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Projects</h1>
          <p className="mt-1 text-sm text-slate-500">Open a run to see stages, docs, and what needs you.</p>
        </div>
        <Link to="/" className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500">
          New run
        </Link>
      </div>

      {error && <div role="alert" className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{error}</div>}

      {!error && projects.length === 0 ? (
        <EmptyState title="No projects yet" description="Start with an idea, a Markdown spec, or an existing repo." action={<Link to="/" className="text-sm font-semibold text-indigo-600">Start a run →</Link>} />
      ) : (
        <ul className="space-y-3">
          {projects.map((p, i) => {
            const bot = botById(p.active_bot)
            return (
              <motion.li key={p.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                <Link to={`/projects/${p.id}`}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-indigo-200 hover:shadow-md">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-slate-900">{p.name}</span>
                      <StatusBadge status={p.status} />
                    </div>
                    <div className="mt-1 truncate text-sm text-slate-500">{p.description}</div>
                    <div className="mt-2 text-xs text-slate-400">
                      {STAGE_UI[p.current_stage] || p.current_stage} · {bot?.emoji} {bot?.name} · {formatTime(p.updated_at)}
                    </div>
                  </div>
                  <ArrowUpRight className="h-5 w-5 shrink-0 text-indigo-500" />
                </Link>
              </motion.li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
