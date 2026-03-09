import { describe, vi, beforeEach, it, expect } from 'vitest';
import { InitExperimentationServiceService } from '../experimentation';
import {
  enableAPIMGatewayConnection,
  enableCodeInterpreterConsumption,
  enableCodeInterpreterStandard,
  EXP_FLAGS,
} from '../experimentationFlags';

describe('lib/designer-client-services/experimentationFlags', () => {
  let mockIsFeatureEnabled: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockIsFeatureEnabled = vi.fn();
    InitExperimentationServiceService({
      isFeatureEnabled: mockIsFeatureEnabled,
      getFeatureValue: vi.fn(),
    });
  });

  describe('enableAPIMGatewayConnection', () => {
    it('should return true when feature flag is enabled', async () => {
      mockIsFeatureEnabled.mockResolvedValue(true);
      const result = await enableAPIMGatewayConnection();
      expect(result).toBe(true);
      expect(mockIsFeatureEnabled).toHaveBeenCalledWith(EXP_FLAGS.ENABLE_APIM_GEN_AI_GATEWAY);
    });

    it('should return false when feature flag is disabled', async () => {
      mockIsFeatureEnabled.mockResolvedValue(false);
      const result = await enableAPIMGatewayConnection();
      expect(result).toBe(false);
    });
  });

  describe('enableCodeInterpreterConsumption', () => {
    it('should return true when feature flag is enabled', async () => {
      mockIsFeatureEnabled.mockResolvedValue(true);
      const result = await enableCodeInterpreterConsumption();
      expect(result).toBe(true);
      expect(mockIsFeatureEnabled).toHaveBeenCalledWith(EXP_FLAGS.ENABLE_CODE_INTERPRETER_CONSUMPTION);
    });

    it('should return false when feature flag is disabled', async () => {
      mockIsFeatureEnabled.mockResolvedValue(false);
      const result = await enableCodeInterpreterConsumption();
      expect(result).toBe(false);
    });
  });

  describe('enableCodeInterpreterStandard', () => {
    it('should return true when feature flag is enabled', async () => {
      mockIsFeatureEnabled.mockResolvedValue(true);
      const result = await enableCodeInterpreterStandard();
      expect(result).toBe(true);
      expect(mockIsFeatureEnabled).toHaveBeenCalledWith(EXP_FLAGS.ENABLE_CODE_INTERPRETER_STANDARD);
    });

    it('should return false when feature flag is disabled', async () => {
      mockIsFeatureEnabled.mockResolvedValue(false);
      const result = await enableCodeInterpreterStandard();
      expect(result).toBe(false);
    });
  });
});
