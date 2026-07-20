import React, { useEffect, useState } from 'react';
import { transactionsApi } from '../api/client';
import { useApi } from '../hooks/useApi';
import { TableSkeleton } from '../components/LoadingSkeleton';
import { StatusBadge } from '../components/StatusBadge';
import { format } from 'date-fns';
import { Calendar, Search, DollarSign } from 'lucide-react';

export const Transactions: React.FC = () => {
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState('');

  const {
    data: transactionsData,
    loading,
    execute: fetchTransactions,
  } = useApi<any, [number]>(transactionsApi.getAll);

  useEffect(() => {
    fetchTransactions(page);
  }, [page, fetchTransactions]);

  const transactionsList = transactionsData?.content ?? [];
  const totalPages = transactionsData?.totalPages ?? 1;

  const filteredTransactions = transactionsList.filter(
    (tx: any) =>
      tx.providerOrderId?.toLowerCase().includes(search.toLowerCase()) ||
      tx.providerPaymentId?.toLowerCase().includes(search.toLowerCase()) ||
      tx.id.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="page-header">
        <h1 className="page-title">Transactions Ledger</h1>
        <p className="page-subtitle">Historical log of all payment transfers initiated, capture results, and provider orders.</p>
      </div>

      {/* Filter and Search Bar */}
      <div className="card p-4 flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by order ID, payment ID, transaction ID..."
            className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-2 text-sm text-slate-300 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-all"
          />
        </div>
      </div>

      {/* Main Table */}
      {loading ? (
        <TableSkeleton rows={5} />
      ) : filteredTransactions.length === 0 ? (
        <div className="card p-12 text-center text-slate-400">
          No transactions found or matches the query.
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px]">
              <thead>
                <tr className="bg-white/5 border-b border-white/10">
                  <th className="table-header">Transaction ID</th>
                  <th className="table-header">Razorpay Order ID</th>
                  <th className="table-header">Razorpay Payment ID</th>
                  <th className="table-header">Amount</th>
                  <th className="table-header">Status</th>
                  <th className="table-header">Created At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {filteredTransactions.map((tx: any) => (
                  <tr key={tx.id} className="table-row">
                    <td className="table-cell font-mono text-xs text-slate-400">
                      {tx.id}
                    </td>
                    <td className="table-cell font-mono text-xs text-slate-300">
                      {tx.providerOrderId ?? '--'}
                    </td>
                    <td className="table-cell font-mono text-xs text-slate-300">
                      {tx.providerPaymentId ?? (
                        <span className="text-slate-500 italic text-[11px]">waiting capture</span>
                      )}
                    </td>
                    <td className="table-cell text-white font-medium">
                      ₹{tx.amount.toLocaleString('en-IN')}
                    </td>
                    <td className="table-cell">
                      <StatusBadge status={tx.status} />
                    </td>
                    <td className="table-cell text-slate-400 text-xs font-medium">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-slate-500" />
                        {format(new Date(tx.createdAt), 'dd MMM yyyy HH:mm')}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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
