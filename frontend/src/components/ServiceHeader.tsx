import React from 'react'
import { Sparkles, MessageSquare, ShieldCheck, Activity, Server, Database } from 'lucide-react'

export type ServiceDomain = 'discovery' | 'workspace' | 'escrow' | 'platform'

interface ServiceHeaderProps {
  service: ServiceDomain
  title: string
  subtitle: string
  action?: React.ReactNode
}

const serviceConfig: Record<
  ServiceDomain,
  {
    badge: string
    badgeColor: string
    techStack: string
    port: string
    icon: React.ComponentType<{ className?: string }>
    bgGradient: string
    borderColor: string
    textColor: string
  }
> = {
  discovery: {
    badge: 'Service 1: Discovery & Matching Engine',
    badgeColor: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30',
    techStack: 'Spring Boot • PostgreSQL • Elasticsearch 8.11 • GraphQL',
    port: 'Port 8081',
    icon: Sparkles,
    bgGradient: 'from-indigo-950/40 via-slate-900/40 to-transparent',
    borderColor: 'border-indigo-500/20',
    textColor: 'text-indigo-400',
  },
  workspace: {
    badge: 'Service 2: Collaboration Workspace',
    badgeColor: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
    techStack: 'Node.js / Express • MongoDB • Redis Pub/Sub • Socket.io',
    port: 'Port 5000',
    icon: MessageSquare,
    bgGradient: 'from-emerald-950/40 via-slate-900/40 to-transparent',
    borderColor: 'border-emerald-500/20',
    textColor: 'text-emerald-400',
  },
  escrow: {
    badge: 'Service 3: Escrow & Milestones Vault',
    badgeColor: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
    techStack: 'Spring Boot • MySQL 8.0 • PayPal Sandbox • Kafka Events',
    port: 'Port 8080',
    icon: ShieldCheck,
    bgGradient: 'from-amber-950/30 via-slate-900/40 to-transparent',
    borderColor: 'border-amber-500/20',
    textColor: 'text-amber-400',
  },
  platform: {
    badge: 'DevCollab Platform Ecosystem',
    badgeColor: 'bg-brand-500/15 text-brand-300 border-brand-500/30',
    techStack: 'Vite React • RS256 JWT • Distributed Architecture',
    port: 'Port 3000',
    icon: Server,
    bgGradient: 'from-brand-950/40 via-slate-900/40 to-transparent',
    borderColor: 'border-brand-500/20',
    textColor: 'text-brand-400',
  },
}

export const ServiceHeader: React.FC<ServiceHeaderProps> = ({
  service,
  title,
  subtitle,
  action,
}) => {
  const config = serviceConfig[service]
  const Icon = config.icon

  return (
    <div
      className={`rounded-2xl border ${config.borderColor} bg-gradient-to-r ${config.bgGradient} p-6 backdrop-blur-md relative overflow-hidden`}
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider border ${config.badgeColor}`}
            >
              <Icon className="w-3.5 h-3.5" />
              {config.badge}
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-medium bg-white/5 border border-white/10 text-slate-300">
              <Activity className="w-3 h-3 text-emerald-400 animate-pulse" />
              Live Online ({config.port})
            </span>
            <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-mono text-slate-400 bg-black/20 border border-white/5">
              <Database className="w-3 h-3 text-slate-400" />
              {config.techStack}
            </span>
          </div>

          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
              {title}
            </h1>
            <p className="text-xs md:text-sm text-slate-400 mt-1 max-w-2xl">{subtitle}</p>
          </div>
        </div>

        {action && <div className="flex-shrink-0">{action}</div>}
      </div>
    </div>
  )
}
