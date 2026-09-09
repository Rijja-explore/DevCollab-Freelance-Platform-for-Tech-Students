# Implementation Plan: DevCollab Workspace Service Frontend

## Overview

Replace the existing health-check-only frontend with a full real-time collaborative workspace UI. Tasks are ordered foundation-first: globals and config → service layer → context layer → common components → layout → workspace-specific components → pages → wiring and verification. Each task builds on the previous and ends with all code integrated.

The implementation language is **JavaScript (JSX)** using the already-installed React 18, React Router DOM 6, Axios, and socket.io-client. Testing uses **Vitest + fast-check + @testing-library/react**.

---

## Tasks

- [x] 1. Set up testing infrastructure and global styles
  - Install dev dependencies: `npm install --save-dev vitest @testing-library/react @testing-library/jest-dom jsdom fast-check`
  - Configure Vitest in `vite.config.js` with `jsdom` environment and `@testing-library/jest-dom` setup file
  - Create `src/styles/globals.css` with:
    - CSS custom properties: `--color-teal: #06d6a0`, `--color-coral: #ff6b6b`, `--color-violet: #a855f7`, `--color-amber: #fbbf24`, `--bg-primary: #0a0e1a`, `--bg-secondary: #0d1117`
    - Google Fonts import for DM Sans, Syne, and JetBrains Mono
    - Base reset, body background, font assignments
    - Glassmorphism card utility class (`.glass-card`)
    - `meshDrift` keyframe animation for mesh background orbs
    - Dot-grid overlay CSS using `radial-gradient`
    - Shimmer keyframe animation for `LoadingSkeleton`
  - Remove old `App.css` and `index.css`; update `main.jsx` to import `globals.css`
  - _Requirements: 11.4, 11.5_

- [x] 2. Implement API service layer
  - [x] 2.1 Create `src/services/api.js`
    - Configure Axios instance with `baseURL: '/api'`
    - Add request interceptor to attach `Authorization: Bearer <token>` from `localStorage.getItem('authToken')`
    - Add response interceptor to dispatch `new CustomEvent('auth:401')` on 401 and normalize errors to `{ status, message }`
    - Export all endpoint functions: `getHealth`, `getWorkspace`, `getWorkspaceByProject`, `getMessages`, `createMessage`, `updateMessage`, `deleteMessage`, `getComments`, `createComment`, `createReply`, `updateComment`, `deleteComment`, `getMilestones`, `createMilestone`, `getMilestone`, `completeMilestone`
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

  - [ ]* 2.2 Write property test for API error normalization
    - **Property 2: API Error Normalization**
    - **Validates: Requirements 2.5**
    - Use `fc.integer({ min: 400, max: 599 }).filter(n => n !== 401)` and `fc.string()` to generate error inputs
    - Assert rejected promise has `{ status, message }` with matching values
    - Minimum 100 iterations; tag: `// Feature: workspace-frontend, Property 2`

  - [ ]* 2.3 Write unit tests for API service
    - Test that request interceptor attaches Authorization header from localStorage
    - Test that 401 response dispatches `auth:401` custom event
    - Test that each exported function calls the correct HTTP method and URL path

- [x] 3. Implement Socket.IO service
  - Create `src/services/socket.js` with `connectSocket(token)`, `getSocket()`, and `disconnectSocket()` functions
  - `connectSocket` creates singleton `io('http://localhost:5000', { auth: { token }, reconnection: true })` if not already connected
  - Export socket instance management functions
  - _Requirements: 3.1_

