import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  botById, formatTime, stagesToProgress, STAGE_UI,
} from '../data/constants'
import { getLatestQuiz, getProject, listDocuments, projectWsUrl, getMaintainer } from '../lib/api'
import StatusBadge from '../components/StatusBadge'
import StageTracker from '../components/StageTracker'
import { PageSkeleton } from '../components/Skeleton'
import EmptyState from '../components/EmptyState'
import QuizWizard from '../components/QuizWizard'
import { useToast } from '../components/Toast'
import {
  ExternalLink, FileText, GitPullRequest, FlaskConical, Globe, GitBranch, Rocket, ArrowRight,
} from 'lucide-react'

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'documents', label: 'Documents' },
  { id: 'activity', label: 'Activity' },
  { id: 'maintainer', label: 'Maintainer', existingOnly: true },
]

const OUTPUT_ICONS = {
  requirements: FileText, design: FileText, development: GitPullRequest, testing: FlaskConical, deployment: Globe,
}

function buildOutputs(stages = []) {
  const byName = Object.fromEntries(stages.map((s) => [s.name, s]))
  const defaults = {
    requirements: 'Requirements', design: 'Design', development: 'Code / PR',
    testing: 'Test report', deployment: 'Live URL',
  }
  return ['requirements', 'design', 'development', 'testing', 'deployment'].map((name) => {
    const s = byName[name]
    return {
      key: name,
      label: s?.output_label || defaults[name],
      href: s?.output_url || null,
      meta: s?.output_url || (s?.status === 'done' ? 'Complete' : s?.status === 'active' || s?.status === 'clarifying' ? 'In progress' : 'Not started'),
      status: s?.status,
    }
  })
}

