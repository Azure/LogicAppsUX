import { describe, it, expect } from 'vitest';
import agentloop from '../agentloop';

const inputs = agentloop.properties.inputs?.properties as Record<string, any>;
const agentModelTypeOptions = inputs.agentModelType['x-ms-editor-options'].options as {
  value: string;
  displayName: string;
}[];

describe('agentloop – MicrosoftFoundry regression', () => {
  describe('agentModelType dropdown values', () => {
    const dropdownValues = agentModelTypeOptions.map((o) => o.value);

    it('should include MicrosoftFoundry', () => {
      expect(dropdownValues).toContain('MicrosoftFoundry');
    });

    it('should contain the full expected set of dropdown values', () => {
      expect(dropdownValues).toEqual(['MicrosoftFoundry', 'FoundryAgentService', 'APIMGenAIGateway', 'V1ChatCompletionsService']);
    });

    it('should NOT include AzureOpenAI (removed from new connection creation)', () => {
      expect(dropdownValues).not.toContain('AzureOpenAI');
    });

    it('should default to MicrosoftFoundry', () => {
      expect(inputs.agentModelType.default).toBe('MicrosoftFoundry');
    });
  });

  describe('deploymentId visibility', () => {
    const deploymentVisValues = inputs.deploymentId['x-ms-input-dependencies'].parameters[0].values as string[];

    it('should include AzureOpenAI, MicrosoftFoundry, and APIMGenAIGateway', () => {
      expect(deploymentVisValues).toContain('AzureOpenAI');
      expect(deploymentVisValues).toContain('MicrosoftFoundry');
      expect(deploymentVisValues).toContain('APIMGenAIGateway');
    });
  });

  describe('no leftover AzureOpenAI in dropdown options', () => {
    it('no dropdown option should have AzureOpenAI as a value', () => {
      for (const option of agentModelTypeOptions) {
        expect(option.value).not.toBe('AzureOpenAI');
      }
    });
  });
});
