import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Play, RotateCcw, Sparkles, X, FileText, ExternalLink } from 'lucide-react'
import { Link } from 'react-router-dom'
import { STAGE_BOT, STAGE_UI, botById, formatTime, friendlyOutputLabel, isInternalDocPath } from '../data/constants'
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion'

const STAGE_KEYS = ['requirements', 'design', 'development', 'testing', 'deployment']

/** Desktop node centers in viewBox 1000×440 */
const POS = {
  requirements: { x: 90, y: 200 },
  gate_design: { x: 270, y: 200 },
  design: { x: 420, y: 200 },
  development: { x: 580, y: 200 },
  testing: { x: 740, y: 200 },
  gate_release: { x: 880, y: 110 },
  deployment: { x: 880, y: 300 },
}

function stageState(stages, key) {
  return (stages || []).find((x) => x.name === key)?.status || 'pending'
}

function curved(a, b, bend = 0) {
  const mx = (a.x + b.x) / 2
  const my = (a.y + b.y) / 2 + bend
  return `M ${a.x} ${a.y} Q ${mx} ${my} ${b.x} ${b.y}`
}

function Confetti({ show }) {
  if (!show) return null
  const bits = Array.from({ length: 24 }, (_, i) => i)
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {bits.map((i) => (
        <motion.span
          key={i}
          className="absolute h-2 w-2 rounded-sm"
          style={{
            left: `${10 + (i * 37) % 80}%`,
            top: '20%',
            background: ['#818cf8', '#c084fc', '#34d399', '#fbbf24', '#fb7185'][i % 5],
          }}
          initial={{ y: 0, opacity: 1, rotate: 0 }}
          animate={{ y: 180 + (i % 5) * 20, opacity: 0, rotate: 180 + i * 20 }}
          transition={{ duration: 1.4 + (i % 4) * 0.1, ease: 'easeOut' }}
        />
      ))}
    </div>
  )
}

