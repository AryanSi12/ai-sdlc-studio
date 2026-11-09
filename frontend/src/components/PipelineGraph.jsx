import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Check, Shield, X } from 'lucide-react'
import { Link } from 'react-router-dom'
import { STAGE_BOT, STAGE_UI, botById } from '../data/constants'
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion'

const STAGE_KEYS = ['requirements', 'design', 'development', 'testing', 'deployment']

function stageState(stages, key) {
  const s = (stages || []).find((x) => x.name === key)
  return s?.status || 'pending'
}

function NodeCard({ label, state, bot, selected, onSelect, reduced, gate }) {
  const isDone = state === 'done'
  const isActive = state === 'active' || state === 'clarifying'
  const isFailed = state === 'failed'
  const hex = bot?.hex || '#5b5bd6'

  return (
    <motion.button
      type="button"
      onClick={onSelect}
      whileHover={reduced ? undefined : { y: -2, scale: 1.02 }}
      whileTap={reduced ? undefined : { scale: 0.98 }}
      animate={
        isActive && !reduced
          ? { boxShadow: [`0 0 0 0 ${hex}00`, `0 0 0 8px ${hex}22`, `0 0 0 0 ${hex}00`] }
          : {}
      }
      transition={isActive && !reduced ? { duration: 2, repeat: Infinity } : { duration: 0.2 }}
      className={[
        'group relative flex w-full flex-col items-center justify-center rounded-2xl border text-center transition',
        gate ? 'min-h-[56px] px-2 py-2' : 'min-h-[76px] px-3 py-2.5',
        isDone && 'border-emerald-300 bg-emerald-50/90',
        isActive && 'border-indigo-300 bg-white',
        isFailed && 'border-rose-300 bg-rose-50',
        !isDone && !isActive && !isFailed && 'border-zinc-200 bg-white/95',
        selected && 'ring-2 ring-indigo-300 ring-offset-2',
        gate && 'border-dashed border-amber-300/80',
      ]
        .filter(Boolean)
        .join(' ')}
      style={isActive ? { boxShadow: `0 10px 30px -12px ${hex}88` } : undefined}
      aria-pressed={selected}
      aria-label={`${label}: ${state}`}
    >
      {gate ? (
        <Shield className={`mb-1 h-4 w-4 ${isDone ? 'text-emerald-600' : isActive ? 'text-amber-600' : 'text-zinc-400'}`} />
      ) : (
        <div className="mb-1.5 flex h-8 w-8 items-center justify-center rounded-xl" style={{ background: `${hex}18` }}>
          {isDone ? (
            <motion.span
              initial={reduced ? false : { scale: 0.4, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 380, damping: 18 }}
            >
              <Check className="h-4 w-4 text-emerald-600" strokeWidth={2.5} />
            </motion.span>
          ) : (
            <img src={bot?.image} alt="" className="h-5 w-5" width={20} height={20} />
          )}
        </div>
      )}
      <span
        className={`text-[11px] font-semibold leading-tight ${
          isActive ? 'text-indigo-700' : isDone ? 'text-emerald-800' : isFailed ? 'text-rose-700' : 'text-zinc-600'
        }`}
      >
        {label}
      </span>
      {isActive && !gate && <span className="mt-0.5 text-[10px] font-medium text-indigo-500">Active</span>}
      {gate && isActive && <span className="mt-0.5 text-[10px] font-medium text-amber-600">Awaiting you</span>}
    </motion.button>
  )
}

function Connector({ active, done, fail, vertical, reduced }) {
  const base = fail ? 'bg-rose-200' : done ? 'bg-emerald-300' : active ? 'bg-indigo-200' : 'bg-zinc-200'
  return (
    <div
      className={`relative overflow-hidden ${vertical ? 'mx-auto h-8 w-0.5' : 'mx-1 h-0.5 w-full min-w-[12px] flex-1'} ${base}`}
      aria-hidden
    >
      {active && !reduced && (
        <motion.div
          className={`absolute ${vertical ? 'left-0 w-full' : 'top-0 h-full'} rounded-full bg-indigo-500`}
          style={vertical ? { height: '40%' } : { width: '40%' }}
          animate={vertical ? { y: ['-100%', '250%'] } : { x: ['-100%', '250%'] }}
          transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}
        />
      )}
      {fail && active && !reduced && (
        <motion.div
          className={`absolute ${vertical ? 'left-0 w-full bg-rose-500' : 'top-0 h-full bg-rose-500'}`}
          style={vertical ? { height: '35%' } : { width: '35%' }}
          animate={vertical ? { y: ['250%', '-100%'] } : { x: ['250%', '-100%'] }}
          transition={{ duration: 1.4, repeat: Infinity, ease: 'linear' }}
        />
      )}
    </div>
  )
}

