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
type QueryValue = string | number | boolean | undefined | null | Array<string | number>

/** Builds a query string, skipping empty values and repeating array params. */
const toQuery = (params: Record<string, QueryValue>) => {
  const qs = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return
    if (Array.isArray(value)) value.forEach((v) => qs.append(key, String(v)))
    else qs.append(key, String(value))
  })
  return qs.toString()
}

export interface ProjectSearchParams {
  q?: string
  category?: string
  status?: string
  skills?: string[]
  allSkills?: boolean
  minBudget?: number
  maxBudget?: number
  page?: number
  size?: number
  sortBy?: 'createdAt' | 'budget' | 'title'
  sortDirection?: 'asc' | 'desc'
}

export interface TalentSearchParams {
  q?: string
  skills?: string[]
  allSkills?: boolean
  minRating?: number
  minHourlyRate?: number
  maxHourlyRate?: number
  location?: string
  availability?: string[]
  page?: number
  size?: number
  sortBy?: 'rating' | 'reviewCount' | 'hourlyRate' | 'fullName'
  sortDirection?: 'asc' | 'desc'
}

export interface CreateReviewPayload {
  reviewerId: string
  reviewerName: string
  rating: number
  title?: string
  comment?: string
  projectId?: string
}

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
  apply: (projectId: string, studentId: string) =>
    client.post('/api/matches/apply', { projectId, studentId }),
  match: (projectId: string, studentId: string) =>
    client.post('/api/matches', { projectId, studentId }),
  approveMatch: (matchId: string, startupId?: string) =>
    client.post(`/api/matches/${matchId}/approve`, { startupId }),
  rejectMatch: (matchId: string, startupId?: string) =>
    client.post(`/api/matches/${matchId}/reject`, { startupId }),
  getAllMatches: () =>
    client.get('/api/matches'),
  getStudentMatches: (studentId: string) =>
    client.get(`/api/matches/student/${studentId}`),
  getStartupMatches: (startupId: string) =>
    client.get(`/api/matches/startup/${startupId}`),
  getStudentProfiles: () =>
    client.get('/api/profiles/students'),
  getStudentProfile: (id: string) =>
    client.get(`/api/profiles/students/${id}`),
  updateStudentProfile: (id: string, data: unknown) =>
    client.put(`/api/profiles/students/${id}`, data),

  // ── Advanced search & filtering ────────────────────────────────────────────
  advancedSearchProjects: (params: ProjectSearchParams) =>
    client.get(`/api/projects/advanced-search?${toQuery({ ...params })}`),
  advancedSearchTalent: (params: TalentSearchParams) =>
    client.get(`/api/profiles/students/advanced-search?${toQuery({ ...params })}`),

  // ── Ratings & reviews ──────────────────────────────────────────────────────
  getReviews: (studentId: string, page = 0, size = 10) =>
    client.get(`/api/profiles/students/${studentId}/reviews?page=${page}&size=${size}`),
  getReviewSummary: (studentId: string) =>
    client.get(`/api/profiles/students/${studentId}/reviews/summary`),
  addReview: (studentId: string, data: CreateReviewPayload) =>
    client.post(`/api/profiles/students/${studentId}/reviews`, data),
  deleteReview: (reviewId: string) =>
    client.delete(`/api/profiles/students/reviews/${reviewId}`),

  // ── Recommendation engine ──────────────────────────────────────────────────
  getSimilarProjects: (projectId: string, limit = 6) =>
    client.get(`/api/recommendations/projects/${projectId}/similar?limit=${limit}`),
  getCandidatesForProject: (projectId: string, limit = 10) =>
    client.get(`/api/recommendations/projects/${projectId}/candidates?limit=${limit}`),
  getSimilarStudents: (studentId: string, limit = 6) =>
    client.get(`/api/recommendations/students/${studentId}/similar?limit=${limit}`),
  getStudentsFromViews: (viewedIds: string[], limit = 6) =>
    client.get(`/api/recommendations/students/from-views?${toQuery({ ids: viewedIds, limit })}`),
  graphql: (query: string, variables: Record<string, unknown> = {}) =>
    client.post('/graphql', { query, variables }),
  analyzeMySkillGap: (projectId: string) =>
    client.post('/graphql', {
      query: `query AnalyzeMySkillGap($projectId: ID!) {
        analyzeMySkillGap(projectId: $projectId) {
          projectTitle
          studentSkills
          requiredSkills
          matchedSkills
          missingSkills
          coverage
          severity
          explanations
          recommendations {
            courseId
            title
            skill
            provider
            durationHours
            price
            currency
            difficulty
            url
            reason
            resourceType
            viewCount
            itemCount
          }
        }
      }`,
      variables: { projectId },
    }),
}

