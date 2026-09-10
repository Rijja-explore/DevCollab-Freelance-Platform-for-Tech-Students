import React, { useEffect, useState, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  ArrowLeft,
  MessageSquare,
  Code2,
  Milestone,
  Send,
  Users,
  CheckCircle2,
  Clock,
  FileCode,
  ShieldCheck,
  Plus,
} from 'lucide-react'
import { workspaceApi } from '../api/client'
import { useAuth } from '../contexts/AuthContext'
import toast from 'react-hot-toast'
import { io, Socket } from 'socket.io-client'

interface Message {
  id?: string
  _id?: string
  workspaceId: string
  senderId: string
  senderName: string
  content: string
  createdAt: string
}

interface CodeComment {
  id?: string
  _id?: string
  workspaceId: string
  lineNumber?: number
  fileSnippet?: string
  content: string
  authorName?: string
  createdAt?: string
}

export const WorkspaceDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState<'chat' | 'code' | 'milestones'>('chat')
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [comments, setComments] = useState<CodeComment[]>([])
  const [newComment, setNewComment] = useState('')
  const [selectedLine, setSelectedLine] = useState<number | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const socketRef = useRef<Socket | null>(null)

  const workspaceId = id || 'ws-default'

  useEffect(() => {
    // 1. Fetch initial messages
    workspaceApi
      .getMessages(workspaceId)
      .then((res) => {
        const msgs = res.data?.data ?? res.data ?? []
        setMessages(Array.isArray(msgs) ? msgs : [])
      })
      .catch(() => {
        setMessages([])
      })

    // 2. Fetch code comments
    workspaceApi
      .getComments(workspaceId)
      .then((res) => {
        const cmts = res.data?.data ?? res.data ?? []
        setComments(Array.isArray(cmts) ? cmts : [])
      })
      .catch(() => {
        setComments([])
      })

    // 3. Connect Socket.io with JWT Auth
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

      socket.emit('join-workspace', { workspaceId })

      socket.on('new-message', (msg: Message) => {
        setMessages((prev) => {
          if (prev.some((m) => m.content === msg.content && m.senderId === msg.senderId && Math.abs(new Date(m.createdAt).getTime() - new Date(msg.createdAt).getTime()) < 3000)) {
            return prev
          }
          return [...prev, msg]
        })
      })

      socket.on('message-created', (msg: Message) => {
        setMessages((prev) => {
          if (prev.some((m) => m.content === msg.content && m.senderId === msg.senderId && Math.abs(new Date(m.createdAt).getTime() - new Date(msg.createdAt).getTime()) < 3000)) {
            return prev
          }
          return [...prev, msg]
        })
      })

      socket.on('new-comment', (cmt: CodeComment) => {
        setComments((prev) => [...prev, cmt])
      })

      socket.on('comment-created', (cmt: CodeComment) => {
        setComments((prev) => [...prev, cmt])
      })

      return () => {
        socket.disconnect()
      }
    } catch {
      // offline fallback
    }
  }, [workspaceId])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim()) return

    const msgPayload: Message = {
      workspaceId,
      senderId: user?.id || 'demo-user',
      senderName: user?.name || 'DevCollab Member',
      content: newMessage.trim(),
      createdAt: new Date().toISOString(),
    }

    try {
      await workspaceApi.sendMessage(workspaceId, msgPayload.content, msgPayload.senderId, msgPayload.senderName)
      socketRef.current?.emit('send-message', msgPayload)
      setMessages((prev) => [...prev, msgPayload])
      setNewMessage('')
    } catch {
      socketRef.current?.emit('send-message', msgPayload)
      setMessages((prev) => [...prev, msgPayload])
      setNewMessage('')
    }
  }

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newComment.trim()) return

    const commentPayload: CodeComment = {
      workspaceId,
      lineNumber: selectedLine || 1,
      fileSnippet: 'src/services/PaymentService.ts:L' + (selectedLine || 1),
      content: newComment.trim(),
      authorName: user?.name || 'DevCollab Reviewer',
      createdAt: new Date().toISOString(),
    }

    try {
      await workspaceApi.addComment(
        workspaceId,
        commentPayload.content,
        commentPayload.lineNumber,
        commentPayload.fileSnippet,
      )
      socketRef.current?.emit('send-comment', commentPayload)
      setComments((prev) => [...prev, commentPayload])
      setNewComment('')
      setSelectedLine(null)
      toast.success('Code review comment pinned!')
    } catch {
      socketRef.current?.emit('send-comment', commentPayload)
      setComments((prev) => [...prev, commentPayload])
      setNewComment('')
      setSelectedLine(null)
      toast.success('Code review comment pinned!')
    }
  }

  const sampleCode = `import { PayPalScriptProvider } from '@paypal/react-paypal-js'
import axios from 'axios'

export async function createEscrowOrder(contractId: string, amount: number) {
  const response = await axios.post('/api/milestones', {
    contractId,
    amount,
    currency: 'USD',
    status: 'FUNDED_PENDING_APPROVAL'
  })
  return response.data
}

export async function releaseMilestoneFunds(milestoneId: string) {
  return await axios.post(\`/api/milestones/\${milestoneId}/release\`)
}`

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
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
              Workspace #{workspaceId.substring(0, 8)}
            </h1>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Socket.io Live
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Real-Time Collaboration: Node.js 18 + MongoDB + Redis Pub/Sub + WebSockets
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-1 p-1 bg-white/5 border border-white/10 rounded-xl">
          <button
            type="button"
            onClick={() => setActiveTab('chat')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'chat'
                ? 'bg-brand-500 text-white shadow-lg shadow-brand-500/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            Live Chat
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('code')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'code'
                ? 'bg-brand-500 text-white shadow-lg shadow-brand-500/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Code2 className="w-3.5 h-3.5" />
            Code Reviews
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('milestones')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'milestones'
                ? 'bg-brand-500 text-white shadow-lg shadow-brand-500/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Milestone className="w-3.5 h-3.5" />
            Milestones
          </button>
        </div>
      </div>

      {/* Main Workspace Panels */}
      {activeTab === 'chat' && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Chat Stream */}
          <div className="lg:col-span-3 flex flex-col h-[600px] rounded-3xl bg-white/[0.03] border border-white/10 backdrop-blur-xl overflow-hidden shadow-2xl">
            <div className="p-4 border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-brand-400" />
                <span className="text-xs font-bold text-white uppercase tracking-wider">
                  Project Channel
                </span>
              </div>
              <span className="text-[10px] text-slate-500">Messages persisted in MongoDB</span>
            </div>

            <div className="flex-1 p-5 overflow-y-auto space-y-4">
              {messages.map((msg, idx) => {
                const isMe = msg.senderId === user?.id || (user?.role === 'STUDENT' && msg.senderName.includes('Alex'))
                return (
                  <div
                    key={idx}
                    className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                  >
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

            {/* Input form */}
            <form onSubmit={handleSendMessage} className="p-4 border-t border-white/10 bg-white/[0.01] flex gap-3">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type your message to collaborators..."
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

          {/* Participants Side Panel */}
          <div className="p-6 rounded-3xl bg-white/[0.03] border border-white/10 backdrop-blur-xl h-fit space-y-6">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Users className="w-4 h-4 text-brand-400" />
              Workspace Members
            </h3>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 font-bold text-xs">
                  ER
                </div>
                <div>
                  <div className="text-xs font-bold text-white">Elena Rostova</div>
                  <div className="text-[10px] text-slate-400">Startup Founder</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-brand-500/20 border border-brand-500/30 flex items-center justify-center text-brand-400 font-bold text-xs">
                  AC
                </div>
                <div>
                  <div className="text-xs font-bold text-white">Alex Chen</div>
                  <div className="text-[10px] text-slate-400">Student Developer</div>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-white/10 space-y-2">
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Security & Escrow
              </div>
              <div className="flex items-center gap-2 text-xs text-emerald-400">
                <ShieldCheck className="w-4 h-4" />
                <span>PayPal Milestone Protection Active</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Code Review Tab */}
      {activeTab === 'code' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 p-6 rounded-3xl bg-slate-900 border border-white/10 font-mono text-xs shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-4 font-sans">
              <div className="flex items-center gap-2 text-slate-400">
                <FileCode className="w-4 h-4 text-brand-400" />
                <span className="text-xs font-bold text-white">src/services/PaymentService.ts</span>
              </div>
              <span className="text-[10px] text-slate-500">Click line number to add comment</span>
            </div>

            <div className="space-y-1">
              {sampleCode.split('\n').map((line, idx) => (
                <div
                  key={idx}
                  onClick={() => setSelectedLine(idx + 1)}
                  className={`flex items-start gap-4 px-2 py-0.5 rounded cursor-pointer transition-colors ${
                    selectedLine === idx + 1 ? 'bg-brand-500/20 border-l-2 border-brand-400' : 'hover:bg-white/5'
                  }`}
                >
                  <span className="text-slate-600 select-none w-6 text-right">{idx + 1}</span>
                  <span className="text-slate-300 whitespace-pre">{line}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Comments Panel */}
          <div className="p-6 rounded-3xl bg-white/[0.03] border border-white/10 backdrop-blur-xl flex flex-col justify-between shadow-2xl space-y-4">
            <div>
              <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
                <Code2 className="w-4 h-4 text-brand-400" />
                Review Comments ({comments.length})
              </h3>
              <div className="space-y-3 max-h-[360px] overflow-y-auto">
                {comments.map((cmt, idx) => (
                  <div key={idx} className="p-3.5 rounded-2xl bg-white/5 border border-white/10 space-y-1.5">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-bold text-brand-400">{cmt.authorName || 'Reviewer'}</span>
                      {cmt.lineNumber && (
                        <span className="px-1.5 py-0.5 rounded bg-brand-500/20 text-brand-300 text-[10px] font-mono">
                          Line {cmt.lineNumber}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-300">{cmt.content}</p>
                  </div>
                ))}
              </div>
            </div>

            <form onSubmit={handleAddComment} className="pt-4 border-t border-white/10 space-y-2">
              <div className="text-[11px] text-slate-400">
                {selectedLine ? `Commenting on Line ${selectedLine}` : 'Select a line from code to comment'}
              </div>
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Write code feedback or suggestion..."
                rows={3}
                className="w-full p-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-brand-500 transition-all"
              />
              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-brand-500 text-white text-xs font-bold hover:bg-brand-600 transition-all flex items-center justify-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" /> Submit Review Note
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Milestones Tab */}
      {activeTab === 'milestones' && (
        <div className="p-8 rounded-3xl bg-white/[0.03] border border-white/10 backdrop-blur-xl shadow-2xl space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-white/10">
            <div>
              <h3 className="text-lg font-bold text-white">Project Milestones & Deliverables</h3>
              <p className="text-xs text-slate-400">Track milestones and approval releases linked to escrow</p>
            </div>
            <Link
              to="/milestones"
              className="px-4 py-2 rounded-xl bg-brand-500 text-white text-xs font-bold hover:bg-brand-600 transition-all"
            >
              Open Milestone Vault
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-5 rounded-2xl bg-white/5 border border-white/10 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white">Milestone 1: Architecture & API Client</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  RELEASED ($400)
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Setup repository, configure TypeScript and RS256 token verification.
              </p>
              <div className="flex items-center gap-2 text-[11px] text-slate-400">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Approved & Settled to Student PayPal</span>
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-white/5 border border-white/10 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white">Milestone 2: Real-time Workspace & UI</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  IN PROGRESS ($800)
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Integrate Socket.io chat, code review comments and PayPal smart checkout.
              </p>
              <div className="flex items-center gap-2 text-[11px] text-slate-400">
                <Clock className="w-4 h-4 text-amber-400" />
                <span>Deliverable under review</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
