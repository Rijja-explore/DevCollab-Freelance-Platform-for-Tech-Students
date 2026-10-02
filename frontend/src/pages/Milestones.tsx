import React, { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { PayPalButtons, usePayPalScriptReducer } from '@paypal/react-paypal-js';
import { milestonesApi, contractsApi, transactionsApi } from '../api/client';
import { useApi } from '../hooks/useApi';
import { TableSkeleton } from '../components/LoadingSkeleton';
import { StatusBadge } from '../components/StatusBadge';
import { format } from 'date-fns';
import {
  Calendar,
  CheckCircle,
  Play,
  ExternalLink,
  X,
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

export const Milestones: React.FC = () => {
  const { role } = useAuth();
  const [searchParams] = useSearchParams();
  const contractIdParam = searchParams.get('contractId');

  const [page, setPage] = useState(0);
  const [selectedContract, setSelectedContract] = useState<any>(null);
  const [paypalOrder, setPaypalOrder] = useState<any>(null);
  const [editingMilestone, setEditingMilestone] = useState<any>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editDueDate, setEditDueDate] = useState('');

  const {
    data: milestonesData,
    loading,
    execute: fetchMilestones,
  } = useApi<any, [number]>(milestonesApi.getAll);

  const { execute: approveMilestone, loading: approving } = useApi<any, [string]>(
    milestonesApi.approve,
    {
      successMessage: 'Milestone approved. You can now fund this milestone via PayPal.',
    }
  );

  const { execute: releaseMilestone, loading: releasing } = useApi<any, [string]>(
    milestonesApi.release,
    {
      successMessage: 'PayPal payment order created. Complete the checkout to release funds to student.',
    }
  );

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

  useEffect(() => {
    fetchMilestones(page);
    if (contractIdParam) {
      contractsApi.getById(contractIdParam).then((res) => {
        setSelectedContract(res.data?.data ?? res.data);
      });
    }
  }, [page, contractIdParam, fetchMilestones]);

  const capturePayment = async (transactionId: string) => {
    try {
      await transactionsApi.capture(transactionId);
      toast.success('Payment captured! Funds have been released to the student.');
      setPaypalOrder(null);
      fetchMilestones(page);
    } catch (err) {
      console.error(err);
      toast.error('Payment capture failed. Please check PayPal Sandbox or try again.');
    }
  };

  const handlePay = async (milestoneId: string, amount: number, contractTitle: string) => {
    try {
      console.log(`[handlePay] Starting payment for milestone: ${milestoneId}, amount: ${amount}, title: ${contractTitle}`)
      
      const milestoneRes = await releaseMilestone(milestoneId);
      const milestoneData = milestoneRes?.data ?? milestoneRes;

      console.log('[handlePay] Milestone release response:', milestoneData);

      let orderId = milestoneData?.providerOrderId;
      let transactionId = milestoneData?.transactionId;
      
      console.log(`[handlePay] Got orderId: ${orderId}, transactionId: ${transactionId}`)
      
      if (!orderId || !transactionId) {
        console.log('[handlePay] Order or transaction ID missing, fetching from transactions API...');
        try {
          const txs = await transactionsApi.getAll(0, 50);
          const all = txs.data?.data?.content ?? txs.data?.content ?? txs.data?.data ?? [];
          console.log(`[handlePay] Found ${all.length} transactions, filtering for milestoneId: ${milestoneId}`)
          
          const tx = all
            .filter((t: any) => t.milestoneId === milestoneId)
            .sort((a: any, b: any) =>
              new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
            )[0];
          
          if (tx) {
            orderId = tx?.providerOrderId;
            transactionId = tx?.id;
            console.log('[handlePay] Retrieved transaction:', tx);
          } else {
            console.warn('[handlePay] No transaction found for this milestone')
          }
        } catch (txErr) {
          console.error('[handlePay] Error fetching transactions:', txErr)
        }
      }

      if (!orderId || !transactionId) {
        // Order creation succeeded but we couldn't retrieve the IDs
        // This might be a timing issue, so just warn and don't block the UI
        console.warn(`[handlePay] Could not retrieve orderId or transactionId - order may have been created but details not yet available`);
        toast('Payment order created but details loading. Please wait a moment...', { icon: '⏳' });
        
        // Try again after a delay
        setTimeout(() => {
          handlePay(milestoneId, amount, contractTitle);
        }, 2000);
        return;
      }

      let approveUrl = milestoneData?.approveUrl || milestoneData?.data?.approveUrl;
      
      console.log(`[handlePay] Setting PayPal order with orderId: ${orderId}, transactionId: ${transactionId}, approveUrl: ${!!approveUrl}`)
      
      // Add cancel and return URLs with milestone info for retry functionality
      if (approveUrl) {
        const cancelUrl = `/payment-cancel?milestoneId=${milestoneId}&title=${encodeURIComponent(contractTitle)}&amount=${amount}`;
        const returnUrl = `/payment-success?transactionId=${transactionId}&milestoneId=${milestoneId}`;
        
        // Update URLs in approveUrl if needed
        approveUrl = approveUrl
          .replace(/CANCEL_URL[^&]*/g, `CANCEL_URL=${encodeURIComponent(cancelUrl)}`)
          .replace(/RETURN_URL[^&]*/g, `RETURN_URL=${encodeURIComponent(returnUrl)}`);
      }

      // Set the order to open the modal
      setPaypalOrder({
        orderId,
        transactionId,
        milestoneId,
        amount,
        title: contractTitle,
        approveUrl,
      });
      
      console.log('[handlePay] PayPal order set, modal should open')
    } catch (err: any) {
      console.error('[handlePay] Payment checkout error:', err);
      const errorMessage = err.message || 'Failed to trigger payment checkout flow';
      toast.error(errorMessage);
      setPaypalOrder(null);
    }
  };

  const handleApprove = async (id: string) => {
    await approveMilestone(id);
    fetchMilestones(page);
  };

  const milestonesList = milestonesData?.content ?? milestonesData?.data?.content ?? (Array.isArray(milestonesData) ? milestonesData : []);
  const totalPages = milestonesData?.totalPages ?? milestonesData?.data?.totalPages ?? 1;

  // Filter milestones if contractId parameter is present
  const filteredMilestones = contractIdParam
    ? milestonesList.filter((m: any) => m.contractId === contractIdParam)
    : milestonesList;

  return (
    <div className="space-y-6">
      {/* Service 3 Escrow Banner */}
      <ServiceHeader
        service="escrow"
        title="Escrow Milestones & PayPal Checkout"
        subtitle="Track project deliverables, initiate PayPal sandbox order authorizations, and capture milestone disbursements. Students are notified automatically when payments are released."
      />

      {selectedContract && (
        <div className="card p-4 border border-brand-500/20 bg-brand-500/5 flex items-center justify-between">
          <div className="text-sm">
            <span className="text-slate-400">Filtering milestones for contract:</span>{' '}
            <strong className="text-white">{selectedContract.title}</strong>
          </div>
          <Link to="/milestones" className="text-xs text-brand-400 hover:underline">
            Show All
          </Link>
        </div>
      )}

      {/* Payment Status Guide */}
      <div className="card p-4 border border-emerald-500/20 bg-emerald-500/5">
        <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-wider mb-2">Payment Status Guide</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-2 text-xs">
          <div className="p-2 rounded bg-white/5">
            <div className="font-semibold text-slate-300">PENDING</div>
            <div className="text-slate-500 text-[10px]">Milestone created, waiting for approval</div>
          </div>
          <div className="p-2 rounded bg-white/5">
            <div className="font-semibold text-amber-300">APPROVED</div>
            <div className="text-slate-500 text-[10px]">Ready for payment, startup can fund</div>
          </div>
          <div className="p-2 rounded bg-white/5">
            <div className="font-semibold text-blue-300">PAYMENT_PROCESSING</div>
            <div className="text-slate-500 text-[10px]">Payment initiated, processing via PayPal</div>
          </div>
          <div className="p-2 rounded bg-white/5">
            <div className="font-semibold text-emerald-300">RELEASED</div>
            <div className="text-slate-500 text-[10px]">Payment completed, funds released to student</div>
          </div>
        </div>
        <p className="text-[10px] text-slate-500 mt-2">
          Students receive automatic notifications when payments reach RELEASED status.
          Check the <Link to="/transactions" className="text-brand-400 hover:underline">Transactions</Link> page for payment history.
        </p>
      </div>

      {/* Main Table */}
      {loading ? (
        <TableSkeleton rows={4} />
      ) : filteredMilestones.length === 0 ? (
        <div className="card p-12 text-center text-slate-400">
          No milestones registered or matching filters.
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px]">
              <thead>
                <tr className="bg-white/5 border-b border-white/10">
                  <th className="table-header">Sequence</th>
                  <th className="table-header">Title & Description</th>
                  <th className="table-header">Contract ID</th>
                  <th className="table-header">Amount</th>
                  <th className="table-header">Status</th>
                  <th className="table-header">Due Date</th>
                  <th className="table-header text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {filteredMilestones.map((milestone: any) => (
                  <tr key={milestone.id} className="table-row">
                    <td className="table-cell font-bold text-slate-400">
                      #{milestone.sequenceOrder}
                    </td>
                    <td className="table-cell">
                      <div>
                        <div className="font-semibold text-slate-200">{milestone.title}</div>
                        <div className="text-xs text-slate-500 mt-0.5 truncate max-w-xs">
                          {milestone.description}
                        </div>
                      </div>
                    </td>
                    <td className="table-cell font-mono text-xs text-slate-400">
                      <Link
                        to={`/contracts?id=${milestone.contractId}`}
                        className="hover:text-brand-400 flex items-center gap-1.5"
                      >
                        {milestone.contractId.slice(0, 8)}...
                        <ExternalLink className="w-3 h-3 text-slate-500" />
                      </Link>
                    </td>
                    <td className="table-cell text-white font-medium">
                      ${Number(milestone.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })} USD
                    </td>
                    <td className="table-cell">
                      <StatusBadge status={milestone.status} />
                      {milestone.status === 'RELEASED' && (
                        <div className="text-[9px] text-emerald-400 mt-1">
                          ✓ Payment released to student
                        </div>
                      )}
                      {milestone.status === 'PAYMENT_PROCESSING' && (
                        <div className="text-[9px] text-amber-400 mt-1">
                          ⏳ Payment being processed
                        </div>
                      )}
                      {milestone.status === 'FAILED' && (
                        <div className="text-[9px] text-red-400 mt-1">
                          ❌ Payment failed — Click Retry
                        </div>
                      )}
                    </td>
                    <td className="table-cell text-slate-400 text-xs">
                      {milestone.dueDate ? (
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-slate-500" />
                          {format(new Date(milestone.dueDate), 'dd MMM yyyy')}
                        </div>
                      ) : (
                        '--'
                      )}
                    </td>
                    <td className="table-cell text-right">
                      <div className="flex items-center justify-end gap-2">
                        {(role === 'STARTUP' || role === 'ADMIN') ? (
                          <>
                            {/* Edit button - only for PENDING/IN_PROGRESS milestones */}
                            {(milestone.status === 'PENDING' || milestone.status === 'IN_PROGRESS') && (
                              <button
                                onClick={() => {
                                  setEditingMilestone(milestone);
                                  setEditTitle(milestone.title);
                                  setEditDescription(milestone.description);
                                  setEditDueDate(milestone.dueDate ? new Date(milestone.dueDate).toISOString().split('T')[0] : '');
                                }}
                                className="px-2 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-slate-300 text-xs font-medium border border-white/10"
                                title="Edit milestone"
                              >
                                Edit
                              </button>
                            )}
                            
                            {(milestone.status === 'PENDING' || milestone.status === 'SUBMITTED' || milestone.status === 'IN_PROGRESS') && (
                              <button
                                onClick={async () => {
                                  try {
                                    console.log('[Approve & Fund] Starting...')
                                    await handleApprove(milestone.id);
                                    console.log('[Approve & Fund] Milestone approved, now calling handlePay...')
                                    // Wait a small moment for the approve to fully complete
                                    await new Promise(resolve => setTimeout(resolve, 500));
                                    await handlePay(milestone.id, milestone.amount, milestone.title);
                                  } catch (err) {
                                    console.error('[Approve & Fund] Error during approve flow:', err);
                                    toast.error('Failed to approve milestone. Please try again.');
                                  }
                                }}
                                disabled={approving || releasing}
                                className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-[#ffc439] to-[#f4b628] hover:brightness-105 text-slate-950 font-bold text-xs shadow-md shadow-amber-500/10 flex items-center gap-1.5 transition-all"
                              >
                                <Play className="w-3 h-3 fill-current" />
                                Approve & Fund via PayPal
                              </button>
                            )}
                            {(milestone.status === 'APPROVED' || milestone.status === 'FAILED') && (
                              <button
                                onClick={() =>
                                  handlePay(
                                    milestone.id,
                                    milestone.amount,
                                    milestone.title
                                  )
                                }
                                disabled={releasing}
                                className={`px-3 py-1.5 rounded-xl font-bold text-xs shadow-md flex items-center gap-1.5 transition-all text-white ${
                                  milestone.status === 'FAILED'
                                    ? 'bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 shadow-red-500/20'
                                    : 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 shadow-emerald-500/10'
                                }`}
                              >
                                <Play className="w-3 h-3 fill-current" />
                                {milestone.status === 'FAILED' ? 'Retry Payment Release' : 'Release Payment via PayPal'}
                              </button>
                            )}
                            {milestone.status === 'RELEASED' && (
                              <Link
                                to="/payments"
                                className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-400 hover:underline"
                              >
                                <CheckCircle className="w-3.5 h-3.5" />
                                Payout Disbursed
                              </Link>
                            )}
                          </>
                        ) : (
                          <span className="text-[11px] text-slate-400 font-medium">
                            {milestone.status === 'RELEASED' ? (
                              <Link to="/payments" className="text-emerald-400 hover:underline">
                                ✓ Paid & Settled
                              </Link>
                            ) : (
                              'Milestone in Escrow Vault'
                            )}
                          </span>
                        )}
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

      {/* PayPal / Escrow Checkout Modal */}
      {paypalOrder && (
        <CheckoutModal
          order={paypalOrder}
          onClose={() => setPaypalOrder(null)}
          onCapture={capturePayment}
        />
      )}

      {/* Edit Milestone Modal */}
      {editingMilestone && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="card w-full max-w-md p-6 relative">
            <button
              onClick={() => setEditingMilestone(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-bold text-white">Edit Milestone</h3>
            <p className="text-sm text-slate-400 mt-1">
              Update milestone details (Sequence #{editingMilestone.sequenceOrder})
            </p>

            <form onSubmit={(e) => {
              e.preventDefault();
              if (!editTitle.trim()) {
                toast.error('Title is required');
                return;
              }
              updateMilestone(editingMilestone.id, {
                title: editTitle,
                description: editDescription,
                dueDate: editDueDate || undefined
              });
            }} className="mt-6 space-y-4">
              <div>
                <label className="label">Title *</label>
                <input
                  type="text"
                  required
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="input"
                  placeholder="Milestone title"
                />
              </div>

              <div>
                <label className="label">Description</label>
                <textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  rows={3}
                  className="input py-2"
                  placeholder="Milestone description"
                />
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
                <p className="text-[10px] text-slate-500 mt-1">
                  Optional: Set a future due date for this milestone
                </p>
              </div>

              <div className="pt-4 border-t border-white/10 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setEditingMilestone(null)}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updating}
                  className="btn-primary"
                >
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
