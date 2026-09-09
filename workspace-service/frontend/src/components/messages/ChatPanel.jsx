import React, { useState, useEffect, useRef, useCallback } from 'react';
import * as api from '../../services/api';
import { getSocket } from '../../services/socket';
import useAuth from '../../hooks/useAuth';
import MessageBubble from './MessageBubble';
import LoadingSkeleton from '../common/LoadingSkeleton';
import ErrorState from '../common/ErrorState';
import Button from '../common/Button';

/**
 * ChatPanel
 *
 * Real-time chat panel for a workspace.
 *
 * - Fetches messages on mount via api.getMessages(workspaceId)
 * - Subscribes to message-created / message-updated / message-deleted socket events
 * - Unsubscribes on unmount
 * - Auto-scrolls to the bottom whenever the messages array changes
 * - Send form: optimistically appends and POSTs
 * - Inline edit form: shown for the message matching editingId; PUTs on submit
 * - Delete: DELETEs and removes from state
 * - Shows LoadingSkeleton while loading, ErrorState on failure
 *
 * Props:
 *   workspaceId {string} - ID of the workspace to load messages for
 *
 * Requirements: 7.1, 7.4, 7.5, 7.6, 7.7, 7.8, 7.9, 7.10
 */

// ── Pure reducer helpers (exported for property-based testing) ─────────────

export function appendMessage(messages, newMessage) {
  return [...messages, newMessage];
}

export function updateMessage(messages, updatedMessage) {
  return messages.map(m => (m.id === updatedMessage.id ? updatedMessage : m));
}

export function deleteMessage(messages, messageId) {
  return messages.filter(m => m.id !== messageId);
}

// ── Component ──────────────────────────────────────────────────────────────

