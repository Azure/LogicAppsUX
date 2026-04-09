import { describe, it, expect } from 'vitest';
import agentLoopConnector from '../agentLoopConnector';

describe('agentLoopConnector', () => {
  describe('notSupportedConnectionParameters', () => {
    const notSupported = agentLoopConnector.properties.operationParameterSets?.agentModelType?.uiDefinition?.constraints
      ?.notSupportedConnectionParameters as Record<string, string[]>;

    it('should have notSupportedConnectionParameters defined', () => {
      expect(notSupported).toBeDefined();
    });

    it('should filter BringYourOwnKey and ClientCertificate for AzureOpenAI', () => {
      expect(notSupported.AzureOpenAI).toEqual(['BringYourOwnKey', 'ClientCertificate']);
    });

    it('should filter ManagedServiceIdentity, BringYourOwnKey and ClientCertificate for MicrosoftFoundry (leaving only Key)', () => {
      expect(notSupported.MicrosoftFoundry).toEqual(['ManagedServiceIdentity', 'BringYourOwnKey', 'ClientCertificate']);
    });

    it('should filter Key, BringYourOwnKey and ClientCertificate for FoundryAgentService', () => {
      expect(notSupported.FoundryAgentService).toEqual(['Key', 'BringYourOwnKey', 'ClientCertificate']);
    });

    it('should filter ManagedServiceIdentity, BringYourOwnKey and ClientCertificate for APIMGenAIGateway', () => {
      expect(notSupported.APIMGenAIGateway).toEqual(['ManagedServiceIdentity', 'BringYourOwnKey', 'ClientCertificate']);
    });

    it('should filter Key and ManagedServiceIdentity for V1ChatCompletionsService', () => {
      expect(notSupported.V1ChatCompletionsService).toEqual(['Key', 'ManagedServiceIdentity']);
    });

    it('should leave only Key auth for MicrosoftFoundry when cross-referenced with connectionParameterSets values', () => {
      const allAuthNames = agentLoopConnector.properties.connectionParameterSets?.values.map((v) => v.name) ?? [];
      const foundryUnsupported = notSupported.MicrosoftFoundry;
      const supportedForFoundry = allAuthNames.filter((name) => !foundryUnsupported.includes(name));
      expect(supportedForFoundry).toEqual(['Key']);
    });
  });
});
