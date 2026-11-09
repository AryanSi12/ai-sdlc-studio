export const BOTS = [
  {
    id: 'orchestrator',
    name: 'Orchestrator',
    role: 'Manager',
    color: 'violet',
    hex: '#7c3aed',
    emoji: '🎯',
    image: '/bots/orchestrator.svg',
    scene: '/scenes/orchestrator.jpg',
    blurb: 'Routes work across specialists, opens approval gates, and keeps the pipeline moving.',
    capabilities: ['Assigns the right specialist at each stage', 'Opens design & release approval gates', 'Tracks handoffs and retries across bots'],
    io: { input: 'Project intent', output: 'Stage plan' },
  },
  {
    id: 'requirement_gatherer',
    name: 'Requirement Gatherer',
    role: 'Requirements',
    color: 'sky',
    hex: '#0284c7',
    emoji: '📋',
    image: '/bots/requirement_gatherer.svg',
    scene: '/scenes/requirement_gatherer.jpg',
    blurb: 'Turns ideas into crisp requirements — quizzes you, then drafts the PRD.',
    capabilities: ['Clarifying quiz rounds', 'Writes a full requirements doc', 'Extracts stories & acceptance criteria'],
    io: { input: 'Idea or .md spec', output: 'Requirements doc' },
  },
  {
    id: 'designer',
    name: 'Designer',
    role: 'Architecture',
    color: 'fuchsia',
    hex: '#c026d3',
    emoji: '✏️',
    image: '/bots/designer.svg',
    scene: '/scenes/designer.jpg',
    blurb: 'Shapes architecture, APIs, and UX flows. Pauses for your design approval.',
    capabilities: ['System & API design', 'UX flow sketches', 'Human design-approval gate'],
    io: { input: 'Requirements', output: 'Design doc' },
  },
  {
    id: 'developer',
    name: 'Developer',
    role: 'Implementation',
    color: 'emerald',
    hex: '#059669',
    emoji: '💻',
    image: '/bots/developer.svg',
    scene: '/scenes/developer.jpg',
    blurb: 'Implements the design into code and opens pull requests.',
    capabilities: ['Implements features from design', 'Opens PRs on GitHub', 'Receives fail-loop fixes from Tester'],
    io: { input: 'Design', output: 'Code / PR' },
  },
  {
    id: 'tester',
    name: 'Tester',
    role: 'QA',
    color: 'amber',
    hex: '#d97706',
    emoji: '🧪',
    image: '/bots/tester.svg',
    scene: '/scenes/tester.jpg',
    blurb: 'Runs tests and loops failures back to Development until green.',
    capabilities: ['Runs automated test suites', 'Writes test reports', 'Loops failures back to Developer'],
    io: { input: 'Build', output: 'Test report' },
  },
  {
    id: 'deployer',
    name: 'Deployer',
    role: 'Release',
    color: 'rose',
    hex: '#e11d48',
    emoji: '🚀',
    image: '/bots/deployer.svg',
    scene: '/scenes/deployer.jpg',
    blurb: 'Ships to production after your release approval — live URL ready.',
    capabilities: ['Release approval gate', 'Deploys to hosting', 'Publishes live URL'],
    io: { input: 'Green build', output: 'Live URL' },
  },
  {
    id: 'maintainer',
    name: 'Maintainer',
    role: 'Existing repos',
    color: 'cyan',
    hex: '#0891b2',
    emoji: '🔧',
    image: '/bots/maintainer.svg',
    scene: '/scenes/maintainer.jpg',
    blurb: 'Scans existing repos first — health, issues, then hands off into the pipeline.',
    capabilities: ['Repo health score', 'Issue & debt scan', 'Hands change into the pipeline'],
    io: { input: 'Repo URL', output: 'Health report' },
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

export const DOC_KIND_LABEL = {
  requirements: 'Requirements',
  design: 'Design',
  test_report: 'Test report',
  test: 'Test report',
  deployment: 'Deployment',
  maintainer: 'Maintainer report',
  notes: 'Notes',
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
    scene: '/scenes/orchestrator.jpg',
    blurb: '',
    capabilities: [],
    io: { input: '—', output: '—' },
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

export function friendlyOutputLabel(stage) {
  if (!stage) return '—'
  if (stage.output_label) return stage.output_label
  const defaults = {
    requirements: 'Requirements document',
    design: 'Design document',
    development: 'Code / pull request',
    testing: 'Test report',
    deployment: 'Live deployment',
  }
  return defaults[stage.name] || STAGE_UI[stage.name] || 'Output'
}

export function isInternalDocPath(href) {
  return typeof href === 'string' && href.startsWith('/projects/')
}
