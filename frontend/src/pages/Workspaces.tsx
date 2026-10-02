import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
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
  projectName?: string
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
  const navigate = useNavigate()
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
    let isMounted = true
    const fetchWorkspaces = async (isInitial = false) => {
      if (isInitial) setLoading(true)
      try {
        const res = await workspaceApi.getAll()
        const data = res.data?.data ?? res.data ?? []
        if (!isMounted) return
        if (Array.isArray(data) && data.length > 0) {
          setWorkspaces(data)
          setSelectedWorkspace((prev) => prev ?? data[0])
        } else {
          setWorkspaces([])
          setSelectedWorkspace((prev) => prev ?? null)
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

    // Initial fetch
    fetchWorkspaces(true)

    // Poll every 5 seconds to catch newly created workspaces without spamming
    const interval = setInterval(() => {
      fetchWorkspaces(false)
    }, 5000)

    return () => {
      isMounted = false
      clearInterval(interval)
    }
  }, [])

  // Connect Socket.io when workspace changes
  useEffect(() => {
    if (!selectedWorkspace) return

    const wsId = selectedWorkspace.id || selectedWorkspace._id || 'default'
    
    // Flag to track if this effect is the active one
    let isActiveEffect = true

    // Fetch messages for active workspace
    const fetchWorkspaceData = async () => {
      try {
        console.log(`Fetching messages and comments for workspace: ${wsId}`)
        const [messagesRes, commentsRes] = await Promise.all([
          workspaceApi.getMessages(wsId),
          workspaceApi.getComments(wsId)
        ])

        // Only update if this effect is still active (user didn't switch workspaces)
        if (!isActiveEffect) return

        const msgs = messagesRes.data?.data ?? messagesRes.data ?? []
        const cmts = commentsRes.data?.data ?? commentsRes.data ?? []

        const normalizedMsgs = (Array.isArray(msgs) ? msgs : []).map((m: any) => ({
          ...m,
          id: m.id || m._id,
          content: m.content || m.text || '',
          senderId: m.senderId || 'unknown',
          senderName: m.senderName || (m.senderId === user?.id ? (user?.name || 'You') : 'Collaborator'),
          createdAt: m.createdAt || new Date().toISOString()
        }))

        const normalizedCmts = (Array.isArray(cmts) ? cmts : []).map((c: any) => ({
          ...c,
          id: c.id || c._id,
          content: c.content || c.text || '',
          lineNumber: c.lineNumber,
          fileSnippet: c.fileSnippet || c.fileRef,
          createdAt: c.createdAt || new Date().toISOString()
        }))
        
        console.log(`Successfully fetched ${normalizedMsgs.length} messages and ${normalizedCmts.length} comments for workspace ${wsId}`)
        
        setMessages(normalizedMsgs)
        setComments(normalizedCmts)
      } catch (err: any) {
        console.error('Failed to fetch workspace data:', err)
      }
    }

    fetchWorkspaceData()

    const token = localStorage.getItem('devcollab_token') || ''
    let socket: Socket | null = null
    
    try {
      // Connect to same origin via Vite/Nginx reverse proxy or fallback
      const socketUrl = window.location.port === '5173' || window.location.port === '80' || !window.location.port
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
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        reconnectionAttempts: 5
      })
      socketRef.current = socket

      socket.emit('join-workspace', { workspaceId: wsId })

      socket.on('connect_error', (error: any) => {
        console.error('Socket connection error:', error)
      })

      // Helper function to deduplicate messages
      const isDuplicate = (newMsg: any, existingMsgs: any[]): boolean => {
        const newId = newMsg.id || newMsg._id
        const newText = newMsg.content || newMsg.text
        return existingMsgs.some((m) => {
          const mId = m.id || m._id
          if (mId && newId && mId === newId) return true
          const mText = m.content || m.text
          if (mText === newText && m.senderId === newMsg.senderId && m.createdAt && newMsg.createdAt) {
            const timeDiff = Math.abs(
              new Date(m.createdAt).getTime() - new Date(newMsg.createdAt).getTime()
            )
            return timeDiff < 2000
          }
          return false
        })
      }

      socket.on('new-message', (msg: any) => {
        if (!isActiveEffect) return
        const normalized = {
          ...msg,
          id: msg.id || msg._id,
          content: msg.content || msg.text || '',
          senderName: msg.senderName || (msg.senderId === user?.id ? (user?.name || 'You') : 'Collaborator'),
        }
        setMessages((prev) => {
          if (isDuplicate(normalized, prev)) return prev
          return [...prev, normalized]
        })
      })

      socket.on('message-created', (msg: any) => {
        if (!isActiveEffect) return
        const normalized = {
          ...msg,
          id: msg.id || msg._id,
          content: msg.content || msg.text || '',
          senderName: msg.senderName || (msg.senderId === user?.id ? (user?.name || 'You') : 'Collaborator'),
        }
        setMessages((prev) => {
          if (isDuplicate(normalized, prev)) return prev
          return [...prev, normalized]
        })
      })

      socket.on('new-comment', (cmt: any) => {
        if (!isActiveEffect) return
        const normalized = {
          ...cmt,
          id: cmt.id || cmt._id,
          content: cmt.content || cmt.text || '',
        }
        setComments((prev) => {
          const exists = prev.some((c: any) => (c.id || c._id) === (normalized.id || normalized._id))
          if (exists) return prev
          return [...prev, normalized]
        })
      })

      socket.on('comment-created', (cmt: any) => {
        if (!isActiveEffect) return
        const normalized = {
          ...cmt,
          id: cmt.id || cmt._id,
          content: cmt.content || cmt.text || '',
        }
        setComments((prev) => {
          const exists = prev.some((c: any) => (c.id || c._id) === (normalized.id || normalized._id))
          if (exists) return prev
          return [...prev, normalized]
        })
      })

      socket.on('disconnect', (reason: string) => {
        console.log('Disconnected from workspace:', wsId, 'Reason:', reason)
      })
    } catch (err) {
      console.error('Failed to create Socket.io connection:', err)
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
      senderId: user?.id || 'demo-user',
      senderName: user?.name || 'DevCollab Member',
      createdAt: new Date().toISOString(),
    }

    try {
      const res = await workspaceApi.sendMessage(wsId, msgPayload.content, msgPayload.senderId, msgPayload.senderName)
      
      // Use the response data if available, otherwise use the payload
      const sentMsg = res.data?.data || msgPayload
      
      // Emit to socket only after successful HTTP POST
      if (socketRef.current?.connected) {
        socketRef.current.emit('send-message', { ...sentMsg, workspaceId: wsId })
      }
      
      // Add message to state - may be duplicated by Socket.io but will be deduped
      setMessages((prev) => {
        if (isDuplicate(sentMsg, prev)) return prev
        return [...prev, sentMsg]
      })
      
      setInputMessage('')
      console.log('Message sent successfully:', sentMsg)
    } catch (error) {
      console.error('Error sending message:', error)
      toast.error('Failed to send message')
      // Keep the input text in case user wants to retry
    }
  }

  const isDuplicate = (newMsg: Message, existingMsgs: Message[]): boolean => {
    return existingMsgs.some((m) => {
      // Match by ID first (most reliable)
      if (m._id && newMsg._id && m._id === newMsg._id) return true
      // Fallback to content + sender + timestamp for locally-created messages
      if (m.content === newMsg.content && 
          m.senderId === newMsg.senderId &&
          m.createdAt && newMsg.createdAt) {
        const timeDiff = Math.abs(
          new Date(m.createdAt).getTime() - new Date(newMsg.createdAt).getTime()
        )
        return timeDiff < 1000 // Within 1 second
      }
      return false
    })
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
          description="Workspaces are created automatically via RabbitMQ when a student matches or applies to an open project. This may take a few seconds. If you just matched a project, the page will auto-refresh. The page refreshes every 5 seconds."
          actionText={role === 'STUDENT' ? 'Explore Projects' : 'Post Project'}
          onAction={() => navigate('/projects')}
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
                        {ws.projectName || ws.title || ws.name || `Workspace #${(ws.id || ws._id || '').substring(0, 6)}`}
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-400">
                      Status: <span className="text-emerald-400 font-semibold">{ws.status || 'ACTIVE'}</span>
                    </div>
                    <div className="mt-1 text-[9px] text-slate-500 font-mono">
                      Project: {(ws.projectId || '').substring(0, 8)}...
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
                      {selectedWorkspace.projectName || selectedWorkspace.title || selectedWorkspace.name || 'Active Collaboration Workspace'}
                    </h2>
                    <div className="text-[9px] text-slate-500 font-mono mt-1">
                      Project: {(selectedWorkspace.projectId || '').substring(0, 8)}...
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(selectedWorkspace.projectId || '')
                          toast.success('Project ID copied')
                        }}
                        className="ml-2 px-1 py-0.5 text-[8px] bg-brand-500/20 hover:bg-brand-500/30 rounded border border-brand-500/30"
                      >
                        Copy
                      </button>
                    </div>
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
                  <div className="flex-1 flex flex-col h-[480px]">
                    <div className="flex-1 p-5 space-y-4 overflow-y-auto">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                            Real-time Code Review & Comments
                          </h3>
                          <span className="text-[10px] text-slate-500">({comments.length} comments)</span>
                        </div>

                        {comments.length === 0 ? (
                          <div className="p-6 text-center text-xs text-slate-500 bg-white/[0.02] border border-white/5 rounded-2xl">
                            <p className="mb-2">No code review comments yet.</p>
                            <p className="text-[11px] text-slate-600">Add line-specific feedback or general code suggestions below.</p>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {comments.map((c, idx) => (
                              <div key={idx} className="p-3 rounded-xl bg-white/5 border border-white/5 space-y-1.5">
                                <div className="flex items-center justify-between text-[10px]">
                                  <span className={`font-semibold px-2 py-0.5 rounded ${c.lineNumber ? 'bg-brand-500/20 text-brand-300' : 'bg-slate-700/30 text-slate-300'}`}>
                                    {c.lineNumber ? `Line ${c.lineNumber}` : 'General Note'}
                                  </span>
                                  <span className="text-slate-600">{c.createdAt ? new Date(c.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now'}</span>
                                </div>
                                {c.fileSnippet && (
                                  <div className="p-2 rounded bg-slate-900/50 border border-slate-700/50 font-mono text-[10px] text-slate-400 overflow-x-auto max-h-16">
                                    <code>{c.fileSnippet}</code>
                                  </div>
                                )}
                                <p className="text-slate-300 text-xs">{c.content}</p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    <form onSubmit={handleAddComment} className="p-4 border-t border-white/10 space-y-2">
                      <div className="space-y-2">
                        <label className="text-[10px] font-semibold text-slate-400 uppercase">Add Code Review Comment</label>
                        <div className="grid grid-cols-4 gap-2">
                          <input
                            type="number"
                            value={lineNumber}
                            onChange={(e) => setLineNumber(e.target.value)}
                            placeholder="Line # (optional)"
                            min="1"
                            className="col-span-1 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-xs focus:outline-none focus:border-brand-500"
                          />
                          <input
                            type="text"
                            value={commentInput}
                            onChange={(e) => setCommentInput(e.target.value)}
                            placeholder="Your feedback or suggestion..."
                            className="col-span-3 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-xs focus:outline-none focus:border-brand-500"
                          />
                        </div>
                      </div>
                      <button
                        type="submit"
                        disabled={!commentInput.trim()}
                        className="w-full py-2 rounded-lg bg-brand-500 hover:bg-brand-600 disabled:bg-slate-700 disabled:cursor-not-allowed text-white text-xs font-bold transition-all"
                      >
                        Post Code Review Comment
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
