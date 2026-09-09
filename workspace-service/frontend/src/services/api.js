import axios from 'axios';

/**
 * API Service Layer
 *
 * Centralized Axios instance for all backend REST calls.
 * - baseURL: '/api' (proxied to port 5000 by Vite dev server)
 * - Request interceptor: attaches Authorization header from localStorage
 * - Response interceptor: dispatches auth:401 event on 401, normalizes errors to { status, message }
 */

const instance = axios.create({ baseURL: '/api' });

// Request interceptor — attach Authorization header if token is present
instance.interceptors.request.use(config => {
  const token = localStorage.getItem('authToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor — handle 401 and normalize errors
instance.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401) {
      window.dispatchEvent(new CustomEvent('auth:401'));
    }
    return Promise.reject({
      status: err.response?.status,
      message: err.response?.data?.message || err.message,
    });
  }
);

// ─── Health ──────────────────────────────────────────────────────────────────

/** GET /health */
export const getHealth = () => instance.get('/health').then(res => res.data);

// ─── Workspaces ───────────────────────────────────────────────────────────────

/** GET /workspaces/:id */
export const getWorkspace = (id) =>
  instance.get(`/workspaces/${id}`).then(res => res.data);

/** GET /workspaces/project/:projectId */
export const getWorkspaceByProject = (projectId) =>
  instance.get(`/workspaces/project/${projectId}`).then(res => res.data);

// ─── Messages ─────────────────────────────────────────────────────────────────

/** GET /workspaces/:workspaceId/messages */
export const getMessages = (workspaceId) =>
  instance.get(`/workspaces/${workspaceId}/messages`).then(res => res.data);

/** POST /workspaces/:workspaceId/messages */
export const createMessage = (workspaceId, body) =>
  instance.post(`/workspaces/${workspaceId}/messages`, body).then(res => res.data);

/** PUT /messages/:messageId */
export const updateMessage = (messageId, body) =>
  instance.put(`/messages/${messageId}`, body).then(res => res.data);

/** DELETE /messages/:messageId */
export const deleteMessage = (messageId) =>
  instance.delete(`/messages/${messageId}`).then(res => res.data);

// ─── Comments ─────────────────────────────────────────────────────────────────

/** GET /workspaces/:workspaceId/comments */
export const getComments = (workspaceId) =>
  instance.get(`/workspaces/${workspaceId}/comments`).then(res => res.data);

/** POST /workspaces/:workspaceId/comments */
export const createComment = (workspaceId, body) =>
  instance.post(`/workspaces/${workspaceId}/comments`, body).then(res => res.data);

/** POST /comments/:commentId/reply */
export const createReply = (commentId, body) =>
  instance.post(`/comments/${commentId}/reply`, body).then(res => res.data);

/** PUT /comments/:commentId */
export const updateComment = (commentId, body) =>
  instance.put(`/comments/${commentId}`, body).then(res => res.data);

/** DELETE /comments/:commentId */
export const deleteComment = (commentId) =>
  instance.delete(`/comments/${commentId}`).then(res => res.data);

// ─── Milestones ───────────────────────────────────────────────────────────────

/** GET /workspaces/:workspaceId/milestones */
export const getMilestones = (workspaceId) =>
  instance.get(`/workspaces/${workspaceId}/milestones`).then(res => res.data);

/** POST /workspaces/:workspaceId/milestones */
export const createMilestone = (workspaceId, body) =>
  instance.post(`/workspaces/${workspaceId}/milestones`, body).then(res => res.data);

/** GET /milestones/:milestoneId */
export const getMilestone = (milestoneId) =>
  instance.get(`/milestones/${milestoneId}`).then(res => res.data);

/** POST /milestones/:milestoneId/complete */
export const completeMilestone = (milestoneId, body) =>
  instance.post(`/milestones/${milestoneId}/complete`, body).then(res => res.data);

export default instance;
