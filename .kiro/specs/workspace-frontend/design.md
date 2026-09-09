# Design Document: DevCollab Workspace Service Frontend

## Overview

The workspace-frontend is a React 18 SPA that wraps the fully-implemented workspace-service backend. It provides real-time collaborative workspace views — chat, threaded comments, and milestone tracking — over Socket.IO and REST. The application replaces the existing minimal health-check page with a complete glassmorphism UI consistent with the DevCollab platform design language.

The frontend is already bootstrapped with React 18, React Router DOM 6, Axios, and socket.io-client. No additional runtime dependencies will be added. Styling is done with vanilla CSS (CSS custom properties + CSS Modules or a single `globals.css` stylesheet).

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│  Browser (port 3000)                                    │
│  ┌───────────────────────────────────────────────────┐  │
│  │  React App                                        │  │
│  │  ┌──────────────┐   ┌────────────────────────┐   │  │
│  │  │ AuthContext  │   │   ToastContext          │   │  │
│  │  └──────────────┘   └────────────────────────┘   │  │
│  │  ┌────────────────────────────────────────────┐   │  │
│  │  │  React Router DOM v6 (BrowserRouter)       │   │  │
│  │  │  /           → Dashboard                  │   │  │
│  │  │  /workspaces → WorkspaceList              │   │  │
│  │  │  /workspaces/:id → WorkspaceDetail        │   │  │
│  │  └────────────────────────────────────────────┘   │  │
│  │  ┌────────────────┐  ┌──────────────────────┐    │  │
│  │  │  api.js        │  │  socket.js           │    │  │
│  │  │  (Axios)       │  │  (Socket.IO client)  │    │  │
│  │  └────────────────┘  └──────────────────────┘    │  │
│  └───────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
         │ /api/* (Vite proxy)          │ ws:// direct
         ▼                              ▼
┌─────────────────┐           ┌─────────────────────┐
│  REST API       │           │  Socket.IO server   │
│  port 5000      │           │  port 5000          │
└─────────────────┘           └─────────────────────┘
```

### Key Architectural Decisions

**No CSS framework**: The design spec calls for a specific glassmorphism aesthetic. Using Tailwind or another framework would fight against it. All styles live in `globals.css` using CSS custom properties.

**No separate toast library**: ToastContext + a simple Toast component is ~50 lines and eliminates a dependency.

**No Redux / Zustand**: The state surface is small and co-located. AuthContext and ToastContext are the only global states. Panel-level state (messages, comments, milestones) lives in the respective panel components, updated by socket events.

**Socket singleton**: `socket.js` exports a singleton `io()` instance created once at module load. Hooks and components use `getSocket()` / `connectSocket()` helpers rather than creating multiple connections.

**Vite proxy for REST, direct connection for Socket.IO**: The Vite config already proxies `/api` to port 5000. Socket.IO must connect directly to `http://localhost:5000` — it cannot go through the Vite proxy because WebSocket upgrade headers are not reliably forwarded.

---

## Components and Interfaces

### Context Layer

#### AuthContext (`src/contexts/AuthContext.jsx`)

```js
// Provides:
{
  token: string | null,
  userId: string | null,
  role: string | null,
  setToken(token: string): void,   // saves to localStorage, decodes payload
  clearToken(): void,               // removes from localStorage, resets state
}
```

Listens for a custom `auth:401` DOM event dispatched by `api.js` to clear the session.

#### ToastContext (`src/contexts/ToastContext.jsx`)

```js
// Provides:
{
  toasts: Array<{ id: string, message: string, type: 'success'|'error'|'info' }>,
  addToast(message: string, type: string): void,
  removeToast(id: string): void,
}
```

Auto-removes toasts after 4000 ms using `setTimeout` keyed to each toast's `id`.

---

### Hook Layer

#### useAuth (`src/hooks/useAuth.js`)
Convenience wrapper: `const { token, userId, role, setToken, clearToken } = useAuth()`

#### useSocket (`src/hooks/useSocket.js`)
```js
// Returns the singleton socket instance, connecting if necessary.
// Joins/leaves the workspace room on mount/unmount when workspaceId is provided.
useSocket(workspaceId?: string): Socket
```

---

### Service Layer

#### api.js (`src/services/api.js`)

```js
const instance = axios.create({ baseURL: '/api' });

// Request interceptor: attach Authorization header
instance.interceptors.request.use(config => {
  const token = localStorage.getItem('authToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Response interceptor: handle 401
instance.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401) {
      window.dispatchEvent(new CustomEvent('auth:401'));
    }
    return Promise.reject({ status: err.response?.status, message: err.response?.data?.message || err.message });
  }
);

// Exported functions (see Requirement 2.4)
```

#### socket.js (`src/services/socket.js`)

```js
import { io } from 'socket.io-client';

let socket = null;

export function getSocket() { return socket; }

export function connectSocket(token) {
  if (socket?.connected) return socket;
  socket = io('http://localhost:5000', {
    auth: { token },
    autoConnect: true,
    reconnection: true,
  });
  return socket;
}

export function disconnectSocket() {
  socket?.disconnect();
  socket = null;
}
```

---

### Layout Components

#### Layout (`src/components/layout/Layout.jsx`)
Top-level wrapper rendered by all routes. Renders:
- `MeshBackground` (animated orbs + dot grid, position: fixed, z-index: -1)
- `Sidebar` (left navigation)
- `Navbar` (top bar)
- `<main>` slot for page content

#### Sidebar (`src/components/layout/Sidebar.jsx`)
Navigation links using React Router `<NavLink>`. Active link gets teal left-border indicator. Links: Dashboard (`/`), Workspaces (`/workspaces`).

#### Navbar (`src/components/layout/Navbar.jsx`)
- App title: "DevCollab Workspace" (Syne font)
- When unauthenticated: renders `<TokenInput />`
- When authenticated: renders decoded `userId` in JetBrains Mono and `role` badge

---

### Common Components

#### StatusBadge (`src/components/common/StatusBadge.jsx`)
Props: `status: string`

Color mapping (CSS custom properties):
- `ACTIVE`, `COMPLETED` → `var(--color-teal)` (#06d6a0)
- `PENDING` → `var(--color-amber)` (#fbbf24)
- `IN_PROGRESS` → `var(--color-violet)` (#a855f7)
- `ARCHIVED` → `var(--color-muted)` (#6b7280)

Renders as a small pill with background at 15% opacity and text at full color.

#### Button (`src/components/common/Button.jsx`)
Props: `variant: 'primary'|'secondary'|'danger'`, `size: 'sm'|'md'`, `onClick`, `disabled`, `type`, `children`

- `primary`: teal background
- `secondary`: glass border, no background fill
- `danger`: coral background

#### Card (`src/components/common/Card.jsx`)
Glassmorphism container. Renders `<div>` with:
```css
background: rgba(255, 255, 255, 0.04);
backdrop-filter: blur(12px);
border: 1px solid rgba(255, 255, 255, 0.08);
border-radius: 16px;
```

#### Modal (`src/components/common/Modal.jsx`)
Props: `isOpen: bool`, `onClose: fn`, `title: string`, `children`

Renders a fixed backdrop overlay. Closes on backdrop click. Traps focus within modal while open (using `useRef` + `onKeyDown` Tab handler). Renders with glassmorphism card styling.

#### EmptyState (`src/components/common/EmptyState.jsx`)
Props: `message: string`, `icon?: ReactNode`

Centered layout with a large muted icon placeholder and message text.

#### ErrorState (`src/components/common/ErrorState.jsx`)
Props: `message: string`, `onRetry: fn`

Renders coral-tinted error message and a "Retry" Button with `variant="secondary"`.

#### LoadingSkeleton (`src/components/common/LoadingSkeleton.jsx`)
Props: `lines?: number`, `height?: string`

Renders animated shimmer placeholder blocks using `@keyframes shimmer`.

#### TokenInput (`src/components/common/TokenInput.jsx`)
Renders a collapsible input field. User pastes JWT → clicks "Save" → `setToken()` from AuthContext. Also renders a "Clear" button when a token is present.

#### Toast (`src/components/common/Toast.jsx`)
Renders the active toast list from ToastContext. Fixed position, bottom-right. Each toast shows `message` and a dismiss `×` button.

---

### Workspace Components

#### WorkspaceHeader (`src/components/workspace/WorkspaceHeader.jsx`)
Props: `workspace: { id, projectId, studentId, startupId, status, createdAt }`

Displays all fields. Uses `StatusBadge` for `status`. Formats `createdAt` with `toLocaleDateString()`. IDs rendered in JetBrains Mono.

#### WorkspaceNotFound (`src/components/workspace/WorkspaceNotFound.jsx`)
Props: `workspaceId: string`

Displays a coral-tinted error card with the not-found workspaceId and a `<Link>` back to `/workspaces`.

---

### Message Components

#### ChatPanel (`src/components/messages/ChatPanel.jsx`)
Props: `workspaceId: string`

State: `messages: Message[]`, `loading: bool`, `error: string|null`, `inputText: string`, `editingId: string|null`, `editText: string`

Lifecycle:
1. On mount: fetch messages, subscribe to socket events (message-created/updated/deleted).
2. On new message: auto-scroll `messagesEndRef` into view.
3. On unmount: unsubscribe socket listeners.

Renders: scrollable message list + input form at bottom.

#### MessageBubble (`src/components/messages/MessageBubble.jsx`)
Props: `message: Message`, `currentUserId: string`, `onEdit: fn`, `onDelete: fn`

Right-aligned when `message.senderId === currentUserId`, left-aligned otherwise. Edit/delete buttons only shown for own messages. Edited messages show "(edited)" suffix.

---

### Comment Components

#### CommentsPanel (`src/components/comments/CommentsPanel.jsx`)
Props: `workspaceId: string`

State: `comments: Comment[]`, `loading: bool`, `error: string|null`, form state for new comment.

Lifecycle: fetch on mount, subscribe to comment socket events.

Renders: new-comment form (text + optional fileRef + lineNumber) at top, then `CommentItem` list.

#### CommentItem (`src/components/comments/CommentItem.jsx`)
Props: `comment: Comment`, `currentUserId: string`, `onReply: fn`, `onEdit: fn`, `onDelete: fn`

Renders comment body, optional file/line badge, reply list (nested `CommentItem` components for `replies[]`), and action buttons for own comments.

---

### Milestone Components

#### MilestonesPanel (`src/components/milestones/MilestonesPanel.jsx`)
Props: `workspaceId: string`

State: `milestones: Milestone[]`, `loading: bool`, `error: string|null`, modal open states.

Renders: "Create Milestone" button + `MilestoneCard` list.

#### MilestoneCard (`src/components/milestones/MilestoneCard.jsx`)
Props: `milestone: Milestone`, `onComplete: fn`

Displays title, amount (formatted with `Intl.NumberFormat` as USD), `StatusBadge`, completion metadata when present. Shows "Complete" button for PENDING or IN_PROGRESS milestones.

#### CreateMilestoneModal (`src/components/milestones/CreateMilestoneModal.jsx`)
Props: `workspaceId: string`, `isOpen: bool`, `onClose: fn`, `onCreated: fn`

Form fields: `contractId` (text, required), `title` (text, required), `amount` (number, required, min 0). Calls `api.createMilestone()` on submit.

#### CompleteMilestoneModal (`src/components/milestones/CompleteMilestoneModal.jsx`)
Props: `milestone: Milestone`, `isOpen: bool`, `onClose: fn`, `onCompleted: fn`

Form field: `completionNotes` (textarea, optional). Calls `api.completeMilestone()` on submit.

---

### Pages

#### Dashboard (`src/pages/Dashboard.jsx`)
- Fetches `/health` on mount.
- Renders `HealthStatusCard` (inline component) with health data.
- Renders two lookup forms: by workspace ID (navigates to `/workspaces/:id`) and by project ID (calls `api.getWorkspaceByProject()` then navigates).

#### WorkspaceList (`src/pages/WorkspaceList.jsx`)
- Displays explanatory text about the absence of a list endpoint.
- Renders the same lookup forms as Dashboard.

#### WorkspaceDetail (`src/pages/WorkspaceDetail.jsx`)
- Reads `workspaceId` from `useParams()`.
- Fetches workspace on mount; renders `WorkspaceNotFound` on 404.
- Renders `WorkspaceHeader` + tab bar + active panel (`ChatPanel` | `CommentsPanel` | `MilestonesPanel`).
- Mounts `useSocket(workspaceId)` to join the workspace room.

---

## Data Models

### Message
```ts
{
  id: string,
  workspaceId: { _id: string, projectId: string } | string,
  senderId: string,
  text: string,
  type: 'TEXT' | 'SYSTEM',
  deleted: boolean,
  edited: boolean,
  editedAt: string | null,
  createdAt: string,
  updatedAt: string,
}
```

### Comment
```ts
{
  id: string,
  workspaceId: string,
  fileRef: string | null,
  lineNumber: number | null,
  authorId: string,
  text: string,
  parentId: string | null,
  deleted: boolean,
  edited: boolean,
  editedAt: string | null,
  replyCount: number,
  replies: Comment[],
  createdAt: string,
  updatedAt: string,
}
```

### Milestone
```ts
{
  id: string,
  workspaceId: string,
  projectId: string,
  contractId: string,
  studentId: string,
  title: string,
  amount: number,
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED',
  completedAt: string | null,
  completionNotes: string | null,
  createdAt: string,
  updatedAt: string,
}
```

### Workspace
```ts
{
  id: string,
  projectId: string,
  studentId: string,
  startupId: string,
  status: 'ACTIVE' | 'ARCHIVED',
  createdAt: string,
  updatedAt: string,
}
```

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: JWT Decode Round-Trip

*For any* well-formed JWT string with a payload containing `{ sub, role }`, the `decodeToken(token)` utility function SHALL return `{ userId: sub, role }` that exactly matches the values encoded in the token's payload section.

**Validates: Requirements 1.2**

---

### Property 2: API Error Normalization

*For any* HTTP error status code in the range 400–599 (excluding 401) and any error message string, the api service SHALL reject the promise with an object whose `status` field equals the HTTP status code and whose `message` field is a non-empty string.

**Validates: Requirements 2.5**

---

### Property 3: Message List Append

*For any* array of Message objects and any new valid Message object not already in the list, receiving a `message-created` socket event SHALL produce a list whose length is exactly the original length plus one, and the last element SHALL equal the new message.

**Validates: Requirements 3.4**

---

### Property 4: Message List Update

*For any* array of Message objects containing an item with id X, receiving a `message-updated` socket event for id X with updated text SHALL produce a list of the same length where the item with id X has the updated text and all other items are unchanged.

**Validates: Requirements 3.5**

---

### Property 5: Message List Delete

*For any* array of Message objects containing an item with id X, receiving a `message-deleted` socket event with `{ messageId: X }` SHALL produce a list that contains no item with id X and has length exactly one less than the original.

**Validates: Requirements 3.6**

---

### Property 6: Comment List Upsert (Top-Level and Reply)

*For any* array of Comment objects and any new valid Comment (with `parentId: null` for top-level, or a valid `parentId` for a reply), receiving a `comment-created` socket event SHALL correctly place the comment: top-level comments are appended to the root list; replies are appended to the `replies` array of the parent comment identified by `parentId`.

**Validates: Requirements 3.7**

---

### Property 7: Comment List Update

*For any* array of Comment objects containing an item with id X, receiving a `comment-updated` socket event for id X SHALL produce a list where the item with id X reflects the updated data and the list length is unchanged.

**Validates: Requirements 3.8**

---

### Property 8: Comment List Delete

*For any* array of Comment objects containing an item with id X, receiving a `comment-deleted` socket event with `{ commentId: X }` SHALL produce a list that contains no item with id X.

**Validates: Requirements 3.9**

---

### Property 9: Ownership-Gated Edit/Delete Visibility

*For any* message (or comment) and any userId string, the edit and delete action buttons SHALL be visible if and only if `senderId` (or `authorId`) equals `userId`. This property holds for all combinations of message content, user IDs, and component render states.

**Validates: Requirements 7.3, 8.3**

---

### Property 10: StatusBadge Color Mapping

*For any* status string in the defined set `{ ACTIVE, COMPLETED, PENDING, IN_PROGRESS, ARCHIVED }`, the StatusBadge component SHALL apply the correct semantic CSS class/color variable: ACTIVE → teal, COMPLETED → teal, PENDING → amber, IN_PROGRESS → violet, ARCHIVED → muted. For any status string not in the defined set, the component SHALL apply a default muted style without throwing an error.

**Validates: Requirements 9.9, 12.1**

---

## Error Handling

### API Errors
- All api service functions wrap responses. Non-2xx responses are normalized to `{ status, message }`.
- 401 responses trigger `auth:401` custom event → AuthContext clears session → toast shown.
- 404 from workspace fetch → WorkspaceNotFound component rendered.
- Other errors → `ErrorState` component with retry callback.

### Socket Errors
- `error` event from server → toast notification with the error message.
- Connection loss → Socket.IO auto-reconnect (enabled by default). A small banner "Reconnecting…" is shown in the Navbar while `socket.connected === false`.
- Failed `join-workspace` → toast error.

### Form Validation
- All forms validate required fields client-side before dispatching requests.
- Empty/whitespace-only text inputs are rejected with inline error messages.
- Amount fields reject non-numeric and negative values.

### Loading States
- All data-fetching operations set `loading: true` before the request and `loading: false` in the finally block.
- `LoadingSkeleton` is shown during loading for message, comment, and milestone lists.

---

## Testing Strategy

### Dual Testing Approach

Both unit tests and property-based tests are used:
- **Unit tests**: Specific examples, edge cases, integration points between components, and error conditions.
- **Property-based tests**: Universal properties across many generated inputs (Properties 1–10 above).

### Property-Based Testing Library

**fast-check** will be used for property-based testing. It is the standard PBT library for JavaScript/TypeScript and integrates with Vitest.

Install command (to be added in tasks): `npm install --save-dev fast-check vitest @testing-library/react @testing-library/jest-dom jsdom`

Each property test is configured to run a **minimum of 100 iterations**.

### Tag Format

Each property test MUST include a comment:
```
// Feature: workspace-frontend, Property N: <property_text>
```

### Test File Locations

```
frontend/src/
├── __tests__/
│   ├── services/
│   │   ├── api.test.js          (unit + property: api error normalization)
│   │   └── auth.test.js         (unit: JWT decode)
│   ├── contexts/
│   │   └── AuthContext.test.jsx (unit: token lifecycle)
│   ├── components/
│   │   ├── StatusBadge.test.jsx (property: color mapping)
│   │   ├── MessageBubble.test.jsx (property: ownership gating)
│   │   └── CommentItem.test.jsx (property: ownership gating)
│   └── hooks/
│       └── useSocket.test.js    (unit + property: message/comment list mutations)
```

### Unit Test Focus Areas
- AuthContext token read/write/clear lifecycle
- TokenInput save and clear interactions
- 401 response → session clearance flow
- Dashboard health fetch and form submission
- WorkspaceDetail tab switching
- ChatPanel auto-scroll on new message
- Modal focus trap and backdrop close
- Toast auto-dismiss after 4000 ms
- Toast dismiss button immediate removal

### Property Test Focus Areas
- Property 1: JWT decode (fast-check string/base64 arbitraries)
- Property 2: API error normalization (fast-check integer + string arbitraries)
- Properties 3–5: Message list mutations (fast-check array + record arbitraries)
- Properties 6–8: Comment list mutations (fast-check array + record arbitraries)
- Property 9: Ownership-gated visibility (fast-check string pair arbitraries)
- Property 10: StatusBadge color mapping (fast-check oneof arbitrary from status enum)
