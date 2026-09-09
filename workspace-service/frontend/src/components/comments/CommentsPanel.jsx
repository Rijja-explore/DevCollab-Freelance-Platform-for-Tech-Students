import React, { useState, useEffect, useCallback } from 'react';
import * as api from '../../services/api';
import { getSocket } from '../../services/socket';
import useAuth from '../../hooks/useAuth';
import CommentItem from './CommentItem';
import LoadingSkeleton from '../common/LoadingSkeleton';
import ErrorState from '../common/ErrorState';
import Button from '../common/Button';

/**
 * CommentsPanel
 *
 * Threaded comments panel for a workspace.
 *
 * - Fetches top-level comments (with replies) on mount via api.getComments(workspaceId)
 * - Subscribes to comment-created / comment-updated / comment-deleted socket events
 * - Socket comment-created:
 *     parentId === null  → append to root list
 *     parentId set       → append to parent comment's replies array
 * - Socket comment-updated: replace matching comment by id (root or nested)
 * - Socket comment-deleted: remove matching comment by commentId (root or nested)
 * - New-comment form: text (required), fileRef (optional), lineNumber (optional)
 * - Delegates reply/edit/delete to CommentItem via callbacks
 * - Shows LoadingSkeleton while loading, ErrorState on failure
 *
 * Props:
 *   workspaceId {string} - ID of the workspace
 *
 * Requirements: 8.1, 8.4, 8.5, 8.7, 8.8, 8.9, 8.10, 8.11, 8.12
 */

// ── Pure reducer helpers (exported for property-based testing) ─────────────

export function appendRootComment(comments, newComment) {
  return [...comments, { ...newComment, replies: newComment.replies ?? [] }];
}

export function appendReply(comments, newReply) {
  return comments.map(c => {
    if (c.id === newReply.parentId) {
      return { ...c, replies: [...(c.replies ?? []), newReply] };
    }
    return c;
  });
}

export function upsertComment(comments, updatedComment) {
  // Check root level first
  const rootIdx = comments.findIndex(c => c.id === updatedComment.id);
  if (rootIdx !== -1) {
    const next = [...comments];
    next[rootIdx] = { ...updatedComment, replies: next[rootIdx].replies ?? [] };
    return next;
  }
  // Check nested replies
  return comments.map(c => ({
    ...c,
    replies: (c.replies ?? []).map(r =>
      r.id === updatedComment.id ? { ...updatedComment, replies: r.replies ?? [] } : r
    ),
  }));
}

export function removeComment(comments, commentId) {
  const filtered = comments.filter(c => c.id !== commentId);
  return filtered.map(c => ({
    ...c,
    replies: (c.replies ?? []).filter(r => r.id !== commentId),
  }));
}

// ── Component ──────────────────────────────────────────────────────────────

