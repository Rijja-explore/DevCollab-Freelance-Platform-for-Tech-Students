import React, { useState } from 'react';
import Modal from '../common/Modal';
import Button from '../common/Button';
import * as api from '../../services/api';

/**
 * CreateMilestoneModal
 *
 * Form modal for creating a new milestone in a workspace.
 * Fields: contractId (required), title (required), amount (required, min 0)
 *
 * On successful submit:
 *   1. Calls api.createMilestone(workspaceId, { contractId, title, amount })
 *   2. Calls onCreated(newMilestone)
 *   3. Closes the modal
 *
 * Props:
 *   workspaceId {string}   - ID of the workspace to attach the milestone to
 *   isOpen      {boolean}  - modal visibility
 *   onClose     {function} - called to close the modal without saving
 *   onCreated   {function} - called with the newly created milestone object
 *
 * Requirements: 9.3, 9.4, 9.5
 */
export default function CreateMilestoneModal({ workspaceId, isOpen, onClose, onCreated }) {
  const [contractId, setContractId] = useState('');
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  function resetForm() {
    setContractId('');
    setTitle('');
    setAmount('');
    setError(null);
  }

  function handleClose() {
    resetForm();
    onClose();
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);

    // Client-side validation
    if (!contractId.trim()) {
      setError('Contract ID is required.');
      return;
    }
    if (!title.trim()) {
      setError('Title is required.');
      return;
    }
    const parsedAmount = parseFloat(amount);
    if (amount === '' || isNaN(parsedAmount) || parsedAmount < 0) {
      setError('Amount must be a number ≥ 0.');
      return;
    }

    setSubmitting(true);
    try {
      const newMilestone = await api.createMilestone(workspaceId, {
        contractId: contractId.trim(),
        title: title.trim(),
        amount: parsedAmount,
      });
      onCreated(newMilestone);
      resetForm();
      onClose();
    } catch (err) {
      setError(err.message ?? 'Failed to create milestone. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  const inputStyle = {
    width: '100%',
    padding: '9px 12px',
    borderRadius: '8px',
    border: '1px solid rgba(255, 255, 255, 0.15)',
    background: 'rgba(255, 255, 255, 0.05)',
    color: '#e2e8f0',
    fontSize: '0.9375rem',
    fontFamily: 'var(--font-body)',
    outline: 'none',
    boxSizing: 'border-box',
  };

  const labelStyle = {
    display: 'block',
    marginBottom: '6px',
    fontSize: '0.8125rem',
    fontWeight: 500,
    color: 'rgba(226, 232, 240, 0.7)',
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Create Milestone">
      <form onSubmit={handleSubmit} noValidate>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

          {/* Contract ID */}
          <div>
            <label htmlFor="cm-contractId" style={labelStyle}>
              Contract ID <span style={{ color: 'var(--color-coral)' }}>*</span>
            </label>
            <input
              id="cm-contractId"
              type="text"
              required
              value={contractId}
              onChange={e => setContractId(e.target.value)}
              placeholder="Enter contract ID"
              style={inputStyle}
              disabled={submitting}
            />
          </div>

          {/* Title */}
          <div>
            <label htmlFor="cm-title" style={labelStyle}>
              Title <span style={{ color: 'var(--color-coral)' }}>*</span>
            </label>
            <input
              id="cm-title"
              type="text"
              required
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Milestone title"
              style={inputStyle}
              disabled={submitting}
            />
          </div>

          {/* Amount */}
          <div>
            <label htmlFor="cm-amount" style={labelStyle}>
              Amount (USD) <span style={{ color: 'var(--color-coral)' }}>*</span>
            </label>
            <input
              id="cm-amount"
              type="number"
              required
              min="0"
              step="0.01"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              placeholder="0.00"
              style={{ ...inputStyle, fontFamily: 'var(--font-mono)' }}
              disabled={submitting}
            />
          </div>

          {/* Inline error */}
          {error && (
            <p
              role="alert"
              style={{
                margin: 0,
                color: 'var(--color-coral)',
                fontSize: '0.875rem',
              }}
            >
              {error}
            </p>
          )}

          {/* Actions */}
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '4px' }}>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={handleClose}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={submitting}
            >
              {submitting ? 'Creating…' : 'Create Milestone'}
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
