import { describe, expect, it } from 'vitest';
import type { MessageDescriptor } from 'react-intl';
import * as messageGroups from '../messages';

type MessageGroup = Record<string, MessageDescriptor>;

describe('intl messages', () => {
  const groups = Object.entries(messageGroups) as [string, MessageGroup][];

  it('exports non-empty message groups', () => {
    expect(groups.length).toBeGreaterThan(0);

    for (const [, group] of groups) {
      expect(Object.keys(group).length).toBeGreaterThan(0);
    }
  });

  it('contains valid descriptors for every message', () => {
    for (const [groupName, group] of groups) {
      for (const [messageKey, descriptor] of Object.entries(group)) {
        expect(descriptor.id, `${groupName}.${messageKey} should have id`).toBeTypeOf('string');
        expect(descriptor.id?.trim(), `${groupName}.${messageKey} should have non-empty id`).toBeTruthy();

        expect(descriptor.defaultMessage, `${groupName}.${messageKey} should have defaultMessage`).toBeTypeOf('string');
        expect(descriptor.defaultMessage?.trim(), `${groupName}.${messageKey} should have non-empty defaultMessage`).toBeTruthy();

        expect(descriptor.description, `${groupName}.${messageKey} should have description`).toBeTypeOf('string');
        expect(descriptor.description?.toString().trim(), `${groupName}.${messageKey} should have non-empty description`).toBeTruthy();
      }
    }
  });

  it('keeps shared ids semantically consistent', () => {
    const idToMessages = new Map<string, Set<string>>();

    for (const [, group] of groups) {
      for (const [, descriptor] of Object.entries(group)) {
        const id = descriptor.id as string;
        const defaultMessage = descriptor.defaultMessage as string;

        const messagesForId = idToMessages.get(id) ?? new Set<string>();
        messagesForId.add(defaultMessage);
        idToMessages.set(id, messagesForId);
      }
    }

    for (const [id, defaultMessages] of idToMessages) {
      expect(defaultMessages.size, `id ${id} maps to multiple default messages`).toBe(1);
    }
  });
});
