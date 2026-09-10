import React, { useState, useEffect, useRef } from 'react'
import { workspaceApi } from '../api/client'
import {
  MessageSquare,
  Send,
  Code2,
  Hash,
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
  const { user, role } = useAuth()
  const [workspaces, setWorkspaces] = useState<Workspace[]>([])
  const [selectedWorkspace, setSelectedWorkspace] = useState<Workspace | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [inputMessage, setInputMessage] = useState('')
  const [comments, setComments] = useState<Comment[]>([])
  const [commentInput, setCommentInput] = useState('')
  const [lineNumber, setLineNumber] = useState('')
  const [activeTab, setActiveTab] = useState<'chat' | 'reviews'>('chat')
  const [loading, setLoading] = useState(true)
  const socketRef = useRef<Socket | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Fetch workspaces from MongoDB via Workspace Service
  useEffect(() => {
    setLoading(true)
    workspaceApi
      .getAll()
      .then((res) => {
        const data = res.data?.data ?? res.data ?? []
        if (Array.isArray(data) && data.length > 0) {
          setWorkspaces(data)
          setSelectedWorkspace(data[0])
        } else {
          setWorkspaces([])
          setSelectedWorkspace(null)
        }
      })
      .catch((err) => {
        console.error('Error fetching workspaces:', err)
        setWorkspaces([])
      })
      .finally(() => setLoading(false))
  }, [])

  // Connect Socket.io when workspace changes
  useEffect(() => {
    if (!selectedWorkspace) return

    const wsId = selectedWorkspace.id || selectedWorkspace._id || 'default'

    // Fetch messages for active workspace
    workspaceApi.getMessages(wsId).then((res) => {
      const msgs = res.data?.data ?? res.data ?? []
      setMessages(Array.isArray(msgs) ? msgs : [])
    }).catch(() => setMessages([]))

    // Fetch comments
    workspaceApi.getComments(wsId).then((res) => {
      const cmts = res.data?.data ?? res.data ?? []
      setComments(Array.isArray(cmts) ? cmts : [])
    }).catch(() => setComments([]))

    const token = localStorage.getItem('devcollab_token') || ''
    try {
      const socket = io('http://localhost:5000', {
        transports: ['websocket', 'polling'],
        auth: { token },
        extraHeaders: {
          Authorization: `Bearer ${token}`,
        },
      })
      socketRef.current = socket

      socket.emit('join-workspace', { workspaceId: wsId })

      socket.on('new-message', (msg: Message) => {
        setMessages((prev) => {
          if (prev.some((m) => m.content === msg.content && m.senderId === msg.senderId && Math.abs(new Date(m.createdAt || 0).getTime() - new Date(msg.createdAt || 0).getTime()) < 3000)) {
            return prev
          }
          return [...prev, msg]
        })
      })

      socket.on('message-created', (msg: Message) => {
        setMessages((prev) => {
          if (prev.some((m) => m.content === msg.content && m.senderId === msg.senderId && Math.abs(new Date(m.createdAt || 0).getTime() - new Date(msg.createdAt || 0).getTime()) < 3000)) {
            return prev
          }
          return [...prev, msg]
        })
      })

      socket.on('new-comment', (cmt: Comment) => {
        setComments((prev) => [...prev, cmt])
      })

      socket.on('comment-created', (cmt: Comment) => {
        setComments((prev) => [...prev, cmt])
      })

      return () => {
        socket.disconnect()
      }
    } catch {
      // offline fallback
    }
  }, [selectedWorkspace])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inputMessage.trim() || !selectedWorkspace) return

    const wsId = selectedWorkspace.id || selectedWorkspace._id || 'default'
    const msgPayload: Message = {
      content: inputMessage.trim(),
      senderId: user?.id || 'demo-user',
      senderName: user?.name || 'DevCollab Member',
      createdAt: new Date().toISOString(),
    }

    try {
      await workspaceApi.sendMessage(wsId, msgPayload.content, msgPayload.senderId, msgPayload.senderName)
      socketRef.current?.emit('send-message', { ...msgPayload, workspaceId: wsId })
      setMessages((prev) => [...prev, msgPayload])
      setInputMessage('')
    } catch {
      setMessages((prev) => [...prev, msgPayload])
      setInputMessage('')
    }
  }

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!commentInput.trim() || !selectedWorkspace) return

    const wsId = selectedWorkspace.id || selectedWorkspace._id || 'default'
    const lineNum = lineNumber ? parseInt(lineNumber, 10) : undefined

    try {
      await workspaceApi.addComment(wsId, commentInput.trim(), lineNum)
      const newCmt: Comment = {
        content: commentInput.trim(),
        lineNumber: lineNum,
        createdAt: new Date().toISOString(),
      }
      setComments((prev) => [...prev, newCmt])
      setCommentInput('')
      setLineNumber('')
      toast.success('Code review comment posted')
    } catch {
      toast.error('Failed to post comment')
    }
  }

  return (
    <div className="space-y-6">
      {/* Service 2 Collaboration Workspace Banner */}
      <ServiceHeader
        service="workspace"
        title="Live Collaboration Workspaces"
        subtitle="Real-time multi-tenant project rooms, live websocket chat, code snippet reviews, and milestone progress tracking."
      />

      {loading ? (
        <TableSkeleton rows={4} />
      ) : workspaces.length === 0 ? (
        <EmptyState
          title="No Active Workspaces Found"
          description="Workspaces are created automatically when a student matches or applies to an open project."
          actionText={role === 'STUDENT' ? 'Explore Projects' : 'Post Project'}
          onAction={() => {}}
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 min-h-[600px]">
          {/* Workspace List Sidebar */}
          <div className="lg:col-span-1 p-4 rounded-3xl bg-white/[0.03] border border-white/10 backdrop-blur-xl shadow-xl space-y-3">
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider px-2">
              Your Active Projects ({workspaces.length})
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
                        {ws.title || ws.name || `Workspace #${(ws.id || ws._id || '').substring(0, 6)}`}
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-400">
                      Status: <span className="text-emerald-400 font-semibold">{ws.status || 'ACTIVE'}</span>
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
                <div className="p-4 border-b border-white/10 flex items-center justify-between">
                  <div>
                    <h2 className="text-sm font-bold text-white">
                      {selectedWorkspace.title || selectedWorkspace.name || 'Active Collaboration Workspace'}
                    </h2>
                    <span className="text-[10px] text-emerald-400 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      Socket.io WebSockets Connected
                    </span>
                  </div>

                  <div className="flex items-center gap-1 p-1 rounded-xl bg-white/5 border border-white/10">
                    <button
                      type="button"
                      onClick={() => setActiveTab('chat')}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                        activeTab === 'chat' ? 'bg-brand-500 text-white' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <MessageSquare className="w-3.5 h-3.5" /> Chat
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab('reviews')}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                        activeTab === 'reviews' ? 'bg-brand-500 text-white' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <Code2 className="w-3.5 h-3.5" /> Code Reviews
                    </button>
                  </div>
                </div>

                {/* Tab: Chat */}
                {activeTab === 'chat' && (
                  <div className="flex-1 flex flex-col justify-between h-[480px]">
                    <div className="flex-1 p-5 overflow-y-auto space-y-3">
                      {messages.length === 0 ? (
                        <div className="text-center py-12 text-xs text-slate-500">
                          No messages yet in this channel. Send the first message below!
                        </div>
                      ) : (
                        messages.map((msg, idx) => {
                          const isMe = msg.senderId === user?.id
                          return (
                            <div key={idx} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                              <div className="text-[10px] text-slate-500 mb-0.5">
                                {msg.senderName || 'Member'} • {msg.createdAt ? new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Now'}
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

                    <form onSubmit={handleSendMessage} className="p-3 border-t border-white/10 flex gap-2">
                      <input
                        type="text"
                        value={inputMessage}
                        onChange={(e) => setInputMessage(e.target.value)}
                        placeholder="Type message to collaborators..."
                        className="flex-1 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-brand-500"
                      />
                      <button
                        type="submit"
                        className="px-4 py-2.5 rounded-xl bg-brand-500 text-white text-xs font-bold hover:bg-brand-600 flex items-center gap-1.5"
                      >
                        <Send className="w-3.5 h-3.5" /> Send
                      </button>
                    </form>
                  </div>
                )}

                {/* Tab: Reviews */}
                {activeTab === 'reviews' && (
                  <div className="p-5 space-y-4">
                    <div className="space-y-3">
                      <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                        Inline Code Review Comments ({comments.length})
                      </h3>
                      {comments.length === 0 ? (
                        <div className="p-6 text-center text-xs text-slate-500 bg-white/[0.02] border border-white/5 rounded-2xl">
                          No code comments recorded yet. Add review notes below.
                        </div>
                      ) : (
                        comments.map((c, idx) => (
                          <div key={idx} className="p-3 rounded-xl bg-white/5 border border-white/5 text-xs space-y-1">
                            <div className="flex items-center justify-between text-[10px]">
                              <span className="font-mono text-brand-300">Line {c.lineNumber || 'General'}</span>
                              <span className="text-slate-500">{c.createdAt ? new Date(c.createdAt).toLocaleTimeString() : 'Recent'}</span>
                            </div>
                            <p className="text-slate-200">{c.content}</p>
                          </div>
                        ))
                      )}
                    </div>

                    <form onSubmit={handleAddComment} className="pt-4 border-t border-white/10 space-y-2">
                      <div className="grid grid-cols-4 gap-2">
                        <input
                          type="number"
                          value={lineNumber}
                          onChange={(e) => setLineNumber(e.target.value)}
                          placeholder="Line #"
                          className="col-span-1 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-xs focus:outline-none focus:border-brand-500"
                        />
                        <input
                          type="text"
                          value={commentInput}
                          onChange={(e) => setCommentInput(e.target.value)}
                          placeholder="Review suggestion or feedback..."
                          className="col-span-3 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-xs focus:outline-none focus:border-brand-500"
                        />
                      </div>
                      <button
                        type="submit"
                        className="w-full py-2.5 rounded-xl bg-brand-500 text-white text-xs font-bold hover:bg-brand-600"
                      >
                        Submit Code Review Note
                      </button>
                    </form>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
