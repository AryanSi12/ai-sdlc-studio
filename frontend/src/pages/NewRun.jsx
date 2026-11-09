import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { FileUp, FolderGit, Lightbulb, Sparkles, Upload } from 'lucide-react'
import { createProjectFromFile, createProjectFromIdea, createProjectFromRepo } from '../lib/api'
import { useToast } from '../components/Toast'

export default function NewRun() {
  const navigate = useNavigate()
  const toast = useToast()
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
    { id: 'idea', title: 'Describe your idea', desc: 'Write in plain words. Requirement Gatherer will quiz you, then draft a full requirements doc.', Icon: Lightbulb, accent: 'violet', primary: true },
    { id: 'new', title: 'Upload a spec', desc: 'Drop a Markdown PRD. Stories and acceptance criteria are extracted from it.', Icon: FileUp, accent: 'indigo' },
    { id: 'existing', title: 'Existing project', desc: 'Paste a GitHub repo. Maintainer scans it first, then the change enters the pipeline.', Icon: FolderGit, accent: 'cyan' },
  ]

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Start a new run</h1>
        <p className="mt-2 text-sm text-slate-500">
          Describe an idea, upload a spec, or connect an existing repo. The Orchestrator routes the rest.
        </p>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        {cards.map((card, i) => {
          const active = mode === card.id
          const Icon = card.Icon
          return (
            <motion.button
              key={card.id}
              type="button"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              onClick={() => setMode(card.id)}
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.99 }}
              className={[
                'rounded-2xl border p-5 text-left shadow-sm transition',
                active
                  ? card.accent === 'violet'
                    ? 'border-violet-300 bg-violet-50/70 ring-2 ring-violet-100 lg:col-span-1'
                    : card.accent === 'indigo'
                      ? 'border-indigo-300 bg-indigo-50/60 ring-2 ring-indigo-100'
                      : 'border-cyan-300 bg-cyan-50/60 ring-2 ring-cyan-100'
                  : 'border-slate-200 bg-white hover:border-slate-300',
                card.primary && !active ? 'border-violet-100' : '',
              ].join(' ')}
              aria-pressed={active}
            >
              <div className={`mb-3 flex h-11 w-11 items-center justify-center rounded-xl ${
                card.accent === 'violet' ? 'bg-violet-100 text-violet-600' :
                card.accent === 'indigo' ? 'bg-indigo-100 text-indigo-600' : 'bg-cyan-100 text-cyan-600'
              }`}>
                <Icon className="h-5 w-5" />
              </div>
              <h2 className="text-base font-semibold text-slate-900">{card.title}</h2>
              <p className="mt-1 text-sm text-slate-500">{card.desc}</p>
            </motion.button>
          )
        })}
      </div>

      <motion.div layout className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        {mode === 'idea' && (
          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-600">Project name (optional)</label>
              <input
                value={ideaName}
                onChange={(e) => setIdeaName(e.target.value)}
                placeholder="e.g. Habit Tracker"
                className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-200"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-600">What do you want to build?</label>
              <textarea
                value={idea}
                onChange={(e) => setIdea(e.target.value)}
                rows={7}
                placeholder="In plain words: who it’s for, what it should do, platforms, must-haves, constraints…"
                className="w-full resize-y rounded-lg border border-slate-200 px-3 py-2.5 text-sm leading-relaxed focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-200"
              />
            </div>
          </div>
        )}

        {mode === 'new' && (
          <label
            className="flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-12 transition hover:border-indigo-400"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault()
              const f = e.dataTransfer.files?.[0]
              if (f) { setFile(f); setFileName(f.name) }
            }}
          >
            <Upload className="mb-2 h-8 w-8 text-slate-400" />
            <span className="text-sm text-slate-700">{fileName || 'Drop your .md spec here, or click to browse'}</span>
            <input type="file" accept=".md,text/markdown" className="hidden" onChange={(e) => {
              const f = e.target.files?.[0]
              setFile(f || null)
              setFileName(f?.name || '')
            }} />
          </label>
        )}

        {mode === 'existing' && (
          <div className="space-y-3">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-600">GitHub repo URL</label>
              <input value={repo} onChange={(e) => setRepo(e.target.value)} placeholder="https://github.com/acme/app"
                className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-200" />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-600">Describe the change</label>
              <textarea value={change} onChange={(e) => setChange(e.target.value)} rows={4}
                className="w-full resize-none rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-200" />
            </div>
          </div>
        )}
      </motion.div>

      {error && (
        <div role="alert" className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{error}</div>
      )}

      <div className="mt-6 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white px-6 py-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3 text-sm text-slate-500">
          <Sparkles className="h-4 w-4 text-violet-500" />
          {mode === 'idea'
            ? 'Requirement Gatherer will ask clarifying questions, then write your requirements doc.'
            : 'Orchestrator creates the project, assigns bots, and opens approval gates.'}
        </div>
        <button type="button" disabled={busy} onClick={handleStart}
          className="rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-indigo-200 transition hover:bg-indigo-500 disabled:opacity-60">
          {busy ? 'Starting…' : 'Start run'}
        </button>
      </div>
    </div>
  )
}
