import React from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  Compass,
  Sparkles,
  Code2,
  FolderGit2,
  FileText,
  Milestone,
  ShieldCheck,
  CreditCard,
  X,
} from 'lucide-react'

interface SidebarProps {
  isOpen: boolean
  onClose: () => void
}

const navSections = [
  {
    title: 'Platform Overview',
    items: [
      { to: '/', label: 'Dashboard', icon: LayoutDashboard, desc: 'Ecosystem overview' },
    ],
  },
  {
    title: 'Discovery & Matching',
    items: [
      { to: '/projects', label: 'Projects Catalog', icon: Compass, desc: 'Search & browse' },
      { to: '/recommendations', label: 'Match Engine', icon: Sparkles, desc: 'Skill recommendations' },
      { to: '/graphql-explorer', label: 'GraphQL Explorer', icon: Code2, desc: 'Direct /graphql API' },
    ],
  },
  {
    title: 'Collaboration',
    items: [
      { to: '/workspaces', label: 'Workspaces', icon: FolderGit2, desc: 'Chat & Code reviews' },
    ],
  },
  {
    title: 'Escrow & Payments',
    items: [
      { to: '/contracts', label: 'Contracts', icon: FileText, desc: 'Escrow agreements' },
      { to: '/milestones', label: 'Milestones & PayPal', icon: Milestone, desc: 'Approvals & Checkout' },
      { to: '/transactions', label: 'Transactions Ledger', icon: CreditCard, desc: 'Settlement logs' },
      { to: '/audit-logs', label: 'Security Audit', icon: ShieldCheck, desc: 'Traceability trail' },
    ],
  },
]

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const location = useLocation()

  return (
    <aside
      className={`
        fixed lg:static inset-y-0 left-0 z-40
        w-72 flex flex-col h-screen flex-shrink-0
        bg-slate-950/90 backdrop-blur-2xl
        border-r border-white/10
        transform transition-transform duration-300 ease-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}
    >
      {/* Brand Header */}
      <div className="p-6 flex items-center justify-between border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-brand-500/25">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-white text-lg tracking-tight">DevCollab</h1>
            <span className="text-[10px] text-brand-400 font-semibold tracking-widest uppercase">
              Microservices Platform
            </span>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="lg:hidden w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-slate-400 hover:text-white"
          aria-label="Close sidebar"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-4 py-4 space-y-6 overflow-y-auto">
        {navSections.map((section, sIdx) => (
          <div key={sIdx} className="space-y-1.5">
            <p className="px-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
              {section.title}
            </p>
            {section.items.map((item) => {
              const isActive =
                item.to === '/'
                  ? location.pathname === '/'
                  : location.pathname.startsWith(item.to)

              const Icon = item.icon

              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={onClose}
                  className={`group flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 ${
                    isActive
                      ? 'bg-brand-500 text-white shadow-lg shadow-brand-500/20'
                      : 'text-slate-400 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <Icon
                    className={`w-4 h-4 transition-colors ${
                      isActive ? 'text-white' : 'text-slate-500 group-hover:text-brand-400'
                    }`}
                  />
                  <div>
                    <div className="leading-tight">{item.label}</div>
                    <div
                      className={`text-[10px] font-normal transition-colors ${
                        isActive ? 'text-brand-100' : 'text-slate-500'
                      }`}
                    >
                      {item.desc}
                    </div>
                  </div>
                </NavLink>
              )
            })}
          </div>
        ))}
      </nav>

      {/* Footer Info */}
      <div className="p-4 m-4 rounded-xl bg-white/5 border border-white/5 text-center">
        <div className="text-[11px] font-semibold text-slate-300">
          DevCollab Cloud-Native
        </div>
        <div className="text-[10px] text-slate-500 mt-0.5">
          REST · GraphQL · WebSocket · PayPal
        </div>
      </div>
    </aside>
  )
}
