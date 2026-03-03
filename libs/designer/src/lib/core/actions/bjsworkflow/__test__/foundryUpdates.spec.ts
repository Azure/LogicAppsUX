import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  setPendingFoundryUpdate,
  clearPendingFoundryUpdate,
  hasPendingFoundryUpdates,
  flushPendingFoundryUpdates,
} from '../foundryUpdates';

// Mock the external dependencies
vi.mock('@microsoft/logic-apps-shared', () => ({
  updateFoundryAgent: vi.fn().mockResolvedValue({}),
  CognitiveServiceService: vi.fn(() => ({
    getFoundryAccessToken: vi.fn().mockResolvedValue('mock-token'),
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
      expect(updateFoundryAgent).toHaveBeenCalledWith('https://acct.services.ai.azure.com/api/projects/proj', 'agent-1', 'mock-token', {
        model: 'gpt-4',
        instructions: 'Be helpful',
      });
    });

    it('should clear all pending updates after flush', async () => {
      setPendingFoundryUpdate('node-1', {
        projectEndpoint: 'https://acct.services.ai.azure.com/api/projects/proj',
        agentId: 'agent-1',
        updates: { model: 'gpt-4' },
      });

      await flushPendingFoundryUpdates();
      expect(hasPendingFoundryUpdates()).toBe(false);
    });
  });
});
