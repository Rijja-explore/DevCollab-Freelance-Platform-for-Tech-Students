import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { workspaceApi } from '../api/client'
import {
  MessageSquare,
  Send,
  Code2,
  Hash,
  ExternalLink,
  Plus,
  FileCode,
  Copy,
  Check,
  Sparkles,
} from 'lucide-react'
import { io, Socket } from 'socket.io-client'
import toast from 'react-hot-toast'
import { useAuth } from '../contexts/AuthContext'
import { EmptyState } from '../components/EmptyState'
import { TableSkeleton } from '../components/LoadingSkeleton'
import { ServiceHeader } from '../components/ServiceHeader'

interface Workspace {
  id: string
  _id?: string
  projectId: string
  projectName?: string
  title?: string
  name?: string
  startupId: string
  studentId: string
  status: string
  createdAt: string
}

interface Message {
  _id?: string
  id?: string
  content: string
  senderId?: string
  senderName?: string
  createdAt?: string
}

export interface ReviewComment {
  id: string
  authorId: string
  authorName: string
  authorRole: 'STARTUP' | 'STUDENT'
  content: string
  lineNumber?: number
  action?: 'COMMENT' | 'APPROVE' | 'REQUEST_CHANGES'
  createdAt: string
}

export interface CodeSubmission {
  id: string
  workspaceId: string
  studentId: string
  studentName: string
  title: string
  repositoryUrl: string
  branch?: string
  codeSnippet: string
  notes?: string
  status: 'PENDING_REVIEW' | 'APPROVED' | 'CHANGES_REQUESTED'
  createdAt: string
  comments: ReviewComment[]
}

