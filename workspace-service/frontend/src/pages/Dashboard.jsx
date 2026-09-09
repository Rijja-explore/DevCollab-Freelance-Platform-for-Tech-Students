/**
 * Dashboard Page
 *
 * Fetches GET /health on mount and shows a status card.
 * Provides two lookup forms:
 *  1. Navigate directly to /workspaces/:id by workspace ID.
 *  2. Resolve a workspace by project ID via getWorkspaceByProject, then navigate.
 *
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7
 */

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import * as api from '../services/api';
import Card from '../components/common/Card';
import StatusBadge from '../components/common/StatusBadge';
import Button from '../components/common/Button';

export default function Dashboard() {
  const navigate = useNavigate();

  // ── Health state ───────────────────────────────────────────────────────────
  const [healthData, setHealthData] = useState(null);
  const [healthError, setHealthError] = useState(null);

  useEffect(() => {
    api.getHealth()
      .then(data => setHealthData(data))
      .catch(err => setHealthError(err?.message || 'Health check failed'));
  }, []);

  // ── Workspace-ID lookup form ───────────────────────────────────────────────
  const [workspaceId, setWorkspaceId] = useState('');

  function handleWorkspaceSubmit(e) {
    e.preventDefault();
    const trimmed = workspaceId.trim();
    if (!trimmed) return;
    navigate(`/workspaces/${trimmed}`);
  }

  // ── Project-ID lookup form ─────────────────────────────────────────────────
  const [projectId, setProjectId] = useState('');
  const [projectLookupError, setProjectLookupError] = useState('');

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

  // ── Derived health badge status ────────────────────────────────────────────
  const badgeStatus =
    healthData?.status === 'ok' ? 'ACTIVE' : 'ARCHIVED';

  return (
    <div style={{ maxWidth: '640px', margin: '0 auto', padding: '2rem 1rem' }}>
      {/* ── Page heading ── */}
      <h1
        style={{
          fontFamily: 'var(--font-heading)',
          fontSize: '1.75rem',
          fontWeight: 700,
          marginBottom: '1.75rem',
          color: 'rgba(255,255,255,0.9)',
        }}
      >
        Dashboard
      </h1>

      {/* ── Health Status Card ── */}
      <Card style={{ marginBottom: '2rem', padding: '1.25rem 1.5rem' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '1rem',
          }}
        >
          <h2
            style={{
              margin: 0,
              fontSize: '1rem',
              fontWeight: 700,
              color: 'rgba(255,255,255,0.85)',
            }}
          >
            Backend Health
          </h2>
          {healthData && <StatusBadge status={badgeStatus} />}
        </div>

        {healthError && (
          <p style={{ color: 'var(--color-coral)', margin: 0, fontSize: '0.875rem' }}>
            {healthError}
          </p>
        )}

        {!healthData && !healthError && (
          <p style={{ color: 'rgba(255,255,255,0.4)', margin: 0, fontSize: '0.875rem' }}>
            Checking service health…
          </p>
        )}

        {healthData && (
          <dl
            style={{
              display: 'grid',
              gridTemplateColumns: '120px 1fr',
              gap: '0.4rem 0.75rem',
              margin: 0,
              fontSize: '0.875rem',
            }}
          >
            {[
              ['Status',    healthData.status],
              ['Service',   healthData.service],
              ['Uptime',    healthData.uptime != null ? `${Math.floor(healthData.uptime)}s` : '—'],
              ['Timestamp', healthData.timestamp
                ? new Date(healthData.timestamp).toLocaleString()
                : '—'],
            ].map(([label, value]) => (
              <>
                <dt
                  key={`dt-${label}`}
                  style={{
                    color: 'rgba(255,255,255,0.4)',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                    fontSize: '0.75rem',
                    alignSelf: 'center',
                  }}
                >
                  {label}
                </dt>
                <dd
                  key={`dd-${label}`}
                  style={{ margin: 0, color: 'rgba(255,255,255,0.85)' }}
                >
                  {value ?? '—'}
                </dd>
              </>
            ))}
          </dl>
        )}
      </Card>

      {/* ── Workspace-ID Lookup ── */}
      <Card style={{ marginBottom: '1.5rem', padding: '1.25rem 1.5rem' }}>
        <h3
          style={{
            margin: '0 0 1rem',
            fontSize: '0.9375rem',
            fontWeight: 700,
            color: 'rgba(255,255,255,0.85)',
          }}
        >
          Look up by Workspace ID
        </h3>
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
        <h3
          style={{
            margin: '0 0 1rem',
            fontSize: '0.9375rem',
            fontWeight: 700,
            color: 'rgba(255,255,255,0.85)',
          }}
        >
          Look up by Project ID
        </h3>
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
