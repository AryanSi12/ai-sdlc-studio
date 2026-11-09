import { motion } from 'framer-motion'

export default function EmptyState({ title, description, action, icon }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-3xl border border-dashed border-zinc-200 bg-white/80 px-6 py-14 text-center shadow-sm"
    >
      {icon && <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-50 text-zinc-400 ring-1 ring-zinc-200">{icon}</div>}
      <h3 className="text-base font-semibold tracking-tight text-zinc-800">{title}</h3>
      {description && <p className="mx-auto mt-2 max-w-md text-sm text-zinc-500">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </motion.div>
  )
}
