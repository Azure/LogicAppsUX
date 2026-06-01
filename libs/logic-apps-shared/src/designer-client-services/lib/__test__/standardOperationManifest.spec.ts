import { describe, vi, beforeEach, it, expect } from 'vitest';
import { InitExperimentationServiceService } from '../experimentation';
import { StandardOperationManifestService } from '../standard/operationmanifest';
import { agentType } from '../base/operationmanifest';

describe('StandardOperationManifestService', () => {
  let service: StandardOperationManifestService;

  beforeEach(() => {
    InitExperimentationServiceService({
      isFeatureEnabled: vi.fn(),
      getFeatureValue: vi.fn(),
    });
    service = new StandardOperationManifestService({
      apiVersion: '2024-02-01',
      baseUrl: 'https://test.azure.com',
      httpClient: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() } as any,
    });
  });

  describe('getOperationManifest for agent type', () => {
    it('should always return manifest with builtinTools', async () => {
      const manifest = await service.getOperationManifest('connectorId', agentType);

      const agentChatCompletionSettings = (manifest.properties?.inputs?.properties as any)?.agentModelSettings?.properties
        ?.agentChatCompletionSettings?.properties;

      expect(agentChatCompletionSettings?.builtinTools).toBeDefined();
    });
  });
});
