/**
 * Property-based + unit tests for CommentsPanel pure reducer helpers.
 *
 * Tests: appendRootComment, appendReply, upsertComment, removeComment.
 * Validates: Requirements 3.7, 3.8, 3.9
 */

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import {
  appendRootComment,
  appendReply,
  upsertComment,
  removeComment,
} from '../../components/comments/CommentsPanel';

// ── Arbitraries ───────────────────────────────────────────────────────────────

const baseCommentArbitrary = fc.record({
  id: fc.uuid(),
  workspaceId: fc.uuid(),
  authorId: fc.uuid(),
  text: fc.string({ minLength: 1, maxLength: 200 }),
  parentId: fc.constant(null),
  deleted: fc.boolean(),
  edited: fc.boolean(),
  createdAt: fc.constant(new Date(2024, 0, 1).toISOString()),
  replies: fc.constant([]),
});

const replyArbitrary = (parentId) =>
  fc.record({
    id: fc.uuid(),
    workspaceId: fc.uuid(),
    authorId: fc.uuid(),
    text: fc.string({ minLength: 1, maxLength: 200 }),
    parentId: fc.constant(parentId),
    deleted: fc.boolean(),
    edited: fc.boolean(),
    createdAt: fc.date().map(d => d.toISOString()),
    replies: fc.constant([]),
  });

// ── Unit tests ────────────────────────────────────────────────────────────────

describe('appendRootComment', () => {
  it('adds a comment to an empty list', () => {
    const comment = { id: '1', text: 'a', replies: [] };
    const result = appendRootComment([], comment);
    expect(result).toHaveLength(1);
  });

  it('appends to the end', () => {
    const existing = [{ id: '1', text: 'a', replies: [] }];
    const newC = { id: '2', text: 'b', replies: [] };
    const result = appendRootComment(existing, newC);
    expect(result[result.length - 1].id).toBe('2');
  });

  it('ensures the appended comment has a replies array', () => {
    const comment = { id: '1', text: 'a' }; // no replies field
    const result = appendRootComment([], comment);
    expect(result[0].replies).toEqual([]);
  });
});

describe('appendReply', () => {
  it('appends a reply to the matching parent', () => {
    const parent = { id: 'p1', text: 'parent', replies: [] };
    const reply = { id: 'r1', text: 'reply', parentId: 'p1' };
    const result = appendReply([parent], reply);
    expect(result[0].replies).toHaveLength(1);
    expect(result[0].replies[0].id).toBe('r1');
  });

  it('does not modify other comments', () => {
    const parent = { id: 'p1', text: 'parent', replies: [] };
    const other = { id: 'p2', text: 'other', replies: [] };
    const reply = { id: 'r1', text: 'reply', parentId: 'p1' };
    const result = appendReply([parent, other], reply);
    expect(result[1].replies).toHaveLength(0);
  });
});

describe('upsertComment', () => {
  it('replaces a root-level comment by id', () => {
    const comments = [
      { id: 'c1', text: 'old', replies: [] },
      { id: 'c2', text: 'other', replies: [] },
    ];
    const updated = { id: 'c1', text: 'new' };
    const result = upsertComment(comments, updated);
    expect(result.find(c => c.id === 'c1').text).toBe('new');
    expect(result).toHaveLength(2);
  });

  it('replaces a nested reply by id', () => {
    const comments = [
      {
        id: 'c1',
        text: 'root',
        replies: [{ id: 'r1', text: 'old reply', replies: [] }],
      },
    ];
    const updated = { id: 'r1', text: 'updated reply' };
    const result = upsertComment(comments, updated);
    expect(result[0].replies[0].text).toBe('updated reply');
  });
});

describe('removeComment', () => {
  it('removes a root-level comment by id', () => {
    const comments = [
      { id: 'c1', text: 'a', replies: [] },
      { id: 'c2', text: 'b', replies: [] },
    ];
    const result = removeComment(comments, 'c1');
    expect(result.find(c => c.id === 'c1')).toBeUndefined();
    expect(result).toHaveLength(1);
  });

  it('removes a nested reply by id', () => {
    const comments = [
      {
        id: 'c1',
        text: 'root',
        replies: [{ id: 'r1', text: 'reply', replies: [] }],
      },
    ];
    const result = removeComment(comments, 'r1');
    expect(result[0].replies).toHaveLength(0);
  });
});

// ── Property 6: Comment List Upsert (Top-Level and Reply) ────────────────────
// Feature: workspace-frontend, Property 6: Comment List Upsert (Top-Level and Reply)

describe('Property 6: Comment List Upsert', () => {
  it('top-level comment is appended to root list with length+1', () => {
    fc.assert(
      fc.property(
        fc.array(baseCommentArbitrary),
        baseCommentArbitrary,
        (comments, newComment) => {
          const base = comments.filter(c => c.id !== newComment.id);
          const topLevel = { ...newComment, parentId: null };
          const result = appendRootComment(base, topLevel);
          return result.length === base.length + 1;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('reply is placed under the correct parent, not at the root', () => {
    fc.assert(
      fc.property(
        fc.array(baseCommentArbitrary, { minLength: 1 }),
        baseCommentArbitrary,
        (comments, replyTemplate) => {
          const parent = comments[0];
          const reply = { ...replyTemplate, id: `reply-${replyTemplate.id}`, parentId: parent.id };
          const result = appendReply(comments, reply);

          const parentAfter = result.find(c => c.id === parent.id);
          const replyInRoot = result.find(c => c.id === reply.id);

          return (
            parentAfter !== undefined &&
            parentAfter.replies.some(r => r.id === reply.id) &&
            replyInRoot === undefined
          );
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ── Property 7: Comment List Update ─────────────────────────────────────────
// Feature: workspace-frontend, Property 7: Comment List Update

describe('Property 7: Comment List Update', () => {
  it('list length is preserved and the targeted comment is updated', () => {
    fc.assert(
      fc.property(
        fc.array(baseCommentArbitrary, { minLength: 1 }),
        baseCommentArbitrary,
        (comments, updateTemplate) => {
          const target = comments[0];
          const updated = { ...updateTemplate, id: target.id };
          const result = upsertComment(comments, updated);

          const found = result.find(c => c.id === target.id);
          return (
            result.length === comments.length &&
            found !== undefined &&
            found.text === updated.text
          );
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ── Property 8: Comment List Delete ─────────────────────────────────────────
// Feature: workspace-frontend, Property 8: Comment List Delete

describe('Property 8: Comment List Delete', () => {
  it('deleted comment id is absent from the result', () => {
    fc.assert(
      fc.property(
        fc.array(baseCommentArbitrary, { minLength: 1 }),
        (comments) => {
          const target = comments[0];
          const result = removeComment(comments, target.id);
          return result.every(c => c.id !== target.id);
        }
      ),
      { numRuns: 100 }
    );
  });
});
