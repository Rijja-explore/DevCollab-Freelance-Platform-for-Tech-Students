import React from 'react';
import Button from '../common/Button';

/**
 * MessageBubble
 *
 * Renders a single chat message. Layout and actions vary by ownership and type:
 * - TEXT messages owned by the current user: right-aligned + edit/delete buttons
 * - TEXT messages from others: left-aligned, no action buttons
 * - SYSTEM messages: centered, muted notice style (no actions regardless of sender)
 * - "(edited)" suffix appended when message.edited === true
 *
 * Props:
 *   message       {Message}  - the message object
 *   currentUserId {string}   - the authenticated user's id
 *   onEdit        {function} - called with the message when Edit is clicked
 *   onDelete      {function} - called with the message when Delete is clicked
 *
 * Requirements: 7.2, 7.3
 */
export default function MessageBubble({ message, currentUserId, onEdit, onDelete }) {
  const { senderId, text, type, edited, createdAt } = message;
  const isOwn = senderId === currentUserId;
  const isSystem = type === 'SYSTEM';

  const formattedTime = createdAt
    ? new Date(createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : '';

  // ── SYSTEM message ─────────────────────────────────────────────────────────
  if (isSystem) {
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          padding: '6px 0',
        }}
      >
        <span
          style={{
            fontSize: '0.75rem',
            color: 'var(--color-muted)',
            fontStyle: 'italic',
            background: 'rgba(255, 255, 255, 0.04)',
            border: '1px solid rgba(255, 255, 255, 0.06)',
            borderRadius: '999px',
            padding: '3px 14px',
          }}
        >
          {text}
        </span>
      </div>
    );
  }

  // ── TEXT message ───────────────────────────────────────────────────────────
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: isOwn ? 'flex-end' : 'flex-start',
        marginBottom: '4px',
      }}
    >
      {/* Sender label (only for messages from others) */}
      {!isOwn && (
        <span
          style={{
            fontSize: '0.6875rem',
            fontFamily: 'var(--font-mono)',
            color: 'var(--color-muted)',
            marginBottom: '3px',
            paddingLeft: '4px',
          }}
        >
          {senderId}
        </span>
      )}

      {/* Bubble row */}
      <div
        style={{
          display: 'flex',
          flexDirection: isOwn ? 'row-reverse' : 'row',
          alignItems: 'flex-end',
          gap: '6px',
          maxWidth: '72%',
        }}
      >
        {/* Bubble */}
        <div
          style={{
            background: isOwn
              ? 'rgba(6, 214, 160, 0.15)'
              : 'rgba(255, 255, 255, 0.06)',
            border: isOwn
              ? '1px solid rgba(6, 214, 160, 0.25)'
              : '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: isOwn ? '16px 4px 16px 16px' : '4px 16px 16px 16px',
            padding: '10px 14px',
            wordBreak: 'break-word',
          }}
        >
          <span
            style={{
              fontSize: '0.9375rem',
              color: '#e2e8f0',
              lineHeight: 1.5,
            }}
          >
            {text}
            {edited && (
              <span
                style={{
                  marginLeft: '6px',
                  fontSize: '0.75rem',
                  color: 'var(--color-muted)',
                  fontStyle: 'italic',
                }}
              >
                (edited)
              </span>
            )}
          </span>
          <div
            style={{
              marginTop: '4px',
              fontSize: '0.6875rem',
              fontFamily: 'var(--font-mono)',
              color: 'var(--color-muted)',
              textAlign: isOwn ? 'right' : 'left',
            }}
          >
            {formattedTime}
          </div>
        </div>

        {/* Action buttons — only for own messages */}
        {isOwn && (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
              marginBottom: '4px',
            }}
          >
            <Button
              variant="secondary"
              size="sm"
              onClick={() => onEdit(message)}
              aria-label="Edit message"
            >
              Edit
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={() => onDelete(message)}
              aria-label="Delete message"
            >
              Del
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
