import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { formatTime, STAGE_UI } from '../data/constants'
import { decideApproval, listApprovals, listNeedsInput } from '../lib/api'
import { useToast } from '../components/Toast'
import EmptyState from '../components/EmptyState'
import { PageSkeleton } from '../components/Skeleton'
import { Check, X, ShieldAlert, MessageCircleQuestion, Inbox as InboxIcon } from 'lucide-react'
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion'

export default function Inbox() {
  const toast = useToast()
  const reduced = usePrefersReducedMotion()
  const [approvals, setApprovals] = useState([])
  const [needs, setNeeds] = useState([])
  const [comments, setComments] = useState({})
  const [busyId, setBusyId] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  async function load() {
    try {
      const [a, n] = await Promise.all([listApprovals('pending'), listNeedsInput()])
      setApprovals(a)
      setNeeds(n)
      setError('')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  async function onDecide(id, decision) {
    setBusyId(id)
    try {
      await decideApproval(id, { decision, comment: comments[id] || '' })
      toast.success(decision === 'approved' ? 'Approved' : 'Rejected')
      await load()
    } catch (err) {
      toast.error(err.message)
      setError(err.message)
    } finally {
      setBusyId(null)
    }
  }

  if (loading) return <PageSkeleton />
  const empty = needs.length === 0 && approvals.length === 0

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 sm:text-3xl">Inbox</h1>
        <p className="mt-1 text-sm text-zinc-500">Quizzes and approval gates waiting on you.</p>
      </div>

      {error && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{error}</div>}

      {empty ? (
        <EmptyState
          icon={<InboxIcon className="h-5 w-5" />}
          title="You're caught up"
          description="Nothing needs your input right now."
          action={<Link to="/projects" className="text-sm font-semibold text-indigo-600">View projects →</Link>}
        />
      ) : (
        <div className="space-y-4">
          {needs.map((n, i) => (
            <motion.div
              key={n.round_id}
              initial={reduced ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-violet-200 bg-white p-5 shadow-sm"
            >
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-violet-600 ring-1 ring-violet-100">
                  <MessageCircleQuestion className="h-5 w-5" />
                </div>
                <div>
                  <div className="font-semibold text-zinc-900">{n.project_name}</div>
                  <div className="text-sm text-zinc-600">{n.summary}</div>
                  <div className="mt-1 text-xs text-zinc-400">{formatTime(n.created_at)}</div>
                </div>
              </div>
              <Link to={`/projects/${n.project_id}`} className="rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white shadow-sm shadow-violet-200 transition hover:bg-violet-500">
                Answer quiz
              </Link>
            </motion.div>
          ))}

          {approvals.map((a, i) => (
            <motion.article
              key={a.id}
              initial={reduced ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm"
            >
              <div className="mb-1 flex items-center gap-2">
                <ShieldAlert className="h-4 w-4 text-amber-500" />
                <span className="text-xs font-semibold uppercase tracking-wider text-amber-700">{a.gate} approval</span>
              </div>
              <h2 className="text-lg font-semibold text-zinc-900">{a.project_name || a.project_id}</h2>
              <p className="mt-1 text-xs text-zinc-500">{STAGE_UI[a.project_stage] || a.project_stage} · {formatTime(a.created_at)}</p>
              <p className="mt-3 text-sm leading-relaxed text-zinc-700">{a.summary}</p>
              <textarea
                rows={2}
                value={comments[a.id] || ''}
                onChange={(e) => setComments({ ...comments, [a.id]: e.target.value })}
                placeholder="Optional comment…"
                className="mt-4 w-full resize-none rounded-xl border border-zinc-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
              />
              <div className="mt-3 flex gap-2">
                <button type="button" disabled={busyId === a.id} onClick={() => onDecide(a.id, 'approved')}
                  className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm shadow-emerald-200 disabled:opacity-60">
                  <Check className="h-4 w-4" /> Approve
                </button>
                <button type="button" disabled={busyId === a.id} onClick={() => onDecide(a.id, 'rejected')}
                  className="inline-flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-700 disabled:opacity-60">
                  <X className="h-4 w-4" /> Reject
                </button>
              </div>
            </motion.article>
          ))}
        </div>
      )}
    </div>
  )
}
