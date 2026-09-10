import React from 'react';
import { useLocation } from 'react-router-dom';
import { Bell, Search, ShieldAlert, Menu, Zap } from 'lucide-react';

interface NavbarProps {
  onMenuClick: () => void;
}

const routeTitles: Record<string, string> = {
  '/': 'Dashboard',
  '/contracts': 'Contracts',
  '/milestones': 'Milestones',
  '/transactions': 'Transactions',
  '/audit-logs': 'Audit Logs',
};

export const Navbar: React.FC<NavbarProps> = ({ onMenuClick }) => {
  const location = useLocation();

  const getTitle = () => {
    if (location.pathname.startsWith('/transactions/')) return 'Payment Details';
    return routeTitles[location.pathname] ?? 'DevCollab Vault';
  };

  return (
    <header className="h-16 border-b border-surface-border bg-surface/60 backdrop-blur-xl flex items-center justify-between px-4 md:px-8 sticky top-0 z-20">
      <div className="flex items-center gap-4 flex-1 min-w-0">
        <button
          type="button"
          onClick={onMenuClick}
          className="lg:hidden w-9 h-9 rounded-xl bg-white/[0.04] border border-surface-border flex items-center justify-center text-slate-400 hover:text-white transition-colors"
          aria-label="Open navigation"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-vault-teal hidden sm:block" />
            <h2 className="font-display font-semibold text-white text-base md:text-lg truncate">
              {getTitle()}
            </h2>
          </div>
          <p className="text-[11px] text-slate-500 hidden sm:block">
            DevCollab Escrow Service · Service C
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 md:gap-3">
        {/* Search — hidden on small screens */}
        <div className="relative hidden md:block w-64 lg:w-80 group">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 group-focus-within:text-vault-teal transition-colors" />
          <input
            type="text"
            placeholder="Search contracts, payments..."
            className="w-full bg-white/[0.03] border border-surface-border rounded-xl pl-10 pr-4 py-2 text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-vault-teal/30 focus:ring-2 focus:ring-vault-teal/10 transition-all"
          />
        </div>

        {/* Test mode pill */}
        <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-vault-amber/10 border border-vault-amber/20 text-vault-amber rounded-full text-[10px] font-semibold tracking-wide uppercase">
          <ShieldAlert className="w-3 h-3" />
          Test Mode
        </div>

        {/* Notifications */}
        <button
          type="button"
          className="relative w-9 h-9 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-surface-border flex items-center justify-center text-slate-400 hover:text-white transition-all"
          aria-label="Notifications"
        >
          <Bell className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-accent-coral rounded-full ring-2 ring-surface" />
        </button>
      </div>
    </header>
  );
};
