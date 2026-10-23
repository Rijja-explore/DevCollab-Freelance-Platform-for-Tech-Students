import React, { useState, useEffect } from 'react'
import {
  Bell,
  CheckCircle2,
  DollarSign,
  Sparkles,
  MessageSquare,
  ShieldCheck,
  Trash2,
  Check,
  RefreshCw,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { auditApi, discoveryApi } from '../api/client'
import { formatDistanceToNow } from 'date-fns'

interface NotificationItem {
  id: string
  title: string
  message: string
  type: 'MATCH' | 'PAYMENT' | 'CHAT' | 'SECURITY'
  time: string
  read: boolean
}

const LOCAL_STORAGE_READ_KEY = 'devcollab_notifications_read'
const LOCAL_STORAGE_CLEARED_KEY = 'devcollab_notifications_cleared'

export const Notifications: React.FC = () => {
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [loading, setLoading] = useState(true)

  const loadNotifications = async () => {
    setLoading(true)
    try {
      const readIds = new Set<string>(
        JSON.parse(localStorage.getItem(LOCAL_STORAGE_READ_KEY) || '[]')
      )
      const clearedIds = new Set<string>(
        JSON.parse(localStorage.getItem(LOCAL_STORAGE_CLEARED_KEY) || '[]')
      )

      const items: NotificationItem[] = []

      // 1. Fetch system audit logs (payments, contracts, milestones)
      try {
        const auditRes = await auditApi.getAll(0, 20)
        const logs = auditRes.data?.data?.content ?? auditRes.data?.content ?? (Array.isArray(auditRes.data) ? auditRes.data : [])
        
        logs.forEach((logItem: any) => {
          const id = `audit-${logItem.id}`
          if (clearedIds.has(id)) return

          let type: NotificationItem['type'] = 'SECURITY'
          let title = `System Activity: ${logItem.action || 'Event'}`

          if (String(logItem.action).includes('PAYMENT') || String(logItem.action).includes('RELEASE')) {
            type = 'PAYMENT'
            title = 'Escrow Payment Update'
          } else if (String(logItem.action).includes('MILESTONE') || String(logItem.action).includes('CONTRACT')) {
            type = 'MATCH'
            title = 'Milestone / Contract Activity'
          }

          let timeStr = 'Just now'
          if (logItem.createdAt) {
            try {
              timeStr = formatDistanceToNow(new Date(logItem.createdAt), { addSuffix: true })
            } catch {
              timeStr = 'Recently'
            }
          }

          items.push({
            id,
            title,
            message: logItem.details || logItem.reason || `Event recorded for ${logItem.entityType || 'entity'}`,
            type,
            time: timeStr,
            read: readIds.has(id),
          })
        })
      } catch (err) {
        console.warn('Could not load audit notifications:', err)
      }

      // 2. Fetch match records
      try {
        const matchRes = await discoveryApi.getAllMatches()
        const matches = matchRes.data?.data ?? []
        if (Array.isArray(matches)) {
          matches.forEach((m: any) => {
            const id = `match-${m.id}`
            if (clearedIds.has(id)) return

            items.push({
              id,
              title: 'Project Match Confirmed',
              message: `Student matched with score ${Number(m.matchScore || 0).toFixed(0)}%. Workspace & escrow initialized automatically.`,
              type: 'MATCH',
              time: m.matchedAt ? formatDistanceToNow(new Date(m.matchedAt), { addSuffix: true }) : 'Recently',
              read: readIds.has(id),
            })
          })
        }
      } catch (err) {
        console.warn('Could not load match notifications:', err)
      }

      // If no live events yet, provide default initial notifications
      if (items.length === 0 && clearedIds.size === 0) {
        items.push(
          {
            id: 'system-welcome',
            title: 'Welcome to DevCollab Notification Center',
            message: 'All RabbitMQ events, escrow payments, and workspace activities will stream here live.',
            type: 'SECURITY',
            time: 'Just now',
            read: readIds.has('system-welcome'),
          },
          {
            id: 'system-paypal',
            title: 'PayPal Sandbox Escrow Ready',
            message: 'Sandbox payments configured in USD for automated milestone escrow releases.',
            type: 'PAYMENT',
            time: '1 hour ago',
            read: readIds.has('system-paypal'),
          }
        )
      }

      setNotifications(items)
    } catch (e) {
      console.error('Failed to load notifications:', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadNotifications()
  }, [])

  const markAllAsRead = () => {
    const allIds = notifications.map((n) => n.id)
    localStorage.setItem(LOCAL_STORAGE_READ_KEY, JSON.stringify(allIds))
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
    toast.success('All notifications marked as read')
  }

  const markAsRead = (id: string) => {
    const readIds = new Set<string>(
      JSON.parse(localStorage.getItem(LOCAL_STORAGE_READ_KEY) || '[]')
    )
    readIds.add(id)
    localStorage.setItem(LOCAL_STORAGE_READ_KEY, JSON.stringify(Array.from(readIds)))
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)))
  }

  const clearAll = () => {
    const allIds = notifications.map((n) => n.id)
    const clearedIds = new Set<string>(
      JSON.parse(localStorage.getItem(LOCAL_STORAGE_CLEARED_KEY) || '[]')
    )
    allIds.forEach((id) => clearedIds.add(id))
    localStorage.setItem(LOCAL_STORAGE_CLEARED_KEY, JSON.stringify(Array.from(clearedIds)))
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
            Real-time event stream from RabbitMQ, Escrow Milestones, and Matching Engine
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={loadNotifications}
            disabled={loading}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 transition-all border border-white/10"
            title="Refresh notifications"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            type="button"
            onClick={markAllAsRead}
            disabled={notifications.length === 0}
            className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-semibold transition-all border border-white/10 flex items-center gap-1.5 disabled:opacity-50"
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-brand-400" /> Mark All Read
          </button>
          <button
            type="button"
            onClick={clearAll}
            disabled={notifications.length === 0}
            className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-rose-500/10 text-slate-400 hover:text-rose-400 text-xs font-semibold transition-all border border-white/10 flex items-center gap-1.5 disabled:opacity-50"
          >
            <Trash2 className="w-3.5 h-3.5" /> Clear
          </button>
        </div>
      </div>

      {loading ? (
        <div className="p-12 text-center rounded-3xl bg-white/[0.02] border border-white/10">
          <RefreshCw className="w-8 h-8 text-brand-400 animate-spin mx-auto mb-3" />
          <p className="text-sm text-slate-400">Loading live notifications...</p>
        </div>
      ) : notifications.length === 0 ? (
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
              onClick={() => !notif.read && markAsRead(notif.id)}
              className={`p-4 rounded-2xl border transition-all flex items-start gap-4 cursor-pointer ${
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
              {!notif.read ? (
                <span className="w-2 h-2 rounded-full bg-brand-400 mt-2 flex-shrink-0" />
              ) : (
                <Check className="w-3.5 h-3.5 text-slate-600 mt-2 flex-shrink-0" />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
