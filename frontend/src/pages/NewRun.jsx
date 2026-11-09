import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { FileUp, FolderGit, Lightbulb, Sparkles, Upload, ArrowRight } from 'lucide-react'
import { createProjectFromFile, createProjectFromIdea, createProjectFromRepo } from '../lib/api'
import { useToast } from '../components/Toast'
import BotSlideshow from '../components/BotSlideshow'
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion'
import { staggerContainer, staggerItem } from '../lib/motion'

export default function NewRun() {
  const navigate = useNavigate()
  const toast = useToast()
  const reduced = usePrefersReducedMotion()
  const [mode, setMode] = useState('idea')
  const [repo, setRepo] = useState('')
  const [change, setChange] = useState('')
  const [idea, setIdea] = useState('')
  const [ideaName, setIdeaName] = useState('')
  const [file, setFile] = useState(null)
  const [fileName, setFileName] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function handleStart() {
    setError('')
    setBusy(true)
    try {
      let project
      if (mode === 'idea') {
        if (!idea.trim()) {
          setError('Describe what you want to build.')
          setBusy(false)
          return
        }
        project = await createProjectFromIdea({ name: ideaName.trim() || undefined, ideaText: idea.trim() })
      } else if (mode === 'new') {
        if (!file) {
          setError('Please upload a .md spec file.')
          setBusy(false)
          return
        }
        project = await createProjectFromFile({ file, description: change || undefined })
      } else {
        if (!repo.trim()) {
          setError('Please enter a GitHub repo URL.')
          setBusy(false)
          return
        }
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

  const cards = [
    { id: 'idea', title: 'Describe your idea', desc: 'Plain words in. Requirement Gatherer quizzes you, then drafts a full PRD.', Icon: Lightbulb, accent: 'violet' },
    { id: 'new', title: 'Upload a spec', desc: 'Drop a Markdown PRD. Stories and acceptance criteria are extracted.', Icon: FileUp, accent: 'indigo' },
    { id: 'existing', title: 'Existing project', desc: 'Paste a GitHub repo. Maintainer scans first, then the change enters the pipeline.', Icon: FolderGit, accent: 'cyan' },
  ]

  return (
    <div className="mx-auto max-w-5xl">
      {/* Hero */}
      <section className="mesh-hero relative mb-10 overflow-hidden rounded-[1.75rem] border border-zinc-200/70 px-6 py-10 sm:px-10 sm:py-14">
        <motion.div
          initial={reduced ? false : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          className="relative z-10 max-w-2xl"
        >
          <div className="inline-flex items-center gap-2 rounded-full border border-indigo-200/70 bg-white/70 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-indigo-600 backdrop-blur">
            <Sparkles className="h-3 w-3" />
            Bot-orchestrated SDLC
          </div>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight text-zinc-900 sm:text-4xl sm:leading-[1.15]">
            Ship software with a{' '}
            <span className="bg-gradient-to-r from-indigo-600 via-violet-600 to-fuchsia-500 bg-clip-text text-transparent">
              seven-bot pipeline
            </span>
          </h1>
          <p className="mt-4 max-w-xl text-base leading-relaxed text-zinc-500">
            From idea to live URL — Requirements, Design, Dev, Test, Deploy — with human gates where it matters.
          </p>
          <a
            href="#start"
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-zinc-300/50 transition hover:bg-zinc-800"
          >
            Start a run <ArrowRight className="h-4 w-4" />
          </a>
        </motion.div>
        {!reduced && (
          <motion.div
            aria-hidden
            className="pointer-events-none absolute -right-10 -top-10 h-56 w-56 rounded-full bg-indigo-400/20 blur-3xl"
            animate={{ scale: [1, 1.15, 1], opacity: [0.4, 0.7, 0.4] }}
            transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
          />
        )}
      </section>

      <div className="mb-10">
        <BotSlideshow />
      </div>

      <div id="start" className="mb-6 scroll-mt-24">
        <h2 className="text-xl font-semibold tracking-tight text-zinc-900">Start a new run</h2>
        <p className="mt-1.5 text-sm text-zinc-500">Idea, spec, or existing repo — Orchestrator routes the rest.</p>
      </div>

      <motion.div
        className="grid gap-4 lg:grid-cols-3"
        variants={staggerContainer(reduced)}
        initial="initial"
        animate="animate"
      >
        {cards.map((card) => {
          const active = mode === card.id
          const Icon = card.Icon
          return (
            <motion.button
              key={card.id}
              type="button"
              variants={staggerItem(reduced)}
              onClick={() => setMode(card.id)}
              whileHover={reduced ? undefined : { y: -3 }}
              whileTap={reduced ? undefined : { scale: 0.99 }}
              className={[
                'rounded-2xl border p-5 text-left shadow-sm transition',
                active
                  ? card.accent === 'violet'
                    ? 'border-violet-300 bg-violet-50/80 ring-2 ring-violet-100'
                    : card.accent === 'indigo'
                      ? 'border-indigo-300 bg-indigo-50/70 ring-2 ring-indigo-100'
                      : 'border-cyan-300 bg-cyan-50/70 ring-2 ring-cyan-100'
                  : 'border-zinc-200 bg-white hover:border-zinc-300',
              ].join(' ')}
              aria-pressed={active}
            >
              <div
                className={`mb-3 flex h-11 w-11 items-center justify-center rounded-xl ${
                  card.accent === 'violet'
                    ? 'bg-violet-100 text-violet-600'
                    : card.accent === 'indigo'
                      ? 'bg-indigo-100 text-indigo-600'
                      : 'bg-cyan-100 text-cyan-600'
                }`}
              >
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="text-base font-semibold text-zinc-900">{card.title}</h3>
              <p className="mt-1 text-sm text-zinc-500">{card.desc}</p>
            </motion.button>
          )
        })}
      </motion.div>

      <motion.div layout className="mt-5 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        {mode === 'idea' && (
          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-zinc-600">Project name (optional)</label>
              <input
                value={ideaName}
                onChange={(e) => setIdeaName(e.target.value)}
                placeholder="e.g. Habit Tracker"
                className="w-full rounded-xl border border-zinc-200 px-3 py-2.5 text-sm transition focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-200"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-zinc-600">What do you want to build?</label>
              <textarea
                value={idea}
                onChange={(e) => setIdea(e.target.value)}
                rows={7}
                placeholder="In plain words: who it’s for, what it should do, platforms, must-haves, constraints…"
                className="w-full resize-y rounded-xl border border-zinc-200 px-3 py-2.5 text-sm leading-relaxed transition focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-200"
              />
            </div>
          </div>
        )}

        {mode === 'new' && (
          <label
            className="flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-zinc-300 bg-zinc-50 px-4 py-12 transition hover:border-indigo-400 hover:bg-indigo-50/30"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault()
              const f = e.dataTransfer.files?.[0]
              if (f) {
                setFile(f)
                setFileName(f.name)
              }
            }}
          >
            <Upload className="mb-2 h-8 w-8 text-zinc-400" />
            <span className="text-sm text-zinc-700">{fileName || 'Drop your .md spec here, or click to browse'}</span>
            <input
              type="file"
              accept=".md,text/markdown"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0]
                setFile(f || null)
                setFileName(f?.name || '')
              }}
            />
          </label>
        )}

        {mode === 'existing' && (
          <div className="space-y-3">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-zinc-600">GitHub repo URL</label>
              <input
                value={repo}
                onChange={(e) => setRepo(e.target.value)}
                placeholder="https://github.com/acme/app"
                className="w-full rounded-xl border border-zinc-200 px-3 py-2.5 text-sm focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-200"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-zinc-600">Describe the change</label>
              <textarea
                value={change}
                onChange={(e) => setChange(e.target.value)}
                rows={4}
                className="w-full resize-none rounded-xl border border-zinc-200 px-3 py-2.5 text-sm focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-200"
              />
            </div>
          </div>
        )}
      </motion.div>

      {error && (
        <div role="alert" className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          {error}
        </div>
      )}

      <div className="mt-5 flex flex-col gap-3 rounded-2xl border border-zinc-200 bg-white px-6 py-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3 text-sm text-zinc-500">
          <Sparkles className="h-4 w-4 text-violet-500" />
          {mode === 'idea'
            ? 'Requirement Gatherer will ask clarifying questions, then write your requirements doc.'
            : 'Orchestrator creates the project, assigns bots, and opens approval gates.'}
        </div>
        <button
          type="button"
          disabled={busy}
          onClick={handleStart}
          className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-indigo-200 transition hover:bg-indigo-500 disabled:opacity-60"
        >
          {busy ? 'Starting…' : 'Start run'}
        </button>
      </div>
    </div>
  )
}
