import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { buildProjectEndpointFromResourceId, updateFoundryAgent, listFoundryModels } from '../foundryAgentService';

describe('foundryAgentService', () => {
  describe('buildProjectEndpointFromResourceId', () => {
    it('should extract account and project from a valid ARM resource ID', () => {
      const resourceId =
        '/subscriptions/11e43792-2b16-4f94-b5ea-de10eade3aef/resourceGroups/MyRG/providers/Microsoft.CognitiveServices/accounts/myAccount/projects/myProject';
      const result = buildProjectEndpointFromResourceId(resourceId);
      expect(result).toBe('https://myAccount.services.ai.azure.com/api/projects/myProject');
    });

    it('should be case-insensitive for the provider path', () => {
      const resourceId = '/subscriptions/abc/resourceGroups/rg/providers/microsoft.cognitiveservices/accounts/Acct/projects/Proj';
      const result = buildProjectEndpointFromResourceId(resourceId);
      expect(result).toBe('https://Acct.services.ai.azure.com/api/projects/Proj');
    });

    it('should return undefined for an invalid resource ID', () => {
      expect(buildProjectEndpointFromResourceId('/subscriptions/abc/resourceGroups/rg')).toBeUndefined();
    });

    it('should return undefined for an empty string', () => {
      expect(buildProjectEndpointFromResourceId('')).toBeUndefined();
    });

    it('should handle resource IDs with special characters in names', () => {
      const resourceId =
        '/subscriptions/sub-123/resourceGroups/my-rg/providers/Microsoft.CognitiveServices/accounts/my-account-01/projects/my-project-02';
      const result = buildProjectEndpointFromResourceId(resourceId);
      expect(result).toBe('https://my-account-01.services.ai.azure.com/api/projects/my-project-02');
    });
  });

  describe('updateFoundryAgent', () => {
    const originalFetch = globalThis.fetch;

    beforeEach(() => {
      globalThis.fetch = vi.fn();
    });

    afterEach(() => {
      globalThis.fetch = originalFetch;
    });

    it('should send model and instructions inside a definition envelope with kind "prompt"', async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          object: 'agent',
          id: 'agent-1',
          name: 'TestAgent',
          versions: { latest: { definition: { kind: 'prompt', model: 'gpt-4', instructions: 'Do stuff' }, metadata: {} } },
        }),
      };
      (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(mockResponse);

      await updateFoundryAgent('https://acct.services.ai.azure.com/api/projects/proj', 'agent-1', 'fake-token', {
        model: 'gpt-4',
        instructions: 'Do stuff',
      });

      expect(globalThis.fetch).toHaveBeenCalledOnce();
      const [url, options] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(url).toContain('/agents/agent-1');
      expect(options.method).toBe('POST');

      const body = JSON.parse(options.body);
      expect(body).toEqual({
        definition: {
          kind: 'prompt',
          model: 'gpt-4',
          instructions: 'Do stuff',
        },
      });
    });

    it('should include name at the top level, not inside definition', async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          object: 'agent',
          id: 'agent-1',
          name: 'Renamed',
          versions: { latest: { definition: { kind: 'prompt' }, metadata: {} } },
        }),
      };
      (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(mockResponse);

      await updateFoundryAgent('https://acct.services.ai.azure.com/api/projects/proj', 'agent-1', 'fake-token', {
        name: 'Renamed',
      });

      const body = JSON.parse((globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body);
      expect(body.name).toBe('Renamed');
      expect(body.definition).toEqual({ kind: 'prompt' });
    });

    it('should throw on non-OK responses', async () => {
      const mockResponse = {
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        text: vi.fn().mockResolvedValue('{"error":{"message":"bad"}}'),
      };
      (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(mockResponse);

      await expect(
        updateFoundryAgent('https://acct.services.ai.azure.com/api/projects/proj', 'agent-1', 'fake-token', { model: 'gpt-4' })
      ).rejects.toThrow('Foundry API error: bad');
    });
  });

  describe('listFoundryModels', () => {
    const originalFetch = globalThis.fetch;

    beforeEach(() => {
      globalThis.fetch = vi.fn();
    });

    afterEach(() => {
      globalThis.fetch = originalFetch;
    });

    it('should parse deployments with data-plane format', async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          data: [
            { name: 'gpt-4-deployment', model_name: 'gpt-4' },
            { name: 'gpt-35-deployment', model_name: 'gpt-35-turbo' },
          ],
        }),
      };
      (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(mockResponse);

      const models = await listFoundryModels('https://acct.services.ai.azure.com/api/projects/proj', 'fake-token');
      expect(models).toHaveLength(2);
      expect(models[0]).toEqual({ id: 'gpt-4-deployment', name: 'gpt-4' });
      expect(models[1]).toEqual({ id: 'gpt-35-deployment', name: 'gpt-35-turbo' });
    });

    it('should parse deployments with ARM format (value array)', async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          value: [{ name: 'deploy-1', properties: { model: { name: 'gpt-4', version: '0613' } } }],
        }),
      };
      (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(mockResponse);

      const models = await listFoundryModels('https://acct.services.ai.azure.com/api/projects/proj', 'fake-token');
      expect(models).toHaveLength(1);
      expect(models[0]).toEqual({ id: 'deploy-1', name: 'gpt-4' });
    });

    it('should return empty array when no deployments exist', async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({}),
      };
      (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(mockResponse);

      const models = await listFoundryModels('https://acct.services.ai.azure.com/api/projects/proj', 'fake-token');
      expect(models).toEqual([]);
    });
  });
});
