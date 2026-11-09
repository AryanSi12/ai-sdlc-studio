import { useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowLeft, ArrowRight, Check, Sparkles } from 'lucide-react'
import { submitQuizAnswers } from '../lib/api'
import { useToast } from './Toast'

export default function QuizWizard({ projectId, quiz, onDone }) {
  const toast = useToast()
  const questions = quiz?.questions || []
  const [step, setStep] = useState(0)
  const [answers, setAnswers] = useState({})
  const [phase, setPhase] = useState('questions') // questions | review | submitting | success
  const [error, setError] = useState('')

  const total = questions.length
  const current = questions[step]
  const progress = total ? Math.round(((phase === 'review' || phase === 'success' ? total : step) / total) * 100) : 0

  const canNext = useMemo(() => {
    if (!current) return false
    if (!current.required) return true
    const v = answers[current.id]
    if (current.kind === 'multi') return Array.isArray(v) && v.length > 0
    if (current.kind === 'text') return typeof v === 'string' && v.trim().length > 0
    return v !== undefined && v !== null && v !== ''
  }, [answers, current])

  function setValue(qid, value) {
    setAnswers((a) => ({ ...a, [qid]: value }))
  }

  function toggleMulti(qid, opt) {
    setAnswers((a) => {
      const cur = Array.isArray(a[qid]) ? a[qid] : []
      return { ...a, [qid]: cur.includes(opt) ? cur.filter((x) => x !== opt) : [...cur, opt] }
    })
  }

  async function submit() {
    setPhase('submitting')
    setError('')
    try {
      const payload = Object.entries(answers).map(([question_id, value]) => ({ question_id, value }))
      await submitQuizAnswers(projectId, quiz.id, payload)
      setPhase('success')
      toast.success('Answers submitted')
      setTimeout(() => onDone?.(), 1400)
    } catch (err) {
      setError(err.message)
      setPhase('review')
      toast.error(err.message)
    }
  }

  if (!quiz || quiz.status !== 'open' || !total) return null

  return (
    <section className="rounded-2xl border border-violet-200 bg-gradient-to-br from-violet-50 via-white to-white p-6 shadow-sm" aria-label="Clarifying quiz">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider text-violet-600">Needs your input</div>
          <h2 className="text-lg font-semibold text-slate-900">Clarifying quiz · round {quiz.round_number}</h2>
        </div>
        <div className="text-xs font-medium text-slate-500">
          {phase === 'review' ? 'Review' : phase === 'success' ? 'Done' : `Question ${Math.min(step + 1, total)} of ${total}`}
        </div>
      </div>

      <div className="mb-6 h-2 overflow-hidden rounded-full bg-violet-100" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
        <motion.div className="h-full bg-violet-500" animate={{ width: `${progress}%` }} transition={{ duration: 0.35 }} />
      </div>

      <AnimatePresence mode="wait">
        {phase === 'questions' && current && (
          <motion.div key={current.id} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }}>
            <p className="text-base font-medium text-slate-900">{current.text}</p>
            {current.help && <p className="mt-1 text-sm text-slate-500">{current.help}</p>}

            <div className="mt-5 space-y-2">
              {current.kind === 'single' && (current.options || []).map((opt) => (
                <button key={opt} type="button" onClick={() => setValue(current.id, opt)}
                  className={`flex w-full items-center rounded-xl border px-4 py-3 text-left text-sm transition ${
                    answers[current.id] === opt ? 'border-violet-400 bg-violet-50 text-violet-900 ring-2 ring-violet-100' : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}>
                  {opt}
                </button>
              ))}
              {current.kind === 'multi' && (current.options || []).map((opt) => {
                const selected = Array.isArray(answers[current.id]) && answers[current.id].includes(opt)
                return (
                  <button key={opt} type="button" onClick={() => toggleMulti(current.id, opt)}
                    className={`flex w-full items-center rounded-xl border px-4 py-3 text-left text-sm transition ${
                      selected ? 'border-violet-400 bg-violet-50 text-violet-900' : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}>
                    <span className={`mr-3 flex h-4 w-4 items-center justify-center rounded border ${selected ? 'border-violet-500 bg-violet-500 text-white' : 'border-slate-300'}`}>
                      {selected && <Check className="h-3 w-3" />}
                    </span>
                    {opt}
                  </button>
                )
              })}
              {current.kind === 'text' && (
                <textarea
                  rows={4}
                  value={answers[current.id] || ''}
                  onChange={(e) => setValue(current.id, e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-200"
                  placeholder="Type your answer…"
                />
              )}
              {current.kind === 'scale' && (
                <div className="flex flex-wrap gap-2">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button key={n} type="button" onClick={() => setValue(current.id, n)}
                      className={`h-11 w-11 rounded-xl border text-sm font-semibold transition ${
                        answers[current.id] === n ? 'border-violet-500 bg-violet-600 text-white' : 'border-slate-200 bg-white text-slate-700 hover:border-violet-300'
                      }`}
                      aria-label={`Scale ${n}`}>
                      {n}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-between">
              <button type="button" disabled={step === 0} onClick={() => setStep((s) => s - 1)}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 disabled:opacity-40">
                <ArrowLeft className="h-4 w-4" /> Back
              </button>
              {step < total - 1 ? (
                <button type="button" disabled={!canNext} onClick={() => setStep((s) => s + 1)}
                  className="inline-flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40">
                  Next <ArrowRight className="h-4 w-4" />
                </button>
              ) : (
                <button type="button" disabled={!canNext} onClick={() => setPhase('review')}
                  className="inline-flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40">
                  Review <ArrowRight className="h-4 w-4" />
                </button>
              )}
            </div>
          </motion.div>
        )}

        {phase === 'review' && (
          <motion.div key="review" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
            <h3 className="mb-3 text-sm font-semibold text-slate-800">Review your answers</h3>
            <ul className="space-y-3">
              {questions.map((q) => (
                <li key={q.id} className="rounded-xl border border-slate-100 bg-slate-50/80 px-4 py-3">
                  <div className="text-xs font-medium text-slate-500">{q.text}</div>
                  <div className="mt-1 text-sm text-slate-900">
                    {Array.isArray(answers[q.id]) ? answers[q.id].join(', ') : String(answers[q.id] ?? '—')}
                  </div>
                </li>
              ))}
            </ul>
            {error && <div className="mt-3 text-sm text-rose-600">{error}</div>}
            <div className="mt-6 flex justify-between">
              <button type="button" onClick={() => setPhase('questions')} className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600">
                Back
              </button>
              <button type="button" onClick={submit} className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white">
                Submit answers
              </button>
            </div>
          </motion.div>
        )}

        {(phase === 'submitting' || phase === 'success') && (
          <motion.div key="done" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="py-10 text-center">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-violet-100 text-violet-600">
              {phase === 'success' ? <Check className="h-7 w-7" /> : <Sparkles className="h-7 w-7 animate-pulse" />}
            </div>
            <p className="text-base font-semibold text-slate-900">
              {phase === 'success' ? 'Got it — thank you!' : 'Submitting…'}
            </p>
            <p className="mt-2 text-sm text-slate-500">
              Requirement Gatherer is writing your requirements…
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  )
}
