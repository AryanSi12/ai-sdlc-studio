// VITE_API_URL: set on Vercel to https://ai-sdlc-studio.onrender.com.
// Empty/unset in production (backend/static same-origin) → window.location.origin.
// Dev fallback → local FastAPI.
const API_URL = (
  import.meta.env.VITE_API_URL ||
  (import.meta.env.PROD && typeof window !== 'undefined' ? window.location.origin : 'http://127.0.0.1:8000')
).replace(/\/$/, '')

async function request(path, options = {}) {
  const res = await fetch(`${API_URL}${path}`, options)
  if (!res.ok) {
    let detail = res.statusText
    try {
      const body = await res.json()
      detail = body.detail || JSON.stringify(body)
    } catch {
      /* ignore */
    }
    throw new Error(typeof detail === 'string' ? detail : JSON.stringify(detail))
  }
  if (res.status === 204) return null
  return res.json()
}

export function getApiUrl() {
  return API_URL
}

export function listProjects() {
  return request('/api/projects')
}

export function getProject(id) {
  return request(`/api/projects/${id}`)
}

export function deleteProject(id) {
  return request(`/api/projects/${id}`, { method: 'DELETE' })
}

export function createProjectFromFile({ file, name, description }) {
  const form = new FormData()
  if (file) form.append('spec_file', file)
  if (name) form.append('name', name)
  if (description) form.append('description', description)
  return request('/api/projects', { method: 'POST', body: form })
}

export function createProjectFromRepo({ repoUrl, change, name }) {
  const form = new FormData()
  form.append('repo_url', repoUrl)
  if (change) form.append('change', change)
  if (name) form.append('name', name)
  return request('/api/projects', { method: 'POST', body: form })
}

export function listEvents({ projectId, bot } = {}) {
  const params = new URLSearchParams()
  if (projectId) params.set('project_id', projectId)
  if (bot) params.set('bot', bot)
  const q = params.toString()
  return request(`/api/events${q ? `?${q}` : ''}`)
}

export function listApprovals(status = 'pending') {
  const q = status ? `?status=${encodeURIComponent(status)}` : ''
  return request(`/api/approvals${q}`)
}

export function decideApproval(id, { decision, comment, decidedBy = 'Aryan Singh' }) {
  return request(`/api/approvals/${id}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ decision, comment, decided_by: decidedBy }),
  })
}

export function listBots() {
  return request('/api/bots')
}

export function getMaintainer(projectId) {
  return request(`/api/maintainer/${projectId}`)
}

export function projectWsUrl(projectId) {
  const base = API_URL.replace(/^http/, 'ws')
  return `${base}/ws/projects/${projectId}`
}

export function createProjectFromIdea({ name, ideaText }) {
  const form = new FormData()
  form.append('idea_text', ideaText)
  if (name) form.append('name', name)
  return request('/api/projects', { method: 'POST', body: form })
}

export function getLatestQuiz(projectId) {
  return request(`/api/projects/${projectId}/quiz/latest`)
}

export function submitQuizAnswers(projectId, roundId, answers, answeredBy = 'Aryan Singh') {
  return request(`/api/projects/${projectId}/quiz/${roundId}/answers`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ answers, answered_by: answeredBy }),
  })
}

export function listDocuments(projectId) {
  return request(`/api/projects/${projectId}/documents`)
}

export function getDocument(projectId, docId) {
  return request(`/api/projects/${projectId}/documents/${docId}`)
}

export function listNeedsInput() {
  return request('/api/inbox/needs-input')
}
