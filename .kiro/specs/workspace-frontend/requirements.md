# Requirements Document

## Introduction

The DevCollab Workspace Service Frontend is a React 18 single-page application that provides a real-time collaborative interface for the workspace-service backend (fully implemented through Phase 8). The frontend enables students and startups to communicate via chat, review code via threaded comments, and track project milestones — all synchronized in real time over Socket.IO. The application uses a dark glassmorphism design language consistent with the broader DevCollab platform.

## Glossary

- **App**: The React 18 single-page application running on port 3000.
- **AuthContext**: React context that manages the JWT token and decoded user identity throughout the component tree.
- **ToastContext**: React context that manages transient notification messages displayed to the user.
- **Workspace**: A collaboration space joining a student and a startup for a project, identified by a UUID.
- **Message**: A chat message sent within a workspace with a `TEXT` or `SYSTEM` type.
- **Comment**: A threaded annotation optionally tied to a file reference and line number within a workspace.
- **Reply**: A Comment whose `parentId` references another Comment.
- **Milestone**: A deliverable within a workspace with a `PENDING`, `IN_PROGRESS`, or `COMPLETED` status and an associated payment amount.
- **Socket**: The Socket.IO client connection used for receiving real-time workspace events.
- **JWT**: JSON Web Token stored in `localStorage` under the key `authToken`; payload contains `{ sub, role, iat, exp }`.
- **API_BASE**: The Vite dev-proxy prefix `/api` that forwards requests to the backend on port 5000.
- **StatusBadge**: A UI component that maps a status string to a semantic color.
- **Toast**: A transient non-blocking notification message displayed in the App.
- **WorkspaceDetail**: The page that renders the workspace's Chat, Comments, and Milestones tabs.

---

## Requirements

### Requirement 1: Authentication Token Management

**User Story:** As a developer or tester, I want to provide my JWT token to the application, so that I can authenticate API and Socket.IO requests without a separate login flow.

#### Acceptance Criteria

1. THE App SHALL read the JWT from `localStorage.getItem('authToken')` on startup and store it in AuthContext.
2. WHEN AuthContext is initialized and a token is present, THE App SHALL decode the JWT payload using `JSON.parse(atob(token.split('.')[1]))` and expose `{ userId, role }` to all consumers.
3. WHEN any API response returns HTTP 401, THE App SHALL remove the token from `localStorage`, clear AuthContext state, and display a toast notification informing the user that the session has expired.
4. THE TokenInput component SHALL allow the user to paste a JWT string into a text field and save it to `localStorage.setItem('authToken', token)`, then reload AuthContext state.
5. WHEN the user clears the token via TokenInput, THE App SHALL remove the token from `localStorage` and reset AuthContext to an unauthenticated state.
6. WHILE the user is unauthenticated, THE App SHALL display the TokenInput component in the Navbar so that the user can provide credentials.

---

### Requirement 2: API Service Layer

**User Story:** As a frontend developer, I want a centralized Axios service module, so that all HTTP requests share the same base URL, authorization header, and error-handling logic.

#### Acceptance Criteria

1. THE api service SHALL configure an Axios instance with `baseURL: '/api'` to route requests through the Vite dev proxy.
2. WHEN a request is dispatched, THE api service SHALL attach the header `Authorization: Bearer <token>` using the value from `localStorage.getItem('authToken')`.
3. WHEN an API response has HTTP status 401, THE api service SHALL dispatch a `401` event that AuthContext listens to, triggering session clearance.
4. THE api service SHALL expose typed functions for every backend endpoint: `getWorkspace(id)`, `getWorkspaceByProject(projectId)`, `getMessages(workspaceId)`, `createMessage(workspaceId, body)`, `updateMessage(messageId, body)`, `deleteMessage(messageId)`, `getComments(workspaceId)`, `createComment(workspaceId, body)`, `createReply(commentId, body)`, `updateComment(commentId, body)`, `deleteComment(commentId)`, `getMilestones(workspaceId)`, `createMilestone(workspaceId, body)`, `getMilestone(milestoneId)`, `completeMilestone(milestoneId, body)`.
5. WHEN an API call fails with a non-401 network or server error, THE api service SHALL reject the promise with a normalized error object containing `{ status, message }`.

---

### Requirement 3: Socket.IO Real-Time Integration

