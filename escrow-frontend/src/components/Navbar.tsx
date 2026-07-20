import React from 'react';
import { Sun, Moon, Bell, Search, ShieldAlert } from 'lucide-react';

interface NavbarProps {
  darkMode: boolean;
  setDarkMode: (dark: boolean) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ darkMode, setDarkMode }) => {
  return (
    <header className="h-16 border-b border-surface-border bg-surface/40 backdrop-blur-xl flex items-center justify-between px-8 sticky top-0 z-10">
      <div className="flex items-center gap-4 w-96">
        <div className="relative w-full group">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 group-focus-within:text-brand-400 transition-colors" />
          <input
            type="text"
            placeholder="Search contracts, transactions..."
            className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-brand-500/50 focus:bg-white/10 focus:shadow-[0_0_15px_rgba(139,92,246,0.15)] transition-all"
          />
        </div>
      </div>

      <div className="flex items-center gap-4">
        {/* Environment Alert Pill */}
        <div className="flex items-center gap-1.5 px-3 py-1 bg-yellow-500/10 border border-yellow-500/20 text-yellow-500 rounded-full text-[10px] font-semibold tracking-wide uppercase">
          <ShieldAlert className="w-3.5 h-3.5" />
          Razorpay Test Mode
        </div>

        {/* Theme Toggle */}
        <button
          onClick={() => setDarkMode(!darkMode)}
          className="w-9 h-9 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 flex items-center justify-center text-slate-300 hover:text-white transition-all hover:scale-105"
          title="Toggle color theme"
        >
          {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>

        {/* Notifications */}
        <button className="w-9 h-9 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 flex items-center justify-center text-slate-300 hover:text-white relative transition-all hover:scale-105">
          <Bell className="w-4 h-4" />
          <span className="absolute top-2 right-2 w-2 h-2 bg-accent-pink rounded-full shadow-[0_0_8px_rgba(236,72,153,0.8)]"></span>
        </button>
      </div>
    </header>
  );
};
