import { describe, it, expect } from 'vitest';
import { AgentUtils, isDynamicConnection } from '../Utils';

describe('AgentUtils', () => {
  describe('ModelType constants', () => {
    it('should have correct model type values', () => {
      expect(AgentUtils.ModelType.AzureOpenAI).toBe('Azure OpenAI');
      expect(AgentUtils.ModelType.FoundryService).toBe('Foundry project');
      expect(AgentUtils.ModelType.APIM).toBe('APIM Gen AI Gateway');
      expect(AgentUtils.ModelType.V1ChatCompletionsService).toBe('V1 Chat Completions Service');
    });

    it('should not have trailing spaces in model type values', () => {
      // Regression test for trailing space fix in commit
      Object.values(AgentUtils.ModelType).forEach((modelType) => {
        expect(modelType).toBe(modelType.trim());
      });
    });
  });

  describe('isConnector', () => {
    it('should return true for agent connector without leading slash', () => {
      expect(AgentUtils.isConnector('connectionProviders/agent')).toBe(true);
    });

    it('should return true for agent connector with leading slash', () => {
      expect(AgentUtils.isConnector('/connectionProviders/agent')).toBe(true);
    });

    it('should be case insensitive', () => {
      expect(AgentUtils.isConnector('CONNECTIONPROVIDERS/AGENT')).toBe(true);
      expect(AgentUtils.isConnector('ConnectionProviders/Agent')).toBe(true);
    });

    it('should return false for non-agent connectors', () => {
      expect(AgentUtils.isConnector('connectionProviders/office365')).toBe(false);
      expect(AgentUtils.isConnector('/providers/microsoft.web/connections')).toBe(false);
      expect(AgentUtils.isConnector('')).toBe(false);
    });

    it('should handle undefined input', () => {
      expect(AgentUtils.isConnector(undefined)).toBe(false);
    });

    it('should handle null input', () => {
      expect(AgentUtils.isConnector(null as any)).toBe(false);
    });
  });

  describe('isDeploymentOrModelIdParameter', () => {
    it('should return true for deploymentId parameter', () => {
      expect(AgentUtils.isDeploymentOrModelIdParameter('deploymentId')).toBe(true);
    });

    it('should return true for modelId parameter', () => {
      expect(AgentUtils.isDeploymentOrModelIdParameter('modelId')).toBe(true);
    });

    it('should be case insensitive for deploymentId', () => {
      expect(AgentUtils.isDeploymentOrModelIdParameter('DEPLOYMENTID')).toBe(true);
      expect(AgentUtils.isDeploymentOrModelIdParameter('DeploymentId')).toBe(true);
    });

    it('should be case insensitive for modelId', () => {
      expect(AgentUtils.isDeploymentOrModelIdParameter('MODELID')).toBe(true);
      expect(AgentUtils.isDeploymentOrModelIdParameter('ModelId')).toBe(true);
    });

    it('should return false for other parameter names', () => {
      expect(AgentUtils.isDeploymentOrModelIdParameter('agentModelType')).toBe(false);
      expect(AgentUtils.isDeploymentOrModelIdParameter('messages')).toBe(false);
      expect(AgentUtils.isDeploymentOrModelIdParameter('deployment')).toBe(false);
      expect(AgentUtils.isDeploymentOrModelIdParameter('model')).toBe(false);
      expect(AgentUtils.isDeploymentOrModelIdParameter('')).toBe(false);
    });

    it('should handle undefined input', () => {
      expect(AgentUtils.isDeploymentOrModelIdParameter(undefined)).toBe(false);
    });

    it('should handle null input', () => {
      expect(AgentUtils.isDeploymentOrModelIdParameter(null as any)).toBe(false);
    });
  });

  describe('isAgentModelTypeParameter', () => {
    it('should return true for agentModelType parameter', () => {
      expect(AgentUtils.isAgentModelTypeParameter('agentModelType')).toBe(true);
    });

    it('should be case insensitive', () => {
      expect(AgentUtils.isAgentModelTypeParameter('AGENTMODELTYPE')).toBe(true);
      expect(AgentUtils.isAgentModelTypeParameter('AgentModelType')).toBe(true);
    });

    it('should return false for other parameter names', () => {
      expect(AgentUtils.isAgentModelTypeParameter('deploymentId')).toBe(false);
      expect(AgentUtils.isAgentModelTypeParameter('modelId')).toBe(false);
      expect(AgentUtils.isAgentModelTypeParameter('agentModel')).toBe(false);
      expect(AgentUtils.isAgentModelTypeParameter('')).toBe(false);
    });

    it('should handle undefined input', () => {
      expect(AgentUtils.isAgentModelTypeParameter(undefined)).toBe(false);
    });

    it('should handle null input', () => {
      expect(AgentUtils.isAgentModelTypeParameter(null as any)).toBe(false);
    });
  });
});

describe('isDynamicConnection', () => {
  it('should return true for DynamicUserInvoked feature', () => {
    expect(isDynamicConnection('DynamicUserInvoked')).toBe(true);
  });

  it('should be case insensitive', () => {
    expect(isDynamicConnection('DYNAMICUSERINVOKED')).toBe(true);
    expect(isDynamicConnection('dynamicuserinvoked')).toBe(true);
  });

  it('should return false for other features', () => {
    expect(isDynamicConnection('StaticConnection')).toBe(false);
    expect(isDynamicConnection('CustomConnection')).toBe(false);
    expect(isDynamicConnection('')).toBe(false);
  });

  it('should handle undefined input', () => {
    expect(isDynamicConnection(undefined)).toBe(false);
  });
});