**User Story:** As a collaborator, I want workspace state (messages, comments, milestones) to update in real time without page refresh, so that I see changes made by other participants immediately.

#### Acceptance Criteria

1. THE socket service SHALL establish a Socket.IO connection to `http://localhost:5000` with `{ auth: { token } }` using the current `authToken` from `localStorage`.
2. WHEN the WorkspaceDetail page mounts, THE socket service SHALL emit `join-workspace` with `{ workspaceId }` to subscribe to workspace-scoped events.
3. WHEN the WorkspaceDetail page unmounts, THE socket service SHALL emit `leave-workspace` with `{ workspaceId }` before disconnecting the room subscription.
4. WHEN THE socket receives `message-created`, THE App SHALL append the new Message document to the ChatPanel message list without a full data refetch.
5. WHEN THE socket receives `message-updated`, THE App SHALL replace the matching message in the ChatPanel message list by `id`.
6. WHEN THE socket receives `message-deleted`, THE App SHALL remove the matching message from the ChatPanel message list by `messageId`.
7. WHEN THE socket receives `comment-created`, THE App SHALL append the new Comment document to the CommentsPanel list, or append it as a reply under the parent comment when `parentId` is set.
8. WHEN THE socket receives `comment-updated`, THE App SHALL replace the matching comment in the CommentsPanel list by `id`.
9. WHEN THE socket receives `comment-deleted`, THE App SHALL remove the matching comment from the CommentsPanel list by `commentId`.
10. WHEN THE socket receives an `error` event, THE App SHALL display the error message in a toast notification.
11. WHEN THE socket connection is lost, THE App SHALL display a persistent reconnecting indicator and attempt automatic reconnection.

---

### Requirement 4: Dashboard Page

**User Story:** As a user, I want a dashboard that shows backend health and lets me look up a workspace, so that I can confirm the service is running and navigate to a specific workspace.

#### Acceptance Criteria

1. WHEN the Dashboard page loads, THE App SHALL fetch `GET /health` and display the returned `{ status, service, timestamp, uptime }` values in a status card.
2. WHEN the health check returns `status: "ok"`, THE StatusBadge SHALL render with the `ACTIVE` teal color scheme.
3. WHEN the health check fails or returns a non-ok status, THE StatusBadge SHALL render with a muted error color scheme.
4. THE Dashboard SHALL render a workspace lookup form with two input fields: one for workspace ID and one for project ID.
5. WHEN the user submits the workspace ID form with a non-empty value, THE App SHALL navigate to `/workspaces/:id`.
6. WHEN the user submits the project ID form with a non-empty value, THE App SHALL call `GET /api/workspaces/project/:projectId` and navigate to `/workspaces/:id` using the `id` from the response.
7. WHEN the project ID lookup returns no workspace, THE App SHALL display an inline error message within the form.

---

### Requirement 5: Workspace Lookup Page

**User Story:** As a user, I want a page that explains there is no workspace list endpoint and provides lookup forms, so that I can find a workspace by its ID or by project ID.

#### Acceptance Criteria

1. THE WorkspaceList page SHALL display an explanatory message that workspaces must be looked up individually because no list endpoint exists.
2. THE WorkspaceList page SHALL render the same workspace-ID and project-ID lookup forms described in Requirement 4.4–4.7.
3. WHEN a valid workspace ID is entered and submitted, THE App SHALL navigate to `/workspaces/:id`.
4. WHEN a valid project ID is entered and submitted, THE App SHALL resolve the workspace and navigate to `/workspaces/:id`.

---

### Requirement 6: Workspace Detail Page

**User Story:** As a collaborator, I want a workspace detail page with Chat, Comments, and Milestones tabs, so that I can access all collaboration features in a single view.

#### Acceptance Criteria

1. WHEN the WorkspaceDetail page mounts with a `workspaceId` route parameter, THE App SHALL call `GET /api/workspaces/:id` and display workspace metadata in the WorkspaceHeader component.
2. THE WorkspaceHeader SHALL display `projectId`, `studentId`, `startupId`, workspace `status` as a StatusBadge, and `createdAt` date.
3. WHEN the workspace fetch returns a 404, THE WorkspaceNotFound component SHALL render with a message and a link back to the workspace lookup page.
4. THE WorkspaceDetail page SHALL render three tabs labelled "Chat", "Comments", and "Milestones".
5. WHEN a tab label is clicked, THE App SHALL display only the panel corresponding to the selected tab.
6. THE App SHALL default to displaying the "Chat" tab on first load.

