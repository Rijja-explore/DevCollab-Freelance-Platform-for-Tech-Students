import React, { useState, useEffect } from 'react';
import Modal from '../common/Modal';
import Button from '../common/Button';
import * as api from '../../services/api';

/**
 * CompleteMilestoneModal
 *
 * Form modal for marking a milestone as complete.
 * Field: completionNotes (textarea, optional)
 *
 * On successful submit:
 *   1. Calls api.completeMilestone(milestone.id, { completionNotes })
 *   2. Calls onCompleted(updatedMilestone)
 *   3. Closes the modal
 *
 * Props:
 *   milestone   {Milestone}  - the milestone being completed
 *   isOpen      {boolean}    - modal visibility
 *   onClose     {function}   - called to close without saving
 *   onCompleted {function}   - called with the updated milestone returned by the API
 *
 * Requirements: 9.7, 9.8
 */
export default function CompleteMilestoneModal({ milestone, isOpen, onClose, onCompleted }) {
  const [completionNotes, setCompletionNotes] = useState('');
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Reset form whenever the modal opens for a (potentially different) milestone
  useEffect(() => {
    if (isOpen) {
      setCompletionNotes('');
      setError(null);
    }
  }, [isOpen]);

  function handleClose() {
    setCompletionNotes('');
    setError(null);
    onClose();
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const updatedMilestone = await api.completeMilestone(milestone.id, {
        completionNotes: completionNotes.trim() || undefined,
      });
      onCompleted(updatedMilestone);
      handleClose();
    } catch (err) {
      setError(err.message ?? 'Failed to complete milestone. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  if (!milestone) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={`Complete: ${milestone.title}`}
    >
      <form onSubmit={handleSubmit} noValidate>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

          {/* Completion Notes */}
          <div>
            <label
              htmlFor="complete-notes"
              style={{
                display: 'block',
                marginBottom: '6px',
                fontSize: '0.8125rem',
                fontWeight: 500,
                color: 'rgba(226, 232, 240, 0.7)',
              }}
            >
              Completion Notes{' '}
              <span style={{ color: 'rgba(226, 232, 240, 0.4)', fontWeight: 400 }}>
                (optional)
              </span>
            </label>
            <textarea
              id="complete-notes"
              rows={4}
              value={completionNotes}
              onChange={e => setCompletionNotes(e.target.value)}
              placeholder="Describe what was delivered…"
              style={{
                width: '100%',
                padding: '9px 12px',
                borderRadius: '8px',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                background: 'rgba(255, 255, 255, 0.05)',
                color: '#e2e8f0',
                fontSize: '0.9375rem',
                fontFamily: 'var(--font-body)',
                outline: 'none',
                resize: 'vertical',
                boxSizing: 'border-box',
              }}
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
              {submitting ? 'Completing…' : 'Mark as Complete'}
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