- [ ] 4. Implement AuthContext and useAuth hook
  - [~] 4.1 Create `src/contexts/AuthContext.jsx`
    - On mount: read `localStorage.getItem('authToken')`, decode payload with `JSON.parse(atob(token.split('.')[1]))`, set `{ token, userId: payload.sub, role: payload.role }`
    - `setToken(token)`: save to localStorage, decode and update state, call `connectSocket(token)` from socket service
    - `clearToken()`: remove from localStorage, reset state to `{ token: null, userId: null, role: null }`
    - Listen for `auth:401` DOM event on window; call `clearToken()` and add error toast when received
    - _Requirements: 1.1, 1.2, 1.3, 1.5_

  - [ ]* 4.2 Write property test for JWT decode
    - **Property 1: JWT Decode Round-Trip**
    - **Validates: Requirements 1.2**
    - Use `fc.record({ sub: fc.string(), role: fc.string() })` to generate payloads
    - Construct mock JWT, call decode utility, assert `userId === sub` and `role === role`
    - Minimum 100 iterations; tag: `// Feature: workspace-frontend, Property 1`

  - [ ]* 4.3 Write unit tests for AuthContext
    - Test token read from localStorage on mount
    - Test clearToken removes localStorage entry and resets state
    - Test `auth:401` event triggers clearToken

  - [~] 4.4 Create `src/hooks/useAuth.js`
    - Thin wrapper: `return useContext(AuthContext)`

- [ ] 5. Implement ToastContext and Toast component
  - [-] 5.1 Create `src/contexts/ToastContext.jsx`
    - State: `toasts: []`
    - `addToast(message, type)`: push `{ id: crypto.randomUUID(), message, type }` to state; schedule `setTimeout(() => removeToast(id), 4000)`
    - `removeToast(id)`: filter toast from state
    - _Requirements: 10.1, 10.3_

  - [~] 5.2 Create `src/components/common/Toast.jsx`
    - Reads `{ toasts, removeToast }` from ToastContext
    - Renders fixed positioned stack (bottom-right, `position: fixed; bottom: 24px; right: 24px; z-index: 1000`)
    - Each toast: color-coded left border (teal=success, coral=error, amber=info), message text, dismiss `×` button
    - _Requirements: 10.2, 10.4, 10.5_

  - [ ]* 5.3 Write unit tests for Toast system
    - Test toast is rendered after `addToast` call
    - Test toast is removed after 4000 ms (use fake timers)
    - Test dismiss button calls `removeToast` immediately

- [ ] 6. Implement common UI components
  - [-] 6.1 Create `src/components/common/StatusBadge.jsx`
    - Props: `status: string`
    - Map status → CSS class that uses color custom properties per design spec
    - Fallback to muted style for unknown statuses
    - _Requirements: 12.1_

  - [ ]* 6.2 Write property test for StatusBadge color mapping
    - **Property 10: StatusBadge Color Mapping**
    - **Validates: Requirements 9.9, 12.1**
    - Use `fc.oneof(fc.constant('ACTIVE'), fc.constant('COMPLETED'), fc.constant('PENDING'), fc.constant('IN_PROGRESS'), fc.constant('ARCHIVED'))` for known statuses
    - Assert correct CSS class is applied per status; also test arbitrary strings don't throw errors
    - Minimum 100 iterations; tag: `// Feature: workspace-frontend, Property 10`

  - [-] 6.3 Create `src/components/common/Button.jsx`
    - Props: `variant` (`primary`|`secondary`|`danger`), `size` (`sm`|`md`), `onClick`, `disabled`, `type`, `children`
    - _Requirements: 12.2_

  - [-] 6.4 Create `src/components/common/Card.jsx`
    - Glassmorphism wrapper div with `background: rgba(255,255,255,0.04)`, `backdrop-filter: blur(12px)`, `border-radius: 16px`
    - _Requirements: 12.3_

  - [~] 6.5 Create `src/components/common/Modal.jsx`
    - Props: `isOpen`, `onClose`, `title`, `children`
    - Fixed backdrop overlay, close on backdrop click
    - Focus trap: on open, focus first focusable child; Tab key cycles within modal; Escape key calls `onClose`
    - _Requirements: 12.4_

  - [~] 6.6 Create `src/components/common/EmptyState.jsx`, `ErrorState.jsx`, `LoadingSkeleton.jsx`
    - `EmptyState`: centered message with muted icon placeholder
    - `ErrorState`: coral-tinted error message + retry Button
    - `LoadingSkeleton`: animated shimmer blocks using shimmer keyframe from globals.css
    - _Requirements: 12.5, 12.6, 12.7_

  - [~] 6.7 Create `src/components/common/TokenInput.jsx`
    - Collapsible JWT input field with Save and Clear buttons
    - Save: calls `AuthContext.setToken(value)` then collapses
    - Clear: calls `AuthContext.clearToken()`
    - _Requirements: 1.4, 1.5_

