import React, { useState, useEffect, useRef } from 'react'
import { workspaceApi } from '../api/client'
import {
  MessageSquare,
  Send,
  Users,
  Code2,
  FolderGit2,
  Hash,
} from 'lucide-react'
import { io, Socket } from 'socket.io-client'
import toast from 'react-hot-toast'

interface Workspace {
  id: string
  _id?: string
  projectId: string
  title?: string
  name?: string
  startupId: string
  studentId: string
  status: string
  createdAt: string
  milestones?: Array<{
    title: string
    status: string
  }>
}

interface Message {
  _id?: string
  id?: string
  content: string
  senderId?: string
  senderName?: string
  createdAt?: string
}

interface Comment {
  _id?: string
  content: string
  lineNumber?: number
  fileSnippet?: string
  createdAt?: string
}

export const Workspaces: React.FC = () => {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([])
  const [selectedWorkspace, setSelectedWorkspace] = useState<Workspace | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [inputMessage, setInputMessage] = useState('')
  const [comments, setComments] = useState<Comment[]>([])
  const [commentInput, setCommentInput] = useState('')
  const [lineNumber, setLineNumber] = useState('')
  const [activeTab, setActiveTab] = useState<'chat' | 'reviews'>('chat')
  const [socketConnected, setSocketConnected] = useState(false)
  const socketRef = useRef<Socket | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Fetch workspaces on mount
  useEffect(() => {
    workspaceApi.getAll().then((res) => {
      const data = res.data?.data ?? res.data ?? []
      if (Array.isArray(data) && data.length > 0) {
        setWorkspaces(data)
        setSelectedWorkspace(data[0])
      } else {
        // Mock fallback if empty
        const sample: Workspace = {
          id: 'ws-sample-1',
          projectId: '11111111-1111-1111-1111-111111111111',
          title: 'AI-Powered Resume Analyzer Workspace',
          startupId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
          studentId: '99999999-9999-9999-9999-999999999999',
          status: 'ACTIVE',
          createdAt: new Date().toISOString(),
          milestones: [
            { title: 'Milestone 1: Project Architecture & Setup', status: 'RELEASED' },
            { title: 'Milestone 2: Core Feature Implementation', status: 'IN_PROGRESS' },
            { title: 'Milestone 3: Final Delivery & Testing', status: 'PENDING' },
          ],
        }
        setWorkspaces([sample])
        setSelectedWorkspace(sample)
      }
    }).catch(() => {
      const sample: Workspace = {
        id: 'ws-sample-1',
        projectId: '11111111-1111-1111-1111-111111111111',
        title: 'AI-Powered Resume Analyzer Workspace',
        startupId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        studentId: '99999999-9999-9999-9999-999999999999',
        status: 'ACTIVE',
        createdAt: new Date().toISOString(),
        milestones: [
          { title: 'Milestone 1: Project Architecture & Setup', status: 'RELEASED' },
          { title: 'Milestone 2: Core Feature Implementation', status: 'IN_PROGRESS' },
          { title: 'Milestone 3: Final Delivery & Testing', status: 'PENDING' },
        ],
      }
      setWorkspaces([sample])
      setSelectedWorkspace(sample)
    })
  }, [])

  // Setup Socket.IO connection
  useEffect(() => {
    if (!selectedWorkspace) return

    const wsId = selectedWorkspace.id || selectedWorkspace._id || 'ws-default'

    // Load initial messages
    workspaceApi.getMessages(wsId).then((res) => {
      const msgs = res.data?.data ?? res.data ?? []
      if (Array.isArray(msgs)) setMessages(msgs)
    }).catch(() => {
      setMessages([
        {
          id: '1',
          content: 'Welcome to the DevCollab collaboration workspace!',
          senderName: 'System Bot',
          createdAt: new Date(Date.now() - 3600000).toISOString(),
        },
        {
          id: '2',
          content: 'I have started on the initial architecture milestone. Repo structure is ready.',
          senderName: 'Alex Chen (Student)',
          createdAt: new Date(Date.now() - 1800000).toISOString(),
        },
      ])
    })

    // Load comments
    workspaceApi.getComments(wsId).then((res) => {
      const c = res.data?.data ?? res.data ?? []
      if (Array.isArray(c)) setComments(c)
    }).catch(() => {
      setComments([
        {
          _id: 'c1',
          content: 'Please verify the JWT verification middleware in authClient.js',
          lineNumber: 42,
          fileSnippet: 'jwt.verify(token, publicKey, { algorithms: ["RS256"] })',
          createdAt: new Date().toISOString(),
        },
      ])
    })

    const token = localStorage.getItem('devcollab_token') || ''
    const socket = io('/', {
      path: '/socket.io',
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
    })

    socketRef.current = socket

    socket.on('connect', () => {
      setSocketConnected(true)
      socket.emit('join:workspace', { workspaceId: wsId })
    })

    socket.on('disconnect', () => {
      setSocketConnected(false)
    })

    socket.on('message:new', (newMsg: Message) => {
      setMessages((prev) => [...prev, newMsg])
    })

    socket.on('comment:new', (newComment: Comment) => {
      setComments((prev) => [...prev, newComment])
    })

    return () => {
      socket.disconnect()
    }
  }, [selectedWorkspace])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inputMessage.trim() || !selectedWorkspace) return

    const wsId = selectedWorkspace.id || selectedWorkspace._id || 'ws-default'
    const newMsg: Message = {
      id: String(Date.now()),
      content: inputMessage,
      senderName: 'Current User',
      createdAt: new Date().toISOString(),
    }

    setMessages((prev) => [...prev, newMsg])
    setInputMessage('')

    if (socketRef.current?.connected) {
      socketRef.current.emit('message:send', {
        workspaceId: wsId,
        content: newMsg.content,
      })
    }

    try {
      await workspaceApi.sendMessage(wsId, newMsg.content)
    } catch (err) {
      // Message already rendered locally
    }
  }

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!commentInput.trim() || !selectedWorkspace) return

    const wsId = selectedWorkspace.id || selectedWorkspace._id || 'ws-default'
    const newComment: Comment = {
      _id: String(Date.now()),
      content: commentInput,
      lineNumber: lineNumber ? parseInt(lineNumber, 10) : undefined,
      createdAt: new Date().toISOString(),
    }

    setComments((prev) => [...prev, newComment])
    setCommentInput('')
    setLineNumber('')
    toast.success('Code review note added')

    try {
      await workspaceApi.addComment(wsId, newComment.content, newComment.lineNumber)
    } catch (err) {}
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <FolderGit2 className="w-6 h-6 text-brand-400" />
            Collaboration Workspace
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Real-time collaboration workspace with team chat, code reviews, and milestone progress.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`w-2.5 h-2.5 rounded-full ${
              socketConnected ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'
            }`}
          />
          <span className="text-xs font-mono text-slate-400">
            {socketConnected ? 'Socket.io Connected' : 'Socket Reconnecting...'}
          </span>
        </div>
      </div>

      {/* Main Container */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 min-h-[600px]">
        {/* Left: Workspaces Directory */}
        <div className="card p-4 space-y-3 flex flex-col">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <Users className="w-4 h-4 text-brand-400" />
              Active Workspaces
            </h2>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-white/5 text-slate-300">
              {workspaces.length}
            </span>
          </div>

          <div className="space-y-2 overflow-y-auto flex-1">
            {workspaces.map((ws) => {
              const isSelected =
                (selectedWorkspace?.id && selectedWorkspace.id === ws.id) ||
                (selectedWorkspace?._id && selectedWorkspace._id === ws._id)
              return (
                <button
                  key={ws.id || ws._id}
                  onClick={() => setSelectedWorkspace(ws)}
                  className={`w-full text-left p-3 rounded-xl transition-all border ${
                    isSelected
                      ? 'bg-brand-500/10 border-brand-500/30 text-white shadow-lg shadow-brand-500/10'
                      : 'bg-white/5 border-transparent text-slate-400 hover:text-slate-200 hover:bg-white/10'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Hash className="w-3.5 h-3.5 text-brand-400" />
                    <span className="font-semibold text-xs truncate">
                      {ws.title || ws.name || 'Workspace ' + ws.projectId.slice(0, 8)}
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono mt-1">
                    Project: {ws.projectId.slice(0, 8)}...
                  </div>
                </button>
              )
            })}
          </div>

          {/* Milestones in current workspace */}
          {selectedWorkspace?.milestones && (
            <div className="border-t border-white/10 pt-3">
              <h3 className="text-[11px] font-bold text-slate-400 uppercase mb-2">
                Workspace Milestones
              </h3>
              <div className="space-y-1.5">
                {selectedWorkspace.milestones.map((m, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between text-xs py-1 px-2 rounded bg-white/5"
                  >
                    <span className="text-slate-300 truncate max-w-[140px]">{m.title}</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                        m.status === 'RELEASED'
                          ? 'bg-emerald-500/20 text-emerald-300'
                          : m.status === 'IN_PROGRESS'
                          ? 'bg-amber-500/20 text-amber-300'
                          : 'bg-slate-500/20 text-slate-400'
                      }`}
                    >
                      {m.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right: Interactive Collaboration Center */}
        <div className="lg:col-span-3 card flex flex-col overflow-hidden">
          {/* Tabs */}
          <div className="px-6 py-3 border-b border-white/10 bg-white/5 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setActiveTab('chat')}
                className={`text-xs font-semibold flex items-center gap-2 pb-1 border-b-2 transition-all ${
                  activeTab === 'chat'
                    ? 'border-brand-400 text-brand-300'
                    : 'border-transparent text-slate-400 hover:text-white'
                }`}
              >
                <MessageSquare className="w-4 h-4" />
                Live Channel Chat
              </button>
              <button
                onClick={() => setActiveTab('reviews')}
                className={`text-xs font-semibold flex items-center gap-2 pb-1 border-b-2 transition-all ${
                  activeTab === 'reviews'
                    ? 'border-brand-400 text-brand-300'
                    : 'border-transparent text-slate-400 hover:text-white'
                }`}
              >
                <Code2 className="w-4 h-4" />
                Code Review Notes ({comments.length})
              </button>
            </div>

            <div className="text-xs text-slate-400 font-medium hidden sm:block">
              {selectedWorkspace?.title || 'Active Session'}
            </div>
          </div>

          {/* Tab Content: Chat */}
          {activeTab === 'chat' && (
            <div className="flex-1 flex flex-col justify-between p-6 h-[500px]">
              <div className="overflow-y-auto space-y-4 flex-1 pr-2">
                {messages.map((msg, idx) => (
                  <div key={idx} className="flex flex-col space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-brand-400">
                        {msg.senderName || 'Team Member'}
                      </span>
                      {msg.createdAt && (
                        <span className="text-[10px] text-slate-500">
                          {new Date(msg.createdAt).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-slate-200 bg-white/5 border border-white/5 rounded-xl px-4 py-2.5 max-w-xl">
                      {msg.content}
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>

              {/* Message Input Bar */}
              <form onSubmit={handleSendMessage} className="pt-4 border-t border-white/10 flex gap-2">
                <input
                  type="text"
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  placeholder="Send a real-time message to workspace channel..."
                  className="input flex-1"
                />
                <button type="submit" className="btn-primary px-4 flex items-center gap-2">
                  <Send className="w-4 h-4" />
                  Send
                </button>
              </form>
            </div>
          )}

          {/* Tab Content: Code Reviews */}
          {activeTab === 'reviews' && (
            <div className="flex-1 flex flex-col justify-between p-6 h-[500px]">
              <div className="overflow-y-auto space-y-4 flex-1 pr-2">
                {comments.map((comment, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-2"
                  >
                    <div className="flex items-center justify-between text-xs text-slate-400">
                      <span className="font-semibold text-brand-300">
                        Review Note #{idx + 1}
                      </span>
                      {comment.lineNumber && (
                        <span className="font-mono text-[10px] bg-white/10 px-2 py-0.5 rounded text-slate-300">
                          Line {comment.lineNumber}
                        </span>
                      )}
                    </div>
                    {comment.fileSnippet && (
                      <pre className="p-2.5 rounded bg-slate-950 font-mono text-[11px] text-emerald-400 overflow-x-auto">
                        {comment.fileSnippet}
                      </pre>
                    )}
                    <p className="text-sm text-slate-200">{comment.content}</p>
                  </div>
                ))}
              </div>

              {/* Add Comment Form */}
              <form onSubmit={handleAddComment} className="pt-4 border-t border-white/10 space-y-3">
                <div className="flex gap-3">
                  <input
                    type="number"
                    value={lineNumber}
                    onChange={(e) => setLineNumber(e.target.value)}
                    placeholder="Line #"
                    className="input w-28"
                  />
                  <input
                    type="text"
                    required
                    value={commentInput}
                    onChange={(e) => setCommentInput(e.target.value)}
                    placeholder="Add code review suggestion or review comment..."
                    className="input flex-1"
                  />
                  <button type="submit" className="btn-primary px-4">
                    Add Note
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
