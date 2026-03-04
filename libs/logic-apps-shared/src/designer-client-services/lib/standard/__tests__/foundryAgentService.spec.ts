import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  buildProjectEndpointFromResourceId,
  updateFoundryAgent,
  listFoundryModels,
  listFoundryAgents,
  listAllFoundryAgents,
  getFoundryAgent,
} from '../foundryAgentService';
import type { IHttpClient } from '../../httpClient';

function createMockHttpClient(overrides: Partial<IHttpClient> = {}): IHttpClient {
  return {
    dispose: vi.fn(),
    get: vi.fn().mockResolvedValue({}),
    post: vi.fn().mockResolvedValue({}),
    put: vi.fn().mockResolvedValue({}),
    patch: vi.fn().mockResolvedValue({}),
    delete: vi.fn().mockResolvedValue({}),
    ...overrides,
  };
}

// Helper to build a raw agent response matching the API shape
function rawAgent(overrides: Record<string, unknown> = {}) {
  return {
    object: 'agent',
    id: overrides['id'] ?? 'agent-1',
    name: overrides['name'] ?? 'TestAgent',
    versions: {
      latest: {
        definition: {
          kind: 'prompt',
          model: overrides['model'] ?? 'gpt-4',
          instructions: overrides['instructions'] ?? 'Do stuff',
          tools: overrides['tools'] ?? [],
        },
        metadata: overrides['metadata'] ?? {},
        description: overrides['description'] ?? null,
        created_at: overrides['created_at'] ?? 1700000000,
      },
    },
  };
}

