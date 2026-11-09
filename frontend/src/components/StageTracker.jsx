import { Check } from 'lucide-react'
import { motion } from 'framer-motion'
import { STAGES } from '../data/constants'

export default function StageTracker({ progress }) {
  return (
    <div className="w-full overflow-x-auto">
      <ol className="flex min-w-[640px] items-center gap-0">
        {STAGES.map((stage, idx) => {
          const state = progress?.[stage] || 'pending'
          const isDone = state === 'done'
          const isActive = state === 'active'
          const isFailed = state === 'failed'
          const isLast = idx === STAGES.length - 1
          return (
            <li key={stage} className="flex flex-1 items-center">
              <div className="flex flex-col items-center gap-2">
                <motion.div
                  layout
                  animate={isActive ? { scale: [1, 1.06, 1] } : { scale: 1 }}
                  transition={isActive ? { repeat: Infinity, duration: 1.8 } : {}}
                  className={[
                    'flex h-9 w-9 items-center justify-center rounded-full border-2 text-sm font-semibold',
                    isDone && 'border-emerald-500 bg-emerald-50 text-emerald-700',
                    isActive && 'border-indigo-500 bg-indigo-50 text-indigo-700 shadow-md shadow-indigo-100',
                    isFailed && 'border-rose-500 bg-rose-50 text-rose-700',
                    !isDone && !isActive && !isFailed && 'border-slate-200 bg-white text-slate-400',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  aria-current={isActive ? 'step' : undefined}
                >
                  {isDone ? <Check className="h-4 w-4" /> : idx + 1}
                </motion.div>
                <span
                  className={[
                    'text-xs font-medium whitespace-nowrap',
                    isActive ? 'text-indigo-700' : isDone ? 'text-emerald-700' : isFailed ? 'text-rose-600' : 'text-slate-400',
                  ].join(' ')}
                >
                  {stage}
                </span>
              </div>
              {!isLast && (
                <div className="relative mx-2 mb-6 h-0.5 flex-1 overflow-hidden rounded bg-slate-200">
                  <motion.div
                    className="absolute inset-y-0 left-0 bg-emerald-500"
                    initial={{ width: 0 }}
                    animate={{ width: isDone ? '100%' : '0%' }}
                    transition={{ duration: 0.5 }}
                  />
                </div>
              )}
            </li>
          )
        })}
      </ol>
    </div>
  )
}
