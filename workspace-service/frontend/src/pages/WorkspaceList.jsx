/**
 * WorkspaceList Page
 *
 * Explains that workspaces must be looked up individually (no list endpoint
 * exists on the backend). Provides the same workspace-ID and project-ID
 * lookup forms as the Dashboard.
 *
 * Requirements: 5.1, 5.2, 5.3, 5.4
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import * as api from '../services/api';
import Card from '../components/common/Card';
import Button from '../components/common/Button';

const inputStyle = {
  flex: 1,
  padding: '8px 12px',
  background: 'rgba(255,255,255,0.06)',
  border: '1px solid rgba(255,255,255,0.12)',
  borderRadius: '8px',
  color: 'rgba(255,255,255,0.9)',
  fontSize: '0.875rem',
  outline: 'none',
  fontFamily: 'var(--font-mono)',
};

export default function WorkspaceList() {
  const navigate = useNavigate();

  const [workspaceId, setWorkspaceId] = useState('');
  const [projectId, setProjectId] = useState('');
  const [projectLookupError, setProjectLookupError] = useState('');

  function handleWorkspaceSubmit(e) {
    e.preventDefault();
    const trimmed = workspaceId.trim();
    if (!trimmed) return;
    navigate(`/workspaces/${trimmed}`);
  }

  async function handleProjectSubmit(e) {
    e.preventDefault();
    setProjectLookupError('');
    const trimmed = projectId.trim();
    if (!trimmed) return;
    try {
      const workspace = await api.getWorkspaceByProject(trimmed);
      navigate(`/workspaces/${workspace.id}`);
    } catch (err) {
      if (err?.status === 404) {
        setProjectLookupError('No workspace found for that project ID.');
      } else {
        setProjectLookupError(err?.message || 'Lookup failed. Please try again.');
      }
    }
  }

  return (
    <div style={{ maxWidth: '640px', margin: '0 auto', padding: '2rem 1rem' }}>
      <h1
        style={{
          fontFamily: 'var(--font-heading)',
          fontSize: '1.75rem',
          fontWeight: 700,
          marginBottom: '0.75rem',
          color: 'rgba(255,255,255,0.9)',
        }}
      >
        Workspaces
      </h1>

      <p
        style={{
          color: 'rgba(255,255,255,0.5)',
          fontSize: '0.9375rem',
          lineHeight: 1.6,
          marginBottom: '2rem',
        }}
      >
        There is no list endpoint for workspaces — each workspace must be
        looked up individually by its ID or by the associated project ID.
      </p>

      {/* ── Workspace-ID Lookup ── */}
      <Card style={{ marginBottom: '1.5rem', padding: '1.25rem 1.5rem' }}>
        <h2
          style={{
            margin: '0 0 1rem',
            fontSize: '0.9375rem',
            fontWeight: 700,
            color: 'rgba(255,255,255,0.85)',
          }}
        >
          Look up by Workspace ID
        </h2>
        <form onSubmit={handleWorkspaceSubmit} style={{ display: 'flex', gap: '0.75rem' }}>
          <input
            type="text"
            value={workspaceId}
            onChange={e => setWorkspaceId(e.target.value)}
            placeholder="e.g. 64ab3f…"
            aria-label="Workspace ID"
            style={inputStyle}
          />
          <Button type="submit" variant="primary" size="sm">
            Go
          </Button>
        </form>
      </Card>

      {/* ── Project-ID Lookup ── */}
      <Card style={{ padding: '1.25rem 1.5rem' }}>
        <h2
          style={{
            margin: '0 0 1rem',
            fontSize: '0.9375rem',
            fontWeight: 700,
            color: 'rgba(255,255,255,0.85)',
          }}
        >
          Look up by Project ID
        </h2>
        <form onSubmit={handleProjectSubmit} style={{ display: 'flex', gap: '0.75rem' }}>
          <input
            type="text"
            value={projectId}
            onChange={e => { setProjectId(e.target.value); setProjectLookupError(''); }}
            placeholder="e.g. proj_abc…"
            aria-label="Project ID"
            style={inputStyle}
          />
          <Button type="submit" variant="primary" size="sm">
            Find
          </Button>
        </form>
        {projectLookupError && (
          <p
            role="alert"
            style={{
              marginTop: '0.5rem',
              marginBottom: 0,
              fontSize: '0.8125rem',
              color: 'var(--color-coral)',
            }}
          >
            {projectLookupError}
          </p>
        )}
      </Card>
    </div>
  );
}
