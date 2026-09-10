import React, { useState } from 'react'
import { useLocation, Link, useNavigate } from 'react-router-dom'
import {
  Bell,
  Menu,
  Zap,
  LogOut,
  User,
  Settings as SettingsIcon,
  ChevronDown,
  GraduationCap,
  Briefcase,
  ShieldCheck,
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'

interface NavbarProps {
  onMenuClick: () => void
}

const routeTitles: Record<string, { title: string; service: string }> = {
  '/dashboard': { title: 'Platform Overview', service: 'Ecosystem Telemetry' },
  '/projects': { title: 'Projects Catalog & Search', service: 'Discovery & Matching (Service 1)' },
  '/applications': { title: 'My Applications & Matches', service: 'Discovery & Matching (Service 1)' },
  '/applicants': { title: 'Student Applicants', service: 'Discovery & Matching (Service 1)' },
  '/talent': { title: 'Find Student Talent', service: 'Discovery & Matching (Service 1)' },
  '/recommendations': { title: 'AI Skill Match Engine', service: 'Discovery & Matching (Service 1)' },
  '/graphql-explorer': { title: 'GraphQL API Explorer', service: 'Discovery & Matching (Service 1)' },
  '/workspaces': { title: 'Collaboration Workspaces', service: 'Real-Time Workspace (Service 2)' },
  '/contracts': { title: 'Contracts & Escrow Vault', service: 'Escrow & Milestones (Service 3)' },
  '/milestones': { title: 'Milestones & PayPal Checkout', service: 'Escrow & Milestones (Service 3)' },
  '/transactions': { title: 'Transactions Ledger', service: 'Escrow & Milestones (Service 3)' },
  '/audit-logs': { title: 'Security Audit Trail', service: 'Escrow & Milestones (Service 3)' },
  '/notifications': { title: 'Notification Center', service: 'Event Stream' },
  '/profile': { title: 'User Profile & Skills', service: 'Identity' },
  '/settings': { title: 'System Architecture & Keys', service: 'Platform Config' },
}

export const Navbar: React.FC<NavbarProps> = ({ onMenuClick }) => {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, role, logout } = useAuth()
  const [profileOpen, setProfileOpen] = useState(false)

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const getPageMeta = () => {
    if (location.pathname.startsWith('/projects/')) {
      return { title: 'Project Details & Matching', service: 'Discovery & Matching (Service 1)' }
    }
    if (location.pathname.startsWith('/workspaces/')) {
      return { title: 'Live Collaboration Workspace', service: 'Real-Time Workspace (Service 2)' }
    }
    if (location.pathname.startsWith('/transactions/')) {
      return { title: 'Payment Settlement Details', service: 'Escrow & Milestones (Service 3)' }
    }
    return routeTitles[location.pathname] ?? { title: 'DevCollab Platform', service: 'Microservices' }
  }

  const pageMeta = getPageMeta()

  return (
    <header className="h-16 border-b border-white/10 bg-slate-950/80 backdrop-blur-xl flex items-center justify-between px-4 md:px-8 sticky top-0 z-20">
      <div className="flex items-center gap-4 flex-1 min-w-0">
        <button
          type="button"
          onClick={onMenuClick}
          className="lg:hidden w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
          aria-label="Open navigation"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-brand-400 hidden sm:block" />
            <h2 className="font-bold text-white text-base md:text-lg truncate">
              {pageMeta.title}
            </h2>
          </div>
          <p className="text-[11px] text-slate-400 hidden sm:block">
            {pageMeta.service}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Verified Static Role Badge (No dropdown switching once registered) */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10">
          {role === 'STUDENT' ? (
            <>
              <GraduationCap className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-semibold text-emerald-300">Student Developer</span>
            </>
          ) : role === 'STARTUP' ? (
            <>
              <Briefcase className="w-4 h-4 text-brand-400" />
              <span className="text-xs font-semibold text-brand-300">Startup Founder</span>
            </>
          ) : (
            <>
              <ShieldCheck className="w-4 h-4 text-indigo-400" />
              <span className="text-xs font-semibold text-indigo-300">Platform Admin</span>
            </>
          )}
        </div>

        {/* PayPal Sandbox Badge */}
        <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 bg-sky-500/10 border border-sky-500/20 text-sky-400 rounded-lg text-[10px] font-semibold tracking-wide">
          PayPal Sandbox
        </div>

        {/* Notifications */}
        <Link
          to="/notifications"
          className="w-9 h-9 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-all relative"
          aria-label="Notifications"
        >
          <Bell className="w-4 h-4" />
          <span className="w-2 h-2 rounded-full bg-brand-400 absolute top-2 right-2 ring-2 ring-slate-950" />
        </Link>

        {/* User Profile Menu */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setProfileOpen(!profileOpen)}
            className="flex items-center gap-2 p-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white text-xs font-semibold transition-all"
          >
            <div className="w-6 h-6 rounded-lg bg-gradient-to-tr from-brand-600 to-indigo-600 flex items-center justify-center text-[10px] font-bold text-white">
              {(user?.name || 'U').substring(0, 1).toUpperCase()}
            </div>
            <span className="hidden sm:inline max-w-[100px] truncate">{user?.name || 'Member'}</span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>

          {profileOpen && (
            <div
              className="absolute right-0 mt-2 w-48 rounded-2xl bg-slate-900 border border-white/10 shadow-2xl p-1.5 z-30 space-y-0.5"
              onClick={() => setProfileOpen(false)}
            >
              <div className="px-3 py-2 border-b border-white/5">
                <div className="text-xs font-bold text-white truncate">{user?.name}</div>
                <div className="text-[10px] text-slate-400 truncate">{user?.email}</div>
              </div>
              <Link
                to="/profile"
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-slate-300 hover:bg-white/5 hover:text-white transition-colors"
              >
                <User className="w-3.5 h-3.5 text-brand-400" /> My Profile
              </Link>
              {role === 'ADMIN' && (
                <Link
                  to="/settings"
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-slate-300 hover:bg-white/5 hover:text-white transition-colors"
                >
                  <SettingsIcon className="w-3.5 h-3.5 text-slate-400" /> System Settings
                </Link>
              )}
              <button
                type="button"
                onClick={handleLogout}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-rose-400 hover:bg-rose-500/10 transition-colors text-left"
              >
                <LogOut className="w-3.5 h-3.5" /> Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