---

### Requirement 7: Chat Panel

**User Story:** As a collaborator, I want to send, edit, and delete messages in a workspace chat, so that I can communicate with my collaborators in real time.

#### Acceptance Criteria

1. WHEN the Chat tab is active and the WorkspaceDetail page has a `workspaceId`, THE ChatPanel SHALL fetch `GET /api/workspaces/:workspaceId/messages` and display the results in chronological order.
2. THE ChatPanel SHALL render each message in a MessageBubble component showing `senderId`, `text`, and formatted `createdAt` timestamp.
3. WHEN the message `senderId` equals the authenticated user's `userId`, THE MessageBubble SHALL render with right-aligned layout and display edit and delete action buttons.
4. WHEN the user submits the chat input form with non-empty text, THE ChatPanel SHALL call `POST /api/workspaces/:workspaceId/messages` with `{ text, type: "TEXT" }` and optimistically append the message.
5. WHEN the edit button on a MessageBubble is clicked, THE ChatPanel SHALL render an inline edit form pre-filled with the message text.
6. WHEN the inline edit form is submitted with non-empty text, THE ChatPanel SHALL call `PUT /api/messages/:messageId` with `{ text }` and update the message in state.
7. WHEN the delete button on a MessageBubble is clicked, THE ChatPanel SHALL call `DELETE /api/messages/:messageId` and remove the message from state.
8. WHEN a real-time socket event for this workspace arrives (message-created, message-updated, message-deleted), THE ChatPanel SHALL update its message list as specified in Requirement 3.4–3.6.
9. WHEN a new message is added to the list, THE ChatPanel SHALL scroll to the bottom of the message list.
10. IF the messages fetch fails, THE ChatPanel SHALL render the ErrorState component with a retry action.

---

### Requirement 8: Comments Panel

**User Story:** As a collaborator, I want to post, reply to, edit, and delete threaded comments within a workspace, so that I can discuss specific parts of the project with optional file and line references.

#### Acceptance Criteria

1. WHEN the Comments tab is active, THE CommentsPanel SHALL fetch `GET /api/workspaces/:workspaceId/comments` and display top-level comments with their nested replies.
2. THE CommentItem component SHALL display `authorId`, `text`, formatted `createdAt`, and when present, `fileRef` and `lineNumber`.
3. WHEN the comment `authorId` equals the authenticated user's `userId`, THE CommentItem SHALL display edit and delete action buttons.
4. THE CommentsPanel SHALL render a new-comment form with a text field and optional `fileRef` and `lineNumber` fields.
5. WHEN the new-comment form is submitted with non-empty text, THE CommentsPanel SHALL call `POST /api/workspaces/:workspaceId/comments` with `{ text, fileRef?, lineNumber? }`.
6. WHEN the reply button on a CommentItem is clicked, THE CommentItem SHALL render an inline reply form.
7. WHEN the reply form is submitted with non-empty text, THE CommentsPanel SHALL call `POST /api/comments/:commentId/reply` with `{ text }` and append the reply under the parent comment.
8. WHEN the edit button on a CommentItem is clicked, THE CommentItem SHALL render an inline edit form pre-filled with the comment text.
9. WHEN the inline edit form is submitted with non-empty text, THE CommentsPanel SHALL call `PUT /api/comments/:commentId` with `{ text }` and update the comment in state.
10. WHEN the delete button on a CommentItem is clicked, THE CommentsPanel SHALL call `DELETE /api/comments/:commentId` and remove the comment from state.
11. WHEN a real-time socket event for this workspace arrives (comment-created, comment-updated, comment-deleted), THE CommentsPanel SHALL update its comment list as specified in Requirement 3.7–3.9.
12. IF the comments fetch fails, THE CommentsPanel SHALL render the ErrorState component with a retry action.

---

### Requirement 9: Milestones Panel

**User Story:** As a collaborator, I want to view, create, and complete project milestones with payment amounts, so that I can track deliverables and trigger payment releases.

#### Acceptance Criteria