describe('foundryAgentService', () => {
  let httpClient: IHttpClient;

  beforeEach(() => {
    httpClient = createMockHttpClient();
  });

  // --- buildProjectEndpointFromResourceId ---

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

    it('should handle resource IDs with trailing slash', () => {
      const resourceId = '/subscriptions/sub/resourceGroups/rg/providers/Microsoft.CognitiveServices/accounts/acct/projects/proj/';
      const result = buildProjectEndpointFromResourceId(resourceId);
      expect(result).toBe('https://acct.services.ai.azure.com/api/projects/proj');
    });
  });

  // --- listFoundryAgents ---

  describe('listFoundryAgents', () => {
    it('should call the agents endpoint and return the raw list response', async () => {
      const listResponse = {
        object: 'list',
        data: [rawAgent()],
        first_id: 'agent-1',
        last_id: 'agent-1',
        has_more: false,
      };
      vi.mocked(httpClient.get).mockResolvedValue(listResponse);

      const result = await listFoundryAgents(httpClient, 'https://acct.services.ai.azure.com/api/projects/proj', 'fake-token');

      expect(result.object).toBe('list');
      expect(result.data).toHaveLength(1);
      expect(result.has_more).toBe(false);

      const callArgs = vi.mocked(httpClient.get).mock.calls[0][0];
      expect(callArgs.uri).toContain('/agents');
      expect(callArgs.queryParameters).toHaveProperty('api-version');
    });

    it('should append query parameters when options are provided', async () => {
      vi.mocked(httpClient.get).mockResolvedValue({ object: 'list', data: [], first_id: null, last_id: null, has_more: false });

      await listFoundryAgents(httpClient, 'https://acct.services.ai.azure.com/api/projects/proj', 'fake-token', {
        limit: 50,
        order: 'desc',
        after: 'cursor-abc',
      });

      const callArgs = vi.mocked(httpClient.get).mock.calls[0][0];
      expect(callArgs.queryParameters).toMatchObject({ limit: 50, order: 'desc', after: 'cursor-abc' });
    });

    it('should normalize cognitiveservices endpoint to services.ai.azure.com', async () => {
      vi.mocked(httpClient.get).mockResolvedValue({ object: 'list', data: [], first_id: null, last_id: null, has_more: false });

      await listFoundryAgents(httpClient, 'https://acct.cognitiveservices.azure.com/api/projects/proj', 'fake-token');

      const callArgs = vi.mocked(httpClient.get).mock.calls[0][0];
      expect(callArgs.uri).toContain('acct.services.ai.azure.com');
      expect(callArgs.uri).not.toContain('cognitiveservices');
    });

    it('should include Authorization header with Bearer token', async () => {
      vi.mocked(httpClient.get).mockResolvedValue({ object: 'list', data: [], first_id: null, last_id: null, has_more: false });

      await listFoundryAgents(httpClient, 'https://acct.services.ai.azure.com/api/projects/proj', 'my-secret-token');

      const callArgs = vi.mocked(httpClient.get).mock.calls[0][0];
      expect(callArgs.headers).toMatchObject({ Authorization: 'Bearer my-secret-token' });
      expect(callArgs.noAuth).toBe(true);
    });
  });

  // --- listAllFoundryAgents ---

  describe('listAllFoundryAgents', () => {
    it('should return normalized agents from a single page', async () => {
      const listResponse = {
        object: 'list',
        data: [rawAgent({ id: 'a1', name: 'Agent1' }), rawAgent({ id: 'a2', name: 'Agent2' })],
        first_id: 'a1',
        last_id: 'a2',
        has_more: false,
      };
      vi.mocked(httpClient.get).mockResolvedValue(listResponse);

      const agents = await listAllFoundryAgents(httpClient, 'https://acct.services.ai.azure.com/api/projects/proj', 'fake-token');

      expect(agents).toHaveLength(2);
      expect(agents[0].id).toBe('a1');
      expect(agents[0].name).toBe('Agent1');
      expect(agents[0].object).toBe('agent');
      expect(agents[1].id).toBe('a2');
    });

    it('should auto-paginate when has_more is true', async () => {
      const page1 = {
        object: 'list',
        data: [rawAgent({ id: 'a1' })],
        first_id: 'a1',
        last_id: 'a1',
        has_more: true,
      };
      const page2 = {
        object: 'list',
        data: [rawAgent({ id: 'a2' })],
        first_id: 'a2',
        last_id: 'a2',
        has_more: false,
      };
      vi.mocked(httpClient.get).mockResolvedValueOnce(page1).mockResolvedValueOnce(page2);

      const agents = await listAllFoundryAgents(httpClient, 'https://acct.services.ai.azure.com/api/projects/proj', 'fake-token');

      expect(agents).toHaveLength(2);
      expect(agents[0].id).toBe('a1');
      expect(agents[1].id).toBe('a2');
      expect(httpClient.get).toHaveBeenCalledTimes(2);

      // Second call should include after=a1 for pagination
      const secondCallArgs = vi.mocked(httpClient.get).mock.calls[1][0];
      expect(secondCallArgs.queryParameters).toMatchObject({ after: 'a1' });
    });

    it('should stop paginating when last_id is null even if has_more is true', async () => {
      const page = {
        object: 'list',
        data: [rawAgent({ id: 'a1' })],
        first_id: 'a1',
        last_id: null,
        has_more: true,
      };
      vi.mocked(httpClient.get).mockResolvedValue(page);

      const agents = await listAllFoundryAgents(httpClient, 'https://acct.services.ai.azure.com/api/projects/proj', 'fake-token');

      expect(agents).toHaveLength(1);
      expect(httpClient.get).toHaveBeenCalledTimes(1);
    });

    it('should normalize agent fields from nested versions structure', async () => {
      const agent = rawAgent({
        id: 'a1',
        name: 'MyAgent',
        model: 'gpt-4o',
        instructions: 'Be helpful',
        tools: [{ type: 'code_interpreter' }],
        description: 'A test agent',
        created_at: 1700000000,
        metadata: { key: 'value' },
      });
      vi.mocked(httpClient.get).mockResolvedValue({
        object: 'list',
        data: [agent],
        first_id: 'a1',
        last_id: 'a1',
        has_more: false,
      });

      const agents = await listAllFoundryAgents(httpClient, 'https://acct.services.ai.azure.com/api/projects/proj', 'fake-token');

      expect(agents[0]).toEqual({
        id: 'a1',
        name: 'MyAgent',
        model: 'gpt-4o',
        instructions: 'Be helpful',
        tools: [{ type: 'code_interpreter' }],
        metadata: { key: 'value' },
        created_at: 1700000000,
        object: 'agent',
        description: 'A test agent',
      });
    });

    it('should handle agents with missing versions/definition gracefully', async () => {
      const minimal = { object: 'agent', id: 'a1', name: 'Bare' };
      vi.mocked(httpClient.get).mockResolvedValue({
        object: 'list',
        data: [minimal],
        first_id: 'a1',
        last_id: 'a1',
        has_more: false,
      });

      const agents = await listAllFoundryAgents(httpClient, 'https://acct.services.ai.azure.com/api/projects/proj', 'fake-token');

      expect(agents[0].id).toBe('a1');
      expect(agents[0].model).toBe('');
      expect(agents[0].instructions).toBeNull();
      expect(agents[0].tools).toEqual([]);
      expect(agents[0].metadata).toEqual({});
      expect(agents[0].created_at).toBe(0);
    });
  });

  // --- getFoundryAgent ---

  describe('getFoundryAgent', () => {
    it('should fetch a single agent by ID and return normalized result', async () => {
      vi.mocked(httpClient.get).mockResolvedValue(rawAgent({ id: 'agent-42', name: 'SpecificAgent', model: 'gpt-4o-mini' }));

      const agent = await getFoundryAgent(httpClient, 'https://acct.services.ai.azure.com/api/projects/proj', 'agent-42', 'fake-token');

      expect(agent.id).toBe('agent-42');
      expect(agent.name).toBe('SpecificAgent');
      expect(agent.model).toBe('gpt-4o-mini');

      const callArgs = vi.mocked(httpClient.get).mock.calls[0][0];
      expect(callArgs.uri).toContain('/agents/agent-42');
    });

    it('should URL-encode the agent ID', async () => {
      vi.mocked(httpClient.get).mockResolvedValue(rawAgent({ id: 'agent/with spaces' }));

      await getFoundryAgent(httpClient, 'https://acct.services.ai.azure.com/api/projects/proj', 'agent/with spaces', 'fake-token');

      const callArgs = vi.mocked(httpClient.get).mock.calls[0][0];
      expect(callArgs.uri).toContain('/agents/agent%2Fwith%20spaces');
    });
  });

  // --- updateFoundryAgent ---

  describe('updateFoundryAgent', () => {
    it('should send model and instructions inside a definition envelope with kind "prompt"', async () => {
      vi.mocked(httpClient.post).mockResolvedValue(rawAgent());

      await updateFoundryAgent(httpClient, 'https://acct.services.ai.azure.com/api/projects/proj', 'agent-1', 'fake-token', {
        model: 'gpt-4',
        instructions: 'Do stuff',
      });

      expect(httpClient.post).toHaveBeenCalledOnce();
      const callArgs = vi.mocked(httpClient.post).mock.calls[0][0];
      expect(callArgs.uri).toContain('/agents/agent-1');
      expect(callArgs.content).toEqual({
        definition: {
          kind: 'prompt',
          model: 'gpt-4',
          instructions: 'Do stuff',
        },
      });
    });

    it('should include name at the top level, not inside definition', async () => {
      vi.mocked(httpClient.post).mockResolvedValue(rawAgent({ name: 'Renamed' }));

      await updateFoundryAgent(httpClient, 'https://acct.services.ai.azure.com/api/projects/proj', 'agent-1', 'fake-token', {
        name: 'Renamed',
      });

      const callArgs = vi.mocked(httpClient.post).mock.calls[0][0];
      expect(callArgs.content).toMatchObject({ name: 'Renamed', definition: { kind: 'prompt' } });
    });

    it('should include description at the top level', async () => {
      vi.mocked(httpClient.post).mockResolvedValue(rawAgent());

      await updateFoundryAgent(httpClient, 'https://acct.services.ai.azure.com/api/projects/proj', 'agent-1', 'fake-token', {
        description: 'Updated description',
      });

      const callArgs = vi.mocked(httpClient.post).mock.calls[0][0];
      expect(callArgs.content).toMatchObject({ description: 'Updated description', definition: { kind: 'prompt' } });
    });

    it('should only include provided fields in the payload', async () => {
      vi.mocked(httpClient.post).mockResolvedValue(rawAgent());

      await updateFoundryAgent(httpClient, 'https://acct.services.ai.azure.com/api/projects/proj', 'agent-1', 'fake-token', {
        model: 'gpt-4o',
      });

      const callArgs = vi.mocked(httpClient.post).mock.calls[0][0];
      expect(callArgs.content).toEqual({ definition: { kind: 'prompt', model: 'gpt-4o' } });
    });

    it('should propagate errors from httpClient', async () => {
      vi.mocked(httpClient.post).mockRejectedValue(new Error('bad request'));

      await expect(
        updateFoundryAgent(httpClient, 'https://acct.services.ai.azure.com/api/projects/proj', 'agent-1', 'fake-token', { model: 'gpt-4' })
      ).rejects.toThrow('bad request');
    });
  });

  // --- listFoundryModels ---

  describe('listFoundryModels', () => {
    it('should parse deployments with data-plane format', async () => {
      vi.mocked(httpClient.get).mockResolvedValue({
        data: [
          { name: 'gpt-4-deployment', model_name: 'gpt-4' },
          { name: 'gpt-35-deployment', model_name: 'gpt-35-turbo' },
        ],
      });

      const models = await listFoundryModels(httpClient, 'https://acct.services.ai.azure.com/api/projects/proj', 'fake-token');
      expect(models).toHaveLength(2);
      expect(models[0]).toEqual({ id: 'gpt-4-deployment', name: 'gpt-4' });
      expect(models[1]).toEqual({ id: 'gpt-35-deployment', name: 'gpt-35-turbo' });
    });

    it('should parse deployments with ARM format (value array)', async () => {
      vi.mocked(httpClient.get).mockResolvedValue({
        value: [{ name: 'deploy-1', properties: { model: { name: 'gpt-4', version: '0613' } } }],
      });

      const models = await listFoundryModels(httpClient, 'https://acct.services.ai.azure.com/api/projects/proj', 'fake-token');
      expect(models).toHaveLength(1);
      expect(models[0]).toEqual({ id: 'deploy-1', name: 'gpt-4' });
    });

    it('should return empty array when no deployments exist', async () => {
      vi.mocked(httpClient.get).mockResolvedValue({});

      const models = await listFoundryModels(httpClient, 'https://acct.services.ai.azure.com/api/projects/proj', 'fake-token');
      expect(models).toEqual([]);
    });

    it('should fall back to deployment name when model name is missing', async () => {
      vi.mocked(httpClient.get).mockResolvedValue({ data: [{ name: 'my-deploy' }] });

      const models = await listFoundryModels(httpClient, 'https://acct.services.ai.azure.com/api/projects/proj', 'fake-token');
      expect(models[0]).toEqual({ id: 'my-deploy', name: 'my-deploy' });
    });

    it('should filter out deployments without a name', async () => {
      vi.mocked(httpClient.get).mockResolvedValue({ data: [{ name: 'valid' }, { name: '' }, { model_name: 'orphan' }] });

      const models = await listFoundryModels(httpClient, 'https://acct.services.ai.azure.com/api/projects/proj', 'fake-token');
      expect(models).toHaveLength(1);
      expect(models[0].id).toBe('valid');
    });

    it('should call the deployments endpoint with correct api-version', async () => {
      vi.mocked(httpClient.get).mockResolvedValue({ data: [] });

      await listFoundryModels(httpClient, 'https://acct.services.ai.azure.com/api/projects/proj', 'fake-token');

      const callArgs = vi.mocked(httpClient.get).mock.calls[0][0];
      expect(callArgs.uri).toContain('/deployments');
      expect(callArgs.queryParameters).toHaveProperty('api-version');
    });
  });
});
