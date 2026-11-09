import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { botById, formatTime, STAGE_UI, STAGES, stagesToProgress } from '../data/constants'
import { listProjects, getProject } from '../lib/api'
import StatusBadge from '../components/StatusBadge'
import { PageSkeleton } from '../components/Skeleton'
import EmptyState from '../components/EmptyState'
import { ArrowUpRight, FolderKanban } from 'lucide-react'
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion'
import { staggerContainer, staggerItem } from '../lib/motion'

function MiniStrip({ stages }) {
  const progress = stagesToProgress(stages)
  return (
    <div className="mt-3 flex items-center gap-1">
      {STAGES.map((s) => {
        const st = progress[s]
        return (
          <div
            key={s}
            title={`${s}: ${st}`}
            className={`h-1.5 flex-1 rounded-full ${
              st === 'done' ? 'bg-emerald-400' : st === 'active' ? 'bg-indigo-500' : st === 'failed' ? 'bg-rose-400' : 'bg-zinc-200'
            }`}
          />
        )
      })}
    </div>
  )
}

export default function Projects() {
  const [projects, setProjects] = useState([])
  const [stageMap, setStageMap] = useState({})
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const reduced = usePrefersReducedMotion()

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const data = await listProjects()
        if (cancelled) return
        setProjects(data)
        // enrich with stages for mini strips
        const details = await Promise.all(data.slice(0, 12).map((p) => getProject(p.id).catch(() => null)))
        if (cancelled) return
        const map = {}
        details.forEach((d, i) => { if (d) map[data[i].id] = d.stages })
        setStageMap(map)
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
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 sm:text-3xl">Projects</h1>
          <p className="mt-1 text-sm text-zinc-500">Open a run to see the pipeline, docs, and what needs you.</p>
        </div>
        <Link to="/" className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm shadow-indigo-200 transition hover:bg-indigo-500">
          New run
        </Link>
      </div>

      {error && <div role="alert" className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{error}</div>}

      {!error && projects.length === 0 ? (
        <EmptyState
          icon={<FolderKanban className="h-5 w-5" />}
          title="No projects yet"
          description="Start with an idea, a Markdown spec, or an existing repo."
          action={<Link to="/" className="text-sm font-semibold text-indigo-600">Start a run →</Link>}
        />
      ) : (
        <motion.ul className="space-y-3" variants={staggerContainer(reduced)} initial="initial" animate="animate">
          {projects.map((p) => {
            const bot = botById(p.active_bot)
            return (
              <motion.li key={p.id} variants={staggerItem(reduced)}>
                <Link
                  to={`/projects/${p.id}`}
                  className="group block rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-lg hover:shadow-indigo-100/50"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-lg font-semibold tracking-tight text-zinc-900">{p.name}</span>
                        <StatusBadge status={p.status} />
                      </div>
                      <div className="mt-1 truncate text-sm text-zinc-500">{p.description}</div>
                      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-zinc-400">
                        <img src={bot?.image} alt="" className="h-4 w-4 rounded" width={16} height={16} />
                        {STAGE_UI[p.current_stage] || p.current_stage} · {bot?.name} · {formatTime(p.updated_at)}
                      </div>
                    </div>
                    <ArrowUpRight className="h-5 w-5 shrink-0 text-indigo-500 opacity-60 transition group-hover:opacity-100" />
                  </div>
                  <MiniStrip stages={stageMap[p.id] || []} />
                </Link>
              </motion.li>
            )
          })}
        </motion.ul>
      )}
    </div>
  )
}
