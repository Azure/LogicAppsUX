import { describe, it, expect } from 'vitest';
import agentloop from '../agentloop';

const inputs = agentloop.properties.inputs?.properties as Record<string, any>;
const agentModelTypeOptions = inputs.agentModelType['x-ms-editor-options'].options as {
  value: string;
  displayName: string;
}[];

describe('agentloop – Foundry V2 regression', () => {
  describe('agentModelType dropdown values', () => {
    const dropdownValues = agentModelTypeOptions.map((o) => o.value);

    it('should include FoundryAgentServiceV2 (not FoundryAgentService)', () => {
      expect(dropdownValues).toContain('FoundryAgentServiceV2');
      expect(dropdownValues).not.toContain('FoundryAgentService');
    });

    it('should contain the full expected set of dropdown values', () => {
      expect(dropdownValues).toEqual(['MicrosoftFoundry', 'FoundryAgentServiceV2', 'APIMGenAIGateway', 'V1ChatCompletionsService']);
    });

    it('should NOT include AzureOpenAI (removed from new connection creation)', () => {
      expect(dropdownValues).not.toContain('AzureOpenAI');
    });

    it('should label the V2 option as "Foundry project (Preview)"', () => {
      const v2Option = agentModelTypeOptions.find((o) => o.value === 'FoundryAgentServiceV2');
      expect(v2Option?.displayName).toBe('Foundry project (Preview)');
    });
  });

  describe('V2-required fields', () => {
    it('foundryAgentName is defined with visibility dependency on FoundryAgentServiceV2', () => {
      const field = inputs.foundryAgentName;
      expect(field).toBeDefined();
      const visValues = field['x-ms-input-dependencies'].parameters[0].values;
      expect(visValues).toEqual(['FoundryAgentServiceV2']);
    });

    it('foundryVersionName is defined with visibility dependency on FoundryAgentServiceV2 and no default', () => {
      const field = inputs.foundryVersionName;
      expect(field).toBeDefined();
      expect(field.default).toBeUndefined();
      const visValues = field['x-ms-input-dependencies'].parameters[0].values;
      expect(visValues).toEqual(['FoundryAgentServiceV2']);
    });
  });

  describe('V1-only fields are NOT present', () => {
    it.each(['foundryAgentId', 'foundryAgentVersion', 'foundryAgentVersionNumber'])('%s should not exist in inputs', (fieldName) => {
      expect(inputs[fieldName]).toBeUndefined();
    });
  });

  describe('deploymentId does NOT include V2', () => {
    const deploymentVisValues = inputs.deploymentId['x-ms-input-dependencies'].parameters[0].values as string[];

    it('should NOT include FoundryAgentServiceV2', () => {
      expect(deploymentVisValues).not.toContain('FoundryAgentServiceV2');
    });

    it('should include AzureOpenAI, MicrosoftFoundry, and APIMGenAIGateway', () => {
      expect(deploymentVisValues).toContain('AzureOpenAI');
      expect(deploymentVisValues).toContain('MicrosoftFoundry');
      expect(deploymentVisValues).toContain('APIMGenAIGateway');
    });
  });

  describe('no leftover V1 references in visibility conditions', () => {
    it('no input parameter should reference bare "FoundryAgentService" (without V2 suffix)', () => {
      for (const [key, field] of Object.entries(inputs)) {
        const deps = (field as any)?.['x-ms-input-dependencies'];
        if (!deps?.parameters) {
          continue;
        }
        for (const param of deps.parameters) {
          if (!param.values) {
            continue;
          }
          for (const v of param.values) {
            if (v === 'FoundryAgentService') {
              throw new Error(`Input "${key}" still references bare "FoundryAgentService" — expected "FoundryAgentServiceV2"`);
            }
          }
        }
      }
    });
  });

  describe('knowledgeBaseName excludes V2', () => {
    const kbVisValues = inputs.knowledgeBaseName['x-ms-input-dependencies'].parameters[0].values as string[];

    it('should NOT include FoundryAgentServiceV2', () => {
      expect(kbVisValues).not.toContain('FoundryAgentServiceV2');
    });

    it('should include AzureOpenAI and other non-V2 model types', () => {
      expect(kbVisValues).toContain('AzureOpenAI');
      expect(kbVisValues).toContain('MicrosoftFoundry');
    });
  });

  describe('foundryVersionName contract', () => {
    const field = inputs.foundryVersionName;

    it('should have internal visibility (hidden from UI)', () => {
      expect(field['x-ms-visibility']).toBe('internal');
    });

    it('should have no default value (set dynamically from API)', () => {
      expect(field.default).toBeUndefined();
    });

    it('should be a string type field', () => {
      expect(field.type).toBe('string');
    });
  });
});
