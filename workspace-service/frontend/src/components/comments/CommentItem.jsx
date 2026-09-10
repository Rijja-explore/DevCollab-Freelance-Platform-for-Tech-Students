import React, { useState } from 'react';
import Button from '../common/Button';

/**
 * CommentItem
 *
 * Renders a single comment and its nested replies (recursively).
 *
 * - Displays authorId (JetBrains Mono), text, formatted createdAt timestamp
 * - Optional fileRef + lineNumber badge (only when present)
 * - Edit/delete buttons ONLY when comment.authorId === currentUserId
 * - Reply button shows an inline reply textarea on click
 * - Nested replies rendered as indented child CommentItem components
 *
 * Props:
 *   comment       {Comment}  - the comment object (may contain replies[])
 *   currentUserId {string}   - the authenticated user's id
 *   onReply       {function} - called with (parentCommentId, replyText)
 *   onEdit        {function} - called with (commentId, newText)
 *   onDelete      {function} - called with (commentId)
 *
 * Requirements: 8.2, 8.3, 8.6
 */
export default function CommentItem({ comment, currentUserId, onReply, onEdit, onDelete }) {
  const { id, authorId, text, createdAt, fileRef, lineNumber, edited, replies = [] } = comment;
  const isOwn = authorId === currentUserId;

  const [showReplyForm, setShowReplyForm] = useState(false);
  const [replyText, setReplyText] = useState('');

  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(text);

  const formattedDate = createdAt
    ? new Date(createdAt).toLocaleString([], {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '';

  // ── Handlers ─────────────────────────────────────────────────────────────

  function handleReplySubmit(e) {
    e.preventDefault();
    const trimmed = replyText.trim();
    if (!trimmed) return;
    onReply(id, trimmed);
    setReplyText('');
    setShowReplyForm(false);
  }

  function handleEditSubmit(e) {
    e.preventDefault();
    const trimmed = editText.trim();
    if (!trimmed) return;
    onEdit(id, trimmed);
    setIsEditing(false);
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
      {/* Comment card */}
      <div
        style={{
          background: 'rgba(255, 255, 255, 0.04)',
          border: '1px solid rgba(255, 255, 255, 0.07)',
          borderRadius: '10px',
          padding: '12px 14px',
        }}
      >
        {/* Header: author + timestamp + file badge */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '8px',
            marginBottom: '8px',
          }}
        >
          {/* Author */}
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '0.8125rem',
              color: 'var(--color-teal)',
              fontWeight: 500,
            }}
          >
            {authorId}
          </span>

          {/* Timestamp */}
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '0.6875rem',
              color: 'var(--color-muted)',
            }}
          >
            {formattedDate}
          </span>

          {/* File + line badge */}
          {fileRef && (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                background: 'rgba(168, 85, 247, 0.12)',
                border: '1px solid rgba(168, 85, 247, 0.25)',
                borderRadius: '6px',
                padding: '2px 8px',
                fontSize: '0.6875rem',
                fontFamily: 'var(--font-mono)',
                color: 'var(--color-violet)',
              }}
            >
              {fileRef}
              {lineNumber != null && (
                <span style={{ opacity: 0.7 }}>:{lineNumber}</span>
              )}
            </span>
          )}

          {/* (edited) indicator */}
          {edited && (
            <span
              style={{
                fontSize: '0.6875rem',
                color: 'var(--color-muted)',
                fontStyle: 'italic',
              }}
            >
              (edited)
            </span>
          )}
        </div>

        {/* Body — edit form or plain text */}
        {isEditing ? (
          <form
            onSubmit={handleEditSubmit}
            style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}
          >
            <textarea
              value={editText}
              onChange={e => setEditText(e.target.value)}
              autoFocus
              rows={3}
              aria-label="Edit comment text"
              style={{
                background: 'rgba(255, 255, 255, 0.06)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                borderRadius: '8px',
                color: '#e2e8f0',
                padding: '8px 10px',
                fontSize: '0.9375rem',
                resize: 'vertical',
                fontFamily: 'var(--font-body)',
                width: '100%',
              }}
            />
            <div style={{ display: 'flex', gap: '8px' }}>
              <Button type="submit" variant="primary" size="sm" disabled={!editText.trim()}>
                Save
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => { setIsEditing(false); setEditText(text); }}
              >
                Cancel
              </Button>
            </div>
          </form>
        ) : (
          <p
            style={{
              margin: 0,
              fontSize: '0.9375rem',
              color: '#e2e8f0',
              lineHeight: 1.6,
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
            }}
          >
            {text}
          </p>
        )}

        {/* Actions */}
        {!isEditing && (
          <div
            style={{
              display: 'flex',
              gap: '8px',
              marginTop: '10px',
              alignItems: 'center',
            }}
          >
            {/* Reply — always visible */}
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShowReplyForm(v => !v)}
              aria-label="Reply to comment"
            >
              Reply
            </Button>

            {/* Edit / Delete — own comments only */}
            {isOwn && (
              <>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => { setIsEditing(true); setEditText(text); }}
                  aria-label="Edit comment"
                >
                  Edit
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => onDelete(id)}
                  aria-label="Delete comment"
                >
                  Delete
                </Button>
              </>
            )}
          </div>
        )}
      </div>

      {/* Inline reply form */}
      {showReplyForm && (
        <form
          onSubmit={handleReplySubmit}
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            marginLeft: '24px',
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '8px',
            padding: '10px 12px',
          }}
        >
          <textarea
            value={replyText}
            onChange={e => setReplyText(e.target.value)}
            autoFocus
            rows={2}
            placeholder="Write a reply…"
            aria-label="Reply text"
            style={{
              background: 'rgba(255, 255, 255, 0.06)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              borderRadius: '8px',
              color: '#e2e8f0',
              padding: '8px 10px',
              fontSize: '0.875rem',
              resize: 'vertical',
              fontFamily: 'var(--font-body)',
            }}
          />
          <div style={{ display: 'flex', gap: '8px' }}>
            <Button type="submit" variant="primary" size="sm" disabled={!replyText.trim()}>
              Post Reply
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => { setShowReplyForm(false); setReplyText(''); }}
            >
              Cancel
            </Button>
          </div>
        </form>
      )}

      {/* Nested replies */}
      {replies.length > 0 && (
        <div
          style={{
            marginLeft: '24px',
            borderLeft: '2px solid rgba(255, 255, 255, 0.07)',
            paddingLeft: '12px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            marginTop: '4px',
          }}
        >
          {replies.map(reply => (
            <CommentItem
              key={reply.id}
              comment={reply}
              currentUserId={currentUserId}
              onReply={onReply}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}
