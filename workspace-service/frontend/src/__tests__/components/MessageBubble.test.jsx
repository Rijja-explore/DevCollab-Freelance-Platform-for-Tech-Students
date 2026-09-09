/**
 * Property-based + unit tests for MessageBubble component.
 *
 * Tests ownership-gated edit/delete button visibility.
 * Validates: Requirements 7.2, 7.3
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import fc from 'fast-check';
import MessageBubble from '../../components/messages/MessageBubble';

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeMessage(overrides = {}) {
  return {
    id: 'msg-1',
    senderId: 'user-abc',
    text: 'Hello world',
    type: 'TEXT',
    edited: false,
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

function renderBubble(message, currentUserId = 'user-abc') {
  return render(
    <MessageBubble
      message={message}
      currentUserId={currentUserId}
      onEdit={vi.fn()}
      onDelete={vi.fn()}
    />
  );
}

// ── Unit tests ────────────────────────────────────────────────────────────────

describe('MessageBubble', () => {
  it('renders the message text', () => {
    renderBubble(makeMessage({ text: 'Test message' }));
    expect(screen.getByText('Test message')).toBeInTheDocument();
  });

  it('shows Edit and Delete buttons for own messages', () => {
    renderBubble(makeMessage({ senderId: 'me' }), 'me');
    expect(screen.getByRole('button', { name: /edit message/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /delete message/i })).toBeInTheDocument();
  });

  it('hides Edit and Delete buttons for other user messages', () => {
    renderBubble(makeMessage({ senderId: 'other-user' }), 'me');
    expect(screen.queryByRole('button', { name: /edit message/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /delete message/i })).toBeNull();
  });

  it('shows "(edited)" suffix when message.edited is true', () => {
    renderBubble(makeMessage({ edited: true, text: 'Edited text' }));
    expect(screen.getByText('(edited)')).toBeInTheDocument();
  });

  it('does not show "(edited)" when edited is false', () => {
    renderBubble(makeMessage({ edited: false }));
    expect(screen.queryByText('(edited)')).toBeNull();
  });

  it('renders SYSTEM messages without Edit/Delete buttons regardless of sender', () => {
    renderBubble(makeMessage({ type: 'SYSTEM', senderId: 'me', text: 'System msg' }), 'me');
    expect(screen.queryByRole('button', { name: /edit/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /delete/i })).toBeNull();
  });
});

// ── Property 9: Ownership-Gated Edit/Delete Visibility (messages) ────────────
// Feature: workspace-frontend, Property 9: Ownership-Gated Edit/Delete Visibility (messages)

describe('Property 9: Ownership-Gated Edit/Delete Visibility (MessageBubble)', () => {
  it('edit/delete buttons are visible iff senderId === currentUserId', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 36 }),
        fc.string({ minLength: 1, maxLength: 36 }),
        fc.string({ minLength: 1, maxLength: 100 }),
        (senderId, currentUserId, text) => {
          const message = makeMessage({ senderId, text, type: 'TEXT', edited: false });
          const { container, unmount } = render(
            <MessageBubble
              message={message}
              currentUserId={currentUserId}
              onEdit={vi.fn()}
              onDelete={vi.fn()}
            />
          );

          const editBtn = container.querySelector('[aria-label="Edit message"]');
          const deleteBtn = container.querySelector('[aria-label="Delete message"]');
          const shouldShow = senderId === currentUserId;

          unmount();

          return shouldShow
            ? editBtn !== null && deleteBtn !== null
            : editBtn === null && deleteBtn === null;
        }
      ),
      { numRuns: 100 }
    );
  });
});