export default function CommentsPanel({ workspaceId }) {
  const { userId } = useAuth();

  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // New comment form state
  const [newText, setNewText] = useState('');
  const [newFileRef, setNewFileRef] = useState('');
  const [newLineNumber, setNewLineNumber] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // ── Fetch comments ────────────────────────────────────────────────────

  const fetchComments = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getComments(workspaceId);
      const list = Array.isArray(data) ? data : (data.comments ?? []);
      // Ensure each comment has a replies array
      setComments(list.map(c => ({ ...c, replies: c.replies ?? [] })));
    } catch (err) {
      setError(err.message ?? 'Failed to load comments.');
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  // ── Socket subscriptions ──────────────────────────────────────────────

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    function onCommentCreated(comment) {
      if (!comment.parentId) {
        setComments(prev => appendRootComment(prev, comment));
      } else {
        setComments(prev => appendReply(prev, comment));
      }
    }
    function onCommentUpdated(comment) {
      setComments(prev => upsertComment(prev, comment));
    }
    function onCommentDeleted({ commentId }) {
      setComments(prev => removeComment(prev, commentId));
    }

    socket.on('comment-created', onCommentCreated);
    socket.on('comment-updated', onCommentUpdated);
    socket.on('comment-deleted', onCommentDeleted);

    return () => {
      socket.off('comment-created', onCommentCreated);
      socket.off('comment-updated', onCommentUpdated);
      socket.off('comment-deleted', onCommentDeleted);
    };
  }, []);

  // ── New comment submit ─────────────────────────────────────────────────

  async function handleNewCommentSubmit(e) {
    e.preventDefault();
    const text = newText.trim();
    if (!text) return;

    const body = { text };
    if (newFileRef.trim()) body.fileRef = newFileRef.trim();
    const parsedLine = parseInt(newLineNumber, 10);
    if (!isNaN(parsedLine) && newLineNumber.trim() !== '') body.lineNumber = parsedLine;

    setSubmitting(true);
    try {
      const created = await api.createComment(workspaceId, body);
      setComments(prev => appendRootComment(prev, created));
      setNewText('');
      setNewFileRef('');
      setNewLineNumber('');
    } catch (err) {
      // leave form intact so the user can retry
    } finally {
      setSubmitting(false);
    }
  }

  // ── Reply ─────────────────────────────────────────────────────────────

  async function handleReply(parentCommentId, replyText) {
    try {
      const created = await api.createReply(parentCommentId, { text: replyText });
      setComments(prev => appendReply(prev, { ...created, parentId: parentCommentId }));
    } catch (err) {
      // silent — CommentItem already reset its form
    }
  }

  // ── Edit ──────────────────────────────────────────────────────────────

  async function handleEdit(commentId, newText) {
    try {
      const updated = await api.updateComment(commentId, { text: newText });
      setComments(prev => upsertComment(prev, updated));
    } catch (err) {
      // silent
    }
  }

  // ── Delete ────────────────────────────────────────────────────────────

  async function handleDelete(commentId) {
    try {
      await api.deleteComment(commentId);
      setComments(prev => removeComment(prev, commentId));
    } catch (err) {
      // silent
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

      {/* New comment form */}
      <form
        onSubmit={handleNewCommentSubmit}
        style={{
          background: 'rgba(255, 255, 255, 0.03)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '12px',
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
        }}
      >
        <h3
          style={{
            margin: 0,
            fontSize: '0.9375rem',
            fontFamily: 'var(--font-body)',
            fontWeight: 600,
            color: 'rgba(226, 232, 240, 0.8)',
          }}
        >
          Add a comment
        </h3>

        {/* Comment text (required) */}
        <textarea
          value={newText}
          onChange={e => setNewText(e.target.value)}
          placeholder="Write a comment…"
          required
          rows={3}
          aria-label="Comment text"
          style={{
            background: 'rgba(255, 255, 255, 0.06)',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            borderRadius: '8px',
            color: '#e2e8f0',
            padding: '10px 12px',
            fontSize: '0.9375rem',
            resize: 'vertical',
            fontFamily: 'var(--font-body)',
            width: '100%',
          }}
        />

        {/* Optional fields row */}
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <input
            type="text"
            value={newFileRef}
            onChange={e => setNewFileRef(e.target.value)}
            placeholder="File reference (optional)"
            aria-label="File reference"
            style={{
              flex: 2,
              minWidth: '160px',
              background: 'rgba(255, 255, 255, 0.06)',
              border: '1px solid rgba(255, 255, 255, 0.10)',
              borderRadius: '8px',
              color: '#e2e8f0',
              padding: '8px 12px',
              fontSize: '0.875rem',
              fontFamily: 'var(--font-mono)',
            }}
          />
          <input
            type="number"
            value={newLineNumber}
            onChange={e => setNewLineNumber(e.target.value)}
            placeholder="Line # (optional)"
            aria-label="Line number"
            min={1}
            style={{
              flex: 1,
              minWidth: '100px',
              background: 'rgba(255, 255, 255, 0.06)',
              border: '1px solid rgba(255, 255, 255, 0.10)',
              borderRadius: '8px',
              color: '#e2e8f0',
              padding: '8px 12px',
              fontSize: '0.875rem',
              fontFamily: 'var(--font-mono)',
            }}
          />
        </div>

        <div>
          <Button
            type="submit"
            variant="primary"
            size="md"
            disabled={!newText.trim() || submitting}
          >
            {submitting ? 'Posting…' : 'Post Comment'}
          </Button>
        </div>
      </form>

      {/* Comment list */}
      {loading && <LoadingSkeleton lines={4} height="72px" />}

      {!loading && error && (
        <ErrorState message={error} onRetry={fetchComments} />
      )}

      {!loading && !error && comments.length === 0 && (
        <div
          style={{
            textAlign: 'center',
            color: 'var(--color-muted)',
            fontSize: '0.9rem',
            padding: '32px',
          }}
        >
          No comments yet. Start the discussion!
        </div>
      )}

      {!loading && !error && comments.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {comments.map(comment => (
            <CommentItem
              key={comment.id}
              comment={comment}
              currentUserId={userId}
              onReply={handleReply}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}
