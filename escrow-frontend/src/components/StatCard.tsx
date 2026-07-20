import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon: LucideIcon;
  trend?: {
    value: string;
    isPositive: boolean;
  };
  loading?: boolean;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  description,
  icon: Icon,
  trend,
  loading = false,
}) => {
  if (loading) {
    return (
      <div className="card p-6 flex flex-col justify-between h-36 relative overflow-hidden">
        <div className="space-y-3">
          <div className="skeleton w-24 h-4 bg-slate-800" />
          <div className="skeleton w-36 h-8 bg-slate-800" />
        </div>
        <div className="skeleton w-44 h-3 bg-slate-800" />
        <div className="absolute right-6 top-6 w-10 h-10 rounded-lg bg-slate-800 skeleton" />
      </div>
    );
  }

  return (
    <div className="card p-6 flex flex-col justify-between h-36 transition-all duration-300 hover:border-white/15 hover:shadow-2xl hover:shadow-black/20 hover:-translate-y-1 relative group bg-surface-card backdrop-blur-xl border-surface-border">
      <div>
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
          {title}
        </span>
        <h2 className="text-3xl font-bold text-white mt-1 group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-brand-400 group-hover:to-accent-blue transition-colors duration-300">
          {value}
        </h2>
      </div>

      <div className="flex items-center gap-2 mt-4">
        {trend && (
          <span
            className={`text-xs font-semibold ${
              trend.isPositive ? 'text-emerald-500' : 'text-rose-500'
            }`}
          >
            {trend.value}
          </span>
        )}
        {description && <span className="text-xs text-slate-500">{description}</span>}
      </div>

      <div className="absolute right-6 top-6 w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center border border-white/5 text-brand-400 group-hover:text-white group-hover:border-brand-500/50 group-hover:bg-brand-500/20 group-hover:shadow-[0_0_20px_rgba(139,92,246,0.3)] transition-all duration-300">
        <Icon className="w-6 h-6" />
      </div>
    </div>
  );
};
