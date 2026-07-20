import React, { useEffect, useState } from 'react';
import { auditApi } from '../api/client';
import { useApi } from '../hooks/useApi';
import { TableSkeleton } from '../components/LoadingSkeleton';
import { format } from 'date-fns';
import { Calendar, ShieldAlert, ArrowRight, User } from 'lucide-react';

export const AuditLogs: React.FC = () => {
  const [page, setPage] = useState(0);
  const [entityType, setEntityType] = useState('');

  const {
    data: auditData,
    loading,
    execute: fetchAuditLogs,
  } = useApi<any, [number, number, string]>(auditApi.getAll);

  useEffect(() => {
    fetchAuditLogs(page, 50, entityType);
  }, [page, entityType, fetchAuditLogs]);

  const auditLogsList = auditData?.content ?? [];
  const totalPages = auditData?.totalPages ?? 1;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="page-header">
        <h1 className="page-title">Immutable Audit Trail</h1>
        <p className="page-subtitle">
          Cryptographically aligned, system-level event recording of matching events and fintech executions.
        </p>
      </div>

      {/* Filter and Search Bar */}
      <div className="card p-4 flex items-center gap-4">
        <div>
          <label className="text-xs text-slate-500 font-semibold uppercase tracking-wider block mb-1">
            Entity Filter
          </label>
          <select
            value={entityType}
            onChange={(e) => {
              setEntityType(e.target.value);
              setPage(0);
            }}
            className="bg-white/5 border border-white/10 text-xs rounded-lg px-3 py-1.5 text-slate-350 focus:outline-none focus:border-brand-500 transition-all"
          >
            <option value="">All Entities</option>
            <option value="CONTRACT">Contracts</option>
            <option value="MILESTONE">Milestones</option>
            <option value="TRANSACTION">Transactions</option>
            <option value="WEBHOOK">Webhooks</option>
          </select>
        </div>
      </div>

      {/* Main Timeline */}
      {loading ? (
        <TableSkeleton rows={5} />
      ) : auditLogsList.length === 0 ? (
        <div className="card p-12 text-center text-slate-400">
          No audit logs recorded for this category.
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="p-6">
            <div className="flow-root">
              <ul className="-mb-8">
                {auditLogsList.map((logItem: any, logIdx: number) => (
                  <li key={logItem.id}>
                    <div className="relative pb-8">
                      {logIdx !== auditLogsList.length - 1 ? (
                        <span
                          className="absolute left-4 top-4 -ml-px h-full w-0.5 bg-white/10"
                          aria-hidden="true"
                        ></span>
                      ) : null}
                      <div className="relative flex space-x-3">
                        <div>
                          <span className="h-8 w-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-slate-400">
                            <ShieldAlert className="w-4 h-4 text-brand-400" />
                          </span>
                        </div>
                        <div className="flex-1 min-w-0 pt-1.5 flex justify-between space-x-4">
                          <div>
                            <p className="text-xs font-semibold text-white">
                              {logItem.action.replace(/_/g, ' ')}
                            </p>
                            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                              {logItem.description}
                            </p>
                            <div className="flex items-center gap-2 mt-2">
                              <span className="text-[10px] bg-white/5 border border-white/10 px-2 py-0.5 rounded text-slate-450 flex items-center gap-1 font-mono">
                                <User className="w-3 h-3 text-slate-500" />
                                Actor: {logItem.actor}
                              </span>
                              <span className="text-[10px] text-slate-500 font-mono">
                                {logItem.entityType} ID: {logItem.entityId}
                              </span>
                            </div>
                          </div>
                          <div className="text-right text-[10px] whitespace-nowrap text-slate-500 font-medium">
                            <div className="flex items-center gap-1">
                              <Calendar className="w-3.5 h-3.5" />
                              {format(new Date(logItem.createdAt), 'dd MMM, HH:mm:ss')}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Pagination */}
          <div className="px-6 py-4 border-t border-white/10 flex items-center justify-between">
            <span className="text-xs text-slate-400">
              Page {page + 1} of {totalPages}
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="btn-secondary py-1 px-3 text-xs"
              >
                Previous
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                className="btn-secondary py-1 px-3 text-xs"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