- [ ] 7. Implement layout components and wire routing
  - [~] 7.1 Create `src/components/layout/Sidebar.jsx`
    - NavLink to `/` (Dashboard) and `/workspaces` (Workspaces)
    - Active link gets teal left-border indicator using NavLink's `isActive` class
    - Dark glass background panel
    - _Requirements: 11.1_

  - [~] 7.2 Create `src/components/layout/Navbar.jsx`
    - App title "DevCollab Workspace" in Syne font
    - When `userId` is null: renders `<TokenInput />`
    - When `userId` is present: renders userId (JetBrains Mono) and role badge
    - Socket reconnecting indicator: shows amber "Reconnecting…" text when socket is disconnected
    - _Requirements: 11.2, 11.3_

  - [~] 7.3 Create `src/components/layout/Layout.jsx`
    - Renders animated mesh background (3 orbs: teal at top-left, violet at center, coral at bottom-right; `meshDrift` animation)
    - Dot-grid overlay div
    - Sidebar + Navbar + `<main>` slot
    - _Requirements: 11.4_

  - [~] 7.4 Rewrite `src/App.jsx`
    - Wrap with `AuthContext.Provider`, `ToastContext.Provider`
    - Render `<BrowserRouter>` with `<Layout>` wrapping all routes
    - Routes: `/` → `Dashboard`, `/workspaces` → `WorkspaceList`, `/workspaces/:id` → `WorkspaceDetail`
    - Render `<Toast />` at root level
    - _Requirements: 11.6_

- [~] 8. Checkpoint — Verify layout renders
  - Run `npm run build` in `frontend/` and confirm zero errors
  - Ensure all tests pass, ask the user if questions arise

- [ ] 9. Implement workspace components
  - [~] 9.1 Create `src/components/workspace/WorkspaceHeader.jsx`
    - Props: `workspace: { id, projectId, studentId, startupId, status, createdAt }`
    - Display all fields; IDs in JetBrains Mono; `StatusBadge` for status; `toLocaleDateString()` for date
    - _Requirements: 6.2_

  - [~] 9.2 Create `src/components/workspace/WorkspaceNotFound.jsx`
    - Props: `workspaceId: string`
    - Coral-tinted card with not-found message and `<Link to="/workspaces">` back to lookup page
    - _Requirements: 6.3_

