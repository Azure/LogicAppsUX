import { describe, it, expect } from 'vitest';
import {
  commonMessages,
  unitTestMessages,
  workspaceMessages,
  exportMessages,
  designerMessages,
  overviewMessages,
  chatMessages,
} from '../messages';

const messageGroups = {
  commonMessages,
  unitTestMessages,
  workspaceMessages,
  exportMessages,
  designerMessages,
  overviewMessages,
  chatMessages,
};

describe('intl messages', () => {
  for (const [groupName, messages] of Object.entries(messageGroups)) {
    describe(groupName, () => {
      it('should export a non-empty message group', () => {
        expect(Object.keys(messages).length).toBeGreaterThan(0);
      });

      it('should have valid message descriptors with id and defaultMessage', () => {
        for (const [key, descriptor] of Object.entries(messages)) {
          expect(descriptor, `${groupName}.${key} missing id`).toHaveProperty('id');
          expect(descriptor, `${groupName}.${key} missing defaultMessage`).toHaveProperty('defaultMessage');
          expect(typeof (descriptor as any).id).toBe('string');
          expect(typeof (descriptor as any).defaultMessage).toBe('string');
        }
      });
    });
  }
});
