import React from 'react';
import { LucideIcon, TrendingUp, TrendingDown } from 'lucide-react';

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
  accent?: 'teal' | 'coral' | 'violet' | 'amber';
}

const accentStyles = {
  teal:   { ring: 'bg-vault-teal',   icon: 'text-vault-teal bg-vault-teal/10 border-vault-teal/20' },
  coral:  { ring: 'bg-accent-coral', icon: 'text-accent-coral bg-accent-coral/10 border-accent-coral/20' },
  violet: { ring: 'bg-vault-violet', icon: 'text-vault-violet bg-vault-violet/10 border-vault-violet/20' },
  amber:  { ring: 'bg-vault-amber',  icon: 'text-vault-amber bg-vault-amber/10 border-vault-amber/20' },
};

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  description,
  icon: Icon,
  trend,
  loading = false,
  accent = 'teal',
}) => {
  const styles = accentStyles[accent];

  if (loading) {
    return (
      <div className="card p-6 flex flex-col justify-between h-40 relative overflow-hidden">
        <div className="space-y-3">
          <div className="skeleton w-28 h-3" />
          <div className="skeleton w-32 h-9" />
        </div>
        <div className="skeleton w-40 h-3" />
        <div className="absolute right-5 top-5 w-11 h-11 rounded-xl skeleton" />
      </div>
    );
  }

  return (
    <div className="card-hover p-6 flex flex-col justify-between h-40 relative group overflow-hidden">
      <div className={`stat-ring ${styles.ring}`} />

      <div className="relative z-10">
        <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest">
          {title}
        </span>
        <h2 className="font-display text-3xl font-bold text-white mt-1.5 tracking-tight group-hover:gradient-text transition-all duration-300">
          {value}
        </h2>
      </div>

      <div className="flex items-center gap-2 mt-3 relative z-10">
        {trend && (
          <span
            className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-md ${
              trend.isPositive
                ? 'text-vault-teal bg-vault-teal/10'
                : 'text-accent-coral bg-accent-coral/10'
            }`}
          >
            {trend.isPositive ? (
              <TrendingUp className="w-3 h-3" />
            ) : (
              <TrendingDown className="w-3 h-3" />
            )}
            {trend.value}
          </span>
        )}
        {description && (
          <span className="text-[11px] text-slate-500 truncate">{description}</span>
        )}
      </div>

      <div
        className={`absolute right-5 top-5 w-11 h-11 rounded-xl border flex items-center justify-center transition-all duration-300 group-hover:scale-110 ${styles.icon}`}
      >
        <Icon className="w-5 h-5" />
      </div>
    </div>
  );
};