- [ ] 10. Implement ChatPanel and MessageBubble
  - [~] 10.1 Create `src/components/messages/MessageBubble.jsx`
    - Props: `message`, `currentUserId`, `onEdit`, `onDelete`
    - Right-aligned layout and edit/delete buttons only when `message.senderId === currentUserId`
    - "(edited)" suffix when `message.edited === true`
    - SYSTEM type messages rendered as centered muted system notice
    - _Requirements: 7.2, 7.3_

  - [ ]* 10.2 Write property test for MessageBubble ownership gating
    - **Property 9: Ownership-Gated Edit/Delete Visibility (messages)**
    - **Validates: Requirements 7.3**
    - Use `fc.string()` for senderId and currentUserId
    - Assert edit/delete buttons visible iff senderId === currentUserId
    - Minimum 100 iterations; tag: `// Feature: workspace-frontend, Property 9`

  - [~] 10.3 Create `src/components/messages/ChatPanel.jsx`
    - Fetch messages on mount with `api.getMessages(workspaceId)`
    - Subscribe to `message-created`, `message-updated`, `message-deleted` socket events
    - Unsubscribe on unmount
    - Auto-scroll `messagesEndRef` when messages array changes
    - Send form: `POST` new message on submit, optimistically append
    - Inline edit form: shown when `editingId` matches message id; `PUT` on submit
    - Delete: `DELETE` on click, remove from state
    - Show `LoadingSkeleton` while loading, `ErrorState` on failure
    - _Requirements: 7.1, 7.4, 7.5, 7.6, 7.7, 7.8, 7.9, 7.10_

  - [ ]* 10.4 Write property tests for message list socket mutations
    - **Property 3: Message List Append**
    - **Property 4: Message List Update**
    - **Property 5: Message List Delete**
    - **Validates: Requirements 3.4, 3.5, 3.6**
    - Extract reducer/handler functions from ChatPanel for isolated testing
    - Use `fc.array(messageArbitrary)` and `fc.record(messageArbitrary)` to generate inputs
    - Assert list length and content invariants for each mutation type
    - Minimum 100 iterations each; tag: `// Feature: workspace-frontend, Property 3/4/5`

- [ ] 11. Implement CommentsPanel and CommentItem
  - [~] 11.1 Create `src/components/comments/CommentItem.jsx`
    - Props: `comment`, `currentUserId`, `onReply`, `onEdit`, `onDelete`
    - Display authorId, text, timestamp, optional fileRef/lineNumber badge
    - Edit/delete buttons only when `comment.authorId === currentUserId`
    - Inline reply form shown when reply button clicked
    - Render nested `replies` array as child `CommentItem` components (indented)
    - _Requirements: 8.2, 8.3, 8.6_

  - [ ]* 11.2 Write property test for CommentItem ownership gating
    - **Property 9: Ownership-Gated Edit/Delete Visibility (comments)**
    - **Validates: Requirements 8.3**
    - Use `fc.string()` for authorId and currentUserId
    - Assert edit/delete buttons visible iff authorId === currentUserId
    - Minimum 100 iterations; tag: `// Feature: workspace-frontend, Property 9`

  - [~] 11.3 Create `src/components/comments/CommentsPanel.jsx`
    - Fetch comments on mount with `api.getComments(workspaceId)`
    - Subscribe to `comment-created`, `comment-updated`, `comment-deleted` socket events; update list accordingly
    - New-comment form: text (required), fileRef (optional), lineNumber (optional)
    - Reply, edit, delete delegated to `CommentItem` via callbacks
    - Show `LoadingSkeleton` while loading, `ErrorState` on failure
    - _Requirements: 8.1, 8.4, 8.5, 8.7, 8.8, 8.9, 8.10, 8.11, 8.12_

  - [ ]* 11.4 Write property tests for comment list socket mutations
    - **Property 6: Comment List Upsert (Top-Level and Reply)**
    - **Property 7: Comment List Update**
    - **Property 8: Comment List Delete**
    - **Validates: Requirements 3.7, 3.8, 3.9**
    - Extract comment list mutation functions for isolated testing
    - Use `fc.array` and `fc.record` arbitraries; test both null and non-null `parentId` for Property 6
    - Minimum 100 iterations each; tag: `// Feature: workspace-frontend, Property 6/7/8`

