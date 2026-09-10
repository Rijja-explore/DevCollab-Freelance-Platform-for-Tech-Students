import React, { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { Bell, Menu, Zap, UserCheck } from 'lucide-react'
import { authApi } from '../api/client'
import toast from 'react-hot-toast'

interface NavbarProps {
  onMenuClick: () => void
}

const routeTitles: Record<string, string> = {
  '/': 'Platform Overview',
  '/projects': 'Projects & Discovery',
  '/recommendations': 'Skill Match Engine',
  '/graphql-explorer': 'GraphQL Explorer',
  '/workspaces': 'Collaboration Workspace',
  '/contracts': 'Contracts & Escrow',
  '/milestones': 'Milestones & PayPal Checkout',
  '/transactions': 'Transactions Ledger',
  '/audit-logs': 'Security Audit Logs',
}

export const Navbar: React.FC<NavbarProps> = ({ onMenuClick }) => {
  const location = useLocation()
  const [currentRole, setCurrentRole] = useState<string>('STARTUP')

  useEffect(() => {
    const savedRole = localStorage.getItem('devcollab_role') || 'STARTUP'
    setCurrentRole(savedRole)

    // Ensure initial token is set
    if (!localStorage.getItem('devcollab_token')) {
      authApi.getToken(savedRole).then((res) => {
        if (res.data?.token) {
          localStorage.setItem('devcollab_token', res.data.token)
          localStorage.setItem('devcollab_role', savedRole)
        }
      }).catch(() => {})
    }
  }, [])

  const handleRoleChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newRole = e.target.value
    setCurrentRole(newRole)
    try {
      const res = await authApi.getToken(newRole)
      if (res.data?.token) {
        localStorage.setItem('devcollab_token', res.data.token)
        localStorage.setItem('devcollab_role', newRole)
        toast.success(`Role switched to ${newRole} (RS256 JWT active)`)
      }
    } catch (err) {
      localStorage.setItem('devcollab_role', newRole)
      toast.success(`Active role: ${newRole}`)
    }
  }

  const getTitle = () => {
    if (location.pathname.startsWith('/transactions/')) return 'Payment Details'
    return routeTitles[location.pathname] ?? 'DevCollab Platform'
  }

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
              {getTitle()}
            </h2>
          </div>
          <p className="text-[11px] text-slate-400 hidden sm:block">
            Cloud-Native Freelance & Student–Startup Platform
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Role Switcher */}
        <div className="flex items-center gap-2 px-2.5 py-1 rounded-xl bg-white/5 border border-white/10">
          <UserCheck className="w-3.5 h-3.5 text-brand-400" />
          <span className="text-[10px] text-slate-400 font-bold uppercase hidden sm:inline">
            Role:
          </span>
          <select
            value={currentRole}
            onChange={handleRoleChange}
            className="bg-transparent text-xs font-semibold text-white focus:outline-none cursor-pointer"
          >
            <option value="STARTUP" className="bg-slate-900 text-white">Startup Founder</option>
            <option value="STUDENT" className="bg-slate-900 text-white">Student Developer</option>
            <option value="ADMIN" className="bg-slate-900 text-white">Platform Admin</option>
          </select>
        </div>

        {/* PayPal Sandbox Badge */}
        <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 bg-sky-500/10 border border-sky-500/20 text-sky-400 rounded-lg text-[10px] font-semibold tracking-wide">
          PayPal Sandbox
        </div>

        {/* Notifications */}
        <button
          type="button"
          className="w-9 h-9 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-all"
          aria-label="Notifications"
        >
          <Bell className="w-4 h-4" />
        </button>
      </div>
    </header>
  )
}
