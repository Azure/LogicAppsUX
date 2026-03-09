import { describe, vi, beforeEach, it, expect } from 'vitest';
import { InitExperimentationServiceService } from '../experimentation';
import { StandardOperationManifestService } from '../standard/operationmanifest';
import { agentType, supportedBaseManifestObjects } from '../base/operationmanifest';

describe('StandardOperationManifestService', () => {
  let mockIsFeatureEnabled: ReturnType<typeof vi.fn>;
  let service: StandardOperationManifestService;

  beforeEach(() => {
    mockIsFeatureEnabled = vi.fn();
    InitExperimentationServiceService({
      isFeatureEnabled: mockIsFeatureEnabled,
      getFeatureValue: vi.fn(),
    });
    service = new StandardOperationManifestService({
      apiVersion: '2024-02-01',
      baseUrl: 'https://test.azure.com',
      httpClient: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() } as any,
    });
  });

  describe('getOperationManifest for agent type', () => {
    it('should return manifest without builtinTools when code interpreter flag is disabled', async () => {
      mockIsFeatureEnabled.mockResolvedValue(false);

      const manifest = await service.getOperationManifest('connectorId', agentType);

      const agentChatCompletionSettings = (manifest.properties?.inputs?.properties as any)?.agentModelSettings?.properties
        ?.agentChatCompletionSettings?.properties;

      expect(agentChatCompletionSettings?.builtinTools).toBeUndefined();
    });

    it('should return manifest with builtinTools when code interpreter flag is enabled', async () => {
      mockIsFeatureEnabled.mockResolvedValue(true);

      const manifest = await service.getOperationManifest('connectorId', agentType);

      const agentChatCompletionSettings = (manifest.properties?.inputs?.properties as any)?.agentModelSettings?.properties
        ?.agentChatCompletionSettings?.properties;

      expect(agentChatCompletionSettings?.builtinTools).toBeDefined();
    });

    it('should not mutate the original manifest when stripping builtinTools', async () => {
      mockIsFeatureEnabled.mockResolvedValue(false);

      await service.getOperationManifest('connectorId', agentType);

      // Verify the original manifest in supportedBaseManifestObjects is untouched
      const originalManifest = supportedBaseManifestObjects.get(agentType);
      const originalBuiltinTools = (originalManifest?.properties?.inputs?.properties as any)?.agentModelSettings?.properties
        ?.agentChatCompletionSettings?.properties?.builtinTools;

      expect(originalBuiltinTools).toBeDefined();
    });
  });
});