export default function ChatPanel({ workspaceId }) {
  const { userId } = useAuth();

  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [inputText, setInputText] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState('');
  const [sending, setSending] = useState(false);

  const messagesEndRef = useRef(null);

  // ── Fetch messages ──────────────────────────────────────────────────────

  const fetchMessages = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getMessages(workspaceId);
      // API may return { messages: [...] } or an array directly
      setMessages(Array.isArray(data) ? data : (data.messages ?? []));
    } catch (err) {
      setError(err.message ?? 'Failed to load messages.');
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  // ── Socket subscriptions ────────────────────────────────────────────────

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    function onMessageCreated(msg) {
      setMessages(prev => appendMessage(prev, msg));
    }
    function onMessageUpdated(msg) {
      setMessages(prev => updateMessage(prev, msg));
    }
    function onMessageDeleted({ messageId }) {
      setMessages(prev => deleteMessage(prev, messageId));
    }

    socket.on('message-created', onMessageCreated);
    socket.on('message-updated', onMessageUpdated);
    socket.on('message-deleted', onMessageDeleted);

    return () => {
      socket.off('message-created', onMessageCreated);
      socket.off('message-updated', onMessageUpdated);
      socket.off('message-deleted', onMessageDeleted);
    };
  }, []);

  // ── Auto-scroll to bottom on new messages ───────────────────────────────

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ── Send new message ────────────────────────────────────────────────────

  async function handleSend(e) {
    e.preventDefault();
    const text = inputText.trim();
    if (!text) return;

    // Optimistic append with a temporary id
    const optimistic = {
      id: `temp-${Date.now()}`,
      workspaceId,
      senderId: userId,
      text,
      type: 'TEXT',
      deleted: false,
      edited: false,
      editedAt: null,
      createdAt: new Date().toISOString(),
    };
    setMessages(prev => appendMessage(prev, optimistic));
    setInputText('');

    try {
      setSending(true);
      const saved = await api.createMessage(workspaceId, { text, type: 'TEXT' });
      // Replace the optimistic entry with the real one
      setMessages(prev => prev.map(m => (m.id === optimistic.id ? saved : m)));
    } catch (err) {
      // Remove optimistic entry on failure
      setMessages(prev => deleteMessage(prev, optimistic.id));
      setInputText(text); // restore input
    } finally {
      setSending(false);
    }
  }

  // ── Edit ────────────────────────────────────────────────────────────────

  function handleEditStart(message) {
    setEditingId(message.id);
    setEditText(message.text);
  }

  function handleEditCancel() {
    setEditingId(null);
    setEditText('');
  }

  async function handleEditSubmit(e, messageId) {
    e.preventDefault();
    const text = editText.trim();
    if (!text) return;

    try {
      const updated = await api.updateMessage(messageId, { text });
      setMessages(prev => updateMessage(prev, updated));
      setEditingId(null);
      setEditText('');
    } catch (err) {
      // leave edit form open so the user can retry
    }
  }

  // ── Delete ──────────────────────────────────────────────────────────────

  async function handleDelete(message) {
    try {
      await api.deleteMessage(message.id);
      setMessages(prev => deleteMessage(prev, message.id));
    } catch (err) {
      // silent — the message stays visible
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        minHeight: '400px',
        gap: '0',
      }}
    >
      {/* Message list */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
        }}
      >
        {loading && <LoadingSkeleton lines={5} height="52px" />}

        {!loading && error && (
          <ErrorState message={error} onRetry={fetchMessages} />
        )}

        {!loading && !error && messages.length === 0 && (
          <div
            style={{
              textAlign: 'center',
              color: 'var(--color-muted)',
              fontSize: '0.9rem',
              padding: '32px',
            }}
          >
            No messages yet. Say hello!
          </div>
        )}

        {!loading && !error && messages.map(message => (
          <div key={message.id}>
            {editingId === message.id ? (
              // ── Inline edit form ───────────────────────────────────────
              <form
                onSubmit={e => handleEditSubmit(e, message.id)}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  background: 'rgba(255, 255, 255, 0.04)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  borderRadius: '12px',
                  padding: '12px',
                  maxWidth: '72%',
                  marginLeft: 'auto',
                }}
              >
                <textarea
                  value={editText}
                  onChange={e => setEditText(e.target.value)}
                  autoFocus
                  rows={2}
                  aria-label="Edit message text"
                  style={{
                    background: 'rgba(255, 255, 255, 0.06)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    borderRadius: '8px',
                    color: '#e2e8f0',
                    padding: '8px 10px',
                    fontSize: '0.9375rem',
                    resize: 'vertical',
                    fontFamily: 'var(--font-body)',
                  }}
                />
                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                  <Button type="button" variant="secondary" size="sm" onClick={handleEditCancel}>
                    Cancel
                  </Button>
                  <Button type="submit" variant="primary" size="sm" disabled={!editText.trim()}>
                    Save
                  </Button>
                </div>
              </form>
            ) : (
              <MessageBubble
                message={message}
                currentUserId={userId}
                onEdit={handleEditStart}
                onDelete={handleDelete}
              />
            )}
          </div>
        ))}

        {/* Scroll anchor */}
        <div ref={messagesEndRef} />
      </div>

      {/* Send form */}
      <form
        onSubmit={handleSend}
        style={{
          display: 'flex',
          gap: '8px',
          padding: '12px 16px',
          borderTop: '1px solid rgba(255, 255, 255, 0.06)',
          background: 'rgba(255, 255, 255, 0.02)',
        }}
      >
        <input
          type="text"
          value={inputText}
          onChange={e => setInputText(e.target.value)}
          placeholder="Type a message…"
          aria-label="Message input"
          style={{
            flex: 1,
            background: 'rgba(255, 255, 255, 0.06)',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            borderRadius: '8px',
            color: '#e2e8f0',
            padding: '10px 14px',
            fontSize: '0.9375rem',
            outline: 'none',
            fontFamily: 'var(--font-body)',
          }}
          disabled={loading}
        />
        <Button
          type="submit"
          variant="primary"
          size="md"
          disabled={!inputText.trim() || sending}
        >
          Send
        </Button>
      </form>
    </div>
  );
}