// ─── Collaboration Workspace Service API ───────────────────────────────────────
export const workspaceApi = {
  getAll: (profileId?: string) => {
    let pId = profileId
    if (!pId) {
      try {
        const u = JSON.parse(localStorage.getItem('devcollab_user') || '{}')
        pId = u?.profileId
      } catch {
        // ignore
      }
    }
    const params = pId ? `?profileId=${encodeURIComponent(pId)}` : ''
    return client.get(`/api/workspaces${params}`)
  },
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
  replyToComment: (commentId: string, text: string) =>
    client.post(`/api/comments/${commentId}/reply`, { text }),

  // ── GitHub Code Review ─────────────────────────────────────────────────────
  // All calls go through the backend — GITHUB_TOKEN is never exposed to the browser.
  github: {
    /** Get linked repo info, or { linked: false } if none is set. */
    getRepo: (workspaceId: string) =>
      client.get(`/api/workspaces/${workspaceId}/github/repo`),

    /** Link (or re-link) a GitHub repository to this workspace. */
    linkRepo: (workspaceId: string, githubOwner: string, githubRepo: string) =>
      client.put(`/api/workspaces/${workspaceId}/github/repo`, { githubOwner, githubRepo }),

    /** List files/folders at `path` (defaults to repo root). */
    listFiles: (workspaceId: string, path = '', ref?: string) => {
      const params = new URLSearchParams()
      if (path) params.append('path', path)
      if (ref)  params.append('ref', ref)
      const qs = params.toString()
      return client.get(`/api/workspaces/${workspaceId}/github/files${qs ? `?${qs}` : ''}`)
    },

    /** Fetch decoded content of a single file. */
    getFile: (workspaceId: string, filePath: string, ref?: string) => {
      const params = new URLSearchParams({ path: filePath })
      if (ref) params.append('ref', ref)
      return client.get(`/api/workspaces/${workspaceId}/github/file?${params}`)
    },

    /** Create a new file in the linked repository. */
    createFile: (
      workspaceId: string,
      path: string,
      content: string,
      message?: string,
      branch?: string,
    ) =>
      client.post(`/api/workspaces/${workspaceId}/github/file`, {
        path,
        content,
        message,
        branch,
      }),

    /** Update an existing file (sha of current blob required). */
    updateFile: (
      workspaceId: string,
      path: string,
      content: string,
      sha: string,
      message?: string,
      branch?: string,
    ) =>
      client.put(`/api/workspaces/${workspaceId}/github/file`, {
        path,
        content,
        sha,
        message,
        branch,
      }),
  },
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
  getAll: (page = 0, size = 20, contractId?: string | null, status?: string) =>
    client.get(`/api/milestones?${toQuery({ page, size, contractId, status })}`),
  create: (data: unknown) =>
    client.post('/api/milestones', data),
  update: (id: string, data: unknown) =>
    client.put(`/api/milestones/${id}`, data),
  approve: (id: string) =>
    client.post(`/api/milestones/${id}/approve`),
  release: (id: string) =>
    client.post(`/api/milestones/${id}/release`),
  complete: (id: string) =>
    client.post(`/api/milestones/${id}/complete`),
  start: (id: string) =>
    client.post(`/api/milestones/${id}/start`),
  submit: (id: string, data: { deliverableUrl?: string; submissionNotes?: string }) =>
    client.post(`/api/milestones/${id}/submit`, data),
  requestChanges: (id: string, reviewFeedback: string) =>
    client.post(`/api/milestones/${id}/request-changes`, { reviewFeedback }),
  dispute: (id: string, reason: string) =>
    client.post(`/api/milestones/${id}/dispute`, { reason }),
  resolveDispute: (id: string, resolution: 'RELEASE' | 'REFUND' | 'REOPEN', resolutionNotes?: string) =>
    client.post(`/api/milestones/${id}/resolve-dispute`, { resolution, resolutionNotes }),
}

export const remindersApi = {
  getAll: (page = 0, size = 20) =>
    client.get(`/api/reminders?page=${page}&size=${size}`),
  getByContract: (contractId: string) =>
    client.get(`/api/reminders/contract/${contractId}`),
  getByMilestone: (milestoneId: string) =>
    client.get(`/api/reminders/milestone/${milestoneId}`),
  trigger: () =>
    client.post('/api/reminders/trigger'),
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
