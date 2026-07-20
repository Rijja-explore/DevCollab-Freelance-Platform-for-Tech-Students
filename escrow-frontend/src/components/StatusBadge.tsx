import React from 'react';
import {
  ContractStatus,
  MilestoneStatus,
  TransactionStatus,
} from '../types';

interface StatusBadgeProps {
  status: ContractStatus | MilestoneStatus | TransactionStatus;
}

const statusConfig: Record<string, { dot: string; bg: string; text: string; border: string }> = {
  ACTIVE:              { dot: 'bg-emerald-400', bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/25' },
  RELEASED:            { dot: 'bg-emerald-400', bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/25' },
  SUCCESS:             { dot: 'bg-emerald-400', bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/25' },
  COMPLETED:           { dot: 'bg-emerald-400', bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/25' },
  PENDING:             { dot: 'bg-vault-amber', bg: 'bg-vault-amber/10', text: 'text-vault-amber', border: 'border-vault-amber/25' },
  IN_PROGRESS:         { dot: 'bg-vault-amber', bg: 'bg-vault-amber/10', text: 'text-vault-amber', border: 'border-vault-amber/25' },
  INITIATED:           { dot: 'bg-vault-amber', bg: 'bg-vault-amber/10', text: 'text-vault-amber', border: 'border-vault-amber/25' },
  SUBMITTED:           { dot: 'bg-sky-400',     bg: 'bg-sky-500/10',     text: 'text-sky-400',     border: 'border-sky-500/25' },
  APPROVED:            { dot: 'bg-sky-400',     bg: 'bg-sky-500/10',     text: 'text-sky-400',     border: 'border-sky-500/25' },
  PAYMENT_PROCESSING:  { dot: 'bg-vault-teal animate-pulse', bg: 'bg-vault-teal/10', text: 'text-vault-teal', border: 'border-vault-teal/25' },
  FAILED:              { dot: 'bg-accent-coral', bg: 'bg-accent-coral/10', text: 'text-accent-coral', border: 'border-accent-coral/25' },
  CANCELLED:           { dot: 'bg-accent-coral', bg: 'bg-accent-coral/10', text: 'text-accent-coral', border: 'border-accent-coral/25' },
  REFUNDED:            { dot: 'bg-accent-coral', bg: 'bg-accent-coral/10', text: 'text-accent-coral', border: 'border-accent-coral/25' },
  DISPUTED:            { dot: 'bg-vault-violet', bg: 'bg-vault-violet/10', text: 'text-vault-violet', border: 'border-vault-violet/25' },
};

const defaultConfig = { dot: 'bg-slate-400', bg: 'bg-slate-500/10', text: 'text-slate-400', border: 'border-slate-500/25' };

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const config = statusConfig[status] ?? defaultConfig;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold uppercase tracking-wide border ${config.bg} ${config.text} ${config.border}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${config.dot}`} />
      {status.replace(/_/g, ' ')}
    </span>
  );
};