function Node({ id, label, state, bot, gate, selected, onSelect, onHover, replayActive, reduced }) {
  const isDone = state === 'done'
  const isActive = state === 'active' || state === 'clarifying' || replayActive
  const isFailed = state === 'failed'
  const hex = bot?.hex || '#5b5bd6'
  const pos = POS[id]

  return (
    <g transform={`translate(${pos.x}, ${pos.y})`} className="cursor-pointer" onClick={() => onSelect(id)} onMouseEnter={() => onHover?.(id)} onMouseLeave={() => onHover?.(null)}>
      {/* pulse ring */}
      {isActive && !reduced && (
        <motion.circle
          r={gate ? 28 : 42}
          fill="none"
          stroke={hex}
          strokeWidth={2}
          initial={{ opacity: 0.6, scale: 0.9 }}
          animate={{ opacity: [0.55, 0], scale: [1, 1.35] }}
          transition={{ duration: 1.8, repeat: Infinity }}
        />
      )}
      {gate ? (
        <>
          <motion.polygon
            points="0,-26 26,0 0,26 -26,0"
            fill={isDone ? '#ecfdf5' : isActive ? '#fffbeb' : '#fff'}
            stroke={isDone ? '#34d399' : isActive ? '#f59e0b' : '#d4d4d8'}
            strokeWidth={2}
            strokeDasharray={isDone ? undefined : '4 3'}
            whileHover={reduced ? undefined : { scale: 1.06 }}
          />
          {isDone ? (
            <g transform="translate(-8,-8)" stroke="#059669" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="7" width="10" height="8" rx="1.5" />
              <path d="M6 7V5a2 2 0 0 1 4 0" />
            </g>
          ) : isActive ? (
            <g transform="translate(-8,-8)" stroke="#d97706" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="7" width="10" height="8" rx="1.5" />
              <path d="M6 7V5a2 2 0 0 1 4 0v2" />
            </g>
          ) : (
            <g transform="translate(-8,-8)" stroke="#a1a1aa" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M8 2l5 2.5v4c0 3.5-2.2 5.5-5 6.5-2.8-1-5-3-5-6.5v-4L8 2z" />
            </g>
          )}
          <text y={42} textAnchor="middle" className="fill-zinc-600" style={{ fontSize: 11, fontWeight: 600 }}>{label}</text>
        </>
      ) : (
        <>
          <motion.circle
            r={36}
            fill="#fff"
            stroke={isDone ? '#34d399' : isActive ? hex : isFailed ? '#fb7185' : '#e4e4e7'}
            strokeWidth={isActive ? 3 : 2}
            filter={isActive ? 'url(#glow)' : undefined}
            whileHover={reduced ? undefined : { scale: 1.06 }}
          />
          {/* avatar via foreignObject */}
          <foreignObject x={-18} y={-18} width={36} height={36}>
            <div xmlns="http://www.w3.org/1999/xhtml" style={{ width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {isDone ? (
                <div style={{ width: 28, height: 28, borderRadius: 999, background: '#ecfdf5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="3"><path d="M5 13l4 4L19 7" /></svg>
                </div>
              ) : (
                <img src={bot.image} alt="" width={28} height={28} style={{ borderRadius: 8 }} />
              )}
            </div>
          </foreignObject>
          <text y={52} textAnchor="middle" className="fill-zinc-700" style={{ fontSize: 12, fontWeight: 600 }}>{label}</text>
          {isActive && <text y={66} textAnchor="middle" style={{ fontSize: 10, fill: hex, fontWeight: 600 }}>Active</text>}
        </>
      )}
      {selected === id && <circle r={gate ? 32 : 44} fill="none" stroke="#818cf8" strokeWidth={2} strokeDasharray="4 3" />}
    </g>
  )
}

function FlowPath({ d, active, done, fail, reduced }) {
  return (
    <g>
      <path d={d} fill="none" stroke={fail ? '#fecdd3' : done ? '#6ee7b7' : '#e4e4e7'} strokeWidth={fail ? 2.5 : 3} strokeLinecap="round" strokeDasharray={fail ? '7 5' : undefined} />
      {(active || done) && !fail && (
        <path d={d} fill="none" stroke={done ? '#34d399' : 'url(#flowGrad)'} strokeWidth={3} strokeLinecap="round" strokeDasharray={done ? undefined : '12 16'}>
          {active && !reduced && <animate attributeName="stroke-dashoffset" from="56" to="0" dur="1.1s" repeatCount="indefinite" />}
        </path>
      )}
      {active && !reduced && !fail && (
        <>
          {[0, 0.4, 0.8].map((delay) => (
            <circle key={delay} r="3.5" fill="#6366f1">
              <animateMotion dur="1.7s" begin={`${delay}s`} repeatCount="indefinite" path={d} />
              <animate attributeName="opacity" values="0;1;1;0" dur="1.7s" begin={`${delay}s`} repeatCount="indefinite" />
            </circle>
          ))}
        </>
      )}
      {fail && active && !reduced && (
        <circle r="3.5" fill="#e11d48">
          <animateMotion dur="2s" repeatCount="indefinite" path={d} />
        </circle>
      )}
    </g>
  )
}

export default function PipelineGraph({ project, docs = [] }) {
  const reduced = usePrefersReducedMotion()
  const stages = project?.stages || []
  const events = project?.events || []
  const [selected, setSelected] = useState(null)
  const [hovered, setHovered] = useState(null)
  const [replayStep, setReplayStep] = useState(null) // null | 0..n
  const [drawer, setDrawer] = useState(null)
  const [burst, setBurst] = useState(false)

  const states = useMemo(() => {
    const m = {}
    for (const k of STAGE_KEYS) m[k] = stageState(stages, k)
    return m
  }, [stages])

  const designGateActive = project?.status === 'waiting_approval' && project?.current_stage === 'design'
  const releaseGateActive = project?.status === 'waiting_approval' && project?.current_stage === 'deployment'
  const designGateDone = states.design === 'done' && ['development', 'testing', 'deployment'].some((k) => states[k] !== 'pending')
  const releaseGateDone = states.deployment === 'done'
  const isComplete = project?.status === 'done'
  const failLoopActive = states.testing === 'failed' || events.some((e) => /fail|loop|re-?test|back to (dev|development)/i.test(`${e.action || ''} ${e.reason || ''}`))

  useEffect(() => {
    if (isComplete) {
      setBurst(true)
      const t = setTimeout(() => setBurst(false), 1800)
      return () => clearTimeout(t)
    }
  }, [isComplete, project?.id])

  // Replay timeline from events
  const replayKeys = useMemo(() => {
    const order = []
    const seen = new Set()
    for (const ev of [...events].reverse()) {
      const action = (ev.action || '').toLowerCase()
      let key = null
      if (action.includes('requirement')) key = 'requirements'
      else if (action.includes('design') && !action.includes('approv')) key = 'design'
      else if (action.includes('design') && action.includes('approv')) key = 'gate_design'
      else if (action.includes('develop') || action.includes('code') || action.includes('pr')) key = 'development'
      else if (action.includes('test')) key = 'testing'
      else if (action.includes('release') || action.includes('deploy')) key = action.includes('approv') ? 'gate_release' : 'deployment'
      if (key && !seen.has(key)) { seen.add(key); order.push(key) }
    }
    // fallback sequential
    if (!order.length) return [...STAGE_KEYS]
    return order
  }, [events])

  useEffect(() => {
    if (replayStep === null) return undefined
    if (replayStep >= replayKeys.length) {
      setReplayStep(null)
      return undefined
    }
    const t = setTimeout(() => setReplayStep((s) => (s === null ? null : s + 1)), reduced ? 200 : 900)
    return () => clearTimeout(t)
  }, [replayStep, replayKeys.length, reduced])

  function effectiveState(key) {
    if (replayStep === null) return states[key] || 'pending'
    const idx = replayKeys.indexOf(key)
    if (idx === -1) return 'pending'
    if (idx < replayStep) return 'done'
    if (idx === replayStep) return 'active'
    return 'pending'
  }

  function gateState(which) {
    if (replayStep !== null) {
      const key = which === 'design' ? 'gate_design' : 'gate_release'
      const idx = replayKeys.indexOf(key)
      if (idx === -1) {
        // derive from stage progress
        if (which === 'design') {
          if (effectiveState('design') === 'done' && effectiveState('development') !== 'pending') return 'done'
          if (effectiveState('design') === 'done') return 'active'
          return 'pending'
        }
        if (effectiveState('deployment') === 'done') return 'done'
        if (effectiveState('testing') === 'done') return 'active'
        return 'pending'
      }
      if (idx < replayStep) return 'done'
      if (idx === replayStep) return 'active'
      return 'pending'
    }
    if (which === 'design') return designGateActive ? 'active' : designGateDone ? 'done' : 'pending'
    return releaseGateActive ? 'active' : releaseGateDone ? 'done' : 'pending'
  }

  const edges = useMemo(() => ({
    e1: curved(POS.requirements, POS.gate_design, -10),
    e2: curved(POS.gate_design, POS.design, 10),
    e3: curved(POS.design, POS.development, -8),
    e4: curved(POS.development, POS.testing, 8),
    e5: `M ${POS.testing.x} ${POS.testing.y} Q ${(POS.testing.x + POS.gate_release.x) / 2} ${POS.testing.y - 40} ${POS.gate_release.x} ${POS.gate_release.y}`,
    e6: curved(POS.gate_release, POS.deployment, 0),
    loop: `M ${POS.testing.x} ${POS.testing.y + 36} C ${POS.testing.x - 20} ${POS.testing.y + 110}, ${POS.development.x + 20} ${POS.development.y + 110}, ${POS.development.x} ${POS.development.y + 36}`,
  }), [])

  function openDrawer(id) {
    setSelected(id)
    if (STAGE_KEYS.includes(id)) {
      const bot = botById(STAGE_BOT[id])
      const stage = stages.find((s) => s.name === id)
      const stageDocs = docs.filter((d) => d.kind?.includes(id.replace('development', 'dev')) || d.kind === id || (id === 'testing' && d.kind?.includes('test')) || (id === 'requirements' && d.kind?.includes('req')) || (id === 'design' && d.kind?.includes('design')))
      const stageEvents = events.filter((e) => e.bot === bot.id || (e.action || '').toLowerCase().includes(id.slice(0, 5)))
      setDrawer({ id, label: STAGE_UI[id], bot, stage, docs: stageDocs.length ? stageDocs : docs.filter((d) => true).slice(0, 0), events: stageEvents.slice(0, 8), allDocs: docs })
    } else {
      setDrawer({
        id,
        label: id === 'gate_design' ? 'Design approval' : 'Release approval',
        bot: botById('orchestrator'),
        gate: true,
        stage: null,
        docs: [],
        events: events.filter((e) => /approv/i.test(e.action || '')).slice(0, 8),
      })
    }
  }

  const tipId = hovered || selected
  const tip = tipId && STAGE_KEYS.includes(tipId)
    ? { label: STAGE_UI[tipId], bot: botById(STAGE_BOT[tipId]), state: effectiveState(tipId), stage: stages.find((s) => s.name === tipId) }
    : tipId === 'gate_design' || tipId === 'gate_release'
      ? { label: tipId === 'gate_design' ? 'Design gate' : 'Release gate', bot: botById('orchestrator'), state: tipId === 'gate_design' ? gateState('design') : gateState('release'), gate: true }
      : null

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-400">Control room</div>
          <h2 className="text-sm font-semibold text-zinc-900">Pipeline graph</h2>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setReplayStep(0)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700 transition hover:bg-indigo-100"
          >
            <Play className="h-3.5 w-3.5" /> Replay run
          </button>
          {replayStep !== null && (
            <button type="button" onClick={() => setReplayStep(null)} className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-600">
              <RotateCcw className="h-3.5 w-3.5" /> Stop
            </button>
          )}
        </div>
      </div>

      <div className="control-room relative overflow-hidden rounded-[1.75rem] border border-indigo-100/80 p-2 sm:p-4">
        <Confetti show={burst && !reduced} />
        {isComplete && (
          <div className="absolute left-4 top-4 z-10 inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
            <Sparkles className="h-3.5 w-3.5" /> Pipeline complete
          </div>
        )}

        <svg viewBox="0 0 1000 440" className="h-auto w-full min-h-[280px] sm:min-h-[420px]" role="img" aria-label="SDLC pipeline graph">
          <defs>
            <linearGradient id="flowGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#a5b4fc" stopOpacity="0" />
              <stop offset="50%" stopColor="#6366f1" />
              <stop offset="100%" stopColor="#a5b4fc" stopOpacity="0" />
            </linearGradient>
            <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
          </defs>

          <FlowPath d={edges.e1} active={effectiveState('requirements') === 'active' || (effectiveState('requirements') === 'done' && gateState('design') === 'active')} done={effectiveState('requirements') === 'done'} reduced={reduced} />
          <FlowPath d={edges.e2} active={gateState('design') === 'active'} done={gateState('design') === 'done'} reduced={reduced} />
          <FlowPath d={edges.e3} active={effectiveState('design') === 'done' && effectiveState('development') !== 'pending'} done={effectiveState('development') !== 'pending' && effectiveState('design') === 'done'} reduced={reduced} />
          <FlowPath d={edges.e4} active={effectiveState('development') === 'active' || (effectiveState('development') === 'done' && effectiveState('testing') === 'active')} done={effectiveState('development') === 'done'} reduced={reduced} />
          <FlowPath d={edges.e5} active={effectiveState('testing') === 'done' || gateState('release') === 'active'} done={gateState('release') === 'done'} reduced={reduced} />
          <FlowPath d={edges.e6} active={gateState('release') === 'done' || effectiveState('deployment') === 'active'} done={effectiveState('deployment') === 'done'} reduced={reduced} />
          <FlowPath d={edges.loop} active={failLoopActive || (replayStep !== null && effectiveState('testing') === 'active')} done={false} fail reduced={reduced} />
          <text x={(POS.testing.x + POS.development.x) / 2} y={POS.testing.y + 125} textAnchor="middle" style={{ fontSize: 11, fontWeight: 700, fill: '#e11d48' }}>fail → Dev</text>

          <Node id="requirements" label="Requirements" state={effectiveState('requirements')} bot={botById('requirement_gatherer')} selected={selected} onSelect={openDrawer} onHover={setHovered} reduced={reduced} />
          <Node id="gate_design" label="Design gate" state={gateState('design')} bot={botById('orchestrator')} gate selected={selected} onSelect={openDrawer} onHover={setHovered} reduced={reduced} />
          <Node id="design" label="Design" state={effectiveState('design')} bot={botById('designer')} selected={selected} onSelect={openDrawer} onHover={setHovered} reduced={reduced} />
          <Node id="development" label="Development" state={effectiveState('development')} bot={botById('developer')} selected={selected} onSelect={openDrawer} onHover={setHovered} reduced={reduced} />
          <Node id="testing" label="Testing" state={effectiveState('testing')} bot={botById('tester')} selected={selected} onSelect={openDrawer} onHover={setHovered} reduced={reduced} />
          <Node id="gate_release" label="Release gate" state={gateState('release')} bot={botById('orchestrator')} gate selected={selected} onSelect={openDrawer} onHover={setHovered} reduced={reduced} />
          <Node id="deployment" label="Deployment" state={effectiveState('deployment')} bot={botById('deployer')} selected={selected} onSelect={openDrawer} onHover={setHovered} reduced={reduced} />
        </svg>

        {/* hover tooltip */}
        <AnimatePresence>
          {tip && !drawer && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="pointer-events-none absolute bottom-4 left-1/2 z-20 w-[min(90%,320px)] -translate-x-1/2 rounded-2xl border border-zinc-200 bg-white/95 p-3 shadow-xl backdrop-blur"
            >
              <div className="flex items-center gap-2">
                <img src={tip.bot.image} alt="" className="h-8 w-8 rounded-xl" />
                <div>
                  <div className="text-sm font-semibold text-zinc-900">{tip.label}{!tip.gate && <> · {tip.bot.name}</>}</div>
                  <div className="text-xs capitalize text-zinc-500">{tip.state}</div>
                </div>
              </div>
              <p className="mt-1.5 text-xs text-zinc-500 line-clamp-2">{tip.gate ? 'Human approval gate' : tip.bot.blurb}</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* scrubber */}
        {replayStep !== null && (
          <div className="absolute bottom-3 left-4 right-4 flex items-center gap-3">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-zinc-200">
              <div className="h-full rounded-full bg-indigo-500 transition-all" style={{ width: `${((replayStep + 1) / Math.max(replayKeys.length, 1)) * 100}%` }} />
            </div>
            <span className="text-[11px] font-medium text-zinc-500">{Math.min(replayStep + 1, replayKeys.length)}/{replayKeys.length}</span>
          </div>
        )}
      </div>

      {/* Side drawer */}
      <AnimatePresence>
        {drawer && (
          <motion.aside
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 16 }}
            className="glass-deep rounded-3xl p-5"
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <img src={drawer.bot.image} alt="" className="h-12 w-12 rounded-2xl shadow-md ring-1 ring-zinc-200" />
                <div>
                  <div className="text-xs font-medium text-zinc-400">{drawer.gate ? 'Human gate' : 'Stage bot'}</div>
                  <div className="text-base font-semibold text-zinc-900">{drawer.label}{!drawer.gate && <> · {drawer.bot.name}</>}</div>
                </div>
              </div>
              <button type="button" aria-label="Close" onClick={() => { setDrawer(null); setSelected(null) }} className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100"><X className="h-4 w-4" /></button>
            </div>
            <p className="text-sm text-zinc-500">{drawer.gate ? 'Approve or reject from Inbox when this gate opens.' : drawer.bot.blurb}</p>

            {drawer.stage && (
              <div className="mt-4 rounded-2xl border border-zinc-100 bg-zinc-50/80 p-3">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">Output</div>
                <div className="mt-1 text-sm font-medium text-zinc-800">{friendlyOutputLabel(drawer.stage)}</div>
                {drawer.stage.output_url && (
                  isInternalDocPath(drawer.stage.output_url) ? (
                    <Link to={drawer.stage.output_url} className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-indigo-600">Open document <ExternalLink className="h-3 w-3" /></Link>
                  ) : (
                    <a href={drawer.stage.output_url} target="_blank" rel="noreferrer" className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-indigo-600">Open link <ExternalLink className="h-3 w-3" /></a>
                  )
                )}
              </div>
            )}

            {!!drawer.events?.length && (
              <div className="mt-4">
                <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-zinc-400">Events</div>
                <ul className="space-y-2">
                  {drawer.events.map((ev) => (
                    <li key={ev.id} className="rounded-xl border border-zinc-100 bg-white px-3 py-2 text-xs">
                      <div className="font-medium text-zinc-800">{ev.action}</div>
                      <div className="text-zinc-400">{formatTime(ev.created_at)}</div>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {!!docs?.length && STAGE_KEYS.includes(drawer.id) && (
              <div className="mt-4">
                <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-zinc-400">Documents</div>
                <ul className="space-y-2">
                  {docs.filter((d) => {
                    const k = (d.kind || '').toLowerCase()
                    if (drawer.id === 'requirements') return k.includes('req')
                    if (drawer.id === 'design') return k.includes('design')
                    if (drawer.id === 'testing') return k.includes('test')
                    if (drawer.id === 'deployment') return k.includes('deploy')
                    return false
                  }).map((d) => (
                    <li key={d.id}>
                      <Link to={`/projects/${project.id}/docs/${d.id}`} className="flex items-center gap-2 rounded-xl border border-zinc-100 bg-white px-3 py-2 text-xs font-medium text-indigo-700 hover:bg-indigo-50">
                        <FileText className="h-3.5 w-3.5" /> {d.title}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </motion.aside>
        )}
      </AnimatePresence>
    </div>
  )
}
