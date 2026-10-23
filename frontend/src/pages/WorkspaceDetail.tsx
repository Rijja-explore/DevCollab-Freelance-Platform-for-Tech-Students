import React, { useEffect, useState, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  ArrowLeft,
  MessageSquare,
  Code2,
  Send,
  Users,
  ShieldCheck,
} from 'lucide-react'
import { workspaceApi } from '../api/client'
import { useAuth } from '../contexts/AuthContext'
import { io, Socket } from 'socket.io-client'
import { CodeReviewPanel } from '../components/workspace/CodeReviewPanel'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Message {
  id?: string
  _id?: string
  workspaceId: string
  senderId: string
  senderName: string
  content: string
  createdAt: string
}

// ─── Component ────────────────────────────────────────────────────────────────

export const WorkspaceDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()

  const [activeTab, setActiveTab] = useState<'chat' | 'code'>('chat')
  const [workspace, setWorkspace]   = useState<any>(null)
  const [loading, setLoading]       = useState(true)
  const [messages, setMessages]     = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const socketRef      = useRef<Socket | null>(null)

  const workspaceId = id || 'ws-default'

  // ── Bootstrap: workspace data + socket ──────────────────────────────────────
  useEffect(() => {
    // Fetch workspace metadata
    setLoading(true)
    workspaceApi
      .getById(workspaceId)
      .then((res) => setWorkspace(res.data?.data ?? res.data ?? {}))
      .catch(() => setWorkspace({}))
      .finally(() => setLoading(false))

    // Fetch chat history
    workspaceApi
      .getMessages(workspaceId)
      .then((res) => {
        const msgs = res.data?.data ?? res.data ?? []
        setMessages(Array.isArray(msgs) ? msgs : [])
      })
      .catch(() => setMessages([]))

    // Connect Socket.IO
    const token = localStorage.getItem('devcollab_token') || ''
    try {
      const socket = io('http://localhost:5000', {
        transports: ['websocket', 'polling'],
        auth: { token },
        extraHeaders: { Authorization: `Bearer ${token}` },
      })
      socketRef.current = socket
      socket.emit('join-workspace', { workspaceId })

      // Deduplicated message handler (socket sometimes sends twice for the sender)
      const addMessage = (msg: Message) => {
        setMessages((prev) => {
          const isDuplicate = prev.some(
            (m) =>
              m.content === msg.content &&
              m.senderId === msg.senderId &&
              Math.abs(
                new Date(m.createdAt).getTime() - new Date(msg.createdAt).getTime(),
              ) < 3000,
          )
          return isDuplicate ? prev : [...prev, msg]
        })
      }

      socket.on('new-message',     addMessage)
      socket.on('message-created', addMessage)

      return () => { socket.disconnect() }
    } catch {
      // Socket unavailable — HTTP-only fallback
    }
  }, [workspaceId])

  // Auto-scroll chat to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // ── Chat send ────────────────────────────────────────────────────────────────
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim()) return

    const payload: Message = {
      workspaceId,
      senderId:   user?.id   || 'demo-user',
      senderName: user?.name || 'DevCollab Member',
      content:    newMessage.trim(),
      createdAt:  new Date().toISOString(),
    }

    // Optimistic UI — append immediately regardless of HTTP result
    setMessages((prev) => [...prev, payload])
    setNewMessage('')

    try {
      await workspaceApi.sendMessage(workspaceId, payload.content, payload.senderId, payload.senderName)
    } catch {
      // Already shown optimistically; socket broadcast handles the rest
    }
    socketRef.current?.emit('send-message', payload)
  }

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 max-w-7xl mx-auto">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Link
            to="/workspaces"
            className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors mb-2"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Workspaces
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-white tracking-tight">
              {loading ? 'Loading…' : workspace?.projectName || 'Project Workspace'}
            </h1>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Socket.io Live
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Real-Time Collaboration · Node.js 18 · MongoDB · Redis · WebSockets
          </p>
        </div>

        {/* Tab switcher */}
        <div className="flex items-center gap-1 p-1 bg-white/5 border border-white/10 rounded-xl">
          {(['chat', 'code'] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all ${
                activeTab === tab
                  ? 'bg-brand-500 text-white shadow-lg shadow-brand-500/20'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {tab === 'chat' ? (
                <><MessageSquare className="w-3.5 h-3.5" /> Live Chat</>
              ) : (
                <><Code2 className="w-3.5 h-3.5" /> Code Reviews</>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ── Chat tab ── */}
      {activeTab === 'chat' && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">

          {/* Message stream */}
          <div className="lg:col-span-3 flex flex-col h-[600px] rounded-3xl bg-white/[0.03] border border-white/10 backdrop-blur-xl overflow-hidden shadow-2xl">
            <div className="p-4 border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-brand-400" />
                <span className="text-xs font-bold text-white uppercase tracking-wider">Project Channel</span>
              </div>
              <span className="text-[10px] text-slate-500">Messages persisted in MongoDB</span>
            </div>

            <div className="flex-1 p-5 overflow-y-auto space-y-4">
              {messages.map((msg, idx) => {
                const isMe = msg.senderId === user?.id
                return (
                  <div key={idx} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                    <div className="flex items-center gap-2 mb-1 text-[11px] text-slate-400">
                      <span className="font-semibold text-slate-300">{msg.senderName}</span>
                      <span>•</span>
                      <span>
                        {msg.createdAt
                          ? new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                          : 'Just now'}
                      </span>
                    </div>
                    <div
                      className={`max-w-md p-3.5 rounded-2xl text-xs leading-relaxed ${
                        isMe
                          ? 'bg-gradient-to-r from-brand-600 to-indigo-600 text-white rounded-br-none shadow-md shadow-brand-500/10'
                          : 'bg-white/10 text-slate-200 rounded-bl-none border border-white/5'
                      }`}
                    >
                      {msg.content}
                    </div>
                  </div>
                )
              })}
              <div ref={messagesEndRef} />
            </div>

            <form onSubmit={handleSendMessage} className="p-4 border-t border-white/10 bg-white/[0.01] flex gap-3">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type your message to collaborators…"
                className="flex-1 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-brand-500 transition-all"
              />
              <button
                type="submit"
                className="px-4 py-2.5 rounded-xl bg-brand-500 text-white text-xs font-bold hover:bg-brand-600 transition-all flex items-center gap-1.5 shadow-lg shadow-brand-500/20"
              >
                <Send className="w-3.5 h-3.5" /> Send
              </button>
            </form>
          </div>

          {/* Members sidebar */}
          <div className="p-6 rounded-3xl bg-white/[0.03] border border-white/10 backdrop-blur-xl h-fit space-y-6">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Users className="w-4 h-4 text-brand-400" />
              Workspace Members
            </h3>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 font-bold text-xs">
                  {workspace?.startupName
                    ? workspace.startupName.substring(0, 2).toUpperCase()
                    : user?.role === 'STARTUP'
                    ? user.name.substring(0, 2).toUpperCase()
                    : 'SO'}
                </div>
                <div>
                  <div className="text-xs font-bold text-white">Startup Owner</div>
                  <div className="text-[11px] text-slate-300 font-medium">
                    {workspace?.startupName || (user?.role === 'STARTUP' ? user.name : 'Startup Founder')}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-brand-500/20 border border-brand-500/30 flex items-center justify-center text-brand-400 font-bold text-xs">
                  {workspace?.studentName
                    ? workspace.studentName.substring(0, 2).toUpperCase()
                    : user?.role === 'STUDENT'
                    ? user.name.substring(0, 2).toUpperCase()
                    : 'ST'}
                </div>
                <div>
                  <div className="text-xs font-bold text-white">Approved Candidate</div>
                  <div className="text-[11px] text-emerald-400 font-medium">
                    {workspace?.studentName || (user?.role === 'STUDENT' ? user.name : 'Student')}
                  </div>
                </div>
              </div>
            </div>
            <div className="pt-4 border-t border-white/10 space-y-2">
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Direct Collaboration
              </div>
              <div className="flex items-center gap-2 text-xs text-emerald-400">
                <ShieldCheck className="w-4 h-4" />
                <span>Private channel with approved candidate</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Code Reviews tab — delegates entirely to CodeReviewPanel ── */}
      {activeTab === 'code' && (
        <CodeReviewPanel workspaceId={workspaceId} socket={socketRef.current} />
      )}
    </div>
  )
}
