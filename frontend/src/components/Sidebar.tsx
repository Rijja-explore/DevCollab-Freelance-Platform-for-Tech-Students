import React, { useState, useEffect } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  Search,
  Handshake,
  FolderGit2,
  FileText,
  CreditCard,
  Bell,
  User,
  Briefcase,
  Users,
  Milestone,
  Sparkles,
  LogOut,
  UserPlus,
  X,
  LucideIcon,
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { workspaceApi } from '../api/client'

interface SidebarProps {
  isOpen: boolean
  onClose: () => void
}

interface NavItem {
  to: string
  label: string
  icon: LucideIcon
  desc: string
}

interface NavSection {
  title: string
  items: NavItem[]
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const location = useLocation()
  const navigate = useNavigate()
  const { role, logout, user } = useAuth()
  const [hasCollaboration, setHasCollaboration] = useState(false)

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const normalizedRole = ((role || user?.role || 'STUDENT') as string).toUpperCase()

  // Check if current user is participant in any active collaboration
  useEffect(() => {
    let isMounted = true
    workspaceApi.getAll()
      .then((res) => {
        if (!isMounted) return
        const data = res.data?.data ?? res.data ?? []
        if (Array.isArray(data)) {
          const isParticipant = data.some((ws: any) =>
            ws.studentId === user?.id ||
            ws.studentId === user?.profileId ||
            ws.startupId === user?.id ||
            ws.startupId === user?.profileId
          )
          setHasCollaboration(isParticipant)
        }
      })
      .catch(() => {
        // fallback
      })
    return () => { isMounted = false }
  }, [user?.id, user?.profileId])

  // Define role-specific navigation lists strictly matching user permissions
  const getNavSections = (): NavSection[] => {
    if (normalizedRole === 'STUDENT') {
      const studentItems: NavItem[] = [
        { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, desc: 'Overview & metrics' },
        { to: '/projects', label: 'Discover Projects', icon: Search, desc: 'Search & matching' },
        { to: '/recommendations', label: 'AI Match Engine', icon: Sparkles, desc: 'Skill-matched gigs & gaps' },
        { to: '/applications', label: 'My Applications', icon: Handshake, desc: 'Applied gigs & status' },
      ]

      // My Collaborations is visible ONLY to the particular student once accepted
      if (hasCollaboration) {
        studentItems.push({
          to: '/workspaces',
          label: 'My Collaborations',
          icon: FolderGit2,
          desc: 'Live chat & code review',
        })
      }

      studentItems.push({ to: '/contracts', label: 'My Contracts', icon: FileText, desc: 'Escrow agreements' })

      return [
        {
          title: 'Student Navigation',
          items: studentItems,
        },
        {
          title: 'Account',
          items: [
            { to: '/notifications', label: 'Notifications', icon: Bell, desc: 'System updates' },
            { to: '/profile', label: 'Developer Profile', icon: User, desc: 'Skills, qualifications & portfolio' },
          ],
        },
      ]
    }

    if (normalizedRole === 'STARTUP') {
      const startupItems: NavItem[] = [
        { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, desc: 'Hires & budget overview' },
        { to: '/projects', label: 'My Projects', icon: Briefcase, desc: 'Post & manage gigs' },
        { to: '/talent', label: 'Find Talent', icon: Search, desc: 'Student developers' },
        { to: '/applicants', label: 'Applicants', icon: Users, desc: 'Review & match talent' },
      ]

      // Collaborations visible only when startup has an active collaboration
      if (hasCollaboration) {
        startupItems.push({
          to: '/workspaces',
          label: 'Collaborations',
          icon: FolderGit2,
          desc: 'Workspaces & code reviews',
        })
      }

      startupItems.push(
        { to: '/contracts', label: 'Contracts', icon: FileText, desc: 'Escrow agreements' },
        { to: '/milestones', label: 'Milestones & Escrow', icon: Milestone, desc: 'PayPal checkout & release' },
        { to: '/transactions', label: 'Payment Ledger', icon: CreditCard, desc: 'Escrow deposit records' },
      )

      return [
        {
          title: 'Startup Navigation',
          items: startupItems,
        },
        {
          title: 'Account',
          items: [
            { to: '/notifications', label: 'Notifications', icon: Bell, desc: 'System updates' },
            { to: '/profile', label: 'Company Profile', icon: User, desc: 'Startup info & projects' },
          ],
        },
      ]
    }

    // Default student view
    return [
      {
        title: 'Student Navigation',
        items: [
          { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, desc: 'Overview & metrics' },
          { to: '/projects', label: 'Discover Projects', icon: Search, desc: 'Search & matching' },
          { to: '/applications', label: 'My Applications', icon: Handshake, desc: 'Applied gigs' },
        ],
      },
    ]
  }

  const sections = getNavSections()

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
        <NavLink to="/dashboard" onClick={onClose} className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-brand-500/25">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-white text-lg tracking-tight">DevCollab</h1>
            <span className="text-[10px] text-brand-400 font-semibold tracking-widest uppercase">
              {normalizedRole === 'STUDENT' ? 'Student Portal' : normalizedRole === 'STARTUP' ? 'Startup Portal' : 'Admin Console'}
            </span>
          </div>
        </NavLink>
        <button
          type="button"
          onClick={onClose}
          className="lg:hidden w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-slate-400 hover:text-white"
          aria-label="Close sidebar"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Navigation Sections */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar">
        {sections.map((section, idx) => (
          <div key={idx} className="space-y-1.5">
            <div className="px-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              {section.title}
            </div>
            <div className="space-y-1">
              {section.items.map((item) => {
                const Icon = item.icon
                const isActive =
                  location.pathname === item.to ||
                  (item.to !== '/dashboard' && location.pathname.startsWith(`${item.to}/`))

                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    onClick={onClose}
                    className={`
                      group flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold
                      transition-all duration-150
                      ${
                        isActive
                          ? 'bg-gradient-to-r from-brand-500/20 to-indigo-500/10 text-white border border-brand-500/30 shadow-sm shadow-brand-500/10'
                          : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'
                      }
                    `}
                  >
                    <div
                      className={`
                        p-1.5 rounded-lg transition-colors
                        ${isActive ? 'bg-brand-500 text-white' : 'bg-white/5 text-slate-400 group-hover:text-white group-hover:bg-white/10'}
                      `}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="truncate">{item.label}</div>
                      <div className="text-[10px] text-slate-500 font-normal truncate">
                        {item.desc}
                      </div>
                    </div>
                  </NavLink>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Bottom User / Logout Card */}
      <div className="p-4 border-t border-white/5 bg-black/20">
        <div className="p-3 rounded-2xl bg-white/[0.02] border border-white/5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-brand-600 to-indigo-500 flex items-center justify-center text-xs font-bold text-white shrink-0">
              {user?.name
                ? user.name.split(' ').map((n) => n[0]).join('').toUpperCase()
                : 'DC'}
            </div>
            <div className="min-w-0">
              <div className="text-xs font-bold text-white truncate">
                {user?.name || 'DevCollab Member'}
              </div>
              <div className="text-[10px] text-slate-400 truncate">
                {normalizedRole}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <NavLink
              to="/register"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/10 transition-colors"
              title="Create New Account"
            >
              <UserPlus className="w-4 h-4" />
            </NavLink>
            <button
              type="button"
              onClick={handleLogout}
              className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </aside>
  )
}
