import { lazy, Suspense } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import { PageSkeleton } from './components/Skeleton'

const NewRun = lazy(() => import('./pages/NewRun'))
const Projects = lazy(() => import('./pages/Projects'))
const ProjectDetail = lazy(() => import('./pages/ProjectDetail'))
const Inbox = lazy(() => import('./pages/Inbox'))
const ActivityLog = lazy(() => import('./pages/ActivityLog'))
const DocumentViewer = lazy(() => import('./pages/DocumentViewer'))

function Lazy({ children }) {
  return <Suspense fallback={<PageSkeleton />}>{children}</Suspense>
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Lazy><NewRun /></Lazy>} />
          <Route path="projects" element={<Lazy><Projects /></Lazy>} />
          <Route path="projects/:id" element={<Lazy><ProjectDetail /></Lazy>} />
          <Route path="projects/:id/docs/:docId" element={<Lazy><DocumentViewer /></Lazy>} />
          <Route path="inbox" element={<Lazy><Inbox /></Lazy>} />
          <Route path="approvals" element={<Navigate to="/inbox" replace />} />
          <Route path="activity" element={<Lazy><ActivityLog /></Lazy>} />
          <Route path="maintainer" element={<Navigate to="/projects" replace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