function FailLoopEdge({ active, reduced, vertical }) {
  if (!active && !vertical) {
    return (
      <div className="pointer-events-none absolute inset-x-0 -bottom-5 flex justify-center" aria-hidden>
        <svg width="70%" height="28" viewBox="0 0 400 28" className="overflow-visible">
          <path d="M 320 0 C 320 22, 80 22, 80 0" fill="none" stroke="#fecdd3" strokeWidth="2" strokeDasharray="6 4" />
        </svg>
      </div>
    )
  }
  return (
    <div
      className={
        vertical
          ? 'relative mx-auto my-1 flex h-10 w-16 items-center justify-center'
          : 'pointer-events-none absolute inset-x-0 -bottom-5 flex justify-center'
      }
      aria-hidden
    >
      <svg
        width={vertical ? 64 : '70%'}
        height={vertical ? 40 : 28}
        viewBox={vertical ? '0 0 64 40' : '0 0 400 28'}
        className="overflow-visible"
      >
        <path
          d={vertical ? 'M 48 4 C 62 4, 62 36, 48 36' : 'M 320 0 C 320 22, 80 22, 80 0'}
          fill="none"
          stroke={active ? '#fb7185' : '#fecdd3'}
          strokeWidth="2"
          strokeDasharray="6 4"
        />
        {active && !reduced && (
          <circle r="3" fill="#e11d48">
            <animateMotion
              dur="1.8s"
              repeatCount="indefinite"
              path={vertical ? 'M 48 4 C 62 4, 62 36, 48 36' : 'M 320 0 C 320 22, 80 22, 80 0'}
            />
          </circle>
        )}
      </svg>
      <span className="absolute -bottom-0.5 rounded bg-rose-50 px-1.5 text-[9px] font-semibold text-rose-600 ring-1 ring-rose-200">
        fail → Dev
      </span>
    </div>
  )
}

