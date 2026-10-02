import axios from 'axios'

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? ''

const client = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15_000,
})

// ─── Request Interceptor: Inject JWT ────────────────────────────────────────
client.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('devcollab_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error),
)

// ─── Response Interceptor ───────────────────────────────────────────────────
client.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      console.warn('Unauthorized request, checking token state')
    }
    return Promise.reject(error)
  },
)

// ─── Auth API ────────────────────────────────────────────────────────────────
export const authApi = {
  getToken: (role = 'STARTUP', userId?: string, email?: string, name?: string) =>
    client.post('/api/auth/token', { role, userId, email, name }),
  login: (email: string, password?: string) =>
    client.post('/api/auth/login', { email, password }),
  register: (data: unknown) =>
    client.post('/api/auth/register', data),
  getMe: () =>
    client.get('/api/auth/me'),
}

// ─── Discovery & Matching Service API ─────────────────────────────────────────
export const discoveryApi = {
  getProjects: (category?: string, status?: string, page = 0, size = 20) => {
    const params = new URLSearchParams({ page: String(page), size: String(size) })
    if (category) params.append('category', category)
    if (status) params.append('status', status)
    return client.get(`/api/projects?${params}`)
  },
  getProjectById: (id: string) =>
    client.get(`/api/projects/${id}`),
  createProject: (data: unknown) =>
    client.post('/api/projects', data),
  updateProject: (id: string, data: unknown) =>
    client.put(`/api/projects/${id}`, data),
  deleteProject: (id: string) =>
    client.delete(`/api/projects/${id}`),
  search: (q?: string, skills?: string[], category?: string) => {
    const params = new URLSearchParams()
    if (q) params.append('q', q)
    if (skills && skills.length) skills.forEach((s) => params.append('skills', s))
    if (category) params.append('category', category)
    return client.get(`/api/projects/search?${params}`)
  },
  getRecommendations: (studentId: string) =>
    client.get(`/api/matches/recommendations/${studentId}`),
  searchTalent: (skills?: string[], q?: string) => {
    const params = new URLSearchParams()
    if (q) params.append('q', q)
    if (skills && skills.length) skills.forEach((s) => params.append('skills', s))
    return client.get(`/api/profiles/students/search?${params}`)
  },
  match: (projectId: string, studentId: string) =>
    client.post('/api/matches', { projectId, studentId }),
  getAllMatches: () =>
    client.get('/api/matches'),
  getStudentMatches: (studentId: string) =>
    client.get(`/api/matches/student/${studentId}`),
  getStartupMatches: (startupId: string) =>
    client.get(`/api/matches/startup/${startupId}`),
  getStudentProfiles: () =>
    client.get('/api/profiles/students'),
  graphql: (query: string, variables: Record<string, unknown> = {}) =>
    client.post('/graphql', { query, variables }),
}

// ─── Collaboration Workspace Service API ───────────────────────────────────────
export const workspaceApi = {
  getAll: () =>
    client.get('/api/workspaces'),
  getById: (id: string) =>
    client.get(`/api/workspaces/${id}`),
  getMessages: (workspaceId: string, limit = 50) =>
    client.get(`/api/messages/${workspaceId}?limit=${limit}`),
  sendMessage: (workspaceId: string, content: string, senderId?: string, senderName?: string) =>
    client.post(`/api/messages/${workspaceId}`, { content, senderId, senderName }),
  getComments: (workspaceId: string) =>
    client.get(`/api/comments/${workspaceId}`),
  addComment: (workspaceId: string, content: string, lineNumber?: number, fileSnippet?: string) =>
    client.post(`/api/comments/${workspaceId}`, { content, lineNumber, fileSnippet }),
}

// ─── Escrow & Milestone Service API ───────────────────────────────────────────
export const contractsApi = {
  getAll: (page = 0, size = 20) =>
    client.get(`/api/contracts?page=${page}&size=${size}`),
  getById: (id: string) =>
    client.get(`/api/contracts/${id}`),
  getByProject: (projectId: string, page = 0) =>
    client.get(`/api/contracts/project/${projectId}?page=${page}`),
  create: (data: unknown) =>
    client.post('/api/contracts', data),
  cancel: (id: string) =>
    client.post(`/api/contracts/${id}/cancel`),
}

export const milestonesApi = {
  getById: (id: string) =>
    client.get(`/api/milestones/${id}`),
  getAll: (page = 0, size = 20) =>
    client.get(`/api/milestones?page=${page}&size=${size}`),
  create: (data: unknown) =>
    client.post('/api/milestones', data),
  update: (id: string, data: unknown) =>
    client.put(`/api/milestones/${id}`, data),
  approve: (id: string) =>
    client.post(`/api/milestones/${id}/approve`),
  release: (id: string) =>
    client.post(`/api/milestones/${id}/release`),
}

export const transactionsApi = {
  getAll: (page = 0, size = 20) =>
    client.get(`/api/transactions?page=${page}&size=${size}`),
  getById: (id: string) =>
    client.get(`/api/transactions/${id}`),
  capture: (id: string) =>
    client.post(`/api/transactions/${id}/capture`),
  getByContract: (contractId: string, page = 0) =>
    client.get(`/api/transactions/contract/${contractId}?page=${page}`),
}

export const auditApi = {
  getAll: (page = 0, size = 50, entityType?: string, action?: string) => {
    const params = new URLSearchParams({ page: String(page), size: String(size) })
    if (entityType) params.append('entityType', entityType)
    if (action) params.append('action', action)
    return client.get(`/api/audit?${params}`)
  },
}

export default client
