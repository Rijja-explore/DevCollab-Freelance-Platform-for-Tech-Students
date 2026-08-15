import React from 'react';
import { Database, Plus } from 'lucide-react';

interface EmptyStateProps {
  title: string;
  description: string;
  actionText?: string;
  onAction?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  actionText,
  onAction,
}) => {
  return (
    <div className="card p-12 flex flex-col items-center justify-center text-center max-w-xl mx-auto my-12 animate-slide-up border-dashed border-vault-teal/20 bg-hero-gradient">
      <div className="w-16 h-16 rounded-2xl bg-vault-teal/10 flex items-center justify-center text-vault-teal border border-vault-teal/20 mb-6">
        <Database className="w-8 h-8" />
      </div>
      <h3 className="font-display text-xl font-bold text-white mb-2">{title}</h3>
      <p className="text-sm text-slate-400 max-w-sm mb-6 leading-relaxed">
        {description}
      </p>
      {actionText && onAction && (
        <button type="button" onClick={onAction} className="btn-primary">
          <Plus className="w-4 h-4" />
          {actionText}
        </button>
      )}
    </div>
  );
};