export default function PipelineGraph({ project, onSelectStage }) {
  const reduced = usePrefersReducedMotion()
  const stages = project?.stages || []
  const [selected, setSelected] = useState(null)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 768px)')
    const on = () => setIsMobile(mq.matches)
    on()
    mq.addEventListener?.('change', on)
    return () => mq.removeEventListener?.('change', on)
  }, [])

  const states = useMemo(() => {
    const m = {}
    for (const k of STAGE_KEYS) m[k] = stageState(stages, k)
    return m
  }, [stages])

  const designGateActive = project?.status === 'waiting_approval' && project?.current_stage === 'design'
  const releaseGateActive = project?.status === 'waiting_approval' && project?.current_stage === 'deployment'
  const designGateDone =
    states.design === 'done' && ['development', 'testing', 'deployment'].some((k) => states[k] !== 'pending')
  const releaseGateDone = states.deployment === 'done'
  const failLoopActive =
    states.testing === 'failed' ||
    (project?.events || []).some((e) => /fail|loop|re-?test|back to (dev|development)/i.test(`${e.action || ''} ${e.reason || ''}`))

  function edgeActive(from, to) {
    if (states[from] === 'done' && (states[to] === 'active' || states[to] === 'clarifying')) return true
    if (states[from] === 'active' || states[from] === 'clarifying') return true
    return false
  }

  function pick(key) {
    setSelected(key)
    if (STAGE_KEYS.includes(key)) onSelectStage?.(key)
  }

  const selectedInfo = (() => {
    if (selected && STAGE_KEYS.includes(selected)) {
      return {
        key: selected,
        label: STAGE_UI[selected],
        state: states[selected],
        bot: botById(STAGE_BOT[selected]),
        stage: (stages || []).find((s) => s.name === selected),
      }
    }
    if (selected === 'gate_design') {
      return {
        key: 'gate_design',
        label: 'Design approval',
        state: designGateActive ? 'active' : designGateDone ? 'done' : 'pending',
        bot: botById('orchestrator'),
        gate: true,
      }
    }
    if (selected === 'gate_release') {
      return {
        key: 'gate_release',
        label: 'Release approval',
        state: releaseGateActive ? 'active' : releaseGateDone ? 'done' : 'pending',
        bot: botById('orchestrator'),
        gate: true,
      }
    }
    return null
  })()

  const nodes = [
    { key: 'requirements', type: 'stage' },
    { key: 'design', type: 'stage' },
    { key: 'gate_design', type: 'gate', label: 'Design gate' },
    { key: 'development', type: 'stage' },
    { key: 'testing', type: 'stage' },
    { key: 'gate_release', type: 'gate', label: 'Release gate' },
    { key: 'deployment', type: 'stage' },
  ]

  function nodeState(key, type) {
    if (type === 'gate') {
      if (key === 'gate_design') return designGateActive ? 'active' : designGateDone ? 'done' : 'pending'
      return releaseGateActive ? 'active' : releaseGateDone ? 'done' : 'pending'
    }
    return states[key]
  }

  function connectorBetween(a, b) {
    // a,b are node keys
    if (a === 'requirements' && b === 'design') return { active: edgeActive('requirements', 'design'), done: states.requirements === 'done' }
    if (a === 'design' && b === 'gate_design') return { active: states.design === 'done' && (designGateActive || designGateDone), done: designGateDone }
    if (a === 'gate_design' && b === 'development') return { active: designGateDone && (states.development !== 'pending' || designGateActive), done: states.development !== 'pending' && designGateDone }
    if (a === 'development' && b === 'testing') return { active: edgeActive('development', 'testing'), done: states.development === 'done' }
    if (a === 'testing' && b === 'gate_release') return { active: states.testing === 'done' || releaseGateActive, done: releaseGateDone }
    if (a === 'gate_release' && b === 'deployment') return { active: releaseGateDone || states.deployment === 'active', done: states.deployment === 'done' }
    return { active: false, done: false }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-400">Pipeline</div>
          <h2 className="text-sm font-semibold text-zinc-900">Live stage graph</h2>
        </div>
        <p className="hidden text-xs text-zinc-400 sm:block">Hover or click a node</p>
      </div>

      <div className="relative overflow-hidden rounded-3xl border border-zinc-200/80 bg-gradient-to-br from-white via-zinc-50/80 to-indigo-50/30 p-4 sm:p-6">
        {isMobile ? (
          <div className="mx-auto flex max-w-[200px] flex-col items-stretch">
            {nodes.map((n, i) => {
              const next = nodes[i + 1]
              const c = next ? connectorBetween(n.key, next.key) : null
              return (
                <div key={n.key} className="relative flex flex-col items-stretch">
                  <NodeCard
                    label={n.type === 'gate' ? n.label : STAGE_UI[n.key]}
                    state={nodeState(n.key, n.type)}
                    bot={n.type === 'gate' ? botById('orchestrator') : botById(STAGE_BOT[n.key])}
                    selected={selected === n.key}
                    onSelect={() => pick(n.key)}
                    reduced={reduced}
                    gate={n.type === 'gate'}
                  />
                  {n.key === 'testing' && (
                    <FailLoopEdge active={failLoopActive} reduced={reduced} vertical />
                  )}
                  {c && <Connector active={c.active} done={c.done} vertical reduced={reduced} />}
                </div>
              )
            })}
          </div>
        ) : (
          <div className="relative pb-8">
            <div className="flex items-center gap-0">
              {nodes.map((n, i) => {
                const next = nodes[i + 1]
                const c = next ? connectorBetween(n.key, next.key) : null
                return (
                  <div key={n.key} className="flex min-w-0 flex-1 items-center">
                    <div className={`w-full ${n.type === 'gate' ? 'max-w-[100px]' : 'max-w-[130px]'} mx-auto`}>
                      <NodeCard
                        label={n.type === 'gate' ? n.label : STAGE_UI[n.key]}
                        state={nodeState(n.key, n.type)}
                        bot={n.type === 'gate' ? botById('orchestrator') : botById(STAGE_BOT[n.key])}
                        selected={selected === n.key}
                        onSelect={() => pick(n.key)}
                        reduced={reduced}
                        gate={n.type === 'gate'}
                      />
                    </div>
                    {c && (
                      <div className="flex w-full min-w-[16px] flex-1 px-1">
                        <Connector active={c.active} done={c.done} reduced={reduced} />
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
            <FailLoopEdge active={failLoopActive} reduced={reduced} />
          </div>
        )}
      </div>

      <AnimatePresence mode="wait">
        {selectedInfo && (
          <motion.div
            key={selectedInfo.key}
            initial={reduced ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduced ? undefined : { opacity: 0, y: 4 }}
            className="glass rounded-2xl p-4 sm:p-5"
            onMouseEnter={() => {}}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <img src={selectedInfo.bot.image} alt="" className="h-10 w-10 rounded-xl" width={40} height={40} />
                <div>
                  <div className="text-xs font-medium text-zinc-400">{selectedInfo.gate ? 'Human gate' : 'Stage bot'}</div>
                  <div className="text-sm font-semibold text-zinc-900">
                    {selectedInfo.label}
                    {!selectedInfo.gate && <> · {selectedInfo.bot.name}</>}
                  </div>
                  <p className="mt-1 text-sm text-zinc-500">
                    {selectedInfo.gate
                      ? selectedInfo.state === 'active'
                        ? 'Waiting for your decision in Inbox.'
                        : selectedInfo.state === 'done'
                          ? 'Gate cleared.'
                          : 'Opens when the prior stage finishes.'
                      : selectedInfo.bot.blurb}
                  </p>
                  {selectedInfo.stage?.output_label && (
                    <div className="mt-2 text-xs text-zinc-500">
                      Output:{' '}
                      {selectedInfo.stage.output_url ? (
                        selectedInfo.stage.output_url.startsWith('/projects/') ? (
                          <Link className="font-medium text-indigo-600 hover:underline" to={selectedInfo.stage.output_url}>
                            {selectedInfo.stage.output_label}
                          </Link>
                        ) : (
                          <a
                            className="font-medium text-indigo-600 hover:underline"
                            href={selectedInfo.stage.output_url}
                            target="_blank"
                            rel="noreferrer"
                          >
                            {selectedInfo.stage.output_label}
                          </a>
                        )
                      ) : (
                        <span className="font-medium text-zinc-700">{selectedInfo.stage.output_label}</span>
                      )}
                    </div>
                  )}
                </div>
              </div>
              <button
                type="button"
                aria-label="Close"
                onClick={() => setSelected(null)}
                className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
