import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { ArrowLeft } from 'lucide-react'
import { getDocument } from '../lib/api'
import { PageSkeleton } from '../components/Skeleton'
import { formatTime } from '../data/constants'

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

  return (
    <div className="mx-auto max-w-3xl">
      <Link to={`/projects/${id}`} className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-indigo-600 hover:text-indigo-500">
        <ArrowLeft className="h-4 w-4" /> Back to project
      </Link>
      <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-slate-400">{doc.kind.replace('_', ' ')}</div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{doc.title}</h1>
        <p className="mt-2 text-xs text-slate-500">
          By {doc.created_by_bot} · {formatTime(doc.created_at)}
        </p>
        <div className="prose prose-slate mt-8 max-w-none prose-headings:scroll-mt-20 prose-a:text-indigo-600">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{doc.markdown}</ReactMarkdown>
        </div>
      </article>
    </div>
  )
}
