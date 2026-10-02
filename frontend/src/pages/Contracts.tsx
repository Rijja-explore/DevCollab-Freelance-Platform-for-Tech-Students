import React, { useEffect, useState } from 'react';
import { contractsApi, workspaceApi } from '../api/client';
import { useApi } from '../hooks/useApi';
import { TableSkeleton } from '../components/LoadingSkeleton';
import { EmptyState } from '../components/EmptyState';
import { StatusBadge } from '../components/StatusBadge';
import { format } from 'date-fns';
import {
  Plus,
  X,
  Search,
  Calendar,
  ChevronRight,
  Ban,
  Copy,
  Check,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { ServiceHeader } from '../components/ServiceHeader';
import toast from 'react-hot-toast';

export const Contracts: React.FC = () => {
  const { role, user } = useAuth();

  const [page, setPage] = useState(0);
  const [search, setSearch] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [workspaces, setWorkspaces] = useState<any[]>([]);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Form states
  const [projectId, setProjectId] = useState('');
  const [startupId, setStartupId] = useState('');
  const [studentId, setStudentId] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [totalAmount, setTotalAmount] = useState('');
  const [terms, setTerms] = useState('');

  const {
    data: contractsData,
    loading,
    execute: fetchContracts,
  } = useApi<any, [number]>(contractsApi.getAll);

  const {
    execute: createContract,
    loading: creating,
  } = useApi<any, [any]>(contractsApi.create, {
    successMessage: 'Escrow contract created successfully',
    onSuccess: () => {
      setShowCreateModal(false);
      resetForm();
      fetchContracts(page);
    },
  });

  const {
    execute: cancelContract,
  } = useApi<any, [string]>(contractsApi.cancel, {
    successMessage: 'Contract cancelled successfully',
    onSuccess: () => {
      fetchContracts(page);
    },
  });

  useEffect(() => {
    fetchContracts(page);
  }, [page, fetchContracts]);

  // Load workspaces when modal opens
  useEffect(() => {
    if (!showCreateModal) {
      return;
    }

    workspaceApi
      .getAll()
      .then((res) => {
        const data = Array.isArray(res.data?.data)
          ? res.data.data
          : [];

        setWorkspaces(data);
      })
      .catch((err) => {
        console.error('Failed to load workspaces:', err);
      });
  }, [showCreateModal]);

  const resetForm = () => {
    setProjectId('');
    setStartupId(user?.profileId || user?.id || '');
    setStudentId('');
    setTitle('');
    setDescription('');
    setTotalAmount('');
    setTerms('');
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();

    if (!projectId || !studentId) {
      toast.error('Project ID and Student ID are required');
      return;
    }

    // Basic UUID validation - handles both lowercase and uppercase
    const uuidRegex =
      /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

    if (!uuidRegex.test(projectId.trim())) {
      toast.error('Project ID must be a valid UUID format (e.g., 123e4567-e89b-12d3-a456-426614174000)');
      return;
    }

    if (!uuidRegex.test(studentId.trim())) {
      toast.error('Student ID must be a valid UUID format (e.g., 123e4567-e89b-12d3-a456-426614174000)');
      return;
    }

    if (startupId && !uuidRegex.test(startupId.trim())) {
      toast.error('Startup ID must be a valid UUID format (e.g., 123e4567-e89b-12d3-a456-426614174000)');
      return;
    }

    if (!totalAmount || Number(totalAmount) <= 0) {
      toast.error('Please enter a valid contract amount');
      return;
    }

    // Build request body with only required fields and valid UUIDs
    const requestBody: any = {
      projectId: projectId.trim(),
      studentId: studentId.trim(),
      title: title?.trim() || 'Untitled Contract',
      description: description?.trim(),
      totalAmount: parseFloat(totalAmount),
      currency: 'USD',
      terms: terms?.trim(),
    };

    // Only include startupId if it's a valid UUID
    if (startupId && uuidRegex.test(startupId.trim())) {
      requestBody.startupId = startupId.trim();
    }

    createContract(requestBody);
  };

  const handleCopyToClipboard = (
    text: string,
    fieldName: string
  ) => {
    if (!text) {
      toast.error(`${fieldName} is unavailable`);
      return;
    }

    navigator.clipboard
      .writeText(text)
      .then(() => {
        setCopiedField(fieldName);
        toast.success(`${fieldName} copied`);

        setTimeout(() => {
          setCopiedField(null);
        }, 2000);
      })
      .catch(() => {
        toast.error(`Failed to copy ${fieldName}`);
      });
  };

  const contractsList =
    contractsData?.content ??
    contractsData?.data?.content ??
    (Array.isArray(contractsData) ? contractsData : []);

  const totalPages =
    contractsData?.totalPages ??
    contractsData?.data?.totalPages ??
    1;

  const normalizedSearch = search.toLowerCase().trim();

  const filteredContracts = contractsList.filter((c: any) => {
    const contractTitle = String(c?.title ?? '').toLowerCase();
    const contractId = String(c?.id ?? '').toLowerCase();

    return (
      contractTitle.includes(normalizedSearch) ||
      contractId.includes(normalizedSearch)
    );
  });

  return (
    <div className="space-y-6">
      {/* Service 3 Escrow Banner */}
      <ServiceHeader
        service="escrow"
        title="Escrow Contracts"
        subtitle="Manage legally-binding freelance agreements with automated milestone funding and PayPal Sandbox escrow vault."
        action={
          role === 'STARTUP' || role === 'ADMIN' ? (
            <button
              onClick={() => setShowCreateModal(true)}
              className="btn-primary"
            >
              <Plus className="w-4 h-4" />
              Create Contract
            </button>
          ) : undefined
        }
      />

      {/* Filter and Search Bar */}
      <div className="card p-4 flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />

          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter contracts by title or ID..."
            className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-2 text-sm text-slate-300 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-all"
          />
        </div>
      </div>

      {/* Main Table */}
      {loading ? (
        <TableSkeleton rows={5} />
      ) : filteredContracts.length === 0 ? (
        <EmptyState
          title="No contracts found"
          description="Matched projects generate escrow agreements automatically, or startup founders can create one manually."
          actionText={
            role === 'STARTUP' || role === 'ADMIN'
              ? 'Create Contract'
              : undefined
          }
          onAction={
            role === 'STARTUP' || role === 'ADMIN'
              ? () => setShowCreateModal(true)
              : undefined
          }
        />
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px]">
              <thead>
                <tr className="bg-white/5 border-b border-white/10">
                  <th className="table-header">
                    Title & Contract ID
                  </th>

                  <th className="table-header">
                    Project ID
                  </th>

                  <th className="table-header">
                    Total Amount
                  </th>

                  <th className="table-header">
                    Status
                  </th>

                  <th className="table-header">
                    Created At
                  </th>

                  <th className="table-header text-right">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-white/10">
                {filteredContracts.map((contract: any) => {
                  const contractId = String(contract?.id ?? '');
                  const projectIdValue = String(
                    contract?.projectId ?? ''
                  );

                  const totalAmountValue = Number(
                    contract?.totalAmount ?? 0
                  );

                  return (
                    <tr
                      key={contractId}
                      className="table-row"
                    >
                      <td className="table-cell">
                        <div>
                          <div className="font-semibold text-slate-200">
                            {contract?.title || 'Untitled Contract'}
                          </div>

                          <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                            {contractId || 'N/A'}
                          </div>
                        </div>
                      </td>

                      <td className="table-cell font-mono text-xs text-slate-400">
                        {projectIdValue
                          ? `${projectIdValue.slice(0, 8)}...`
                          : 'N/A'}
                      </td>

                      <td className="table-cell text-white font-medium">
                        $
                        {totalAmountValue.toLocaleString(
                          'en-US',
                          {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          }
                        )}{' '}
                        {contract?.currency || 'USD'}
                      </td>

                      <td className="table-cell">
                        <StatusBadge
                          status={contract?.status || 'UNKNOWN'}
                        />
                      </td>

                      <td className="table-cell text-slate-400 text-xs">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-slate-500" />

                          {contract?.createdAt
                            ? format(
                                new Date(contract.createdAt),
                                'dd MMM yyyy'
                              )
                            : 'N/A'}
                        </div>
                      </td>

                      <td className="table-cell text-right">
                        <div className="flex items-center justify-end gap-2">
                          {contract?.status === 'ACTIVE' && (
                            <button
                              onClick={() =>
                                cancelContract(contractId)
                              }
                              className="p-1.5 rounded hover:bg-red-500/10 text-rose-500 transition-colors"
                              title="Cancel Contract"
                            >
                              <Ban className="w-4 h-4" />
                            </button>
                          )}

                          <Link
                            to={`/milestones?contractId=${contractId}`}
                            className="btn-secondary px-2.5 py-1 text-xs"
                          >
                            Milestones
                            <ChevronRight className="w-3 h-3" />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
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
                onClick={() =>
                  setPage((p) => Math.max(0, p - 1))
                }
                disabled={page === 0}
                className="btn-secondary py-1 px-3 text-xs disabled:opacity-40"
              >
                Previous
              </button>

              <button
                onClick={() =>
                  setPage((p) =>
                    Math.min(totalPages - 1, p + 1)
                  )
                }
                disabled={page >= totalPages - 1}
                className="btn-secondary py-1 px-3 text-xs disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-surface/80 backdrop-blur-md p-4">
          <div className="card w-full max-w-2xl bg-surface-card border border-white/10 overflow-hidden flex flex-col max-h-[90vh] shadow-[0_0_50px_rgba(139,92,246,0.1)]">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-white">
                  Create Escrow Contract
                </h3>

                <p className="text-xs text-slate-400 mt-1">
                  💡 Normally, contracts are auto-created when a
                  project is matched. Manual creation is for
                  development/testing only.
                </p>
              </div>

              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/5 text-slate-400 hover:text-white transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Form */}
            <form
              onSubmit={handleCreate}
              className="p-6 overflow-y-auto space-y-4 flex-1"
            >
              <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-300 text-xs">
                <strong>How to find IDs:</strong> Open an
                active workspace to see projectId (project), studentId
                (freelancer/developer), and startupId (your ID as project owner).
                You can copy them from the workspace details below.
              </div>

              {/* Quick Reference: Workspaces */}
              {workspaces.length > 0 && (
                <div className="p-3 rounded-lg bg-white/5 border border-white/10 space-y-2">
                  <p className="text-xs font-semibold text-slate-300 mb-2">
                    📋 Available Workspaces (copy IDs from
                    here):
                  </p>

                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {workspaces.slice(0, 3).map((ws) => (
                      <div
                        key={ws.id}
                        className="p-2 rounded bg-white/[0.02] border border-white/5 space-y-1"
                      >
                        <div className="text-[10px] text-slate-400">
                          <span className="font-semibold">
                            Project:
                          </span>{' '}
                          {ws.projectName || 'Unnamed'}

                          <button
                            type="button"
                            onClick={() =>
                              handleCopyToClipboard(
                                ws.projectId,
                                'Project ID'
                              )
                            }
                            className="ml-2 p-0.5 hover:bg-white/10 rounded"
                          >
                            {copiedField === 'Project ID' ? (
                              <Check className="w-3 h-3 text-emerald-400 inline" />
                            ) : (
                              <Copy className="w-3 h-3 inline text-slate-500" />
                            )}
                          </button>
                        </div>

                        <div className="text-[10px] text-slate-500 font-mono">
                          {ws.projectId || 'N/A'}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Project + Amount */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="label">
                    Project UUID (required)
                  </label>

                  <input
                    type="text"
                    required
                    value={projectId}
                    onChange={(e) =>
                      setProjectId(e.target.value)
                    }
                    placeholder="Copy from workspace projectId"
                    className="input"
                  />

                  <p className="text-[10px] text-slate-500 mt-1">
                    UUID of the project this contract relates
                    to
                  </p>
                </div>

                <div>
                  <label className="label">
                    Total Contract Amount USD (required)
                  </label>

                  <input
                    type="number"
                    required
                    min="0.01"
                    step="0.01"
                    value={totalAmount}
                    onChange={(e) =>
                      setTotalAmount(e.target.value)
                    }
                    placeholder="e.g. 5000.00"
                    className="input"
                  />

                  <p className="text-[10px] text-slate-500 mt-1">
                    Total amount to be held in escrow
                  </p>
                </div>
              </div>

              {/* Startup + Student */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="label">
                    Your Startup ID (auto-filled)
                  </label>

                  <input
                    type="text"
                    value={startupId}
                    onChange={(e) =>
                      setStartupId(e.target.value)
                    }
                    placeholder="Your startup ID (auto-filled from your account)"
                    className="input bg-white/10"
                    readOnly
                  />

                  <p className="text-[10px] text-slate-500 mt-1">
                    Your startup ID as the project owner
                  </p>
                </div>

                <div>
                  <label className="label">
                    Student/Freelancer ID (required)
                  </label>

                  <input
                    type="text"
                    required
                    value={studentId}
                    onChange={(e) =>
                      setStudentId(e.target.value)
                    }
                    placeholder="Student ID from workspace or match"
                    className="input"
                  />

                  <p className="text-[10px] text-slate-500 mt-1">
                    UUID of the student/freelancer working on this project
                  </p>
                </div>
              </div>

              {/* Contract Title */}
              <div>
                <label className="label">
                  Contract Title
                </label>

                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Fullstack Development - React & Node.js"
                  className="input"
                />
              </div>

              {/* Description */}
              <div>
                <label className="label">
                  Project Scope & Description
                </label>

                <textarea
                  value={description}
                  onChange={(e) =>
                    setDescription(e.target.value)
                  }
                  rows={3}
                  placeholder="Describe what work will be delivered, deliverables, timeline..."
                  className="input py-2"
                />
              </div>

              {/* Terms */}
              <div>
                <label className="label">
                  Legal Terms & Conditions
                </label>

                <textarea
                  value={terms}
                  onChange={(e) => setTerms(e.target.value)}
                  rows={3}
                  placeholder="Payment terms, revision clauses, liability, IP ownership..."
                  className="input py-2"
                />
              </div>

              {/* Form Actions */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={() =>
                    setShowCreateModal(false)
                  }
                  className="btn-secondary"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={creating}
                  className="btn-primary"
                >
                  {creating
                    ? 'Creating...'
                    : 'Create Contract'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
