import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  FileText,
  Milestone,
  ShieldCheck,
  CreditCard,
  X,
  Sparkles,
} from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, desc: 'Overview' },
  { to: '/contracts', label: 'Contracts', icon: FileText, desc: 'Escrow deals' },
  { to: '/milestones', label: 'Milestones', icon: Milestone, desc: 'Work phases' },
  { to: '/transactions', label: 'Transactions', icon: CreditCard, desc: 'Payments' },
  { to: '/audit-logs', label: 'Audit Logs', icon: ShieldCheck, desc: 'Event trail' },
];

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const location = useLocation();

  return (
    <aside
      className={`
        fixed lg:static inset-y-0 left-0 z-40
        w-72 flex flex-col h-screen flex-shrink-0
        bg-surface-raised/80 backdrop-blur-2xl
        border-r border-surface-border
        transform transition-transform duration-300 ease-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}
    >
      {/* Logo */}
      <div className="p-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 rounded-xl bg-vault-gradient flex items-center justify-center shadow-glow-teal">
              <Sparkles className="w-5 h-5 text-surface" />
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-vault-teal rounded-full border-2 border-surface-raised animate-pulse-slow" />
          </div>
          <div>
            <h1 className="font-display font-bold text-white text-lg leading-tight tracking-tight">
              DevCollab
            </h1>
            <span className="text-[10px] text-vault-teal font-semibold tracking-[0.2em] uppercase">
              Vault · Escrow
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

      {/* Tagline strip */}
      <div className="mx-4 mb-4 px-3 py-2 rounded-xl bg-hero-gradient border border-vault-teal/10">
        <p className="text-[11px] text-slate-400 leading-relaxed">
          Secure payments between <span className="text-vault-teal font-medium">startups</span> &{' '}
          <span className="text-accent-coral font-medium">student devs</span>
        </p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
        <p className="px-3 mb-2 text-[10px] font-semibold text-slate-600 uppercase tracking-widest">
          Navigation
        </p>
        {navItems.map((item) => {
          const isActive =
            item.to === '/'
              ? location.pathname === '/'
              : location.pathname.startsWith(item.to);

          return (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={onClose}
              className={`group flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                isActive ? 'nav-pill-active' : 'text-slate-400 hover:bg-white/[0.04] hover:text-white'
              }`}
            >
              <span
                className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all duration-200 ${
                  isActive
                    ? 'bg-vault-teal/20 text-vault-teal shadow-glow-teal'
                    : 'bg-white/[0.03] text-slate-500 group-hover:text-vault-teal group-hover:bg-vault-teal/10'
                }`}
              >
                <item.icon className="w-[18px] h-[18px]" />
              </span>
              <div className="flex-1 min-w-0">
                <span className="block truncate">{item.label}</span>
                <span className="block text-[10px] text-slate-600 group-hover:text-slate-500 truncate">
                  {item.desc}
                </span>
              </div>
              {isActive && (
                <span className="w-1.5 h-1.5 rounded-full bg-vault-teal shadow-glow-teal flex-shrink-0" />
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* User profile */}
      <div className="p-4 m-3 rounded-2xl bg-white/[0.03] border border-surface-border">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 rounded-xl bg-vault-gradient flex items-center justify-center font-display font-bold text-surface text-sm">
              DC
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-400 rounded-full border-2 border-surface-raised" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white truncate">Platform Admin</p>
            <p className="text-[11px] text-slate-500 truncate">Escrow Operations</p>
          </div>
        </div>
        <div className="mt-3 flex items-center gap-2">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-vault-teal/10 text-vault-teal text-[10px] font-semibold uppercase tracking-wide">
            <span className="w-1 h-1 rounded-full bg-vault-teal animate-pulse" />
            Live
          </span>
          <span className="text-[10px] text-slate-600">Razorpay connected</span>
        </div>
      </div>
    </aside>
  );
};
