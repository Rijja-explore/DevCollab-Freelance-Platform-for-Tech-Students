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
    <div className="card p-12 flex flex-col items-center justify-center text-center max-w-xl mx-auto my-12 animate-fade-in border-dashed border-slate-800 bg-slate-900/30">
      <div className="w-16 h-16 rounded-2xl bg-slate-850 flex items-center justify-center text-slate-500 border border-slate-800 mb-6 group-hover:scale-105 transition-all">
        <Database className="w-8 h-8 text-slate-400" />
      </div>
      <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>
      <p className="text-sm text-slate-400 max-w-sm mb-6 leading-relaxed">
        {description}
      </p>
      {actionText && onAction && (
        <button onClick={onAction} className="btn-primary">
          <Plus className="w-4 h-4" />
          {actionText}
        </button>
      )}
    </div>
  );
};
