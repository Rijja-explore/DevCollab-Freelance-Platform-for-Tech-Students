import React, { useState, useEffect, useCallback } from 'react';
import LoadingSkeleton from '../common/LoadingSkeleton';
import ErrorState from '../common/ErrorState';
import MilestoneCard from './MilestoneCard';
import CreateMilestoneModal from './CreateMilestoneModal';
import CompleteMilestoneModal from './CompleteMilestoneModal';
import * as api from '../../services/api';
import Button from '../common/Button';

/**
 * MilestonesPanel
 *
 * Fetches and displays all milestones for a workspace.
 * - Shows a "Create Milestone" button that opens CreateMilestoneModal
 * - Renders each milestone as a MilestoneCard
 * - Clicking "Complete" on a card opens CompleteMilestoneModal
 * - Appends newly created milestones to state
 * - Replaces updated milestones in state after completion
 * - Shows LoadingSkeleton while loading, ErrorState on fetch failure
 *
 * Props:
 *   workspaceId {string} - ID of the workspace to load milestones for
 *
 * Requirements: 9.1, 9.10
 */
export default function MilestonesPanel({ workspaceId }) {
  const [milestones, setMilestones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Modal state
  const [createOpen, setCreateOpen] = useState(false);
  const [completingMilestone, setCompletingMilestone] = useState(null); // null or milestone object

  const fetchMilestones = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getMilestones(workspaceId);
      // API may return { milestones: [...] } or an array directly
      setMilestones(Array.isArray(data) ? data : (data.milestones ?? []));
    } catch (err) {
      setError(err.message ?? 'Failed to load milestones.');
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    fetchMilestones();
  }, [fetchMilestones]);

  // Called by CreateMilestoneModal after a successful create
  function handleMilestoneCreated(newMilestone) {
    setMilestones(prev => [...prev, newMilestone]);
  }

  // Called by CompleteMilestoneModal after a successful completion
  function handleMilestoneCompleted(updatedMilestone) {
    setMilestones(prev =>
      prev.map(m => (m.id === updatedMilestone.id ? updatedMilestone : m))
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

      {/* Toolbar */}
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <Button
          variant="primary"
          size="sm"
          onClick={() => setCreateOpen(true)}
        >
          + Create Milestone
        </Button>
      </div>

      {/* Content */}
      {loading && (
        <div style={{ padding: '8px 0' }}>
          <LoadingSkeleton lines={4} height="80px" />
        </div>
      )}

      {!loading && error && (
        <ErrorState message={error} onRetry={fetchMilestones} />
      )}

      {!loading && !error && milestones.length === 0 && (
        <div
          style={{
            textAlign: 'center',
            padding: '48px 24px',
            color: 'rgba(226, 232, 240, 0.4)',
            fontSize: '0.9375rem',
          }}
        >
          No milestones yet. Create one to get started.
        </div>
      )}

      {!loading && !error && milestones.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {milestones.map(milestone => (
            <MilestoneCard
              key={milestone.id}
              milestone={milestone}
              onComplete={setCompletingMilestone}
            />
          ))}
        </div>
      )}

      {/* Create Milestone Modal */}
      <CreateMilestoneModal
        workspaceId={workspaceId}
        isOpen={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={handleMilestoneCreated}
      />

      {/* Complete Milestone Modal */}
      <CompleteMilestoneModal
        milestone={completingMilestone}
        isOpen={completingMilestone !== null}
        onClose={() => setCompletingMilestone(null)}
        onCompleted={handleMilestoneCompleted}
      />
    </div>
  );
}
