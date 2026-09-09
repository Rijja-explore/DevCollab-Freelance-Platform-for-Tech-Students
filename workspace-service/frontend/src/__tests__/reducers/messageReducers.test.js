/**
 * Property-based + unit tests for ChatPanel pure reducer helpers.
 *
 * Tests the exported appendMessage, updateMessage, deleteMessage functions.
 * Validates: Requirements 3.4, 3.5, 3.6
 */

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import {
  appendMessage,
  updateMessage,
  deleteMessage,
} from '../../components/messages/ChatPanel';

// ── Arbitraries ───────────────────────────────────────────────────────────────

const messageArbitrary = fc.record({
  id: fc.uuid(),
  workspaceId: fc.uuid(),
  senderId: fc.uuid(),
  text: fc.string({ minLength: 1, maxLength: 200 }),
  type: fc.constantFrom('TEXT', 'SYSTEM'),
  deleted: fc.boolean(),
  edited: fc.boolean(),
  createdAt: fc.constant(new Date(2024, 0, 1).toISOString()),
});

// ── Unit tests ────────────────────────────────────────────────────────────────

describe('appendMessage', () => {
  it('adds a message to an empty list', () => {
    const msg = { id: '1', text: 'hello' };
    const result = appendMessage([], msg);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual(msg);
  });

  it('appends to the end of an existing list', () => {
    const existing = [{ id: '1', text: 'a' }];
    const newMsg = { id: '2', text: 'b' };
    const result = appendMessage(existing, newMsg);
    expect(result[result.length - 1]).toEqual(newMsg);
  });

  it('does not mutate the original array', () => {
    const original = [{ id: '1', text: 'a' }];
    appendMessage(original, { id: '2', text: 'b' });
    expect(original).toHaveLength(1);
  });
});

describe('updateMessage', () => {
  it('replaces the message with the matching id', () => {
    const messages = [
      { id: '1', text: 'old', edited: false },
      { id: '2', text: 'other', edited: false },
    ];
    const updated = { id: '1', text: 'new', edited: true };
    const result = updateMessage(messages, updated);
    expect(result.find(m => m.id === '1').text).toBe('new');
    expect(result.find(m => m.id === '2').text).toBe('other');
  });

  it('preserves list length when a match is found', () => {
    const messages = [{ id: 'x', text: 'a' }, { id: 'y', text: 'b' }];
    const result = updateMessage(messages, { id: 'x', text: 'updated' });
    expect(result).toHaveLength(2);
  });

  it('returns original list unchanged when id is not found', () => {
    const messages = [{ id: 'a', text: 'x' }];
    const result = updateMessage(messages, { id: 'zzz', text: 'y' });
    expect(result[0].text).toBe('x');
  });
});

describe('deleteMessage', () => {
  it('removes the message with the given id', () => {
    const messages = [{ id: '1', text: 'a' }, { id: '2', text: 'b' }];
    const result = deleteMessage(messages, '1');
    expect(result.find(m => m.id === '1')).toBeUndefined();
    expect(result).toHaveLength(1);
  });

  it('leaves list unchanged when id is not found', () => {
    const messages = [{ id: '1', text: 'a' }];
    const result = deleteMessage(messages, 'nonexistent');
    expect(result).toHaveLength(1);
  });
});

// ── Property 3: Message List Append ─────────────────────────────────────────
// Feature: workspace-frontend, Property 3: Message List Append

describe('Property 3: Message List Append', () => {
  it('list length increases by exactly 1 and the new message is last', () => {
    fc.assert(
      fc.property(
        fc.array(messageArbitrary),
        messageArbitrary,
        (messages, newMessage) => {
          // Ensure unique ids to avoid collision with existing messages
          const baseMessages = messages.filter(m => m.id !== newMessage.id);
          const result = appendMessage(baseMessages, newMessage);
          return (
            result.length === baseMessages.length + 1 &&
            result[result.length - 1].id === newMessage.id
          );
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ── Property 4: Message List Update ─────────────────────────────────────────
// Feature: workspace-frontend, Property 4: Message List Update

describe('Property 4: Message List Update', () => {
  it('list length is preserved and the targeted message is replaced', () => {
    fc.assert(
      fc.property(
        fc.array(messageArbitrary, { minLength: 1 }),
        messageArbitrary,
        (messages, updatedMessage) => {
          // Force the updated message to have the same id as one in the list
          const target = messages[0];
          const updated = { ...updatedMessage, id: target.id };
          const result = updateMessage(messages, updated);

          const found = result.find(m => m.id === target.id);
          return (
            result.length === messages.length &&
            found !== undefined &&
            found.text === updated.text
          );
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ── Property 5: Message List Delete ─────────────────────────────────────────
// Feature: workspace-frontend, Property 5: Message List Delete

describe('Property 5: Message List Delete', () => {
  it('list length decreases by 1 and the deleted id is absent', () => {
    fc.assert(
      fc.property(
        fc.array(messageArbitrary, { minLength: 1 }),
        (messages) => {
          const target = messages[0];
          const result = deleteMessage(messages, target.id);
          return (
            result.length === messages.length - 1 &&
            result.every(m => m.id !== target.id)
          );
        }
      ),
      { numRuns: 100 }
    );
  });
});
