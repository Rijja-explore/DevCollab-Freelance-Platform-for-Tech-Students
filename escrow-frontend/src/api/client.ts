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

// ─── Response Interceptor: Handle 401 ───────────────────────────────────────
client.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('devcollab_token')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  },
)

// ─── API Functions ────────────────────────────────────────────────────────────

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
