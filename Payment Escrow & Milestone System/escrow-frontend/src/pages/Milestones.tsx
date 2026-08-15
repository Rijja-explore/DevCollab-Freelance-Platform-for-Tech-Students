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

const isPayPalConfigured = Boolean(import.meta.env.VITE_PAYPAL_CLIENT_ID);

interface CheckoutModalProps {
  order: any;
  onClose: () => void;
  onSimulate: (milestoneId: string, amount: number, orderId: string) => void;
}

/**
 * PayPal / Demo checkout modal.
 *
 * Only renders PayPalButtons when a client id is configured and the
 * PayPalScriptProvider is mounted (App.tsx). Otherwise renders a mock
 * "Simulate Payment" button for offline demos.
 */
const CheckoutModal: React.FC<CheckoutModalProps> = ({ order, onClose, onSimulate }) => {
  // usePayPalScriptReducer is only valid when PayPalScriptProvider is mounted.
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

        <h3 className="text-lg font-bold text-white">Complete Payment</h3>
        <p className="text-sm text-slate-400 mt-1">
          {order.title} · ₹{order.amount.toLocaleString('en-IN')}
        </p>

        <div className="mt-6">
          {isPayPalConfigured ? (
            <div className="min-h-[140px]">
              {isRejected && (
                <p className="text-sm text-rose-400 mb-3">
                  PayPal SDK failed to load. You may be offline.
                </p>
              )}
              {isPending && (
                <p className="text-sm text-slate-400 mb-3">Loading PayPal...</p>
              )}
              <PayPalButtons
                forceReRender={[order.orderId]}
                createOrder={() => order.orderId}
                onApprove={async () => {
                  toast.success('Payment approved. Capturing...');
                  await onSimulate(order.milestoneId, order.amount, order.orderId);
                }}
                onCancel={() => {
                  toast('Payment cancelled.', { icon: '❌' });
                  onClose();
                }}
                onError={() => {
                  toast.error('PayPal checkout errored.');
                  onClose();
                }}
              />
            </div>
          ) : (
            <div className="text-center">
              <p className="text-sm text-slate-400 mb-4">
                Running in <strong className="text-white">demo/mock</strong> mode. No PayPal client is
                configured, so checkout is simulated.
              </p>
              <button
                onClick={() => onSimulate(order.milestoneId, order.amount, order.orderId)}
                className="btn-primary w-full"
              >
                Simulate Payment Capture
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export const Milestones: React.FC = () => {
  const [searchParams] = useSearchParams();
  const contractIdParam = searchParams.get('contractId');

  const [page, setPage] = useState(0);
  const [selectedContract, setSelectedContract] = useState<any>(null);
  const [paypalOrder, setPaypalOrder] = useState<any>(null);

  const {
    data: milestonesData,
    loading,
    execute: fetchMilestones,
  } = useApi<any, [number]>(milestonesApi.getAll);

  const { execute: approveMilestone, loading: approving } = useApi<any, [string]>(
    milestonesApi.approve,
    {
      successMessage: 'Milestone approved. Payment order can now be released.',
    }
  );

  const { execute: releaseMilestone, loading: releasing } = useApi<any, [string]>(
    milestonesApi.release,
    {
      successMessage: 'Payment order created.',
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

  // Simulates capture for mock/demo provider (also finalizes after PayPal approval
  // when a webhook isn't reachable in local dev).
  const mockCapture = async (milestoneId: string, amount: number, orderId: string) => {
    void milestoneId;
    void amount;
    toast.success(`Payment captured · ${orderId} (mock/demo)`);
    setPaypalOrder(null);
    // Refresh to reflect webhook/state changes
    setTimeout(() => fetchMilestones(page), 1800);
  };

  const handlePay = async (milestoneId: string, amount: number, contractTitle: string) => {
    try {
      const milestoneRes = await releaseMilestone(milestoneId);
      const milestoneData = milestoneRes?.data ?? milestoneRes;

      // The backend returns the milestone; the order id lives on the transaction.
      // Fetch the latest transaction for this milestone to get providerOrderId.
      let orderId = milestoneData?.providerOrderId;
      if (!orderId) {
        const txs = await transactionsApi.getAll(0, 50);
        const all = txs.data?.data?.content ?? txs.data?.content ?? [];
        const tx = all
          .filter((t: any) => t.milestoneId === milestoneId)
          .sort((a: any, b: any) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          )[0];
        orderId = tx?.providerOrderId;
      }

      toast.success('Payment order created. Opening checkout...');
      setPaypalOrder({
        orderId: orderId ?? 'MOCK',
        milestoneId,
        amount,
        title: contractTitle,
      });
    } catch (err: any) {
      console.error(err);
      toast.error('Failed to trigger payment checkout flow');
    }
  };

  const handleApprove = async (id: string) => {
    await approveMilestone(id);
    fetchMilestones(page);
  };

  const milestonesList = milestonesData?.content ?? [];
  const totalPages = milestonesData?.totalPages ?? 1;

  // Filter milestones if contractId parameter is present
  const filteredMilestones = contractIdParam
    ? milestonesList.filter((m: any) => m.contractId === contractIdParam)
    : milestonesList;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="page-header">
        <h1 className="page-title">Escrow Milestones</h1>
        <p className="page-subtitle">Track project phases, work submissions, and release payments securely.</p>
      </div>

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
                      ₹{milestone.amount.toLocaleString('en-IN')}
                    </td>
                    <td className="table-cell">
                      <StatusBadge status={milestone.status} />
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
                        {milestone.status === 'SUBMITTED' && (
                          <button
                            onClick={() => handleApprove(milestone.id)}
                            disabled={approving}
                            className="btn-secondary py-1 px-2.5 text-xs text-brand-400 hover:text-brand-300 flex items-center gap-1"
                          >
                            <CheckCircle className="w-3.5 h-3.5" />
                            Approve
                          </button>
                        )}
                        {milestone.status === 'APPROVED' && (
                          <button
                            onClick={() =>
                              handlePay(
                                milestone.id,
                                milestone.amount,
                                milestone.title
                              )
                            }
                            disabled={releasing}
                            className="btn-primary py-1 px-2.5 text-xs flex items-center gap-1"
                          >
                            <Play className="w-3.5 h-3.5 fill-current" />
                            Pay Release
                          </button>
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

      {/* PayPal / Demo Checkout Modal */}
      {paypalOrder && (
        <CheckoutModal
          order={paypalOrder}
          onClose={() => setPaypalOrder(null)}
          onSimulate={mockCapture}
        />
      )}
    </div>
  );
};

