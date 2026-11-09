import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  FileUp, FolderGit, Lightbulb, Sparkles, Upload, ArrowRight, Bot, GitBranch, Shield, Inbox, FolderKanban,
} from 'lucide-react'
import { createProjectFromFile, createProjectFromIdea, createProjectFromRepo, listProjects, listBots } from '../lib/api'
import { useToast } from '../components/Toast'
import BotSlideshow from '../components/BotSlideshow'
import HeroOrbit from '../components/HeroOrbit'
import CountUp from '../components/CountUp'
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion'
import { staggerContainer, staggerItem } from '../lib/motion'

const MODES = [
  { id: 'idea', title: 'Describe your idea', desc: 'Plain words in. Requirement Gatherer quizzes you, then drafts a full PRD.', Icon: Lightbulb, accent: 'violet' },
  { id: 'new', title: 'Upload a spec', desc: 'Drop a Markdown PRD. Stories and acceptance criteria are extracted.', Icon: FileUp, accent: 'indigo' },
  { id: 'existing', title: 'Existing project', desc: 'Paste a GitHub repo. Maintainer scans first, then the change enters the pipeline.', Icon: FolderGit, accent: 'cyan' },
]

export default function NewRun() {
  const navigate = useNavigate()
  const toast = useToast()
  const reduced = usePrefersReducedMotion()
  const formRef = useRef(null)
  const [mode, setMode] = useState('idea')
  const [repo, setRepo] = useState('')
  const [change, setChange] = useState('')
  const [idea, setIdea] = useState('')
  const [ideaName, setIdeaName] = useState('')
  const [file, setFile] = useState(null)
  const [fileName, setFileName] = useState('')
  const [specName, setSpecName] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [stats, setStats] = useState({ projects: 0, bots: 7, done: 0, stages: 5 })

  useEffect(() => {
    ;(async () => {
      try {
        const [projects, bots] = await Promise.all([listProjects(), listBots().catch(() => [])])
        setStats({
          projects: projects.length,
          bots: bots.length || 7,
          done: projects.filter((p) => p.status === 'done').length,
          stages: 5,
        })
      } catch { /* ignore */ }
    })()
  }, [])

  function selectMode(next) {
    setMode(next)
    setError('')
    // Keep the form on-screen after switching (stacked cards used to leave it below the fold).
    requestAnimationFrame(() => {
      formRef.current?.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'center' })
    })
  }

  async function handleStart() {
    setError('')
    setBusy(true)
    try {
      let project
      if (mode === 'idea') {
        if (!idea.trim()) { setError('Describe what you want to build.'); setBusy(false); return }
        project = await createProjectFromIdea({ name: ideaName.trim() || undefined, ideaText: idea.trim() })
      } else if (mode === 'new') {
        if (!file) { setError('Please upload a .md spec file.'); setBusy(false); return }
        project = await createProjectFromFile({
          file,
          name: specName.trim() || undefined,
          description: change.trim() || undefined,
        })
      } else {
        if (!repo.trim()) { setError('Please enter a GitHub repo URL.'); setBusy(false); return }
        project = await createProjectFromRepo({ repoUrl: repo.trim(), change: change.trim() })
      }
      toast.success(`Started ${project.name}`)
      navigate(`/projects/${project.id}`)
    } catch (err) {
      setError(err.message || 'Failed to start run')
      toast.error(err.message || 'Failed to start run')
    } finally {
      setBusy(false)
    }
  }

  const statCards = [
    { label: 'Projects', value: stats.projects, icon: GitBranch },
    { label: 'Specialist bots', value: stats.bots, icon: Bot },
    { label: 'Pipeline stages', value: stats.stages, icon: Sparkles },
    { label: 'Shipped runs', value: stats.done, icon: Shield },
  ]

  const active = MODES.find((m) => m.id === mode) || MODES[0]

  return (
    <div className="mx-auto max-w-6xl">
      <section className="mesh-hero relative mb-10 overflow-hidden rounded-[2rem] border border-zinc-200/70 px-6 py-12 sm:px-10 sm:py-16 lg:px-14">
        <div className="relative z-10 grid items-center gap-10 lg:grid-cols-2">
          <motion.div
            initial={reduced ? false : { opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="inline-flex items-center gap-2 rounded-full border border-indigo-200/80 bg-white/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-indigo-600 backdrop-blur">
              <Sparkles className="h-3 w-3" />
              Bot-orchestrated SDLC
            </div>
            <h1 className="mt-5 text-[clamp(2.5rem,6vw,4.5rem)] font-semibold leading-[1.05] tracking-[-0.04em] text-zinc-900">
              Ship software with a{' '}
              <span className="bg-gradient-to-r from-indigo-600 via-violet-600 to-fuchsia-500 bg-clip-text text-transparent">
                seven-bot pipeline
              </span>
            </h1>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-zinc-500 sm:text-lg">
              From idea to live URL — Requirements, Design, Dev, Test, Deploy — with human gates where it matters.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a href="#start" className="inline-flex items-center gap-2 rounded-2xl bg-zinc-900 px-5 py-3 text-sm font-semibold text-white shadow-xl shadow-zinc-300/60 transition hover:bg-zinc-800">
                Start a run <ArrowRight className="h-4 w-4" />
              </a>
              <Link to="/projects" className="inline-flex items-center gap-2 rounded-2xl border border-zinc-200 bg-white/80 px-5 py-3 text-sm font-semibold text-zinc-700 backdrop-blur transition hover:border-zinc-300">
                <FolderKanban className="h-4 w-4" /> View projects
              </Link>
              <Link to="/inbox" className="inline-flex items-center gap-2 rounded-2xl border border-zinc-200 bg-white/80 px-5 py-3 text-sm font-semibold text-zinc-700 backdrop-blur transition hover:border-zinc-300">
                <Inbox className="h-4 w-4" /> Inbox
              </Link>
            </div>
          </motion.div>
          <motion.div
            initial={reduced ? false : { opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.55, delay: 0.1 }}
            className="relative"
          >
            <HeroOrbit />
          </motion.div>
        </div>

        <div className="relative z-10 mt-12 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {statCards.map((s) => {
            const Icon = s.icon
            return (
              <div key={s.label} className="glass rounded-2xl px-4 py-3">
                <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                  <Icon className="h-3.5 w-3.5" /> {s.label}
                </div>
                <div className="mt-1 text-2xl font-semibold tabular-nums tracking-tight text-zinc-900">
                  <CountUp value={s.value} />
                </div>
              </div>
            )
          })}
        </div>
      </section>

      <div id="crew" className="mb-12 scroll-mt-24">
        <div className="mb-4">
          <h2 className="text-xl font-semibold tracking-tight text-zinc-900">How the crew works</h2>
          <p className="mt-1 text-sm text-zinc-500">Each specialist owns a stage — auto-advancing tour of all seven.</p>
        </div>
        <BotSlideshow />
      </div>

      <div id="start" className="mb-6 scroll-mt-24">
        <h2 className="text-xl font-semibold tracking-tight text-zinc-900">Start a new run</h2>
        <p className="mt-1.5 text-sm text-zinc-500">Idea, spec, or existing repo — Orchestrator routes the rest.</p>
      </div>

      {/* Compact mode tabs — always on one row so the form stays adjacent */}
      <div
        role="tablist"
        aria-label="How to start"
        className="mb-4 flex gap-2 overflow-x-auto rounded-2xl border border-zinc-200 bg-zinc-50/80 p-1.5"
      >
        {MODES.map((card) => {
          const Icon = card.Icon
          const isActive = mode === card.id
          return (
            <button
              key={card.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              aria-controls="run-form"
              id={`mode-tab-${card.id}`}
              onClick={() => selectMode(card.id)}
              className={[
                'flex min-w-0 flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold transition',
                isActive
                  ? card.accent === 'violet'
                    ? 'bg-white text-violet-700 shadow-sm ring-1 ring-violet-200'
                    : card.accent === 'indigo'
                      ? 'bg-white text-indigo-700 shadow-sm ring-1 ring-indigo-200'
                      : 'bg-white text-cyan-700 shadow-sm ring-1 ring-cyan-200'
                  : 'text-zinc-500 hover:bg-white/70 hover:text-zinc-800',
              ].join(' ')}
            >
              <Icon className="h-4 w-4 shrink-0" aria-hidden />
              <span className="truncate">{card.title}</span>
            </button>
          )
        })}
      </div>

      {/* Detail cards kept for clarity on large screens */}
      <motion.div className="mb-4 hidden gap-4 lg:grid lg:grid-cols-3" variants={staggerContainer(reduced)} initial="initial" animate="animate">
        {MODES.map((card) => {
          const isActive = mode === card.id
          const Icon = card.Icon
          return (
            <motion.button
              key={card.id}
              type="button"
              variants={staggerItem(reduced)}
              onClick={() => selectMode(card.id)}
              whileHover={reduced ? undefined : { y: -4 }}
              className={[
                'rounded-2xl border p-5 text-left transition',
                isActive
                  ? card.accent === 'violet'
                    ? 'border-violet-300 bg-violet-50/80 shadow-lg shadow-violet-100 ring-2 ring-violet-100'
                    : card.accent === 'indigo'
                      ? 'border-indigo-300 bg-indigo-50/70 shadow-lg shadow-indigo-100 ring-2 ring-indigo-100'
                      : 'border-cyan-300 bg-cyan-50/70 shadow-lg shadow-cyan-100 ring-2 ring-cyan-100'
                  : 'glass-deep hover:border-zinc-300',
              ].join(' ')}
              aria-pressed={isActive}
            >
              <div className={`mb-3 flex h-11 w-11 items-center justify-center rounded-xl ${
                card.accent === 'violet' ? 'bg-violet-100 text-violet-600' :
                card.accent === 'indigo' ? 'bg-indigo-100 text-indigo-600' : 'bg-cyan-100 text-cyan-600'
              }`}>
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="text-base font-semibold text-zinc-900">{card.title}</h3>
              <p className="mt-1 text-sm text-zinc-500">{card.desc}</p>
            </motion.button>
          )
        })}
      </motion.div>

      <p className="mb-3 text-sm text-zinc-500 lg:hidden">{active.desc}</p>

      <div
        id="run-form"
        ref={formRef}
        role="tabpanel"
        aria-labelledby={`mode-tab-${mode}`}
        className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm"
        data-mode={mode}
      >
        {mode === 'idea' && (
          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-zinc-600" htmlFor="idea-name">Project name (optional)</label>
              <input id="idea-name" value={ideaName} onChange={(e) => setIdeaName(e.target.value)} placeholder="e.g. Habit Tracker"
                className="w-full rounded-xl border border-zinc-200 px-3 py-2.5 text-sm transition focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-200" />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-zinc-600" htmlFor="idea-text">What do you want to build?</label>
              <textarea id="idea-text" value={idea} onChange={(e) => setIdea(e.target.value)} rows={7}
                placeholder="In plain words: who it’s for, what it should do, platforms, must-haves, constraints…"
                className="w-full resize-y rounded-xl border border-zinc-200 px-3 py-2.5 text-sm leading-relaxed transition focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-200" />
            </div>
          </div>
        )}

        {mode === 'new' && (
          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-zinc-600" htmlFor="spec-name">Project name (optional)</label>
              <input id="spec-name" value={specName} onChange={(e) => setSpecName(e.target.value)} placeholder="e.g. Tiny Todo API"
                className="w-full rounded-xl border border-zinc-200 px-3 py-2.5 text-sm transition focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200" />
            </div>
            <label
              className="flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-zinc-300 bg-zinc-50 px-4 py-12 transition hover:border-indigo-400 hover:bg-indigo-50/30"
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault()
                const f = e.dataTransfer.files?.[0]
                if (f) { setFile(f); setFileName(f.name) }
              }}
            >
              <Upload className="mb-2 h-8 w-8 text-zinc-400" aria-hidden />
              <span className="text-sm text-zinc-700">{fileName || 'Drop your .md spec here, or click to browse'}</span>
              <span className="mt-1 text-xs text-zinc-400">Markdown only (.md)</span>
              <input
                type="file"
                name="spec_file"
                accept=".md,text/markdown"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  setFile(f || null)
                  setFileName(f?.name || '')
                }}
              />
            </label>
          </div>
        )}

        {mode === 'existing' && (
          <div className="space-y-3">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-zinc-600" htmlFor="repo-url">GitHub repo URL</label>
              <input id="repo-url" value={repo} onChange={(e) => setRepo(e.target.value)} placeholder="https://github.com/acme/app"
                className="w-full rounded-xl border border-zinc-200 px-3 py-2.5 text-sm focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-200" />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-zinc-600" htmlFor="repo-change">Describe the change</label>
              <textarea id="repo-change" value={change} onChange={(e) => setChange(e.target.value)} rows={4}
                placeholder="What should Maintainer and the pipeline do to this repo?"
                className="w-full resize-none rounded-xl border border-zinc-200 px-3 py-2.5 text-sm focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-200" />
            </div>
          </div>
        )}
      </div>

      {error && <div role="alert" className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{error}</div>}

      <div className="mt-5 flex flex-col gap-3 rounded-2xl border border-zinc-200 bg-white px-6 py-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3 text-sm text-zinc-500">
          <Sparkles className="h-4 w-4 text-violet-500" />
          {mode === 'idea'
            ? 'Requirement Gatherer will ask clarifying questions, then write your requirements doc.'
            : mode === 'new'
              ? 'Orchestrator will ingest your .md spec and open the pipeline.'
              : 'Maintainer scans the repo first, then Orchestrator routes your change.'}
        </div>
        <button type="button" disabled={busy} onClick={handleStart}
          className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-indigo-200 transition hover:bg-indigo-500 disabled:opacity-60">
          {busy ? 'Starting…' : 'Start run'}
        </button>
      </div>
    </div>
  )
}