- [ ] 12. Implement Milestones components
  - [~] 12.1 Create `src/components/milestones/MilestoneCard.jsx`
    - Props: `milestone`, `onComplete`
    - Display title, amount (formatted with `Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })`), StatusBadge, completedAt, completionNotes
    - "Complete" button visible only when status is `PENDING` or `IN_PROGRESS`
    - _Requirements: 9.2, 9.6, 9.9_

  - [~] 12.2 Create `src/components/milestones/CreateMilestoneModal.jsx`
    - Props: `workspaceId`, `isOpen`, `onClose`, `onCreated`
    - Form: contractId (text, required), title (text, required), amount (number, required, min 0)
    - On submit: call `api.createMilestone(workspaceId, { contractId, title, amount })`, call `onCreated(newMilestone)`, close modal
    - _Requirements: 9.3, 9.4, 9.5_

  - [~] 12.3 Create `src/components/milestones/CompleteMilestoneModal.jsx`
    - Props: `milestone`, `isOpen`, `onClose`, `onCompleted`
    - Form: completionNotes (textarea, optional)
    - On submit: call `api.completeMilestone(milestone.id, { completionNotes })`, call `onCompleted(updatedMilestone)`, close modal
    - _Requirements: 9.7, 9.8_

  - [~] 12.4 Create `src/components/milestones/MilestonesPanel.jsx`
    - Fetch milestones on mount with `api.getMilestones(workspaceId)`
    - "Create Milestone" button → open `CreateMilestoneModal`
    - On `onCreated`: append new milestone to state
    - On `onCompleted`: replace updated milestone in state
    - Show `LoadingSkeleton` while loading, `ErrorState` on failure
    - _Requirements: 9.1, 9.10_

- [ ] 13. Implement pages
  - [~] 13.1 Create `src/pages/Dashboard.jsx`
    - Fetch `/health` on mount with `api.getHealth()`; render health card with status, service, uptime, timestamp
    - StatusBadge: teal when `status === "ok"`, muted error otherwise
    - Workspace-ID lookup form: navigate to `/workspaces/:id` on submit
    - Project-ID lookup form: call `api.getWorkspaceByProject(projectId)`, navigate on success, show inline error on 404
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7_

  - [~] 13.2 Create `src/pages/WorkspaceList.jsx`
    - Explanatory text about no list endpoint
    - Same two lookup forms as Dashboard (extract a shared `WorkspaceLookupForms` component if desired)
    - _Requirements: 5.1, 5.2, 5.3, 5.4_

  - [~] 13.3 Create `src/pages/WorkspaceDetail.jsx`
    - `const { id: workspaceId } = useParams()`
    - Fetch workspace with `api.getWorkspace(workspaceId)` on mount; render `WorkspaceNotFound` on 404
    - Mount `useSocket(workspaceId)` for workspace room subscription
    - Tab bar: "Chat" | "Comments" | "Milestones"; default to Chat
    - Render `ChatPanel`, `CommentsPanel`, or `MilestonesPanel` based on active tab
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6_

- [~] 14. Implement useSocket hook
  - Create `src/hooks/useSocket.js`
  - Call `connectSocket(token)` from socket service using current token from AuthContext
  - When `workspaceId` is provided: emit `join-workspace` with `{ workspaceId }` after `connected` event
  - On cleanup (unmount): emit `leave-workspace` with `{ workspaceId }`
  - Expose socket instance and `connected` state
  - _Requirements: 3.1, 3.2, 3.3, 3.11_

- [~] 15. Final checkpoint — Full build and test pass
  - Run `npm run test -- --run` in `frontend/` and confirm all tests pass
  - Run `npm run build` in `frontend/` and confirm zero errors
  - Ensure all tests pass, ask the user if questions arise

---

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster initial delivery; core functionality remains complete without them
- Property tests (tasks 2.2, 4.2, 6.2, 10.2, 10.4, 11.2, 11.4) require extracting pure reducer/handler functions out of components for isolation — this is a deliberate design nudge toward testable code
- The `useSocket` hook (Task 14) is intentionally placed after pages (Task 13) because `WorkspaceDetail` defines the integration point; implement the hook after seeing the full usage context
- No new runtime npm packages should be added — the feature is fully achievable with the already-installed dependencies
- Socket.IO connects to `http://localhost:5000` directly, NOT through the Vite `/api` proxy