1. WHEN the Milestones tab is active, THE MilestonesPanel SHALL fetch `GET /api/workspaces/:workspaceId/milestones` and display all milestones.
2. THE MilestoneCard component SHALL display `title`, `amount` formatted as currency, `status` as a StatusBadge, `completedAt` when present, and `completionNotes` when present.
3. THE MilestonesPanel SHALL render a "Create Milestone" button that opens the CreateMilestoneModal.
4. THE CreateMilestoneModal SHALL contain form fields for `contractId` (required), `title` (required), and `amount` (required, numeric).
5. WHEN the CreateMilestoneModal form is submitted with all required fields, THE MilestonesPanel SHALL call `POST /api/workspaces/:workspaceId/milestones` and append the new milestone to state.
6. WHEN a MilestoneCard with status `PENDING` or `IN_PROGRESS` is displayed, THE MilestoneCard SHALL render a "Complete" button.
7. WHEN the "Complete" button is clicked, THE App SHALL open the CompleteMilestoneModal with an optional `completionNotes` text field.
8. WHEN the CompleteMilestoneModal form is submitted, THE MilestonesPanel SHALL call `POST /api/milestones/:milestoneId/complete` with `{ completionNotes? }` and update the milestone status in state.
9. THE StatusBadge for milestones SHALL render `PENDING` with amber color, `IN_PROGRESS` with violet color, and `COMPLETED` with teal color.
10. IF the milestones fetch fails, THE MilestonesPanel SHALL render the ErrorState component with a retry action.

---

### Requirement 10: Toast Notification System

**User Story:** As a user, I want transient notification messages for success and error outcomes, so that I receive non-blocking feedback on my actions.

#### Acceptance Criteria

1. THE ToastContext SHALL manage a list of active toast notifications, each with `{ id, message, type }` where `type` is `success`, `error`, or `info`.
2. WHEN a toast is added, THE Toast component SHALL render the notification with a type-appropriate color: teal for `success`, coral for `error`, amber for `info`.
3. WHEN 4000 milliseconds have elapsed since a toast was added, THE App SHALL automatically remove it from the active toast list.
4. WHEN the user clicks the dismiss button on a Toast, THE App SHALL remove that toast from the active toast list immediately.
5. THE Toast component SHALL render toasts stacked in the bottom-right corner of the viewport.

---

### Requirement 11: Layout and Navigation

**User Story:** As a user, I want a consistent navigation layout with a sidebar and navbar, so that I can move between pages and understand my current location within the application.

#### Acceptance Criteria

1. THE Layout component SHALL render a Sidebar with navigation links to Dashboard (`/`), and Workspaces (`/workspaces`).
2. THE Navbar component SHALL display the application name "DevCollab Workspace" and, when unauthenticated, the TokenInput component.
3. WHEN the authenticated user's token is loaded, THE Navbar SHALL display the user's `userId` and `role` decoded from the JWT.
4. THE App SHALL render the animated mesh background (three colored orbs with `meshDrift` keyframe animation) and dot-grid overlay on every page.
5. THE App SHALL apply the DM Sans font for body text, Syne for headings, and JetBrains Mono for IDs, code values, and timestamps.
6. THE App SHALL render all routes within the Layout component so that the Sidebar and Navbar are always visible.

---

### Requirement 12: Common UI Components

**User Story:** As a developer, I want a library of common UI components, so that the application maintains visual consistency and reduces code duplication.

#### Acceptance Criteria

1. THE StatusBadge component SHALL accept a `status` prop and render with these colors: `ACTIVE` and `COMPLETED` → teal (`#06d6a0`), `PENDING` → amber (`#fbbf24`), `IN_PROGRESS` → violet (`#a855f7`), `ARCHIVED` → muted gray.
2. THE Button component SHALL accept `variant` (`primary` | `secondary` | `danger`) and `size` (`sm` | `md`) props and render accordingly.
3. THE Card component SHALL render with glassmorphism styles: `background: rgba(255,255,255,0.04)`, `backdrop-filter: blur(12px)`, `border-radius: 16px`.
4. THE Modal component SHALL render centered over a semi-transparent backdrop, trap focus within the modal while open, and close when the backdrop is clicked.
5. THE EmptyState component SHALL accept a `message` prop and render a centered empty-state illustration with the message text.
6. THE ErrorState component SHALL accept `message` and `onRetry` props and render an error message with a retry button.
7. THE LoadingSkeleton component SHALL render animated placeholder blocks matching the shape of the content being loaded.
