/**
 * Property-based + unit tests for CommentItem component.
 *
 * Tests ownership-gated edit/delete button visibility.
 * Validates: Requirements 8.2, 8.3
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import fc from 'fast-check';
import CommentItem from '../../components/comments/CommentItem';

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeComment(overrides = {}) {
  return {
    id: 'comment-1',
    authorId: 'user-abc',
    text: 'Test comment',
    createdAt: new Date().toISOString(),
    fileRef: null,
    lineNumber: null,
    edited: false,
    replies: [],
    ...overrides,
  };
}

function renderItem(comment, currentUserId = 'user-abc') {
  return render(
    <CommentItem
      comment={comment}
      currentUserId={currentUserId}
      onReply={vi.fn()}
      onEdit={vi.fn()}
      onDelete={vi.fn()}
    />
  );
}

// ── Unit tests ────────────────────────────────────────────────────────────────

describe('CommentItem', () => {
  it('renders the comment text', () => {
    renderItem(makeComment({ text: 'Hello comment' }));
    expect(screen.getByText('Hello comment')).toBeInTheDocument();
  });

  it('shows Edit and Delete buttons for own comments', () => {
    renderItem(makeComment({ authorId: 'me' }), 'me');
    expect(screen.getByRole('button', { name: /edit comment/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /delete comment/i })).toBeInTheDocument();
  });

  it('hides Edit and Delete buttons for other user comments', () => {
    renderItem(makeComment({ authorId: 'other-user' }), 'me');
    expect(screen.queryByRole('button', { name: /edit comment/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /delete comment/i })).toBeNull();
  });

  it('always shows Reply button', () => {
    renderItem(makeComment({ authorId: 'other-user' }), 'me');
    expect(screen.getByRole('button', { name: /reply to comment/i })).toBeInTheDocument();
  });

  it('shows "(edited)" label when edited is true', () => {
    renderItem(makeComment({ edited: true }));
    expect(screen.getByText('(edited)')).toBeInTheDocument();
  });

  it('does not show "(edited)" when edited is false', () => {
    renderItem(makeComment({ edited: false }));
    expect(screen.queryByText('(edited)')).toBeNull();
  });

  it('renders fileRef badge when fileRef is present', () => {
    renderItem(makeComment({ fileRef: 'src/index.js', lineNumber: 42 }));
    expect(screen.getByText(/src\/index\.js/)).toBeInTheDocument();
  });

  it('does not render fileRef badge when fileRef is null', () => {
    renderItem(makeComment({ fileRef: null }));
    expect(screen.queryByText(/\.(js|ts|jsx|tsx)/)).toBeNull();
  });

  it('renders nested replies', () => {
    const comment = makeComment({
      replies: [
        makeComment({ id: 'r1', text: 'Nested reply', authorId: 'other' }),
      ],
    });
    renderItem(comment, 'user-abc');
    expect(screen.getByText('Nested reply')).toBeInTheDocument();
  });
});

// ── Property 9: Ownership-Gated Edit/Delete Visibility (comments) ────────────
// Feature: workspace-frontend, Property 9: Ownership-Gated Edit/Delete Visibility (comments)

describe('Property 9: Ownership-Gated Edit/Delete Visibility (CommentItem)', () => {
  it('edit/delete buttons are visible iff authorId === currentUserId', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 36 }),
        fc.string({ minLength: 1, maxLength: 36 }),
        fc.string({ minLength: 1, maxLength: 100 }),
        (authorId, currentUserId, text) => {
          const comment = makeComment({ authorId, text });
          const { container, unmount } = render(
            <CommentItem
              comment={comment}
              currentUserId={currentUserId}
              onReply={vi.fn()}
              onEdit={vi.fn()}
              onDelete={vi.fn()}
            />
          );

          const editBtn = container.querySelector('[aria-label="Edit comment"]');
          const deleteBtn = container.querySelector('[aria-label="Delete comment"]');
          const shouldShow = authorId === currentUserId;

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