export default function ProjectDetail() {
  const { id } = useParams()
  const [params, setParams] = useSearchParams()
  const tab = params.get('tab') || 'overview'
  const toast = useToast()
  const [project, setProject] = useState(null)
  const [quiz, setQuiz] = useState(null)
  const [docs, setDocs] = useState([])
  const [maintainer, setMaintainer] = useState(null)
  const [error, setError] = useState('')
  const [live, setLive] = useState(false)
  const lastEventId = useRef(null)

  const setTab = (id) => setParams(id === 'overview' ? {} : { tab: id })

  const load = useCallback(async () => {
    try {
      const data = await getProject(id)
      setProject(data)
      setError('')
      try { setQuiz(await getLatestQuiz(id)) } catch { setQuiz(null) }
      try { setDocs(await listDocuments(id)) } catch { setDocs([]) }
      if (data.type === 'existing') {
        try { setMaintainer(await getMaintainer(id)) } catch { setMaintainer(null) }
      }
      const newest = data.events?.[0]?.id
      if (newest && lastEventId.current && newest !== lastEventId.current) {
        toast.info(`Update: ${data.events[0].action}`)
      }
      if (newest) lastEventId.current = newest
    } catch (err) {
      setError(err.message)
    }
  }, [id, toast])

  useEffect(() => { load() }, [load])
  useEffect(() => {
    if (!id) return undefined
    let ws
    try {
      ws = new WebSocket(projectWsUrl(id))
      ws.onopen = () => setLive(true)
      ws.onclose = () => setLive(false)
      ws.onerror = () => setLive(false)
      ws.onmessage = () => load()
    } catch { setLive(false) }
    const poll = setInterval(load, 12000)
    return () => { clearInterval(poll); if (ws && ws.readyState <= 1) ws.close() }
  }, [id, load])

  const visibleTabs = useMemo(
    () => TABS.filter((t) => !t.existingOnly || project?.type === 'existing'),
    [project?.type],
  )

  if (error && !project) {
    return (
      <div role="alert" className="mx-auto max-w-xl rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
        {error} — <Link className="font-semibold underline" to="/projects">Back</Link>
      </div>
    )
  }
  if (!project) return <PageSkeleton />

  const active = botById(project.active_bot)
  const progress = stagesToProgress(project.stages)
  const outputs = buildOutputs(project.stages)
  const isDone = project.status === 'done'
  const nextCta = quiz?.status === 'open'
    ? { label: 'Answer clarifying quiz', href: null, scroll: 'quiz' }
    : null

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <Link to="/projects" className="text-xs font-medium text-slate-500 hover:text-indigo-600">Projects</Link>
            <span className="text-slate-300">/</span>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{project.name}</h1>
            <StatusBadge status={project.status} />
            {live && <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700">Live</span>}
          </div>
          <p className="max-w-2xl text-sm text-slate-500">{project.description}</p>
        </div>
        {isDone && (
          <div className="flex flex-wrap gap-2">
            {project.repo_url && (
              <a href={project.repo_url} target="_blank" rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 shadow-sm hover:bg-slate-50">
                <GitBranch className="h-4 w-4" /> Repository
              </a>
            )}
            {outputs.find((o) => o.key === 'deployment' && o.href)?.href && (
              <a href={outputs.find((o) => o.key === 'deployment').href} target="_blank" rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-md shadow-indigo-200 hover:bg-indigo-500">
                <Rocket className="h-4 w-4" /> Open live
              </a>
            )}
          </div>
        )}
      </div>

      <div className="flex gap-1 overflow-x-auto rounded-xl border border-slate-200 bg-white p-1 shadow-sm" role="tablist">
        {visibleTabs.map((t) => (
          <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} onClick={() => setTab(t.id)}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
              tab === t.id ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <div className="space-y-5">
          {isDone && (
            <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl border border-emerald-200 bg-gradient-to-r from-emerald-50 to-white p-5 shadow-sm">
              <div className="text-sm font-semibold text-emerald-800">Pipeline complete</div>
              <p className="mt-1 text-sm text-emerald-700/80">All stages finished. Repo and live deployment are ready.</p>
              <div className="mt-3 flex flex-wrap gap-3 text-sm">
                {project.repo_url && <a className="font-medium text-indigo-600 hover:underline" href={project.repo_url} target="_blank" rel="noreferrer">{project.repo_url}</a>}
                {outputs.find((o) => o.key === 'deployment')?.href && (
                  <a className="font-medium text-indigo-600 hover:underline" href={outputs.find((o) => o.key === 'deployment').href} target="_blank" rel="noreferrer">
                    {outputs.find((o) => o.key === 'deployment').href}
                  </a>
                )}
              </div>
            </motion.div>
          )}

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <StageTracker progress={progress} />
          </section>

          {quiz?.status === 'open' && (
            <div id="quiz">
              <QuizWizard projectId={project.id} quiz={quiz} onDone={load} />
            </div>
          )}

          {!isDone && (
            <div className="grid gap-4 sm:grid-cols-2">
              <section className="rounded-2xl border border-indigo-200 bg-indigo-50/40 p-5 shadow-sm">
                <div className="text-xs font-semibold uppercase tracking-wider text-indigo-600">Active bot</div>
                <div className="mt-3 flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-2xl shadow-sm ring-1 ring-indigo-100">{active?.emoji}</div>
                  <div>
                    <div className="font-semibold text-slate-900">{active?.name}</div>
                    <div className="text-xs text-slate-500">{STAGE_UI[project.current_stage] || project.current_stage}</div>
                  </div>
                </div>
              </section>
              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">Your next step</div>
                {nextCta ? (
                  <button type="button" onClick={() => document.getElementById('quiz')?.scrollIntoView({ behavior: 'smooth' })}
                    className="mt-3 inline-flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white">
                    {nextCta.label} <ArrowRight className="h-4 w-4" />
                  </button>
                ) : (
                  <p className="mt-3 text-sm text-slate-600">No action needed — bots are working. Check Activity for updates.</p>
                )}
                <Link to="/inbox" className="mt-3 inline-block text-sm font-medium text-indigo-600 hover:underline">Open Inbox</Link>
              </section>
            </div>
          )}

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Outputs</h2>
              <button type="button" onClick={() => setTab('documents')} className="text-xs font-semibold text-indigo-600">All documents</button>
            </div>
            <ul className="divide-y divide-slate-100">
              {outputs.map((out) => {
                const Icon = OUTPUT_ICONS[out.key] || FileText
                const internal = out.href?.startsWith('/projects/')
                return (
                  <li key={out.key} className="flex items-center justify-between gap-3 py-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-50 text-slate-600 ring-1 ring-slate-200"><Icon className="h-4 w-4" /></div>
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-slate-800">{out.label}</div>
                        <div className="truncate text-xs text-slate-500">{out.meta}</div>
                      </div>
                    </div>
                    {out.href ? (
                      internal ? (
                        <Link to={out.href} className="text-indigo-600"><ExternalLink className="h-4 w-4" /></Link>
                      ) : (
                        <a href={out.href} target="_blank" rel="noreferrer" className="text-indigo-600"><ExternalLink className="h-4 w-4" /></a>
                      )
                    ) : <span className="text-xs text-slate-300">—</span>}
                  </li>
                )
              })}
            </ul>
          </section>
        </div>
      )}

      {tab === 'documents' && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          {docs.length === 0 ? (
            <EmptyState title="No documents yet" description="When bots upload requirements, design, or reports, they appear here." />
          ) : (
            <ul className="divide-y divide-slate-100">
              {docs.map((d) => (
                <li key={d.id} className="flex items-center justify-between gap-3 py-3">
                  <div>
                    <div className="text-sm font-medium text-slate-900">{d.title}</div>
                    <div className="text-xs text-slate-500">{d.kind.replace('_', ' ')} · {formatTime(d.created_at)}</div>
                  </div>
                  <Link to={`/projects/${id}/docs/${d.id}`} className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white">Open</Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {tab === 'activity' && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <ol className="relative ml-2 border-l border-slate-200">
            {(project.events || []).map((ev) => {
              const bot = botById(ev.bot)
              return (
                <li key={ev.id} className="relative pb-5 pl-5 last:pb-0">
                  <span className="absolute -left-1.5 top-1.5 h-3 w-3 rounded-full border-2 border-white bg-indigo-500" />
                  <div className="text-sm text-slate-800">
                    <span className="mr-1">{bot?.emoji}</span>
                    <span className="font-medium">{bot?.name}</span>
                    <span className="text-slate-500"> — {ev.action}</span>
                  </div>
                  {(ev.reason || ev.details) && <div className="mt-0.5 text-xs text-slate-500 line-clamp-2">{ev.reason || ev.details}</div>}
                  <div className="mt-1 text-[11px] text-slate-400">{formatTime(ev.created_at)}</div>
                </li>
              )
            })}
          </ol>
        </div>
      )}

      {tab === 'maintainer' && project.type === 'existing' && (
        <MaintainerPanel data={maintainer} projectId={project.id} />
      )}
    </div>
  )
}

function MaintainerPanel({ data, projectId }) {
  if (!data) return <EmptyState title="No maintainer scan yet" description="The Maintainer bot posts findings for existing repos." />
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-cyan-200 bg-cyan-50/50 p-5">
        <div className="text-xs font-semibold uppercase tracking-wider text-cyan-700">Health</div>
        <div className="mt-2 flex items-end gap-3">
          <div className="text-4xl font-semibold text-slate-900">{data.health?.score ?? '—'}</div>
          <div className="mb-1 text-sm text-cyan-800">{data.health?.label}</div>
        </div>
        <p className="mt-3 text-sm text-slate-600">{data.summary}</p>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">Issues</h3>
          <ul className="space-y-2">
            {(data.issues || []).map((i) => (
              <li key={i.id} className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-sm">
                <span className="font-medium text-slate-900">{i.title}</span>
                <div className="text-xs text-slate-500">{i.detail}</div>
              </li>
            ))}
            {!data.issues?.length && <li className="text-sm text-slate-500">None</li>}
          </ul>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">Suggestions</h3>
          <ul className="space-y-2">
            {(data.suggestions || []).map((s) => (
              <li key={s.id} className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-sm">
                <span className="font-medium text-slate-900">{s.title}</span>
                <div className="text-xs text-slate-500">{s.description}</div>
              </li>
            ))}
            {!data.suggestions?.length && <li className="text-sm text-slate-500">None</li>}
          </ul>
        </div>
      </div>
    </div>
  )
}
