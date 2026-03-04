import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  setPendingFoundryUpdate,
  clearPendingFoundryUpdate,
  hasPendingFoundryUpdates,
  flushPendingFoundryUpdates,
  getPendingFoundryUpdate,
  consumeVersionRefresh,
} from '../foundryUpdates';

const mockHttpClient = {
  dispose: vi.fn(),
  get: vi.fn().mockResolvedValue({}),
  post: vi.fn().mockResolvedValue({}),
  put: vi.fn().mockResolvedValue({}),
  patch: vi.fn().mockResolvedValue({}),
  delete: vi.fn().mockResolvedValue({}),
};

// Mock the external dependencies
vi.mock('@microsoft/logic-apps-shared', () => ({
  updateFoundryAgent: vi.fn().mockResolvedValue({}),
  CognitiveServiceService: vi.fn(() => ({
    getFoundryAccessToken: vi.fn().mockResolvedValue('mock-token'),
    httpClient: mockHttpClient,
  })),
}));

describe('foundryUpdates', () => {
  beforeEach(() => {
    // Clear all pending updates between tests
    // We do this by flushing (which clears the map)
    // But first we need to ensure it's clean
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

  describe('flushPendingFoundryUpdates', () => {
    it('should return empty array when no pending updates', async () => {
      const results = await flushPendingFoundryUpdates();
      expect(results).toEqual([]);
    });

    it('should call updateFoundryAgent for each pending update', async () => {
      const { updateFoundryAgent } = await import('@microsoft/logic-apps-shared');

      setPendingFoundryUpdate('node-1', {
        projectEndpoint: 'https://acct.services.ai.azure.com/api/projects/proj',
        agentId: 'agent-1',
        updates: { model: 'gpt-4', instructions: 'Be helpful' },
      });

      const results = await flushPendingFoundryUpdates();
      expect(results).toHaveLength(1);
      expect(results[0].status).toBe('fulfilled');
      expect(updateFoundryAgent).toHaveBeenCalledWith(
        mockHttpClient,
        'https://acct.services.ai.azure.com/api/projects/proj',
        'agent-1',
        'mock-token',
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

    it('should return empty array when token getter is unavailable', async () => {
      const { CognitiveServiceService } = await import('@microsoft/logic-apps-shared');
      vi.mocked(CognitiveServiceService).mockReturnValueOnce({ getFoundryAccessToken: undefined, httpClient: undefined } as any);

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
      const { updateFoundryAgent } = await import('@microsoft/logic-apps-shared');
      vi.mocked(updateFoundryAgent)
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

      // consumeVersionRefresh returns true the first time (and clears the flag)
      expect(consumeVersionRefresh('node-1')).toBe(true);
      // Second call returns false — flag was already consumed
      expect(consumeVersionRefresh('node-1')).toBe(false);
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
  });
});
