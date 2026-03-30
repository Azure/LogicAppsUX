import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  setPendingFoundryUpdate,
  clearPendingFoundryUpdate,
  hasPendingFoundryUpdates,
  flushPendingFoundryUpdates,
  getPendingFoundryUpdate,
  consumeVersionRefresh,
  needsVersionRefresh,
} from '../foundryUpdates';

const mockHttpClient = {
  dispose: vi.fn(),
  get: vi.fn().mockResolvedValue({}),
  post: vi.fn().mockResolvedValue({}),
  put: vi.fn().mockResolvedValue({}),
  patch: vi.fn().mockResolvedValue({}),
  delete: vi.fn().mockResolvedValue({}),
};

// Mock the external dependencies (proxy-based API)
vi.mock('@microsoft/logic-apps-shared', () => ({
  updateFoundryAgentViaProxy: vi.fn().mockResolvedValue({}),
  CognitiveServiceService: vi.fn(() => ({
    httpClient: mockHttpClient,
    foundryProxyBaseUrl: 'https://management.azure.com/test/foundryProxy',
  })),
}));

describe('foundryUpdates', () => {
  beforeEach(() => {
    clearPendingFoundryUpdate('node-1');
    clearPendingFoundryUpdate('node-2');
    clearPendingFoundryUpdate('node-3');
  });

  describe('setPendingFoundryUpdate / hasPendingFoundryUpdates', () => {
    it('should report no pending updates when empty', () => {
      expect(hasPendingFoundryUpdates()).toBe(false);
    });

    it('should report pending updates after setting one', () => {
      setPendingFoundryUpdate('node-1', {
        projectEndpoint: 'https://acct.services.ai.azure.com/api/projects/proj',
        agentId: 'agent-1',
        updates: { model: 'gpt-4' },
      });
      expect(hasPendingFoundryUpdates()).toBe(true);
    });

    it('should overwrite previous update for the same node', () => {
      setPendingFoundryUpdate('node-1', {
        projectEndpoint: 'https://acct.services.ai.azure.com/api/projects/proj',
        agentId: 'agent-1',
        updates: { model: 'gpt-4' },
      });
      setPendingFoundryUpdate('node-1', {
        projectEndpoint: 'https://acct.services.ai.azure.com/api/projects/proj',
        agentId: 'agent-1',
        updates: { model: 'gpt-5' },
      });
      expect(hasPendingFoundryUpdates()).toBe(true);
    });
  });

  describe('clearPendingFoundryUpdate', () => {
    it('should remove a pending update for a specific node', () => {
      setPendingFoundryUpdate('node-1', {
        projectEndpoint: 'https://acct.services.ai.azure.com/api/projects/proj',
        agentId: 'agent-1',
        updates: { model: 'gpt-4' },
      });
      clearPendingFoundryUpdate('node-1');
      expect(hasPendingFoundryUpdates()).toBe(false);
    });

    it('should not throw when clearing a non-existent node', () => {
      expect(() => clearPendingFoundryUpdate('nonexistent')).not.toThrow();
    });
  });

  describe('getPendingFoundryUpdate', () => {
    it('should return undefined for nodes with no pending update', () => {
      expect(getPendingFoundryUpdate('nonexistent')).toBeUndefined();
    });

    it('should round-trip selectedVersion through set/get', () => {
      setPendingFoundryUpdate('node-1', {
        projectEndpoint: 'https://acct.services.ai.azure.com/api/projects/proj',
        agentId: 'agent-1',
        updates: { model: 'gpt-4', instructions: 'Be helpful' },
        selectedVersion: '5',
      });

      const pending = getPendingFoundryUpdate('node-1');
      expect(pending).toBeDefined();
      expect(pending!.selectedVersion).toBe('5');
      expect(pending!.updates.model).toBe('gpt-4');
      expect(pending!.updates.instructions).toBe('Be helpful');
    });

    it('should preserve selectedVersion when only version changes', () => {
      setPendingFoundryUpdate('node-1', {
        projectEndpoint: 'https://acct.services.ai.azure.com/api/projects/proj',
        agentId: 'agent-1',
        updates: { model: 'gpt-4' },
        selectedVersion: '3',
      });

      // Simulate a second edit that overwrites with a new version
      setPendingFoundryUpdate('node-1', {
        projectEndpoint: 'https://acct.services.ai.azure.com/api/projects/proj',
        agentId: 'agent-1',
        updates: { model: 'gpt-5' },
        selectedVersion: '7',
      });

      const pending = getPendingFoundryUpdate('node-1');
      expect(pending!.selectedVersion).toBe('7');
      expect(pending!.updates.model).toBe('gpt-5');
    });

    it('should allow selectedVersion to be undefined', () => {
      setPendingFoundryUpdate('node-1', {
        projectEndpoint: 'https://acct.services.ai.azure.com/api/projects/proj',
        agentId: 'agent-1',
        updates: { model: 'gpt-4' },
      });

      const pending = getPendingFoundryUpdate('node-1');
      expect(pending).toBeDefined();
      expect(pending!.selectedVersion).toBeUndefined();
    });
  });

  describe('flushPendingFoundryUpdates', () => {
    it('should return empty array when no pending updates', async () => {
      const results = await flushPendingFoundryUpdates();
      expect(results).toEqual([]);
    });

    it('should call updateFoundryAgentViaProxy for each pending update', async () => {
      const { updateFoundryAgentViaProxy } = await import('@microsoft/logic-apps-shared');

      setPendingFoundryUpdate('node-1', {
        projectEndpoint: 'https://acct.services.ai.azure.com/api/projects/proj',
        agentId: 'agent-1',
        updates: { model: 'gpt-4', instructions: 'Be helpful' },
      });

      const results = await flushPendingFoundryUpdates();
      expect(results).toHaveLength(1);
      expect(results[0].status).toBe('fulfilled');
      expect(updateFoundryAgentViaProxy).toHaveBeenCalledWith(
        {
          httpClient: mockHttpClient,
          proxyBaseUrl: 'https://management.azure.com/test/foundryProxy',
          foundryEndpoint: 'https://acct.services.ai.azure.com/api/projects/proj',
        },
        'agent-1',
        {
          model: 'gpt-4',
          instructions: 'Be helpful',
        }
      );
    });

    it('should clear successful pending updates after flush', async () => {
      setPendingFoundryUpdate('node-1', {
        projectEndpoint: 'https://acct.services.ai.azure.com/api/projects/proj',
        agentId: 'agent-1',
        updates: { model: 'gpt-4' },
      });

      await flushPendingFoundryUpdates();
      expect(hasPendingFoundryUpdates()).toBe(false);
    });

    it('should return empty array when proxy service is unavailable', async () => {
      const { CognitiveServiceService } = await import('@microsoft/logic-apps-shared');
      vi.mocked(CognitiveServiceService).mockReturnValueOnce({ httpClient: undefined, foundryProxyBaseUrl: undefined } as any);

      setPendingFoundryUpdate('node-1', {
        projectEndpoint: 'https://acct.services.ai.azure.com/api/projects/proj',
        agentId: 'agent-1',
        updates: { model: 'gpt-4' },
      });

      const results = await flushPendingFoundryUpdates();
      expect(results).toEqual([]);
      // Pending update should still exist since we skipped
      expect(hasPendingFoundryUpdates()).toBe(true);
    });

    it('should retain failed entries and throw consolidated error on partial failure', async () => {
      const { updateFoundryAgentViaProxy } = await import('@microsoft/logic-apps-shared');
      vi.mocked(updateFoundryAgentViaProxy)
        .mockResolvedValueOnce({} as any) // node-1 succeeds
        .mockRejectedValueOnce(new Error('API error')); // node-2 fails

      setPendingFoundryUpdate('node-1', {
        projectEndpoint: 'https://acct.services.ai.azure.com/api/projects/proj',
        agentId: 'agent-1',
        updates: { model: 'gpt-4' },
      });
      setPendingFoundryUpdate('node-2', {
        projectEndpoint: 'https://acct.services.ai.azure.com/api/projects/proj',
        agentId: 'agent-2',
        updates: { model: 'gpt-5' },
      });

      await expect(flushPendingFoundryUpdates()).rejects.toThrow('Foundry agent update failed: API error');
      // node-2 should still be pending (failed), node-1 should be cleared (succeeded)
      expect(hasPendingFoundryUpdates()).toBe(true);
    });

    it('should mark flushed nodes for version refresh', async () => {
      setPendingFoundryUpdate('node-1', {
        projectEndpoint: 'https://acct.services.ai.azure.com/api/projects/proj',
        agentId: 'agent-1',
        updates: { model: 'gpt-4' },
      });

      await flushPendingFoundryUpdates();

      // needsVersionRefresh checks without consuming
      expect(needsVersionRefresh('node-1')).toBe(true);
      expect(needsVersionRefresh('node-1')).toBe(true); // still true — not consumed
      // consumeVersionRefresh returns true the first time (and clears the flag)
      expect(consumeVersionRefresh('node-1')).toBe(true);
      // Now both should return false
      expect(needsVersionRefresh('node-1')).toBe(false);
      expect(consumeVersionRefresh('node-1')).toBe(false);
    });

    it('should not consume flag for nodes that were never flushed', () => {
      expect(needsVersionRefresh('never-flushed')).toBe(false);
      expect(consumeVersionRefresh('never-flushed')).toBe(false);
    });

    it('should call onFlushed callback with successfully flushed node IDs', async () => {
      const onFlushed = vi.fn();

      setPendingFoundryUpdate('node-1', {
        projectEndpoint: 'https://acct.services.ai.azure.com/api/projects/proj',
        agentId: 'agent-1',
        updates: { model: 'gpt-4' },
      });
      setPendingFoundryUpdate('node-3', {
        projectEndpoint: 'https://acct.services.ai.azure.com/api/projects/proj',
        agentId: 'agent-3',
        updates: { instructions: 'Be brief' },
      });

      await flushPendingFoundryUpdates(onFlushed);

      expect(onFlushed).toHaveBeenCalledOnce();
      expect(onFlushed).toHaveBeenCalledWith(expect.arrayContaining(['node-1', 'node-3']));
    });

    it('should not call onFlushed when no entries are flushed', async () => {
      const onFlushed = vi.fn();
      await flushPendingFoundryUpdates(onFlushed);
      expect(onFlushed).not.toHaveBeenCalled();
    });

    it('should NOT send selectedVersion to the API (it is UI-only state)', async () => {
      const { updateFoundryAgentViaProxy } = await import('@microsoft/logic-apps-shared');
      vi.mocked(updateFoundryAgentViaProxy).mockResolvedValueOnce({} as any);

      setPendingFoundryUpdate('node-1', {
        projectEndpoint: 'https://acct.services.ai.azure.com/api/projects/proj',
        agentId: 'agent-1',
        updates: { model: 'gpt-4', instructions: 'Be helpful' },
        selectedVersion: '5',
      });

      await flushPendingFoundryUpdates();

      // The third argument to updateFoundryAgentViaProxy should be the `updates` object only,
      // with no selectedVersion property leaking through.
      const callArgs = vi.mocked(updateFoundryAgentViaProxy).mock.calls.at(-1);
      expect(callArgs).toBeDefined();
      const updatesArg = callArgs![2];
      expect(updatesArg).toEqual({ model: 'gpt-4', instructions: 'Be helpful' });
      expect(updatesArg).not.toHaveProperty('selectedVersion');
    });

    it('should clear selectedVersion along with the entry after successful flush', async () => {
      setPendingFoundryUpdate('node-1', {
        projectEndpoint: 'https://acct.services.ai.azure.com/api/projects/proj',
        agentId: 'agent-1',
        updates: { model: 'gpt-4' },
        selectedVersion: '5',
      });

      expect(getPendingFoundryUpdate('node-1')?.selectedVersion).toBe('5');

      await flushPendingFoundryUpdates();

      // The entire entry (including selectedVersion) should be gone
      expect(getPendingFoundryUpdate('node-1')).toBeUndefined();
    });
  });
});
