import React, { useCallback, useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { PayPalButtons, usePayPalScriptReducer } from '@paypal/react-paypal-js';
import { milestonesApi, contractsApi, transactionsApi, remindersApi } from '../api/client';
import { useApi, apiErrorMessage } from '../hooks/useApi';
import { TableSkeleton } from '../components/LoadingSkeleton';
import { StatusBadge } from '../components/StatusBadge';
import { format, formatDistanceToNow } from 'date-fns';
import {
  Calendar,
  CheckCircle,
  Play,
  ExternalLink,
  X,
  Eye,
  Send,
  AlertTriangle,
  Scale,
  Bell,
  RefreshCw,
  Mail,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { ServiceHeader } from '../components/ServiceHeader';

const isPayPalConfigured = Boolean(import.meta.env.VITE_PAYPAL_CLIENT_ID);

interface CheckoutModalProps {
  order: any;
  onClose: () => void;
  onCapture: (transactionId: string) => Promise<void>;
}

/**
 * PayPal / Escrow checkout modal.
 */
const CheckoutModal: React.FC<CheckoutModalProps> = ({ order, onClose, onCapture }) => {
  const scriptState = isPayPalConfigured
    ? usePayPalScriptReducer()
    : null;

  const isPending = scriptState ? scriptState[0].isPending : false;
  const isRejected = scriptState ? scriptState[0].isRejected : false;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="card w-full max-w-md p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        <h3 className="text-lg font-bold text-white">Complete PayPal Escrow Payment</h3>
        <p className="text-sm text-slate-400 mt-1">
          {order.title} · ${Number(order.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })} USD
        </p>

        <div className="mt-6 space-y-4">
          {order.approveUrl && (
            <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg text-xs text-amber-200">
              <p className="font-semibold mb-1">PayPal Sandbox Authorization Ready</p>
              <p className="text-slate-400 mb-2">
                Authorize this escrow milestone directly in PayPal Sandbox checkout:
              </p>
              <a
                href={order.approveUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#ffc439] hover:bg-[#f4b628] text-slate-900 font-bold rounded text-xs transition"
              >
                Proceed to PayPal Checkout
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          )}

          {isPayPalConfigured ? (
            <div className="min-h-[140px]">
              {isRejected && (
                <p className="text-sm text-rose-400 mb-3">
                  PayPal SDK failed to load. Check your network or client ID.
                </p>
              )}
              {isPending && (
                <p className="text-sm text-slate-400 mb-3">Loading PayPal Buttons...</p>
              )}
              <PayPalButtons
                forceReRender={[order.orderId]}
                createOrder={() => order.orderId}
                onApprove={async () => {
                  toast.success('Payment approved by PayPal. Capturing escrow...');
                  await onCapture(order.transactionId);
                }}
                onCancel={() => {
                  toast('Payment cancelled.', { icon: '❌' });
                  onClose();
                }}
                onError={() => {
                  toast.error('PayPal checkout encountered an issue.');
                }}
              />
            </div>
          ) : (
            <div className="text-center p-3 bg-white/5 rounded-lg">
              <p className="text-xs text-slate-400 mb-3">
                No PayPal Client ID set in frontend .env. You can capture directly in sandbox demo mode:
              </p>
            </div>
          )}

          <div className="pt-2 border-t border-white/10">
            <button
              onClick={() => onCapture(order.transactionId)}
              className="btn-primary w-full text-xs py-2 bg-emerald-600 hover:bg-emerald-500"
            >
              Verify & Complete Escrow Capture
            </button>
            <p className="text-[11px] text-slate-500 text-center mt-1.5">
              Syncs capture with the PayPal Escrow Service and unlocks workspace milestones.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

import { useAuth } from '../contexts/AuthContext';

type ActionModal =
  | { kind: 'submit'; milestone: any }
  | { kind: 'review'; milestone: any }
  | { kind: 'dispute'; milestone: any }
  | { kind: 'resolve'; milestone: any }
  | null;

const STATUS_GUIDE: { status: string; color: string; text: string }[] = [
  { status: 'PENDING', color: 'text-slate-300', text: 'Created — student can start work' },
  { status: 'IN_PROGRESS', color: 'text-sky-300', text: 'Student is working / revising' },
  { status: 'SUBMITTED', color: 'text-violet-300', text: 'Deliverable awaiting startup review' },
  { status: 'PAYMENT_PROCESSING', color: 'text-blue-300', text: 'Approved — payment released automatically, completing checkout' },
  { status: 'RELEASED', color: 'text-emerald-300', text: 'Funds released to the student' },
  { status: 'DISPUTED', color: 'text-rose-300', text: 'Frozen until an admin resolves it' },
];

const REMINDER_LABELS: Record<string, string> = {
  OVERDUE_MILESTONE: 'Overdue',
  UPCOMING_DUE_DATE: 'Due soon',
  PENDING_APPROVAL_REMINDER: 'Review needed',
  PENDING_RELEASE_REMINDER: 'Payment pending',
};

export const Milestones: React.FC = () => {
  const { role } = useAuth();
  const [searchParams] = useSearchParams();
  const contractIdParam = searchParams.get('contractId');
  const isStartup = role === 'STARTUP' || role === 'ADMIN';
  const isStudent = role === 'STUDENT';

  const [page, setPage] = useState(0);
  const [selectedContract, setSelectedContract] = useState<any>(null);
  const [paypalOrder, setPaypalOrder] = useState<any>(null);
  const [editingMilestone, setEditingMilestone] = useState<any>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editDueDate, setEditDueDate] = useState('');

  const [modal, setModal] = useState<ActionModal>(null);
  const [deliverableUrl, setDeliverableUrl] = useState('');
  const [submissionNotes, setSubmissionNotes] = useState('');
  const [feedback, setFeedback] = useState('');
  const [disputeReason, setDisputeReason] = useState('');
  const [resolution, setResolution] = useState<'RELEASE' | 'REFUND' | 'REOPEN'>('REOPEN');
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);

  const [reminders, setReminders] = useState<any[]>([]);
  const [remindersLoading, setRemindersLoading] = useState(false);
  const [scanning, setScanning] = useState(false);

  const fetchPage = useCallback(
    (p: number) => milestonesApi.getAll(p, 20, contractIdParam),
    [contractIdParam]
  );

  const {
    data: milestonesData,
    loading,
    execute: fetchMilestones,
  } = useApi<any, [number]>(fetchPage);

  const { execute: updateMilestone, loading: updating } = useApi<any, [string, any]>(
    milestonesApi.update,
    {
      successMessage: 'Milestone updated successfully.',
      onSuccess: () => {
        setEditingMilestone(null);
        fetchMilestones(page);
      },
    }
  );

  const loadReminders = useCallback(async () => {
    setRemindersLoading(true);
    try {
      const res = contractIdParam
        ? await remindersApi.getByContract(contractIdParam)
        : await remindersApi.getAll(0, 10);
      const data = res.data?.data;
      setReminders(Array.isArray(data) ? data.slice(0, 10) : data?.content ?? []);
    } catch (err) {
      console.error('Failed to load reminders', err);
      setReminders([]);
    } finally {
      setRemindersLoading(false);
    }
  }, [contractIdParam]);

  useEffect(() => {
    fetchMilestones(page).catch(() => undefined);
  }, [page, fetchMilestones]);

  useEffect(() => {
    setPage(0);
    if (contractIdParam) {
      contractsApi
        .getById(contractIdParam)
        .then((res) => setSelectedContract(res.data?.data ?? res.data))
        .catch(() => setSelectedContract(null));
    } else {
      setSelectedContract(null);
    }
  }, [contractIdParam]);

  useEffect(() => {
    loadReminders();
  }, [loadReminders]);

  const refresh = () => {
    fetchMilestones(page).catch(() => undefined);
    loadReminders();
  };

  /** Runs a milestone action with consistent busy state, toasts and refresh. */
  const runAction = async (id: string, action: () => Promise<any>, success: string) => {
    setBusyId(id);
    try {
      const res = await action();
      toast.success(res?.data?.message || success);
      setModal(null);
      refresh();
      return res?.data?.data;
    } catch (err) {
      toast.error(apiErrorMessage(err));
      return undefined;
    } finally {
      setBusyId(null);
    }
  };

  const capturePayment = async (transactionId: string) => {
    try {
      await transactionsApi.capture(transactionId);
      toast.success('Payment captured! Funds have been released to the student.');
      setPaypalOrder(null);
      refresh();
    } catch (err) {
      console.error(err);
      toast.error(apiErrorMessage(err, 'Payment capture failed. Please try again.'));
    }
  };

  /** Opens checkout for a milestone response that carries the payment order details. */
  const openCheckout = (milestone: any, data: any) => {
    if (!data?.transactionId) {
      toast.error('Payment order details are not available yet. Please refresh and try again.');
      return;
    }
    let approveUrl = data.approveUrl;
    if (approveUrl) {
      const cancelUrl = `/payment-cancel?milestoneId=${milestone.id}&title=${encodeURIComponent(milestone.title)}&amount=${milestone.amount}`;
      const returnUrl = `/payment-success?transactionId=${data.transactionId}&milestoneId=${milestone.id}`;
      approveUrl = approveUrl
        .replace(/CANCEL_URL[^&]*/g, `CANCEL_URL=${encodeURIComponent(cancelUrl)}`)
        .replace(/RETURN_URL[^&]*/g, `RETURN_URL=${encodeURIComponent(returnUrl)}`);
    }
    setPaypalOrder({
      orderId: data.providerOrderId,
      transactionId: data.transactionId,
      milestoneId: milestone.id,
      amount: milestone.amount,
      title: milestone.title,
      approveUrl,
    });
  };

  /** Approval releases the payment automatically; then open checkout to complete it. */
  const handleApprove = async (milestone: any) => {
    setBusyId(milestone.id);
    try {
      const res = await milestonesApi.approve(milestone.id);
      toast.success(res.data?.message || 'Milestone approved — payment released.');
      setModal(null);
      refresh();
      openCheckout(milestone, res.data?.data);
    } catch (err: any) {
      toast.error(apiErrorMessage(err));
      refresh();
    } finally {
      setBusyId(null);
    }
  };

  /** Retries a failed release, or resumes an open checkout. */
  const handleRelease = async (milestone: any) => {
    setBusyId(milestone.id);
    try {
      const res = await milestonesApi.release(milestone.id);
      refresh();
      openCheckout(milestone, res.data?.data);
    } catch (err) {
      toast.error(apiErrorMessage(err));
      refresh();
    } finally {
      setBusyId(null);
    }
  };

  const handleRunReminders = async () => {
    setScanning(true);
    try {
      const res = await remindersApi.trigger();
      toast.success(res.data?.data?.message || 'Reminder scan complete');
      loadReminders();
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setScanning(false);
    }
  };

  const openModal = (next: ActionModal) => {
    setDeliverableUrl(next?.milestone?.deliverableUrl || '');
    setSubmissionNotes('');
    setFeedback('');
    setDisputeReason('');
    setResolution('REOPEN');
    setResolutionNotes('');
    setModal(next);
  };

  const milestonesList = milestonesData?.content ?? milestonesData?.data?.content ?? (Array.isArray(milestonesData) ? milestonesData : []);
  const totalPages = Math.max(1, milestonesData?.totalPages ?? milestonesData?.data?.totalPages ?? 1);

  const canDispute = (m: any) => !['RELEASED', 'DISPUTED', 'PAYMENT_PROCESSING'].includes(m.status);

  const renderStartupActions = (m: any) => {
    const busy = busyId === m.id;
    return (
      <>
        {(m.status === 'PENDING' || m.status === 'IN_PROGRESS') && (
          <>
            <span className="text-[11px] text-slate-500">Awaiting deliverable</span>
            <button
              onClick={() => {
                setEditingMilestone(m);
                setEditTitle(m.title);
                setEditDescription(m.description || '');
                setEditDueDate(m.dueDate ? String(m.dueDate).split('T')[0] : '');
              }}
              className="px-2 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-slate-300 text-xs font-medium border border-white/10"
            >
              Edit
            </button>
          </>
        )}
        {m.status === 'SUBMITTED' && (
          <button
            onClick={() => openModal({ kind: 'review', milestone: m })}
            disabled={busy}
            className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-[#ffc439] to-[#f4b628] hover:brightness-105 text-slate-950 font-bold text-xs shadow-md flex items-center gap-1.5"
          >
            <Eye className="w-3.5 h-3.5" /> Review deliverable
          </button>
        )}
        {(m.status === 'APPROVED' || m.status === 'FAILED') && (
          <button
            onClick={() => handleRelease(m)}
            disabled={busy}
            className="px-3 py-1.5 rounded-xl font-bold text-xs shadow-md flex items-center gap-1.5 text-white bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 disabled:opacity-50"
          >
            <Play className="w-3 h-3 fill-current" /> Retry payment release
          </button>
        )}
        {m.status === 'PAYMENT_PROCESSING' && (
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={busy}
              onClick={() => runAction(m.id, () => milestonesApi.complete(m.id), 'Milestone completed! Funds released to student.')}
              className="px-2.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:brightness-110 text-white font-bold text-xs shadow-md flex items-center gap-1.5 disabled:opacity-50"
              title="Mark this milestone completed and release payment"
            >
              <CheckCircle className="w-3.5 h-3.5" /> Complete
            </button>
            <button
              type="button"
              onClick={() => handleRelease(m)}
              disabled={busy}
              className="px-2.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-slate-200 font-semibold text-xs border border-white/10 flex items-center gap-1"
              title="Re-open checkout for the pending payment order"
            >
              <Play className="w-3 h-3 fill-current text-amber-400" /> Checkout
            </button>
          </div>
        )}
        {m.status === 'RELEASED' && (
          <Link to="/payments" className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-400 hover:underline">
            <CheckCircle className="w-3.5 h-3.5" /> Payout disbursed
          </Link>
        )}
      </>
    );
  };

  const renderStudentActions = (m: any) => {
    const busy = busyId === m.id;
    return (
      <>
        {m.status === 'PENDING' && (
          <button
            onClick={() => runAction(m.id, () => milestonesApi.start(m.id), 'Work started on milestone')}
            disabled={busy}
            className="px-2.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-slate-200 font-semibold text-xs border border-white/10 flex items-center gap-1 disabled:opacity-50"
          >
            <Play className="w-3 h-3 fill-current" /> Start
          </button>
        )}
        {(m.status === 'PENDING' || m.status === 'IN_PROGRESS') && (
          <button
            onClick={() => openModal({ kind: 'submit', milestone: m })}
            disabled={busy}
            className="px-3 py-1.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-bold text-xs flex items-center gap-1.5 disabled:opacity-50"
          >
            <Send className="w-3.5 h-3.5" /> {m.revisionCount > 0 ? 'Resubmit' : 'Submit deliverable'}
          </button>
        )}
        {m.status === 'SUBMITTED' && <span className="text-[11px] text-violet-300">Awaiting startup review</span>}
        {(m.status === 'APPROVED' || m.status === 'PAYMENT_PROCESSING') && (
          <span className="text-[11px] text-blue-300">Approved — payment on its way</span>
        )}
        {m.status === 'FAILED' && <span className="text-[11px] text-rose-300">Payment failed — startup will retry</span>}
        {m.status === 'RELEASED' && (
          <Link to="/payments" className="text-[11px] text-emerald-400 hover:underline">✓ Paid & settled</Link>
        )}
      </>
    );
  };

  return (
    <div className="space-y-6">
      <ServiceHeader
        service="escrow"
        title="Escrow Milestones"
        subtitle="Students submit deliverables, startups review them, and approval releases the escrowed payment automatically. Automated reminders keep deadlines and pending payments moving."
      />

      {selectedContract && (
        <div className="card p-4 border border-brand-500/20 bg-brand-500/5 flex items-center justify-between">
          <div className="text-sm">
            <span className="text-slate-400">Showing milestones for contract:</span>{' '}
            <strong className="text-white">{selectedContract.title}</strong>
          </div>
          <Link to="/milestones" className="text-xs text-brand-400 hover:underline">
            Show all
          </Link>
        </div>
      )}

      {/* Workflow guide */}
      <div className="card p-4 border border-emerald-500/20 bg-emerald-500/5">
        <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-wider mb-2">Milestone workflow</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-2 text-xs">
          {STATUS_GUIDE.map((g) => (
            <div key={g.status} className="p-2 rounded bg-white/5">
              <div className={`font-semibold ${g.color}`}>{g.status.replace('_', ' ')}</div>
              <div className="text-slate-500 text-[10px]">{g.text}</div>
            </div>
          ))}
        </div>
      </div>

      {loading && milestonesList.length === 0 ? (
        <TableSkeleton rows={4} />
      ) : milestonesList.length === 0 ? (
        <div className="card p-12 text-center text-slate-400">No milestones found.</div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px]">
              <thead>
                <tr className="bg-white/5 border-b border-white/10">
                  <th className="table-header">#</th>
                  <th className="table-header">Title & Deliverable</th>
                  <th className="table-header">Contract</th>
                  <th className="table-header">Amount</th>
                  <th className="table-header">Status</th>
                  <th className="table-header">Due Date</th>
                  <th className="table-header text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {milestonesList.map((milestone: any) => {
                  const overdue =
                    milestone.dueDate &&
                    ['PENDING', 'IN_PROGRESS'].includes(milestone.status) &&
                    new Date(milestone.dueDate) < new Date(new Date().toDateString());
                  return (
                    <tr key={milestone.id} className="table-row align-top">
                      <td className="table-cell font-bold text-slate-400">#{milestone.sequenceOrder}</td>
                      <td className="table-cell">
                        <div className="font-semibold text-slate-200">{milestone.title}</div>
                        {milestone.description && (
                          <div className="text-xs text-slate-500 mt-0.5 truncate max-w-xs">{milestone.description}</div>
                        )}
                        {milestone.deliverableUrl && (
                          <a
                            href={milestone.deliverableUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-[11px] text-brand-400 hover:underline inline-flex items-center gap-1 mt-1"
                          >
                            <ExternalLink className="w-3 h-3" /> Deliverable
                          </a>
                        )}
                        {milestone.status === 'IN_PROGRESS' && milestone.reviewFeedback && (
                          <div className="mt-1.5 text-[11px] text-amber-300 max-w-xs">
                            <span className="font-semibold">Changes requested:</span> {milestone.reviewFeedback}
                          </div>
                        )}
                        {milestone.status === 'DISPUTED' && milestone.disputeReason && (
                          <div className="mt-1.5 text-[11px] text-rose-300 max-w-xs">
                            <span className="font-semibold">Dispute:</span> {milestone.disputeReason}
                          </div>
                        )}
                      </td>
                      <td className="table-cell font-mono text-xs text-slate-400">
                        <Link to={`/milestones?contractId=${milestone.contractId}`} className="hover:text-brand-400">
                          {String(milestone.contractId).slice(0, 8)}…
                        </Link>
                      </td>
                      <td className="table-cell text-white font-medium whitespace-nowrap">
                        ${Number(milestone.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="table-cell">
                        <StatusBadge status={milestone.status} />
                        {milestone.revisionCount > 0 && (
                          <div className="text-[10px] text-slate-500 mt-1">
                            {milestone.revisionCount} revision{milestone.revisionCount > 1 ? 's' : ''}
                          </div>
                        )}
                      </td>
                      <td className={`table-cell text-xs ${overdue ? 'text-rose-400 font-semibold' : 'text-slate-400'}`}>
                        {milestone.dueDate ? (
                          <div className="flex items-center gap-1.5 whitespace-nowrap">
                            <Calendar className="w-3.5 h-3.5" />
                            {format(new Date(milestone.dueDate), 'dd MMM yyyy')}
                            {overdue && <span className="text-[10px]">· overdue</span>}
                          </div>
                        ) : (
                          '--'
                        )}
                      </td>
                      <td className="table-cell text-right">
                        <div className="flex items-center justify-end gap-2 flex-wrap">
                          {isStartup ? renderStartupActions(milestone) : isStudent ? renderStudentActions(milestone) : null}
                          {milestone.status === 'DISPUTED' && role === 'ADMIN' && (
                            <button
                              onClick={() => openModal({ kind: 'resolve', milestone })}
                              className="px-2.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center gap-1"
                            >
                              <Scale className="w-3.5 h-3.5" /> Resolve
                            </button>
                          )}
                          {milestone.status === 'DISPUTED' && role !== 'ADMIN' && (
                            <span className="text-[11px] text-rose-300">Awaiting admin decision</span>
                          )}
                          {(isStartup || isStudent) && canDispute(milestone) && (
                            <button
                              onClick={() => openModal({ kind: 'dispute', milestone })}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10"
                              title="Raise a dispute"
                              aria-label="Raise a dispute"
                            >
                              <AlertTriangle className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="px-6 py-4 border-t border-white/10 flex items-center justify-between">
            <span className="text-xs text-slate-400">
              Page {page + 1} of {totalPages}
            </span>
            <div className="flex items-center gap-2">
              <button onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0} className="btn-secondary py-1 px-3 text-xs">
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

      {/* Payment reminders */}
      <div className="card p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Bell className="w-4 h-4 text-amber-400" /> Payment reminders
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              A daily scheduled job emails reminders for upcoming and overdue deadlines, deliverables awaiting review, and
              approved payments that haven't completed.
            </p>
          </div>
          {isStartup && (
            <button onClick={handleRunReminders} disabled={scanning} className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5">
              <RefreshCw className={`w-3.5 h-3.5 ${scanning ? 'animate-spin' : ''}`} />
              {scanning ? 'Checking…' : 'Run reminder check now'}
            </button>
          )}
        </div>
        {remindersLoading ? (
          <div className="h-16 rounded-xl bg-white/5 animate-pulse" />
        ) : reminders.length === 0 ? (
          <p className="text-xs text-slate-500">No reminders have been sent{contractIdParam ? ' for this contract' : ''} yet.</p>
        ) : (
          <ul className="divide-y divide-white/5">
            {reminders.map((r) => (
              <li key={r.id} className="py-3 flex flex-col sm:flex-row sm:items-start gap-2 justify-between">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-300 border border-amber-500/20">
                      {REMINDER_LABELS[r.reminderType] ?? r.reminderType}
                    </span>
                    <span className="text-xs font-semibold text-slate-200">{r.subject}</span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">{r.message}</p>
                </div>
                <div className="text-[10px] text-slate-500 sm:text-right shrink-0 flex sm:flex-col gap-2 sm:gap-0.5">
                  {r.sentAt && <span>{formatDistanceToNow(new Date(r.sentAt), { addSuffix: true })}</span>}
                  <span className="inline-flex items-center gap-1">
                    <Mail className="w-3 h-3" />
                    {r.status === 'SENT' ? `Emailed ${r.recipientEmail ?? ''}` : r.status === 'FAILED' ? 'Email failed' : 'In-app only'}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {paypalOrder && (
        <CheckoutModal order={paypalOrder} onClose={() => setPaypalOrder(null)} onCapture={capturePayment} />
      )}

      {/* Workflow action modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={() => setModal(null)}>
          <div className="card w-full max-w-lg p-6 relative" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
            <button onClick={() => setModal(null)} className="absolute top-4 right-4 text-slate-400 hover:text-white" aria-label="Close">
              <X className="w-5 h-5" />
            </button>
            <p className="text-xs text-slate-500">
              Milestone #{modal.milestone.sequenceOrder} · ${Number(modal.milestone.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </p>
            <h3 className="text-lg font-bold text-white">{modal.milestone.title}</h3>

            {modal.kind === 'submit' && (
              <form
                className="mt-5 space-y-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  runAction(
                    modal.milestone.id,
                    () => milestonesApi.submit(modal.milestone.id, {
                      deliverableUrl: deliverableUrl.trim() || undefined,
                      submissionNotes: submissionNotes.trim() || undefined,
                    }),
                    'Deliverable submitted for review'
                  );
                }}
              >
                {modal.milestone.reviewFeedback && (
                  <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-200">
                    <span className="font-semibold">Requested changes:</span> {modal.milestone.reviewFeedback}
                  </div>
                )}
                <div>
                  <label className="label">Deliverable link *</label>
                  <input
                    type="url"
                    required
                    value={deliverableUrl}
                    onChange={(e) => setDeliverableUrl(e.target.value)}
                    className="input"
                    placeholder="https://github.com/org/repo/pull/12"
                  />
                </div>
                <div>
                  <label className="label">Notes for the reviewer</label>
                  <textarea
                    value={submissionNotes}
                    onChange={(e) => setSubmissionNotes(e.target.value)}
                    rows={3}
                    className="input py-2"
                    placeholder="What was delivered, how to test it…"
                  />
                </div>
                <div className="flex justify-end gap-3 pt-2">
                  <button type="button" onClick={() => setModal(null)} className="btn-secondary">Cancel</button>
                  <button type="submit" disabled={busyId === modal.milestone.id} className="btn-primary">
                    {busyId === modal.milestone.id ? 'Submitting…' : 'Submit for review'}
                  </button>
                </div>
              </form>
            )}

            {modal.kind === 'review' && (
              <div className="mt-5 space-y-4">
                <div className="p-3 rounded-lg bg-white/5 space-y-2 text-xs">
                  {modal.milestone.deliverableUrl ? (
                    <a href={modal.milestone.deliverableUrl} target="_blank" rel="noreferrer" className="text-brand-400 hover:underline inline-flex items-center gap-1 break-all">
                      <ExternalLink className="w-3.5 h-3.5 shrink-0" /> {modal.milestone.deliverableUrl}
                    </a>
                  ) : (
                    <span className="text-slate-500">No deliverable link provided.</span>
                  )}
                  {modal.milestone.submissionNotes && <p className="text-slate-300 whitespace-pre-line">{modal.milestone.submissionNotes}</p>}
                  {modal.milestone.submittedAt && (
                    <p className="text-[10px] text-slate-500">Submitted {formatDistanceToNow(new Date(modal.milestone.submittedAt), { addSuffix: true })}</p>
                  )}
                </div>
                <div>
                  <label className="label">Feedback (required to request changes)</label>
                  <textarea
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    rows={3}
                    className="input py-2"
                    placeholder="What needs to change before you approve?"
                  />
                </div>
                <p className="text-[11px] text-slate-400">
                  Approving releases ${Number(modal.milestone.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })} from escrow to the student.
                </p>
                <div className="flex flex-col sm:flex-row justify-end gap-3 pt-2">
                  <button
                    type="button"
                    disabled={busyId === modal.milestone.id || !feedback.trim()}
                    onClick={() =>
                      runAction(modal.milestone.id, () => milestonesApi.requestChanges(modal.milestone.id, feedback.trim()), 'Changes requested')
                    }
                    className="btn-secondary disabled:opacity-50"
                  >
                    Request changes
                  </button>
                  <button
                    type="button"
                    disabled={busyId === modal.milestone.id}
                    onClick={() => handleApprove(modal.milestone)}
                    className="btn-primary bg-emerald-600 hover:bg-emerald-500"
                  >
                    {busyId === modal.milestone.id ? 'Releasing…' : 'Approve & release payment'}
                  </button>
                </div>
              </div>
            )}

            {modal.kind === 'dispute' && (
              <form
                className="mt-5 space-y-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  runAction(modal.milestone.id, () => milestonesApi.dispute(modal.milestone.id, disputeReason.trim()), 'Dispute raised');
                }}
              >
                <p className="text-xs text-slate-400">
                  A dispute freezes this milestone and its contract until an admin resolves it.
                </p>
                <div>
                  <label className="label">Reason *</label>
                  <textarea
                    required
                    value={disputeReason}
                    onChange={(e) => setDisputeReason(e.target.value)}
                    rows={3}
                    className="input py-2"
                    placeholder="Describe the problem"
                  />
                </div>
                <div className="flex justify-end gap-3 pt-2">
                  <button type="button" onClick={() => setModal(null)} className="btn-secondary">Cancel</button>
                  <button type="submit" disabled={busyId === modal.milestone.id || !disputeReason.trim()} className="btn-primary bg-rose-600 hover:bg-rose-500">
                    Raise dispute
                  </button>
                </div>
              </form>
            )}

            {modal.kind === 'resolve' && (
              <form
                className="mt-5 space-y-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  runAction(
                    modal.milestone.id,
                    () => milestonesApi.resolveDispute(modal.milestone.id, resolution, resolutionNotes.trim() || undefined),
                    'Dispute resolved'
                  );
                }}
              >
                {modal.milestone.disputeReason && (
                  <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-xs text-rose-200">
                    {modal.milestone.disputeReason}
                  </div>
                )}
                <div className="space-y-2">
                  {([
                    ['REOPEN', 'Reopen — send back to the student to continue work'],
                    ['RELEASE', 'Release — approve and pay the student'],
                    ['REFUND', 'Refund — mark the payment as failed / not owed'],
                  ] as const).map(([value, text]) => (
                    <label key={value} className="flex items-start gap-2 text-xs text-slate-300 cursor-pointer">
                      <input type="radio" name="resolution" checked={resolution === value} onChange={() => setResolution(value)} className="mt-0.5" />
                      {text}
                    </label>
                  ))}
                </div>
                <div>
                  <label className="label">Notes</label>
                  <textarea value={resolutionNotes} onChange={(e) => setResolutionNotes(e.target.value)} rows={2} className="input py-2" />
                </div>
                <div className="flex justify-end gap-3 pt-2">
                  <button type="button" onClick={() => setModal(null)} className="btn-secondary">Cancel</button>
                  <button type="submit" disabled={busyId === modal.milestone.id} className="btn-primary">Resolve dispute</button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Edit Milestone Modal */}
      {editingMilestone && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="card w-full max-w-md p-6 relative">
            <button onClick={() => setEditingMilestone(null)} className="absolute top-4 right-4 text-slate-400 hover:text-white" aria-label="Close">
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-bold text-white">Edit Milestone</h3>
            <p className="text-sm text-slate-400 mt-1">Update milestone details (Sequence #{editingMilestone.sequenceOrder})</p>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!editTitle.trim()) {
                  toast.error('Title is required');
                  return;
                }
                updateMilestone(editingMilestone.id, {
                  title: editTitle,
                  description: editDescription,
                  dueDate: editDueDate || undefined,
                }).catch(() => undefined);
              }}
              className="mt-6 space-y-4"
            >
              <div>
                <label className="label">Title *</label>
                <input type="text" required value={editTitle} onChange={(e) => setEditTitle(e.target.value)} className="input" placeholder="Milestone title" />
              </div>
              <div>
                <label className="label">Description</label>
                <textarea value={editDescription} onChange={(e) => setEditDescription(e.target.value)} rows={3} className="input py-2" placeholder="Milestone description" />
              </div>
              <div>
                <label className="label">Due Date</label>
                <input
                  type="date"
                  value={editDueDate}
                  onChange={(e) => setEditDueDate(e.target.value)}
                  className="input"
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>
              <div className="pt-4 border-t border-white/10 flex items-center justify-end gap-3">
                <button type="button" onClick={() => setEditingMilestone(null)} className="btn-secondary">Cancel</button>
                <button type="submit" disabled={updating} className="btn-primary">
                  {updating ? 'Updating...' : 'Update Milestone'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