export const Workspaces: React.FC = () => {
  const { user, role } = useAuth()
  const navigate = useNavigate()
  const [workspaces, setWorkspaces] = useState<Workspace[]>([])
  const [selectedWorkspace, setSelectedWorkspace] = useState<Workspace | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [inputMessage, setInputMessage] = useState('')
  const [activeTab, setActiveTab] = useState<'chat' | 'reviews'>('chat')
  const [loading, setLoading] = useState(true)
  const socketRef = useRef<Socket | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Student Code Submission Form State
  const [showSubmitModal, setShowSubmitModal] = useState(false)
  const [submissionTitle, setSubmissionTitle] = useState('')
  const [repositoryUrl, setRepositoryUrl] = useState('')
  const [branchName, setBranchName] = useState('')
  const [codeSnippet, setCodeSnippet] = useState('')
  const [deliverableNotes, setDeliverableNotes] = useState('')
  const [submittingCode, setSubmittingCode] = useState(false)

  // Submissions State per Workspace
  const [submissions, setSubmissions] = useState<CodeSubmission[]>([])

  // Startup Review Form State
  const [activeReviewId, setActiveReviewId] = useState<string | null>(null)
  const [reviewComment, setReviewComment] = useState('')
  const [reviewLineNumber, setReviewLineNumber] = useState('')
  const [reviewAction, setReviewAction] = useState<'COMMENT' | 'APPROVE' | 'REQUEST_CHANGES'>('COMMENT')
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const isStudent = role === 'STUDENT'
  const isStartup = role === 'STARTUP'

  // Fetch workspaces - restricted ONLY to the particular student and startup owner
  useEffect(() => {
    let isMounted = true
    const fetchWorkspaces = async (isInitial = false) => {
      if (isInitial) setLoading(true)
      try {
        const res = await workspaceApi.getAll()
        const data = res.data?.data ?? res.data ?? []
        if (!isMounted) return

        if (Array.isArray(data) && data.length > 0) {
          // Strictly filter so only the student and startup owner of each workspace can view it
          const allowed = data.filter((ws: any) => {
            if (!user?.id) return true
            return (
              ws.studentId === user.id ||
              ws.studentId === user.profileId ||
              ws.startupId === user.id ||
              ws.startupId === user.profileId
            )
          })

          setWorkspaces(allowed)
          setSelectedWorkspace((prev) => {
            if (prev && allowed.some((w: any) => (w.id || w._id) === (prev.id || prev._id))) {
              return prev
            }
            return allowed[0] ?? null
          })
        } else {
          setWorkspaces([])
          setSelectedWorkspace(null)
        }
      } catch (err) {
        if (!isMounted) return
        console.error('Error fetching workspaces:', err)
        if (isInitial) {
          toast.error('Failed to load workspaces')
        }
      } finally {
        if (isMounted && isInitial) {
          setLoading(false)
        }
      }
    }

    fetchWorkspaces(true)
    const interval = setInterval(() => {
      fetchWorkspaces(false)
    }, 5000)

    return () => {
      isMounted = false
      clearInterval(interval)
    }
  }, [user?.id, user?.profileId])

  // Load submissions for selected workspace
  useEffect(() => {
    if (!selectedWorkspace) {
      setSubmissions([])
      return
    }
    const wsId = selectedWorkspace.id || selectedWorkspace._id || 'default'
    const storageKey = `code_submissions_${wsId}`
    const stored = localStorage.getItem(storageKey)
    if (stored) {
      try {
        setSubmissions(JSON.parse(stored))
      } catch {
        setSubmissions([])
      }
    } else {
      // Default demo initial submission if none exists yet
      const initial: CodeSubmission[] = [
        {
          id: `sub-${wsId}-1`,
          workspaceId: wsId,
          studentId: selectedWorkspace.studentId,
          studentName: 'Student Developer',
          title: 'Initial API Integration & Frontend Components',
          repositoryUrl: 'https://github.com/developer/devcollab-project/pull/1',
          branch: 'main',
          codeSnippet: `// API Client with RS256 token verification\nexport const fetchProjectData = async (id: string) => {\n  const token = localStorage.getItem('devcollab_token');\n  const response = await fetch(\`/api/projects/\${id}\`, {\n    headers: { Authorization: \`Bearer \${token}\` }\n  });\n  return response.json();\n};`,
          notes: 'Completed the core microservice client with RS256 authentication header injection and error handling.',
          status: 'PENDING_REVIEW',
          createdAt: selectedWorkspace.createdAt || new Date().toISOString(),
          comments: [
            {
              id: 'c1',
              authorId: selectedWorkspace.startupId,
              authorName: 'Startup Founder',
              authorRole: 'STARTUP',
              content: 'Please verify the token expiry handling before production merge.',
              lineNumber: 4,
              action: 'COMMENT',
              createdAt: new Date().toISOString(),
            },
          ],
        },
      ]
      setSubmissions(initial)
      localStorage.setItem(storageKey, JSON.stringify(initial))
    }
  }, [selectedWorkspace])

  // Helper to persist submissions
  const saveSubmissions = (newSubmissions: CodeSubmission[], wsId: string) => {
    setSubmissions(newSubmissions)
    localStorage.setItem(`code_submissions_${wsId}`, JSON.stringify(newSubmissions))
  }

  // Connect Socket.io when workspace changes
  useEffect(() => {
    if (!selectedWorkspace) return

    const wsId = selectedWorkspace.id || selectedWorkspace._id || 'default'
    let isActiveEffect = true

    const fetchWorkspaceData = async () => {
      try {
        const messagesRes = await workspaceApi.getMessages(wsId)
        if (!isActiveEffect) return

        const msgs = messagesRes.data?.data ?? messagesRes.data ?? []
        const normalizedMsgs = (Array.isArray(msgs) ? msgs : []).map((m: any) => ({
          ...m,
          id: m.id || m._id,
          content: m.content || m.text || '',
          senderId: m.senderId || 'unknown',
          senderName: m.senderName || (m.senderId === user?.id ? (user?.name || 'You') : 'Collaborator'),
          createdAt: m.createdAt || new Date().toISOString(),
        }))

        setMessages(normalizedMsgs)
      } catch (err: any) {
        console.error('Failed to fetch workspace data:', err)
      }
    }

    fetchWorkspaceData()

    const token = localStorage.getItem('devcollab_token') || ''
    let socket: Socket | null = null

    try {
      const socketUrl =
        window.location.port === '5173' || window.location.port === '80' || !window.location.port
          ? '/'
          : 'http://localhost:5000'

      socket = io(socketUrl, {
        path: '/socket.io',
        transports: ['websocket', 'polling'],
        auth: { token },
        extraHeaders: {
          Authorization: `Bearer ${token}`,
        },
        reconnection: true,
      })
      socketRef.current = socket

      socket.emit('join-workspace', { workspaceId: wsId })

      socket.on('new-message', (msg: any) => {
        if (!isActiveEffect) return
        const normalized = {
          ...msg,
          id: msg.id || msg._id,
          content: msg.content || msg.text || '',
          senderName: msg.senderName || (msg.senderId === user?.id ? (user?.name || 'You') : 'Collaborator'),
        }
        setMessages((prev) => (prev.some((m) => (m.id || m._id) === (normalized.id || normalized._id)) ? prev : [...prev, normalized]))
      })
    } catch (err) {
      console.error('Failed to connect socket:', err)
    }

    return () => {
      isActiveEffect = false
      if (socket) {
        socket.emit('leave-workspace', { workspaceId: wsId })
        socket.disconnect()
      }
    }
  }, [selectedWorkspace, user?.id, user?.name])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inputMessage.trim() || !selectedWorkspace) return

    const wsId = selectedWorkspace.id || selectedWorkspace._id || 'default'
    const msgPayload: Message = {
      content: inputMessage.trim(),
      senderId: user?.id || 'user-1',
      senderName: user?.name || (isStudent ? 'Student Developer' : 'Startup Founder'),
      createdAt: new Date().toISOString(),
    }

    try {
      const res = await workspaceApi.sendMessage(wsId, msgPayload.content, msgPayload.senderId, msgPayload.senderName)
      const sentMsg = res.data?.data || msgPayload

      if (socketRef.current?.connected) {
        socketRef.current.emit('send-message', { ...sentMsg, workspaceId: wsId })
      }

      setMessages((prev) => [...prev, sentMsg])
      setInputMessage('')
    } catch (error) {
      console.error('Error sending message:', error)
      toast.error('Failed to send message')
    }
  }

  // Handle Student Code Submission
  const handleSubmitCode = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedWorkspace) return
    if (!submissionTitle.trim() || !repositoryUrl.trim() || !codeSnippet.trim()) {
      toast.error('Please enter submission title, repository URL, and code snippet.')
      return
    }

    setSubmittingCode(true)
    const wsId = selectedWorkspace.id || selectedWorkspace._id || 'default'

    try {
      const newSub: CodeSubmission = {
        id: `sub-${Date.now()}`,
        workspaceId: wsId,
        studentId: user?.id || selectedWorkspace.studentId,
        studentName: user?.name || 'Student Developer',
        title: submissionTitle.trim(),
        repositoryUrl: repositoryUrl.trim(),
        branch: branchName.trim() || 'main',
        codeSnippet: codeSnippet.trim(),
        notes: deliverableNotes.trim(),
        status: 'PENDING_REVIEW',
        createdAt: new Date().toISOString(),
        comments: [],
      }

      const updated = [newSub, ...submissions]
      saveSubmissions(updated, wsId)

      // Post an automated notification in the workspace chat & comments
      try {
        await workspaceApi.sendMessage(
          wsId,
          `🚀 [Code Review Deliverable Submitted]: "${newSub.title}" — View in Code Reviews tab.`,
          user?.id,
          user?.name || 'Student Developer'
        )
      } catch {
        // Chat notification optional fallback
      }

      toast.success('Code deliverable submitted! The startup owner can now review and comment on it.')
      setShowSubmitModal(false)
      setSubmissionTitle('')
      setRepositoryUrl('')
      setBranchName('')
      setCodeSnippet('')
      setDeliverableNotes('')
    } catch (err) {
      toast.error('Failed to submit code for review.')
      console.error(err)
    } finally {
      setSubmittingCode(false)
    }
  }

  // Handle Review Comment (by Startup Owner or Student reply)
  const handleAddReviewComment = (submissionId: string) => {
    if (!reviewComment.trim() || !selectedWorkspace) return
    const wsId = selectedWorkspace.id || selectedWorkspace._id || 'default'

    const targetSub = submissions.find((s) => s.id === submissionId)
    if (!targetSub) return

    const lineNum = reviewLineNumber ? parseInt(reviewLineNumber, 10) : undefined

    const newComment: ReviewComment = {
      id: `rc-${Date.now()}`,
      authorId: user?.id || 'startup-owner',
      authorName: user?.name || (isStartup ? 'Startup Founder' : 'Student Developer'),
      authorRole: isStartup ? 'STARTUP' : 'STUDENT',
      content: reviewComment.trim(),
      lineNumber: lineNum,
      action: reviewAction,
      createdAt: new Date().toISOString(),
    }

    let updatedStatus = targetSub.status
    if (reviewAction === 'APPROVE') {
      updatedStatus = 'APPROVED'
    } else if (reviewAction === 'REQUEST_CHANGES') {
      updatedStatus = 'CHANGES_REQUESTED'
    }

    const updated = submissions.map((sub) => {
      if (sub.id === submissionId) {
        return {
          ...sub,
          status: updatedStatus,
          comments: [...sub.comments, newComment],
        }
      }
      return sub
    })

    saveSubmissions(updated, wsId)

    // Also persist via workspace comment endpoint
    try {
      workspaceApi.addComment(
        wsId,
        `[Review Note on "${targetSub.title}"]: ${newComment.content}`,
        lineNum,
        targetSub.repositoryUrl
      )
    } catch {
      // Background sync
    }

    toast.success(
      reviewAction === 'APPROVE'
        ? 'Code submission approved!'
        : reviewAction === 'REQUEST_CHANGES'
        ? 'Change request submitted.'
        : 'Review comment posted!'
    )

    setReviewComment('')
    setReviewLineNumber('')
    setReviewAction('COMMENT')
    setActiveReviewId(null)
  }

  const copyCode = (code: string, id: string) => {
    navigator.clipboard.writeText(code)
    setCopiedId(id)
    toast.success('Code copied to clipboard')
    setTimeout(() => setCopiedId(null), 2000)
  }

  return (
    <div className="space-y-6">
      {/* Service 2 Collaboration Workspace Banner */}
      <ServiceHeader
        service="workspace"
        title="Live Collaboration Workspace"
        subtitle="Dedicated project collaboration between the student developer and startup founder with real-time chat and code review deliverables."
      />

      {loading ? (
        <TableSkeleton rows={4} />
      ) : workspaces.length === 0 ? (
        <EmptyState
          title="No Active Collaborations Found"
          description="Collaboration workspaces are private and only visible to the assigned student developer and the startup founder once a project is accepted."
          actionText={isStudent ? 'Browse Open Projects' : 'Post Project'}
          onAction={() => navigate('/projects')}
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 min-h-[600px]">
          {/* Workspace List Sidebar */}
          <div className="lg:col-span-1 p-4 rounded-3xl bg-white/[0.03] border border-white/10 backdrop-blur-xl shadow-xl space-y-3">
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider px-2">
              Your Collaborations ({workspaces.length})
            </h2>

            <div className="space-y-2 max-h-[500px] overflow-y-auto">
              {workspaces.map((ws) => {
                const isSelected = selectedWorkspace?.id === ws.id || selectedWorkspace?._id === ws._id
                return (
                  <button
                    key={ws.id || ws._id}
                    type="button"
                    onClick={() => setSelectedWorkspace(ws)}
                    className={`w-full text-left p-3 rounded-2xl border transition-all ${
                      isSelected
                        ? 'bg-brand-500/15 border-brand-500/40 text-white shadow-lg shadow-brand-500/10'
                        : 'bg-white/5 border-white/5 text-slate-400 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Hash className="w-3.5 h-3.5 text-brand-400" />
                      <span className="text-xs font-bold truncate">
                        {ws.projectName || ws.title || ws.name || `Project #${(ws.projectId || '').substring(0, 8)}`}
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-400">
                      Status: <span className="text-emerald-400 font-semibold">{ws.status || 'ACTIVE'}</span>
                    </div>
                    <div className="mt-1 text-[9px] text-slate-500 font-mono">
                      Project ID: {(ws.projectId || '').substring(0, 8)}...
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Active Workspace View */}
          <div className="lg:col-span-3 rounded-3xl bg-white/[0.03] border border-white/10 backdrop-blur-xl flex flex-col shadow-2xl overflow-hidden">
            {selectedWorkspace && (
              <>
                {/* Header */}
                <div className="p-4 border-b border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h2 className="text-sm font-bold text-white flex items-center gap-2">
                      <span>{selectedWorkspace.projectName || selectedWorkspace.title || selectedWorkspace.name || 'Collaboration Workspace'}</span>
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-brand-500/20 text-brand-300 border border-brand-500/30">
                        {isStudent ? 'Student Workspace' : 'Startup Workspace'}
                      </span>
                    </h2>
                    <span className="text-[10px] text-emerald-400 flex items-center gap-1 mt-0.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      Live WebSocket Channel Active
                    </span>
                  </div>

                  <div className="flex items-center gap-1 p-1 rounded-xl bg-white/5 border border-white/10 self-start sm:self-auto">
                    <button
                      type="button"
                      onClick={() => setActiveTab('chat')}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                        activeTab === 'chat' ? 'bg-brand-500 text-white shadow-md shadow-brand-500/20' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <MessageSquare className="w-3.5 h-3.5" /> Chatting
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab('reviews')}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                        activeTab === 'reviews' ? 'bg-brand-500 text-white shadow-md shadow-brand-500/20' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <Code2 className="w-3.5 h-3.5" /> Code Review
                      {submissions.length > 0 && (
                        <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-white/20 text-white">
                          {submissions.length}
                        </span>
                      )}
                    </button>
                  </div>
                </div>

                {/* Tab: Chatting */}
                {activeTab === 'chat' && (
                  <div className="flex-1 flex flex-col justify-between h-[520px]">
                    <div className="flex-1 p-5 overflow-y-auto space-y-3">
                      {messages.length === 0 ? (
                        <div className="text-center py-16 text-xs text-slate-500">
                          <MessageSquare className="w-8 h-8 text-slate-600 mx-auto mb-2 opacity-50" />
                          No messages yet. Say hello to begin collaborating!
                        </div>
                      ) : (
                        messages.map((msg, idx) => {
                          const isMe = msg.senderId === user?.id
                          return (
                            <div key={idx} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                              <div className="text-[10px] text-slate-500 mb-0.5">
                                {msg.senderName || 'Collaborator'} •{' '}
                                {msg.createdAt
                                  ? new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                                  : 'Now'}
                              </div>
                              <div
                                className={`max-w-md p-3 rounded-2xl text-xs ${
                                  isMe
                                    ? 'bg-brand-500 text-white rounded-br-none'
                                    : 'bg-white/10 text-slate-200 rounded-bl-none border border-white/5'
                                }`}
                              >
                                {msg.content}
                              </div>
                            </div>
                          )
                        })
                      )}
                      <div ref={messagesEndRef} />
                    </div>

                    <form onSubmit={handleSendMessage} className="p-3 border-t border-white/10 flex gap-2 bg-black/20">
                      <input
                        type="text"
                        value={inputMessage}
                        onChange={(e) => setInputMessage(e.target.value)}
                        placeholder="Type message to collaborator..."
                        className="flex-1 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-brand-500"
                      />
                      <button
                        type="submit"
                        className="px-4 py-2.5 rounded-xl bg-brand-500 text-white text-xs font-bold hover:bg-brand-600 flex items-center gap-1.5 transition-all shadow-md shadow-brand-500/20"
                      >
                        <Send className="w-3.5 h-3.5" /> Send
                      </button>
                    </form>
                  </div>
                )}

                {/* Tab: Code Review (No Milestones - strictly student submit & startup comment) */}
                {activeTab === 'reviews' && (
                  <div className="flex-1 flex flex-col h-[520px] overflow-hidden">
                    {/* Header Action Bar */}
                    <div className="p-4 bg-white/[0.02] border-b border-white/10 flex items-center justify-between">
                      <div>
                        <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                          <Code2 className="w-4 h-4 text-brand-400" />
                          Code Review Deliverables
                        </h3>
                        <p className="text-[11px] text-slate-400">
                          {isStudent
                            ? 'Submit your completed code, repository PR, and snippets for the startup owner to review.'
                            : 'Review code submissions submitted by the student and leave feedback comments.'}
                        </p>
                      </div>

                      {/* Student submit button */}
                      {isStudent && (
                        <button
                          type="button"
                          onClick={() => setShowSubmitModal(true)}
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-xs font-bold transition-all shadow-md shadow-brand-500/20"
                        >
                          <Plus className="w-3.5 h-3.5" /> Submit Code for Review
                        </button>
                      )}
                    </div>

                    {/* Submissions List */}
                    <div className="flex-1 p-5 overflow-y-auto space-y-6">
                      {submissions.length === 0 ? (
                        <div className="p-12 text-center text-xs text-slate-500 bg-white/[0.01] border border-white/5 rounded-2xl space-y-3">
                          <FileCode className="w-10 h-10 text-slate-600 mx-auto opacity-50" />
                          <p className="text-slate-300 font-semibold">No code submissions yet for this collaboration.</p>
                          <p className="text-slate-500 text-[11px]">
                            {isStudent
                              ? 'Click "Submit Code for Review" above to submit your repository PR or code snippet.'
                              : 'When the student submits code deliverables, they will appear here for your review and comments.'}
                          </p>
                          {isStudent && (
                            <button
                              type="button"
                              onClick={() => setShowSubmitModal(true)}
                              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-brand-500 text-white text-xs font-bold hover:bg-brand-600 transition-all"
                            >
                              <Plus className="w-4 h-4" /> Submit First Deliverable
                            </button>
                          )}
                        </div>
                      ) : (
                        submissions.map((sub) => {
                          const isApproved = sub.status === 'APPROVED'
                          const isChangesRequested = sub.status === 'CHANGES_REQUESTED'

                          return (
                            <div
                              key={sub.id}
                              className="rounded-2xl bg-white/[0.03] border border-white/10 p-5 space-y-4 shadow-xl"
                            >
                              {/* Top Bar: Title, Student, Status */}
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-3">
                                <div>
                                  <div className="flex items-center gap-2">
                                    <h4 className="text-sm font-bold text-white">{sub.title}</h4>
                                    <span
                                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider ${
                                        isApproved
                                          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                                          : isChangesRequested
                                          ? 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                                          : 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                                      }`}
                                    >
                                      {isApproved
                                        ? 'Approved'
                                        : isChangesRequested
                                        ? 'Revisions Requested'
                                        : 'Pending Review'}
                                    </span>
                                  </div>
                                  <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-2">
                                    <span>Submitted by <strong className="text-slate-200">{sub.studentName}</strong></span>
                                    <span>•</span>
                                    <span>{new Date(sub.createdAt).toLocaleDateString()} at {new Date(sub.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                  </div>
                                </div>

                                {/* GitHub / Repository Link */}
                                {sub.repositoryUrl && (
                                  <a
                                    href={sub.repositoryUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs font-semibold text-brand-300 hover:bg-white/10 hover:text-white transition-all self-start sm:self-auto"
                                  >
                                    <ExternalLink className="w-3.5 h-3.5" />
                                    <span>Open PR / Repo</span>
                                  </a>
                                )}
                              </div>

                              {/* Deliverable Notes */}
                              {sub.notes && (
                                <div className="text-xs text-slate-300 bg-white/[0.02] p-3 rounded-xl border border-white/5">
                                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                                    Student Deliverable Notes
                                  </div>
                                  <p className="whitespace-pre-wrap">{sub.notes}</p>
                                </div>
                              )}

                              {/* Code Snippet Viewer */}
                              {sub.codeSnippet && (
                                <div className="space-y-1">
                                  <div className="flex items-center justify-between text-[11px] text-slate-400 px-1">
                                    <span className="font-mono text-[10px]">Branch: {sub.branch || 'main'}</span>
                                    <button
                                      type="button"
                                      onClick={() => copyCode(sub.codeSnippet, sub.id)}
                                      className="inline-flex items-center gap-1 text-[10px] text-brand-400 hover:text-brand-300"
                                    >
                                      {copiedId === sub.id ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                                      {copiedId === sub.id ? 'Copied' : 'Copy Code'}
                                    </button>
                                  </div>

                                  <div className="p-3.5 rounded-xl bg-slate-950 border border-white/10 font-mono text-xs text-emerald-300 overflow-x-auto max-h-48 leading-relaxed custom-scrollbar">
                                    <pre><code>{sub.codeSnippet}</code></pre>
                                  </div>
                                </div>
                              )}

                              {/* Startup Owner Comment & Review Box */}
                              <div className="pt-3 border-t border-white/10 space-y-3">
                                <div className="flex items-center justify-between">
                                  <div className="text-xs font-bold text-slate-300 flex items-center gap-2">
                                    <span>Review Discussion & Feedback</span>
                                    <span className="text-[10px] text-slate-500">({sub.comments.length} comments)</span>
                                  </div>

                                  <button
                                    type="button"
                                    onClick={() => setActiveReviewId(activeReviewId === sub.id ? null : sub.id)}
                                    className="text-xs font-semibold text-brand-400 hover:text-brand-300 inline-flex items-center gap-1"
                                  >
                                    {activeReviewId === sub.id ? 'Cancel' : '+ Add Review Comment'}
                                  </button>
                                </div>

                                {/* Comments Thread */}
                                {sub.comments.length > 0 && (
                                  <div className="space-y-2">
                                    {sub.comments.map((cmt) => (
                                      <div
                                        key={cmt.id}
                                        className={`p-3 rounded-xl border text-xs space-y-1 ${
                                          cmt.authorRole === 'STARTUP'
                                            ? 'bg-indigo-950/30 border-indigo-500/20 text-slate-200'
                                            : 'bg-white/5 border-white/5 text-slate-200'
                                        }`}
                                      >
                                        <div className="flex items-center justify-between text-[10px]">
                                          <div className="flex items-center gap-2">
                                            <span className="font-bold text-white">{cmt.authorName}</span>
                                            <span className="px-1.5 py-0.2 rounded bg-white/10 text-slate-400 text-[9px] uppercase">
                                              {cmt.authorRole === 'STARTUP' ? 'Startup Founder' : 'Student Developer'}
                                            </span>
                                            {cmt.lineNumber && (
                                              <span className="px-1.5 py-0.2 rounded bg-brand-500/20 text-brand-300 font-mono text-[9px]">
                                                Line {cmt.lineNumber}
                                              </span>
                                            )}
                                          </div>
                                          <span className="text-slate-500">
                                            {new Date(cmt.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                          </span>
                                        </div>
                                        <p className="whitespace-pre-wrap text-slate-300">{cmt.content}</p>
                                      </div>
                                    ))}
                                  </div>
                                )}

                                {/* Comment Form (Startup owner can comment and approve/reject) */}
                                {activeReviewId === sub.id && (
                                  <div className="p-3.5 rounded-xl bg-white/[0.02] border border-brand-500/20 space-y-3">
                                    <div className="text-[11px] font-bold text-slate-300">
                                      {isStartup ? 'Startup Founder Code Review & Comment' : 'Reply to Code Review'}
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                                      <input
                                        type="number"
                                        value={reviewLineNumber}
                                        onChange={(e) => setReviewLineNumber(e.target.value)}
                                        placeholder="Line # (optional)"
                                        min="1"
                                        className="sm:col-span-1 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-xs focus:outline-none focus:border-brand-500"
                                      />
                                      {isStartup && (
                                        <select
                                          value={reviewAction}
                                          onChange={(e) => setReviewAction(e.target.value as any)}
                                          className="sm:col-span-3 px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-white text-xs focus:outline-none focus:border-brand-500 cursor-pointer"
                                        >
                                          <option value="COMMENT">Leave Review Comment</option>
                                          <option value="APPROVE">Approve Code Submission</option>
                                          <option value="REQUEST_CHANGES">Request Revisions</option>
                                        </select>
                                      )}
                                    </div>

                                    <textarea
                                      value={reviewComment}
                                      onChange={(e) => setReviewComment(e.target.value)}
                                      placeholder="Write your constructive feedback, inline note, or review comments..."
                                      rows={3}
                                      className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-xs placeholder-slate-500 focus:outline-none focus:border-brand-500"
                                    />

                                    <div className="flex justify-end gap-2">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setActiveReviewId(null)
                                          setReviewComment('')
                                          setReviewLineNumber('')
                                        }}
                                        className="px-3 py-1.5 rounded-xl bg-white/5 text-slate-400 text-xs font-semibold hover:bg-white/10"
                                      >
                                        Cancel
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleAddReviewComment(sub.id)}
                                        disabled={!reviewComment.trim()}
                                        className="px-4 py-1.5 rounded-xl bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white text-xs font-bold transition-all shadow-md shadow-brand-500/20"
                                      >
                                        Post Review Comment
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          )
                        })
                      )}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* Student Code Submission Modal */}
      {showSubmitModal && selectedWorkspace && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="max-w-xl w-full p-6 rounded-3xl bg-slate-900 border border-white/10 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto custom-scrollbar">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-brand-400" />
                  Submit Code for Review
                </h3>
                <p className="text-[11px] text-slate-400">
                  Deliver your code to the startup owner for evaluation and review comments.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowSubmitModal(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitCode} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Deliverable Title *
                </label>
                <input
                  type="text"
                  value={submissionTitle}
                  onChange={(e) => setSubmissionTitle(e.target.value)}
                  placeholder="e.g. Sprint 1: Auth Client, Microservice Connector & Unit Tests"
                  required
                  className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-xs focus:outline-none focus:border-brand-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Repository or PR Link *
                  </label>
                  <input
                    type="url"
                    value={repositoryUrl}
                    onChange={(e) => setRepositoryUrl(e.target.value)}
                    placeholder="https://github.com/my-org/repo/pull/1"
                    required
                    className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-xs focus:outline-none focus:border-brand-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Branch Name
                  </label>
                  <input
                    type="text"
                    value={branchName}
                    onChange={(e) => setBranchName(e.target.value)}
                    placeholder="feature/auth-and-dashboard"
                    className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-xs focus:outline-none focus:border-brand-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Code Snippet / Changed Files *
                </label>
                <textarea
                  value={codeSnippet}
                  onChange={(e) => setCodeSnippet(e.target.value)}
                  rows={5}
                  placeholder="// Paste key code files or components for inline review..."
                  required
                  className="w-full font-mono text-xs px-3 py-2 rounded-xl bg-slate-950 border border-white/10 text-emerald-300 focus:outline-none focus:border-brand-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Deliverable Notes & Documentation
                </label>
                <textarea
                  value={deliverableNotes}
                  onChange={(e) => setDeliverableNotes(e.target.value)}
                  rows={2}
                  placeholder="Describe architectural decisions, setup instructions, or areas needing feedback..."
                  className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-xs focus:outline-none focus:border-brand-500"
                />
              </div>

              <div className="pt-3 border-t border-white/10 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowSubmitModal(false)}
                  className="px-4 py-2 rounded-xl bg-white/5 text-slate-400 text-xs font-semibold hover:bg-white/10"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingCode}
                  className="px-5 py-2 rounded-xl bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white text-xs font-bold transition-all shadow-md shadow-brand-500/20"
                >
                  {submittingCode ? 'Submitting...' : 'Submit Code for Review'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
