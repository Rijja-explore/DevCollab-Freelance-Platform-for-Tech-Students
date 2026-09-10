import React, { useEffect, useState } from 'react';
import { contractsApi } from '../api/client';
import { useApi } from '../hooks/useApi';
import { TableSkeleton } from '../components/LoadingSkeleton';
import { EmptyState } from '../components/EmptyState';
import { StatusBadge } from '../components/StatusBadge';
import { format } from 'date-fns';
import { Plus, X, Search, Calendar, ChevronRight, Ban } from 'lucide-react';
import { Link } from 'react-router-dom';

export const Contracts: React.FC = () => {
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);

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

  const { execute: createContract, loading: creating } = useApi<any, [any]>(
    contractsApi.create,
    {
      successMessage: 'Escrow contract created successfully',
      onSuccess: () => {
        setShowCreateModal(false);
        resetForm();
        fetchContracts(page);
      },
    }
  );

  const { execute: cancelContract } = useApi<any, [string]>(
    contractsApi.cancel,
    {
      successMessage: 'Contract cancelled successfully',
      onSuccess: () => {
        fetchContracts(page);
      },
    }
  );

  useEffect(() => {
    fetchContracts(page);
  }, [page, fetchContracts]);

  const resetForm = () => {
    setProjectId('');
    setStartupId('');
    setStudentId('');
    setTitle('');
    setDescription('');
    setTotalAmount('');
    setTerms('');
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    createContract({
      projectId,
      startupId,
      studentId,
      title,
      description,
      totalAmount: parseFloat(totalAmount),
      terms,
      milestones: [], // default milestones added dynamically, or empty initially
    });
  };

  const contractsList = contractsData?.content ?? [];
  const totalPages = contractsData?.totalPages ?? 1;

  const filteredContracts = contractsList.filter(
    (c: any) =>
      c.title.toLowerCase().includes(search.toLowerCase()) ||
      c.id.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="page-header mb-0">
          <h1 className="page-title">Escrow Contracts</h1>
          <p className="page-subtitle">Manage project agreements escrowed on the DevCollab network.</p>
        </div>
        <button onClick={() => setShowCreateModal(true)} className="btn-primary">
          <Plus className="w-4 h-4" />
          Create Contract
        </button>
      </div>

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
          description="Matched matches create contracts automatically via Service A, or you can create one manually."
          actionText="Create Contract"
          onAction={() => setShowCreateModal(true)}
        />
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px]">
              <thead>
                <tr className="bg-white/5 border-b border-white/10">
                  <th className="table-header">Title & Contract ID</th>
                  <th className="table-header">Project ID</th>
                  <th className="table-header">Total Amount</th>
                  <th className="table-header">Status</th>
                  <th className="table-header">Created At</th>
                  <th className="table-header text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {filteredContracts.map((contract: any) => (
                  <tr key={contract.id} className="table-row">
                    <td className="table-cell">
                      <div>
                        <div className="font-semibold text-slate-200">{contract.title}</div>
                        <div className="text-[10px] text-slate-500 font-mono mt-0.5">{contract.id}</div>
                      </div>
                    </td>
                    <td className="table-cell font-mono text-xs text-slate-400">
                      {contract.projectId.slice(0, 8)}...
                    </td>
                    <td className="table-cell text-white font-medium">
                      ₹{contract.totalAmount.toLocaleString('en-IN')}
                    </td>
                    <td className="table-cell">
                      <StatusBadge status={contract.status} />
                    </td>
                    <td className="table-cell text-slate-400 text-xs">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-slate-500" />
                        {format(new Date(contract.createdAt), 'dd MMM yyyy')}
                      </div>
                    </td>
                    <td className="table-cell text-right">
                      <div className="flex items-center justify-end gap-2">
                        {contract.status === 'ACTIVE' && (
                          <button
                            onClick={() => cancelContract(contract.id)}
                            className="p-1.5 rounded hover:bg-red-500/10 text-rose-500 transition-colors"
                            title="Cancel Contract"
                          >
                            <Ban className="w-4 h-4" />
                          </button>
                        )}
                        <Link
                          to={`/milestones?contractId=${contract.id}`}
                          className="btn-secondary px-2.5 py-1 text-xs"
                        >
                          Milestones
                          <ChevronRight className="w-3 h-3" />
                        </Link>
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
                className="btn-secondary py-1 px-3 text-xs disabled:opacity-40"
              >
                Previous
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
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
            <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
              <h3 className="text-lg font-bold text-white">Create Escrow Contract</h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/5 text-slate-400 hover:text-white transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="p-6 overflow-y-auto space-y-4 flex-1">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="label">Project UUID</label>
                  <input
                    type="text"
                    required
                    value={projectId}
                    onChange={(e) => setProjectId(e.target.value)}
                    placeholder="e.g. 550e8400-e29b-41d4-a716-446655440000"
                    className="input"
                  />
                </div>
                <div>
                  <label className="label">Total Contract Amount (INR)</label>
                  <input
                    type="number"
                    required
                    value={totalAmount}
                    onChange={(e) => setTotalAmount(e.target.value)}
                    placeholder="e.g. 15000"
                    className="input"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="label">Startup User UUID</label>
                  <input
                    type="text"
                    required
                    value={startupId}
                    onChange={(e) => setStartupId(e.target.value)}
                    placeholder="Client User ID"
                    className="input"
                  />
                </div>
                <div>
                  <label className="label">Student User UUID</label>
                  <input
                    type="text"
                    required
                    value={studentId}
                    onChange={(e) => setStudentId(e.target.value)}
                    placeholder="Freelancer User ID"
                    className="input"
                  />
                </div>
              </div>

              <div>
                <label className="label">Contract Title</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Fullstack Development Agreement"
                  className="input"
                />
              </div>

              <div>
                <label className="label">Project Description / Scope</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  placeholder="Outline matching scope of work details..."
                  className="input py-2"
                />
              </div>

              <div>
                <label className="label">Legal Terms / Conditions</label>
                <textarea
                  value={terms}
                  onChange={(e) => setTerms(e.target.value)}
                  rows={3}
                  placeholder="Define payment milestones, revision clauses..."
                  className="input py-2"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button type="submit" disabled={creating} className="btn-primary">
                  {creating ? 'Creating...' : 'Initialize Contract'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
