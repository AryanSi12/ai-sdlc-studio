export const BOTS = [
  {
    id: 'orchestrator',
    name: 'Orchestrator',
    role: 'Manager',
    color: 'violet',
    hex: '#7c3aed',
    emoji: '🎯',
    image: '/bots/orchestrator.svg',
    blurb: 'Routes work across specialists, opens approval gates, and keeps the pipeline moving.',
  },
  {
    id: 'requirement_gatherer',
    name: 'Requirement Gatherer',
    role: 'Requirements',
    color: 'sky',
    hex: '#0284c7',
    emoji: '📋',
    image: '/bots/requirement_gatherer.svg',
    blurb: 'Turns ideas into crisp requirements — quizzes you, then drafts the PRD.',
  },
  {
    id: 'designer',
    name: 'Designer',
    role: 'Architecture',
    color: 'fuchsia',
    hex: '#c026d3',
    emoji: '✏️',
    image: '/bots/designer.svg',
    blurb: 'Shapes architecture, APIs, and UX flows. Pauses for your design approval.',
  },
  {
    id: 'developer',
    name: 'Developer',
    role: 'Implementation',
    color: 'emerald',
    hex: '#059669',
    emoji: '💻',
    image: '/bots/developer.svg',
    blurb: 'Implements the design into code and opens pull requests.',
  },
  {
    id: 'tester',
    name: 'Tester',
    role: 'QA',
    color: 'amber',
    hex: '#d97706',
    emoji: '🧪',
    image: '/bots/tester.svg',
    blurb: 'Runs tests and loops failures back to Development until green.',
  },
  {
    id: 'deployer',
    name: 'Deployer',
    role: 'Release',
    color: 'rose',
    hex: '#e11d48',
    emoji: '🚀',
    image: '/bots/deployer.svg',
    blurb: 'Ships to production after your release approval — live URL ready.',
  },
  {
    id: 'maintainer',
    name: 'Maintainer',
    role: 'Existing repos',
    color: 'cyan',
    hex: '#0891b2',
    emoji: '🔧',
    image: '/bots/maintainer.svg',
    blurb: 'Scans existing repos first — health, issues, then hands off into the pipeline.',
  },
]

export const STAGES = ['Requirements', 'Design', 'Development', 'Testing', 'Deployment']

export const STAGE_UI = {
  requirements: 'Requirements',
  design: 'Design',
  development: 'Development',
  testing: 'Testing',
  deployment: 'Deployment',
}

export const STAGE_BOT = {
  requirements: 'requirement_gatherer',
  design: 'designer',
  development: 'developer',
  testing: 'tester',
  deployment: 'deployer',
}

export const botColorClasses = {
  violet: { bg: 'bg-violet-50', text: 'text-violet-700', border: 'border-violet-200', dot: 'bg-violet-500', ring: 'ring-violet-200' },
  sky: { bg: 'bg-sky-50', text: 'text-sky-700', border: 'border-sky-200', dot: 'bg-sky-500', ring: 'ring-sky-200' },
  fuchsia: { bg: 'bg-fuchsia-50', text: 'text-fuchsia-700', border: 'border-fuchsia-200', dot: 'bg-fuchsia-500', ring: 'ring-fuchsia-200' },
  emerald: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', dot: 'bg-emerald-500', ring: 'ring-emerald-200' },
  amber: { bg: 'bg-amber-50', text: 'text-amber-800', border: 'border-amber-200', dot: 'bg-amber-500', ring: 'ring-amber-200' },
  rose: { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200', dot: 'bg-rose-500', ring: 'ring-rose-200' },
  cyan: { bg: 'bg-cyan-50', text: 'text-cyan-700', border: 'border-cyan-200', dot: 'bg-cyan-500', ring: 'ring-cyan-200' },
}

export function botById(id) {
  return BOTS.find((b) => b.id === id) || {
    id,
    name: id,
    role: '',
    color: 'violet',
    hex: '#7c3aed',
    emoji: '🤖',
    image: '/bots/orchestrator.svg',
    blurb: '',
  }
}

export function formatTime(iso) {
  if (!iso) return '—'
  try {
    const d = new Date(iso.endsWith('Z') || iso.includes('+') ? iso : `${iso}Z`)
    return (
      d.toLocaleString('en-IN', {
        timeZone: 'Asia/Calcutta',
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      }) + ' IST'
    )
  } catch {
    return iso
  }
}

export function stagesToProgress(stages = []) {
  const progress = {}
  for (const ui of STAGES) progress[ui] = 'pending'
  for (const s of stages) {
    const label = STAGE_UI[s.name] || s.name
    if (s.status === 'done') progress[label] = 'done'
    else if (s.status === 'active' || s.status === 'clarifying') progress[label] = 'active'
    else if (s.status === 'failed') progress[label] = 'failed'
    else progress[label] = 'pending'
  }
  return progress
}
