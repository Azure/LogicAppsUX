import { describe, it, expect } from 'vitest';
import { foundryServiceConnectionRegex, microsoftFoundryModelsRegex } from '@microsoft/logic-apps-shared';
import { AgentUtils } from '../../../../common/utilities/Utils';

/**
 * Regression tests for the V2 agent connection parameter mapping logic
 * used in updateAgentParametersForConnection (connections.ts).
 *
 * These tests validate the mapping/fallback logic without wiring up
 * the full Redux store + dispatch.
 */

/** Mirrors the mapping logic from connections.ts */
function resolveAgentModelType(rawDisplayName: string, cognitiveServiceId: string, existingValue?: string): string {
  let agentModelTypeValue = AgentUtils.DisplayNameToManifest[rawDisplayName] ?? '';

  if (!agentModelTypeValue) {
    if (foundryServiceConnectionRegex.test(cognitiveServiceId)) {
      agentModelTypeValue = 'FoundryAgentServiceV2';
    } else if (microsoftFoundryModelsRegex.test(cognitiveServiceId)) {
      agentModelTypeValue = 'MicrosoftFoundry';
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

describe('updateAgentParametersForConnection – model type resolution', () => {
  describe('display name mapping', () => {
    it('maps known display names to manifest values', () => {
      expect(resolveAgentModelType('Azure OpenAI', '')).toBe('AzureOpenAI');
      expect(resolveAgentModelType('Foundry project', '')).toBe('FoundryAgentServiceV2');
    });
  });

  describe('resource ID fallback via cognitiveServiceAccountId', () => {
    it('falls back to FoundryAgentServiceV2 when cognitiveServiceId matches Foundry project pattern', () => {
      const result = resolveAgentModelType(
        '',
        '/subscriptions/abc/resourceGroups/rg/providers/Microsoft.CognitiveServices/accounts/myaccount/projects/myproject'
      );
      expect(result).toBe('FoundryAgentServiceV2');
    });

    it('falls back to MicrosoftFoundry when cognitiveServiceId has a /models suffix', () => {
      const result = resolveAgentModelType(
        '',
        '/subscriptions/abc/resourceGroups/rg/providers/Microsoft.CognitiveServices/accounts/myaccount/models'
      );
      expect(result).toBe('MicrosoftFoundry');
    });
  });

  describe('AzureOpenAI fallback', () => {
    it('falls back to AzureOpenAI for account-level Azure OpenAI resource IDs', () => {
      const result = resolveAgentModelType(
        '',
        '/subscriptions/abc/resourceGroups/rg/providers/Microsoft.CognitiveServices/accounts/myaccount'
      );
      expect(result).toBe('AzureOpenAI');
    });

    it('falls back to AzureOpenAI when no display name and no CognitiveServices pattern', () => {
      const result = resolveAgentModelType('', '');
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

    it('does NOT preserve existing AzureOpenAI (uses fallback as-is)', () => {
      const result = resolveAgentModelType('', '', 'AzureOpenAI');
      expect(result).toBe('AzureOpenAI');
    });

    it('does NOT preserve invalid/unknown existing values', () => {
      const result = resolveAgentModelType('', '', 'SomeUnknownValue');
      expect(result).toBe('AzureOpenAI');
    });
  });
});
