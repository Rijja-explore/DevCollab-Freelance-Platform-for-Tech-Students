import React from 'react';
import {
  ContractStatus,
  MilestoneStatus,
  TransactionStatus,
} from '../types';

interface StatusBadgeProps {
  status: ContractStatus | MilestoneStatus | TransactionStatus;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const getStyles = () => {
    switch (status) {
      // Successful/Released states
      case 'ACTIVE':
      case 'RELEASED':
      case 'SUCCESS':
      case 'COMPLETED':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';

      // Pending/Action-needed states
      case 'PENDING':
      case 'IN_PROGRESS':
      case 'INITIATED':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/20';

      // Intermediate action states
      case 'SUBMITTED':
      case 'APPROVED':
        return 'bg-sky-500/10 text-sky-400 border-sky-500/20';

      case 'PAYMENT_PROCESSING':
        return 'bg-brand-500/10 text-brand-400 border-brand-500/20 animate-pulse';

      // Negative states
      case 'FAILED':
      case 'CANCELLED':
      case 'REFUNDED':
        return 'bg-rose-500/10 text-rose-400 border-rose-500/20';

      case 'DISPUTED':
        return 'bg-purple-500/10 text-purple-400 border-purple-500/20';

      default:
        return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
    }
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${getStyles()}`}
    >
      {status.replace('_', ' ')}
    </span>
  );
};
