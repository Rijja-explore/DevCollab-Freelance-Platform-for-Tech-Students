import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { transactionsApi } from '../api/client';
import { useApi } from '../hooks/useApi';
import { DetailSkeleton } from '../components/LoadingSkeleton';
import { StatusBadge } from '../components/StatusBadge';
import { format } from 'date-fns';
import { ArrowLeft, CreditCard, ShieldCheck, HelpCircle } from 'lucide-react';

export const PaymentDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();

  const {
    data: tx,
    loading,
    execute: fetchTransaction,
  } = useApi<any, [string]>(transactionsApi.getById);

  useEffect(() => {
    if (id) fetchTransaction(id);
  }, [id, fetchTransaction]);

  if (loading) return <DetailSkeleton />;

  if (!tx) {
    return (
      <div className="card p-12 text-center text-slate-400">
        Transaction details could not be found or retrieved.
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Back Link */}
      <Link
        to="/transactions"
        className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Ledger
      </Link>

      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <span className="text-[10px] bg-white/5 border border-white/10 px-2 py-0.5 rounded text-slate-450 uppercase tracking-wide">
            Provider: {tx.provider}
          </span>
          <h1 className="text-xl font-bold text-white mt-1.5 flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-brand-400" />
            Transaction Details
          </h1>
        </div>
        <StatusBadge status={tx.status} />
      </div>

      {/* Primary Detail Card */}
      <div className="card p-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-brand-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative z-10">
          <div>
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">
              Total Amount
            </span>
            <div className="text-4xl font-extrabold text-white mt-1">
              ₹{tx.amount.toLocaleString('en-IN')}{' '}
              <span className="text-sm font-semibold text-slate-400">{tx.currency}</span>
            </div>
            {tx.completedAt && (
              <span className="text-xs text-slate-500 mt-2 block">
                Settled on {format(new Date(tx.completedAt), 'dd MMM yyyy, HH:mm')}
              </span>
            )}
          </div>

          <div className="space-y-4">
            <div>
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">
                Internal Transaction UUID
              </span>
              <span className="text-xs font-mono text-slate-350">{tx.id}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">
                Milestone Associated
              </span>
              <Link
                to={`/milestones?id=${tx.milestoneId}`}
                className="text-xs text-brand-400 hover:underline font-mono"
              >
                {tx.milestoneId}
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Security Credentials Verification Area */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="card p-6 space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            Payment Provider Identifiers
          </h3>
          <div className="space-y-3 text-xs">
            <div className="flex items-center justify-between py-1 border-b border-white/10">
              <span className="text-slate-500">Razorpay Order ID</span>
              <span className="font-mono text-slate-300">{tx.providerOrderId ?? '--'}</span>
            </div>
            <div className="flex items-center justify-between py-1 border-b border-white/10">
              <span className="text-slate-500">Razorpay Payment ID</span>
              <span className="font-mono text-slate-300">{tx.providerPaymentId ?? '--'}</span>
            </div>
            <div className="flex items-center justify-between py-1">
              <span className="text-slate-500">Captured Status</span>
              <span className="font-semibold text-slate-300 uppercase">{tx.status}</span>
            </div>
          </div>
        </div>

        <div className="card p-6 space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
            <HelpCircle className="w-4 h-4 text-brand-500" />
            Fintech Webhook Compliance
          </h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Payment capture matches are received asynchronously via active HMAC webhooks. Signature verify
            guarantees that all events originate directly from Razorpay Test servers.
          </p>
          {tx.failureReason && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs rounded-lg">
              <strong>Failure Cause:</strong> {tx.failureReason}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
