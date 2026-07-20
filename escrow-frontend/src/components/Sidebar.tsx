import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  FileText,
  Milestone,
  History,
  ShieldCheck,
  CreditCard,
} from 'lucide-react';

export const Sidebar: React.FC = () => {
  const navItems = [
    { to: '/', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/contracts', label: 'Contracts', icon: FileText },
    { to: '/milestones', label: 'Milestones', icon: Milestone },
    { to: '/transactions', label: 'Transactions', icon: CreditCard },
    { to: '/audit-logs', label: 'Audit Logs', icon: ShieldCheck },
  ];

  return (
    <aside className="w-64 bg-surface-card backdrop-blur-2xl border-r border-surface-border flex flex-col h-screen z-20 flex-shrink-0 relative shadow-2xl">
      <div className="p-6 border-b border-surface-border flex items-center gap-3">
        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-brand-500 to-accent-blue flex items-center justify-center font-bold text-white shadow-[0_0_20px_rgba(139,92,246,0.4)]">
          DC
        </div>
        <div>
          <h1 className="font-bold text-white text-base leading-none">DevCollab</h1>
          <span className="text-[10px] text-brand-400 font-semibold tracking-wider uppercase">Escrow Service</span>
        </div>
      </div>

      <nav className="flex-1 px-4 py-6 space-y-1">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-300 ${
                isActive
                  ? 'bg-gradient-to-r from-brand-500/20 to-transparent text-white border-l-4 border-brand-500 shadow-[inset_0_0_20px_rgba(139,92,246,0.1)]'
                  : 'text-slate-400 hover:bg-white/5 hover:text-white hover:scale-[0.98]'
              }`
            }
          >
            <item.icon className="w-5 h-5" />
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="p-4 border-t border-surface-border bg-white/5">
        <div className="flex items-center gap-3 px-2 py-1.5">
          <div className="w-9 h-9 rounded-full bg-white flex items-center justify-center font-semibold text-brand-900 shadow-[0_0_15px_rgba(255,255,255,0.2)]">
            FN
          </div>
          <div className="flex-1 overflow-hidden">
            <p className="text-xs font-semibold text-slate-200 truncate">Fintech Engineer</p>
            <p className="text-[10px] text-slate-500 truncate">active_role: Startup</p>
          </div>
        </div>
      </div>
    </aside>
  );
};
