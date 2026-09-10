import React, { useState } from 'react'
import { Bell, CheckCircle2, DollarSign, Sparkles, MessageSquare, ShieldCheck, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'

interface NotificationItem {
  id: string
  title: string
  message: string
  type: 'MATCH' | 'PAYMENT' | 'CHAT' | 'SECURITY'
  time: string
  read: boolean
}

const INITIAL_NOTIFICATIONS: NotificationItem[] = [
  {
    id: 'notif-1',
    title: 'New Skill Recommendation Match',
    message: 'Your profile scored 92% match with "Next.js AI Copilot Integration".',
    type: 'MATCH',
    time: '5 mins ago',
    read: false,
  },
  {
    id: 'notif-2',
    title: 'PayPal Escrow Milestone Funded',
    message: '$800.00 USD has been secured in the escrow vault for Milestone 2.',
    type: 'PAYMENT',
    time: '1 hour ago',
    read: false,
  },
  {
    id: 'notif-3',
    title: 'Code Review Comment Received',
    message: 'Elena Rostova commented on line 14 of PaymentService.ts.',
    type: 'CHAT',
    time: '3 hours ago',
    read: true,
  },
  {
    id: 'notif-4',
    title: 'RS256 JWT Token Refreshed',
    message: 'Your session token was validated against /.well-known/jwks.json.',
    type: 'SECURITY',
    time: '1 day ago',
    read: true,
  },
]

export const Notifications: React.FC = () => {
  const [notifications, setNotifications] = useState<NotificationItem[]>(INITIAL_NOTIFICATIONS)

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
    toast.success('All notifications marked as read')
  }

  const clearAll = () => {
    setNotifications([])
    toast.success('Notification feed cleared')
  }

  const getIcon = (type: NotificationItem['type']) => {
    switch (type) {
      case 'MATCH':
        return <Sparkles className="w-5 h-5 text-brand-400" />
      case 'PAYMENT':
        return <DollarSign className="w-5 h-5 text-emerald-400" />
      case 'CHAT':
        return <MessageSquare className="w-5 h-5 text-indigo-400" />
      case 'SECURITY':
        return <ShieldCheck className="w-5 h-5 text-sky-400" />
    }
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
            <Bell className="w-6 h-6 text-brand-400" />
            Notifications & System Alerts
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Real-time event stream from RabbitMQ and WebSockets
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={markAllAsRead}
            className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-semibold transition-all border border-white/10 flex items-center gap-1.5"
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-brand-400" /> Mark All Read
          </button>
          <button
            type="button"
            onClick={clearAll}
            className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-rose-500/10 text-slate-400 hover:text-rose-400 text-xs font-semibold transition-all border border-white/10 flex items-center gap-1.5"
          >
            <Trash2 className="w-3.5 h-3.5" /> Clear
          </button>
        </div>
      </div>

      {notifications.length === 0 ? (
        <div className="p-12 text-center rounded-3xl bg-white/[0.02] border border-white/10">
          <Bell className="w-10 h-10 text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-bold text-white">No New Notifications</h3>
          <p className="text-xs text-slate-400 mt-1">You are all caught up with your projects and escrow alerts!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {notifications.map((notif) => (
            <div
              key={notif.id}
              className={`p-4 rounded-2xl border transition-all flex items-start gap-4 ${
                notif.read
                  ? 'bg-white/[0.02] border-white/5 text-slate-400'
                  : 'bg-white/[0.05] border-brand-500/30 text-white shadow-lg shadow-brand-500/5'
              }`}
            >
              <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 flex-shrink-0 mt-0.5">
                {getIcon(notif.type)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="text-xs font-bold text-white truncate">{notif.title}</h4>
                  <span className="text-[10px] text-slate-500 flex-shrink-0">{notif.time}</span>
                </div>
                <p className="text-xs text-slate-300 mt-1 leading-relaxed">{notif.message}</p>
              </div>
              {!notif.read && (
                <span className="w-2 h-2 rounded-full bg-brand-400 mt-2 flex-shrink-0" />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
