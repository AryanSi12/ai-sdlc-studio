import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import NewRun from './pages/NewRun'
import Projects from './pages/Projects'
import ProjectDetail from './pages/ProjectDetail'
import Inbox from './pages/Inbox'
import ActivityLog from './pages/ActivityLog'
import DocumentViewer from './pages/DocumentViewer'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<NewRun />} />
          <Route path="projects" element={<Projects />} />
          <Route path="projects/:id" element={<ProjectDetail />} />
          <Route path="projects/:id/docs/:docId" element={<DocumentViewer />} />
          <Route path="inbox" element={<Inbox />} />
          <Route path="approvals" element={<Navigate to="/inbox" replace />} />
          <Route path="activity" element={<ActivityLog />} />
          <Route path="maintainer" element={<Navigate to="/projects" replace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
