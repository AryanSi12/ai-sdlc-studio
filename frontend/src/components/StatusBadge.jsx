const STYLES = {
  running: 'bg-sky-50 text-sky-700 border-sky-200',
  waiting_approval: 'bg-amber-50 text-amber-800 border-amber-200',
  failed: 'bg-rose-50 text-rose-700 border-rose-200',
  done: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  active: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  idle: 'bg-slate-50 text-slate-600 border-slate-200',
  waiting: 'bg-slate-50 text-slate-500 border-slate-200',
  pending: 'bg-slate-50 text-slate-500 border-slate-200',
  'n/a': 'bg-slate-50 text-slate-400 border-slate-200',
}

const LABELS = {
  running: 'Running',
  waiting_approval: 'Waiting approval',
  failed: 'Failed',
  done: 'Done',
  active: 'Active',
  idle: 'Idle',
  waiting: 'Waiting',
  pending: 'Pending',
  'n/a': 'N/A',
}

export default function StatusBadge({ status }) {
  const style = STYLES[status] || STYLES.idle
  const label = LABELS[status] || status
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${style}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
      {label}
    </span>
  )
}
