import React, { useState } from 'react';
import useAuth from '../../hooks/useAuth';

/* ── Styles ─────────────────────────────────────────────────── */

const wrapperStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
};

const expandedWrapperStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: '8px',
  minWidth: '280px',
};

const textareaStyle = {
  width: '100%',
  minHeight: '72px',
  padding: '8px 12px',
  background: 'rgba(255, 255, 255, 0.06)',
  border: '1px solid rgba(255, 255, 255, 0.14)',
  borderRadius: 'var(--radius-sm)',
  color: '#e2e8f0',
  fontFamily: 'var(--font-mono)',
  fontSize: '0.8rem',
  lineHeight: 1.5,
  resize: 'vertical',
  outline: 'none',
};

const actionRowStyle = {
  display: 'flex',
  gap: '8px',
};

const btnBase = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '6px 14px',
  fontSize: '0.8125rem',
  fontFamily: 'var(--font-body)',
  fontWeight: 500,
  borderRadius: 'var(--radius-sm)',
  border: '1px solid transparent',
  cursor: 'pointer',
  lineHeight: 1,
  transition: 'opacity 0.15s ease',
};

const saveBtnStyle = {
  ...btnBase,
  background: 'var(--color-teal)',
  color: '#0a0e1a',
  borderColor: 'var(--color-teal)',
};

const cancelBtnStyle = {
  ...btnBase,
  background: 'transparent',
  color: '#e2e8f0',
  borderColor: 'rgba(255, 255, 255, 0.2)',
};

const clearBtnStyle = {
  ...btnBase,
  background: 'transparent',
  color: 'var(--color-coral)',
  borderColor: 'rgba(255, 107, 107, 0.35)',
};

const expandBtnStyle = {
  ...btnBase,
  background: 'transparent',
  color: 'var(--color-teal)',
  borderColor: 'rgba(6, 214, 160, 0.35)',
};

const maskedStyle = {
  fontFamily: 'var(--font-mono)',
  fontSize: '0.8rem',
  color: 'var(--color-muted)',
  background: 'rgba(255, 255, 255, 0.05)',
  border: '1px solid rgba(255, 255, 255, 0.08)',
  borderRadius: 'var(--radius-sm)',
  padding: '6px 10px',
  letterSpacing: '0.1em',
  userSelect: 'none',
};

/** Mask a JWT token showing only the first 12 chars then ••• */
function maskToken(token) {
  if (!token) return '';
  const visible = token.slice(0, 12);
  return `${visible}•••`;
}

/**
 * TokenInput — collapsible JWT input field.
 *
 * Behavior:
 *  - No token present: shows "Provide JWT Token" button → expands textarea
 *  - Expanded: shows textarea + Save / Cancel buttons
 *  - Token present: shows masked token + Clear button
 *
 * Uses `useAuth` (from ../../hooks/useAuth) to call `setToken` and `clearToken`.
 */
export default function TokenInput() {
  const { token, setToken, clearToken } = useAuth();
  const [expanded, setExpanded] = useState(false);
  const [value, setValue] = useState('');

  function handleSave() {
    const trimmed = value.trim();
    if (!trimmed) return;
    setToken(trimmed);
    setValue('');
    setExpanded(false);
  }

  function handleCancel() {
    setValue('');
    setExpanded(false);
  }

  function handleClear() {
    clearToken();
  }

  // Token is present — show masked display + clear button
  if (token) {
    return (
      <div style={wrapperStyle}>
        <span style={maskedStyle} title="JWT token is set" aria-label="Token is active">
          {maskToken(token)}
        </span>
        <button style={clearBtnStyle} onClick={handleClear} aria-label="Clear JWT token">
          Clear
        </button>
      </div>
    );
  }

  // No token and not expanded — show "Provide JWT Token" button
  if (!expanded) {
    return (
      <button style={expandBtnStyle} onClick={() => setExpanded(true)} aria-label="Provide JWT token">
        Provide JWT Token
      </button>
    );
  }

  // Expanded — show textarea + Save / Cancel
  return (
    <div style={expandedWrapperStyle}>
      <textarea
        style={textareaStyle}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Paste your JWT token here…"
        aria-label="JWT token input"
        autoFocus
        spellCheck={false}
        onKeyDown={(e) => {
          // Allow Ctrl+Enter or Cmd+Enter to save
          if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
            e.preventDefault();
            handleSave();
          }
        }}
      />
      <div style={actionRowStyle}>
        <button style={saveBtnStyle} onClick={handleSave} aria-label="Save token">
          Save
        </button>
        <button style={cancelBtnStyle} onClick={handleCancel} aria-label="Cancel">
          Cancel
        </button>
      </div>
    </div>
  );
}
