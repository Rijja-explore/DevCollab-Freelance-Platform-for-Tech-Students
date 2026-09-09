/**
 * WorkspaceDetail Page
 *
 * Reads workspaceId from route params, fetches workspace metadata,
 * and renders Chat / Comments / Milestones tabs.
 *
 * Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6
 */

import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import * as api from '../services/api';
import useSocket from '../hooks/useSocket';
import WorkspaceHeader from '../components/workspace/WorkspaceHeader';
import WorkspaceNotFound from '../components/workspace/WorkspaceNotFound';
import ChatPanel from '../components/messages/ChatPanel';
import CommentsPanel from '../components/comments/CommentsPanel';
import MilestonesPanel from '../components/milestones/MilestonesPanel';
import LoadingSkeleton from '../components/common/LoadingSkeleton';

const TABS = ['Chat', 'Comments', 'Milestones'];

const tabBarStyle = {
  display: 'flex',
  gap: '4px',
  borderBottom: '1px solid rgba(255,255,255,0.08)',
  marginBottom: '1.5rem',
};

function tabStyle(isActive) {
  return {
    padding: '10px 20px',
    fontSize: '0.9rem',
    fontFamily: 'var(--font-body)',
    fontWeight: isActive ? 600 : 400,
    color: isActive ? 'var(--color-teal)' : 'rgba(255,255,255,0.5)',
    background: 'transparent',
    border: 'none',
    borderBottom: isActive ? '2px solid var(--color-teal)' : '2px solid transparent',
    cursor: 'pointer',
    marginBottom: '-1px',
    transition: 'color 0.15s ease, border-color 0.15s ease',
  };
}

export default function WorkspaceDetail() {
  const { id: workspaceId } = useParams();

  const [workspace, setWorkspace] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [activeTab, setActiveTab] = useState('Chat');

  // Subscribe to workspace socket room
  useSocket(workspaceId);

  useEffect(() => {
    if (!workspaceId) return;
    setLoading(true);
    setNotFound(false);

    api.getWorkspace(workspaceId)
      .then(data => setWorkspace(data))
      .catch(err => {
        if (err?.status === 404) {
          setNotFound(true);
        }
      })
      .finally(() => setLoading(false));
  }, [workspaceId]);

  if (loading) {
    return (
      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '2rem 1rem' }}>
        <LoadingSkeleton lines={4} />
      </div>
    );
  }

  if (notFound) {
    return <WorkspaceNotFound workspaceId={workspaceId} />;
  }

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', padding: '2rem 1rem' }}>
      <WorkspaceHeader workspace={workspace} />

      {/* Tab bar */}
      <div style={tabBarStyle} role="tablist" aria-label="Workspace sections">
        {TABS.map(tab => (
          <button
            key={tab}
            role="tab"
            aria-selected={activeTab === tab}
            style={tabStyle(activeTab === tab)}
            onClick={() => setActiveTab(tab)}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Active panel */}
      <div role="tabpanel">
        {activeTab === 'Chat'       && <ChatPanel workspaceId={workspaceId} />}
        {activeTab === 'Comments'   && <CommentsPanel workspaceId={workspaceId} />}
        {activeTab === 'Milestones' && <MilestonesPanel workspaceId={workspaceId} />}
      </div>
    </div>
  );
}
