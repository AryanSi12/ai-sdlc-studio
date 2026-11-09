import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Activity, FilePlus2, FolderKanban, Inbox, Search } from 'lucide-react'

const LINKS = [
  { to: '/', label: 'New Run', hint: 'Start a project', icon: FilePlus2 },
  { to: '/projects', label: 'Projects', hint: 'Browse runs', icon: FolderKanban },
  { to: '/inbox', label: 'Inbox', hint: 'Approvals & quizzes', icon: Inbox },
  { to: '/activity', label: 'Activity', hint: 'Audit trail', icon: Activity },
]

export default function CommandPalette() {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setOpen((o) => !o)
      }
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const items = useMemo(() => {
    const s = q.trim().toLowerCase()
    if (!s) return LINKS
    return LINKS.filter((l) => l.label.toLowerCase().includes(s) || l.hint.toLowerCase().includes(s))
  }, [q])

  if (typeof document === 'undefined') return null

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[80] flex items-start justify-center bg-zinc-900/30 p-4 pt-[12vh] backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setOpen(false)}
        >
          <motion.div
            role="dialog"
            aria-label="Command palette"
            initial={{ opacity: 0, y: 8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.98 }}
            className="w-full max-w-lg overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2 border-b border-zinc-100 px-4 py-3">
              <Search className="h-4 w-4 text-zinc-400" />
              <input
                autoFocus
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Jump to…"
                className="flex-1 bg-transparent text-sm outline-none placeholder:text-zinc-400"
              />
              <kbd className="rounded border border-zinc-200 bg-zinc-50 px-1.5 py-0.5 text-[10px] font-medium text-zinc-500">esc</kbd>
            </div>
            <ul className="max-h-72 overflow-auto p-2">
              {items.map((item) => {
                const Icon = item.icon
                return (
                  <li key={item.to}>
                    <button
                      type="button"
                      className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition hover:bg-indigo-50"
                      onClick={() => { navigate(item.to); setOpen(false); setQ('') }}
                    >
                      <Icon className="h-4 w-4 text-indigo-500" />
                      <div className="flex-1">
                        <div className="text-sm font-medium text-zinc-900">{item.label}</div>
                        <div className="text-xs text-zinc-500">{item.hint}</div>
                      </div>
                    </button>
                  </li>
                )
              })}
              {!items.length && <li className="px-3 py-6 text-center text-sm text-zinc-500">No matches</li>}
            </ul>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  )
}

export function CommandHint({ onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="hidden items-center gap-2 rounded-xl border border-zinc-200 bg-white px-2.5 py-1.5 text-xs text-zinc-500 shadow-sm transition hover:border-zinc-300 sm:inline-flex"
    >
      <Search className="h-3.5 w-3.5" />
      Search
      <kbd className="rounded border border-zinc-200 bg-zinc-50 px-1.5 py-0.5 text-[10px] font-semibold text-zinc-500">⌘K</kbd>
    </button>
  )
}
