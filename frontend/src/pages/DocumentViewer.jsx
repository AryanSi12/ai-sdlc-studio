import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { ArrowLeft } from 'lucide-react'
import { getDocument } from '../lib/api'
import { PageSkeleton } from '../components/Skeleton'
import { formatTime, botById } from '../data/constants'

export default function DocumentViewer() {
  const { id, docId } = useParams()
  const [doc, setDoc] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const d = await getDocument(id, docId)
        if (!cancelled) setDoc(d)
      } catch (err) {
        if (!cancelled) setError(err.message)
      }
    })()
    return () => { cancelled = true }
  }, [id, docId])

  if (error) {
    return <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{error}</div>
  }
  if (!doc) return <PageSkeleton />

  const bot = botById(doc.created_by_bot)

  return (
    <div className="mx-auto max-w-3xl">
      <Link to={`/projects/${id}`} className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-indigo-600 transition hover:text-indigo-500">
        <ArrowLeft className="h-4 w-4" /> Back to project
      </Link>
      <article className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-zinc-400">{doc.kind.replace('_', ' ')}</div>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">{doc.title}</h1>
        <p className="mt-2 flex items-center gap-2 text-xs text-zinc-500">
          <img src={bot?.image} alt="" className="h-4 w-4 rounded" width={16} height={16} />
          {doc.created_by_bot} · {formatTime(doc.created_at)}
        </p>
        <div className="prose mt-8 max-w-none">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{doc.markdown}</ReactMarkdown>
        </div>
      </article>
    </div>
  )
}
