import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  setPendingFoundryUpdate,
  clearPendingFoundryUpdate,
  hasPendingFoundryUpdates,
  flushPendingFoundryUpdates,
  getPendingFoundryUpdate,
} from '../foundryUpdates';

const mockHttpClient = {
  dispose: vi.fn(),
  get: vi.fn().mockResolvedValue({}),
  post: vi.fn().mockResolvedValue({}),
  put: vi.fn().mockResolvedValue({}),
  patch: vi.fn().mockResolvedValue({}),
  delete: vi.fn().mockResolvedValue({}),
};

vi.mock('@microsoft/logic-apps-shared', () => ({
  updateFoundryAgent: vi.fn().mockResolvedValue({}),
  CognitiveServiceService: vi.fn(() => ({
    getFoundryAccessToken: vi.fn().mockResolvedValue('mock-token'),
    getHttpClient: vi.fn(() => mockHttpClient),
  })),
}));

const endpoint = 'https://acct.services.ai.azure.com/api/projects/proj';

function makeUpdate(agentId = 'agent-1', updates = { model: 'gpt-4' }) {
  return { projectEndpoint: endpoint, agentId, updates };
}

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
      setPendingFoundryUpdate('node-1', makeUpdate());
      expect(hasPendingFoundryUpdates()).toBe(true);
    });

    it('should overwrite previous update for the same node', () => {
      setPendingFoundryUpdate('node-1', makeUpdate('agent-1', { model: 'gpt-4' }));
      setPendingFoundryUpdate('node-1', makeUpdate('agent-1', { model: 'gpt-5' }));
      expect(hasPendingFoundryUpdates()).toBe(true);
      expect(getPendingFoundryUpdate('node-1')?.updates.model).toBe('gpt-5');
    });

    it('should track multiple nodes independently', () => {
      setPendingFoundryUpdate('node-1', makeUpdate('agent-1'));
      setPendingFoundryUpdate('node-2', makeUpdate('agent-2'));
      expect(hasPendingFoundryUpdates()).toBe(true);
      clearPendingFoundryUpdate('node-1');
      expect(hasPendingFoundryUpdates()).toBe(true);
      clearPendingFoundryUpdate('node-2');
      expect(hasPendingFoundryUpdates()).toBe(false);
    });
  });

  describe('clearPendingFoundryUpdate', () => {
    it('should remove a pending update for a specific node', () => {
      setPendingFoundryUpdate('node-1', makeUpdate());
      clearPendingFoundryUpdate('node-1');
      expect(hasPendingFoundryUpdates()).toBe(false);
    });

    it('should not throw when clearing a non-existent node', () => {
      expect(() => clearPendingFoundryUpdate('nonexistent')).not.toThrow();
    });
  });

  describe('getPendingFoundryUpdate', () => {
    it('should return undefined for a node with no pending update', () => {
      expect(getPendingFoundryUpdate('unknown-node')).toBeUndefined();
    });

    it('should return the pending update for a node', () => {
      const update = makeUpdate('agent-42', { model: 'gpt-4o', instructions: 'Be concise' });
      setPendingFoundryUpdate('node-1', update);
      const result = getPendingFoundryUpdate('node-1');
      expect(result).toEqual(update);
    });

    it('should return the latest update after overwrite', () => {
      setPendingFoundryUpdate('node-1', makeUpdate('agent-1', { model: 'gpt-4' }));
      setPendingFoundryUpdate('node-1', makeUpdate('agent-1', { model: 'gpt-4o', instructions: 'Updated' }));
      const result = getPendingFoundryUpdate('node-1');
      expect(result?.updates).toEqual({ model: 'gpt-4o', instructions: 'Updated' });
    });

    it('should return undefined after clearing', () => {
      setPendingFoundryUpdate('node-1', makeUpdate());
      clearPendingFoundryUpdate('node-1');
      expect(getPendingFoundryUpdate('node-1')).toBeUndefined();
    });
  });

  describe('flushPendingFoundryUpdates', () => {
    it('should return empty array when no pending updates', async () => {
      const results = await flushPendingFoundryUpdates();
      expect(results).toEqual([]);
    });

    it('should call updateFoundryAgent for each pending update', async () => {
      const { updateFoundryAgent } = await import('@microsoft/logic-apps-shared');

      setPendingFoundryUpdate('node-1', makeUpdate('agent-1', { model: 'gpt-4', instructions: 'Be helpful' }));

      const results = await flushPendingFoundryUpdates();
      expect(results).toHaveLength(1);
      expect(results[0].status).toBe('fulfilled');
      expect(updateFoundryAgent).toHaveBeenCalledWith(mockHttpClient, endpoint, 'agent-1', 'mock-token', {
        model: 'gpt-4',
        instructions: 'Be helpful',
      });
    });

    it('should clear successful pending updates after flush', async () => {
      setPendingFoundryUpdate('node-1', makeUpdate());
      await flushPendingFoundryUpdates();
      expect(hasPendingFoundryUpdates()).toBe(false);
      expect(getPendingFoundryUpdate('node-1')).toBeUndefined();
    });

    it('should flush multiple nodes in a single call', async () => {
      const { updateFoundryAgent } = await import('@microsoft/logic-apps-shared');
      vi.mocked(updateFoundryAgent).mockResolvedValue({} as any);

      setPendingFoundryUpdate('node-1', makeUpdate('agent-1', { model: 'gpt-4' }));
      setPendingFoundryUpdate('node-2', makeUpdate('agent-2', { instructions: 'New instructions' }));

      const results = await flushPendingFoundryUpdates();
      expect(results).toHaveLength(2);
      expect(results.every((r) => r.status === 'fulfilled')).toBe(true);
      expect(hasPendingFoundryUpdates()).toBe(false);
    });

    it('should return empty array when token getter is unavailable', async () => {
      const { CognitiveServiceService } = await import('@microsoft/logic-apps-shared');
      vi.mocked(CognitiveServiceService).mockReturnValueOnce({ getFoundryAccessToken: undefined, getHttpClient: undefined } as any);

      setPendingFoundryUpdate('node-1', makeUpdate());

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

      setPendingFoundryUpdate('node-1', makeUpdate('agent-1'));
      setPendingFoundryUpdate('node-2', makeUpdate('agent-2'));

      await expect(flushPendingFoundryUpdates()).rejects.toThrow('Foundry agent update failed: API error');
      // node-2 should still be pending (failed), node-1 should be cleared (succeeded)
      expect(hasPendingFoundryUpdates()).toBe(true);
      expect(getPendingFoundryUpdate('node-1')).toBeUndefined();
      expect(getPendingFoundryUpdate('node-2')).toBeDefined();
    });

    it('should aggregate multiple failure messages', async () => {
      const { updateFoundryAgent } = await import('@microsoft/logic-apps-shared');
      vi.mocked(updateFoundryAgent).mockRejectedValueOnce(new Error('Timeout')).mockRejectedValueOnce(new Error('Unauthorized'));

      setPendingFoundryUpdate('node-1', makeUpdate('agent-1'));
      setPendingFoundryUpdate('node-2', makeUpdate('agent-2'));

      await expect(flushPendingFoundryUpdates()).rejects.toThrow('Foundry agent update failed: Timeout; Unauthorized');
    });

    it('should handle non-Error rejection reasons', async () => {
      const { updateFoundryAgent } = await import('@microsoft/logic-apps-shared');
      vi.mocked(updateFoundryAgent).mockRejectedValueOnce('string error');

      setPendingFoundryUpdate('node-1', makeUpdate());

      await expect(flushPendingFoundryUpdates()).rejects.toThrow('Foundry agent update failed: string error');
    });
  });
});
