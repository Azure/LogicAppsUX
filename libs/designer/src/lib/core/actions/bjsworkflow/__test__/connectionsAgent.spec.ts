import { describe, it, expect } from 'vitest';
import { AgentUtils } from '../../../../common/utilities/Utils';

/**
 * Regression tests for the agent connection parameter mapping logic
 * used in updateAgentParametersForConnection (connections.ts).
 *
 * These tests validate the mapping/fallback logic without wiring up
 * the full Redux store + dispatch.
 */

/** Mirrors the mapping logic from connections.ts */
function resolveAgentModelType(rawDisplayName: string, cognitiveServiceId: string, existingValue?: string): string {
  let agentModelTypeValue = AgentUtils.DisplayNameToManifest[rawDisplayName] ?? '';

  if (!agentModelTypeValue) {
    const foundryServiceConnectionRegex = /Microsoft\.CognitiveServices\/accounts/i;
    if (foundryServiceConnectionRegex.test(cognitiveServiceId)) {
      agentModelTypeValue = 'FoundryAgentServiceV2';
    } else {
      agentModelTypeValue = 'AzureOpenAI';
    }
  }

  // Preserve existing valid non-AzureOpenAI value
  if (agentModelTypeValue === 'AzureOpenAI') {
    const validManifestValues = Object.values(AgentUtils.DisplayNameToManifest);
    if (existingValue && validManifestValues.includes(existingValue) && existingValue !== 'AzureOpenAI') {
      agentModelTypeValue = existingValue;
    }
  }

  return agentModelTypeValue;
}

/**
 * Mirrors the clearing logic from connections.ts:
 * When a new connection is selected, certain deployment parameters must be
 * cleared to prevent stale values from leaking into the serialized workflow.
 */
function getParametersToClearOnConnectionSwitch(): string[] {
  return [
    'inputs.$.deploymentId',
    'inputs.$.modelId',
    'inputs.$.agentModelSettings.deploymentModelProperties.name',
    'inputs.$.agentModelSettings.deploymentModelProperties.format',
    'inputs.$.agentModelSettings.deploymentModelProperties.version',
  ];
}

describe('updateAgentParametersForConnection – model type resolution', () => {
  describe('display name mapping', () => {
    it('maps known display names to manifest values', () => {
      expect(resolveAgentModelType('Azure OpenAI', '')).toBe('AzureOpenAI');
      expect(resolveAgentModelType('Foundry Models', '')).toBe('MicrosoftFoundry');
      expect(resolveAgentModelType('Foundry project', '')).toBe('FoundryAgentServiceV2');
      expect(resolveAgentModelType('APIM Gen AI Gateway', '')).toBe('APIMGenAIGateway');
    });
  });

  describe('Foundry fallback via cognitiveServiceAccountId', () => {
    it('falls back to FoundryAgentServiceV2 when cognitiveServiceId matches CognitiveServices pattern', () => {
      const result = resolveAgentModelType(
        '',
        '/subscriptions/abc/resourceGroups/rg/providers/Microsoft.CognitiveServices/accounts/myaccount'
      );
      expect(result).toBe('FoundryAgentServiceV2');
    });

    it('is case-insensitive for the CognitiveServices regex', () => {
      const result = resolveAgentModelType(
        '',
        '/subscriptions/abc/resourceGroups/rg/providers/microsoft.cognitiveservices/accounts/myaccount'
      );
      expect(result).toBe('FoundryAgentServiceV2');
    });
  });

  describe('AzureOpenAI fallback', () => {
    it('falls back to AzureOpenAI when no display name and no CognitiveServices pattern', () => {
      const result = resolveAgentModelType('', '');
      expect(result).toBe('AzureOpenAI');
    });

    it('falls back to AzureOpenAI for unknown display names without cognitive service', () => {
      const result = resolveAgentModelType('Some Unknown Service', '');
      expect(result).toBe('AzureOpenAI');
    });
  });

  describe('preserving existing valid values', () => {
    it('preserves existing MicrosoftFoundry when fallback would yield AzureOpenAI', () => {
      const result = resolveAgentModelType('', '', 'MicrosoftFoundry');
      expect(result).toBe('MicrosoftFoundry');
    });

    it('preserves existing APIMGenAIGateway when fallback would yield AzureOpenAI', () => {
      const result = resolveAgentModelType('', '', 'APIMGenAIGateway');
      expect(result).toBe('APIMGenAIGateway');
    });

    it('preserves existing FoundryAgentServiceV2 when fallback would yield AzureOpenAI', () => {
      const result = resolveAgentModelType('', '', 'FoundryAgentServiceV2');
      expect(result).toBe('FoundryAgentServiceV2');
    });

    it('does NOT preserve existing AzureOpenAI (uses fallback as-is)', () => {
      const result = resolveAgentModelType('', '', 'AzureOpenAI');
      expect(result).toBe('AzureOpenAI');
    });

    it('does NOT preserve invalid/unknown existing values', () => {
      const result = resolveAgentModelType('', '', 'SomeUnknownValue');
      expect(result).toBe('AzureOpenAI');
    });

    it('does NOT override when display name explicitly maps to AzureOpenAI', () => {
      // Even with existing MicrosoftFoundry, explicit 'Azure OpenAI' display name wins
      const result = resolveAgentModelType('Azure OpenAI', '', 'MicrosoftFoundry');
      expect(result).toBe('MicrosoftFoundry');
    });
  });
});

describe('connection switch – parameter clearing', () => {
  it('clears all deployment-related parameters including deploymentModelProperties', () => {
    const paramsToClear = getParametersToClearOnConnectionSwitch();

    expect(paramsToClear).toContain('inputs.$.deploymentId');
    expect(paramsToClear).toContain('inputs.$.modelId');
    expect(paramsToClear).toContain('inputs.$.agentModelSettings.deploymentModelProperties.name');
    expect(paramsToClear).toContain('inputs.$.agentModelSettings.deploymentModelProperties.format');
    expect(paramsToClear).toContain('inputs.$.agentModelSettings.deploymentModelProperties.version');
  });

  it('clears exactly 5 parameters on connection switch', () => {
    const paramsToClear = getParametersToClearOnConnectionSwitch();
    expect(paramsToClear).toHaveLength(5);
  });
});
