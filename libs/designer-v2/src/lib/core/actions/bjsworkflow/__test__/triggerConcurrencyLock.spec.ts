/**
 * @vitest-environment jsdom
 */
import { describe, expect, it } from 'vitest';
import { isTriggerConcurrencyEnabledInDefinition } from '../settings';
import { getOriginalNodeId, getPersistedNodeOperation } from '../../../state/workflow/workflowSelectors';

describe('trigger concurrency lock resolution', () => {
  const triggerWithConcurrency = {
    type: 'Request',
    kind: 'Http',
    runtimeConfiguration: { concurrency: { runs: 5 } },
  } as any;
  const triggerWithoutConcurrency = {
    type: 'Request',
    kind: 'Http',
  } as any;

  describe('getOriginalNodeId', () => {
    it('returns the id unchanged when there are no replacements', () => {
      expect(getOriginalNodeId({}, 'When_a_HTTP_request_is_received')).toBe('When_a_HTTP_request_is_received');
    });

    it('resolves back to the original id when a renamed node is addressed by its new id', () => {
      const idReplacements = { When_a_HTTP_request_is_received: 'Renamed_trigger' };
      expect(getOriginalNodeId(idReplacements, 'Renamed_trigger')).toBe('When_a_HTTP_request_is_received');
    });

    it('keeps the original id when a renamed node is still addressed by its original id', () => {
      const idReplacements = { When_a_HTTP_request_is_received: 'Renamed_trigger' };
      expect(getOriginalNodeId(idReplacements, 'When_a_HTTP_request_is_received')).toBe('When_a_HTTP_request_is_received');
    });
  });

  describe('isTriggerConcurrencyEnabledInDefinition', () => {
    it('detects persisted trigger concurrency via runtimeConfiguration', () => {
      expect(isTriggerConcurrencyEnabledInDefinition(triggerWithConcurrency)).toBe(true);
    });

    it('detects persisted trigger concurrency via the SingleInstance operation option', () => {
      expect(isTriggerConcurrencyEnabledInDefinition({ type: 'Request', operationOptions: 'SingleInstance' } as any)).toBe(true);
    });

    it('returns false when concurrency is not persisted', () => {
      expect(isTriggerConcurrencyEnabledInDefinition(triggerWithoutConcurrency)).toBe(false);
      expect(isTriggerConcurrencyEnabledInDefinition(undefined)).toBe(false);
    });
  });

  describe('renamed trigger persisted-concurrency lock resolution', () => {
    const originalTriggerId = 'When_a_HTTP_request_is_received';
    const renamedTriggerId = 'Renamed_trigger';
    const idReplacements = { [originalTriggerId]: renamedTriggerId };

    const isLocked = (operations: Record<string, any>, nodeId: string) =>
      isTriggerConcurrencyEnabledInDefinition(getPersistedNodeOperation({ operations, idReplacements } as any, nodeId));

    describe('before reload (operations still keyed by the original id)', () => {
      const operations = { [originalTriggerId]: triggerWithConcurrency };

      it('stays locked when addressed by the original id', () => {
        expect(isLocked(operations, originalTriggerId)).toBe(true);
      });

      it('stays locked when addressed by the renamed id via the reverse-map fallback', () => {
        expect(isLocked(operations, renamedTriggerId)).toBe(true);
      });

      it('stays reversible when only draft (unpublished) concurrency exists', () => {
        expect(isLocked({ [originalTriggerId]: triggerWithoutConcurrency }, renamedTriggerId)).toBe(false);
      });
    });

    describe('after same-session publish/reinitialize (operations rekeyed to the current id, idReplacements stale)', () => {
      const operations = { [renamedTriggerId]: triggerWithConcurrency };

      it('stays locked via the direct id match even though idReplacements still maps old -> new', () => {
        expect(isLocked(operations, renamedTriggerId)).toBe(true);
      });

      it('stays reversible when the reinitialized trigger has no persisted concurrency', () => {
        expect(isLocked({ [renamedTriggerId]: triggerWithoutConcurrency }, renamedTriggerId)).toBe(false);
      });
    });
  });
});
