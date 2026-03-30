import { describe, it, expect } from 'vitest';
import mcpClientConnector from '../manifest/mcpclientconnector';

describe('Standard MCP Client Connector Manifest', () => {
  const connector = mcpClientConnector;
  const parameterSets = connector.properties.connectionParameterSets?.values ?? [];

  it('should have the correct connector id and type', () => {
    expect(connector.id).toBe('connectionProviders/mcpclient');
    expect(connector.type).toBe('McpClient');
  });

  it('should have connectionParameterSets defined', () => {
    expect(connector.properties.connectionParameterSets).toBeDefined();
    expect(parameterSets.length).toBeGreaterThan(0);
  });

  it('should include ManagedServiceIdentity parameter set', () => {
    const msiSet = parameterSets.find((s) => s.name === 'ManagedServiceIdentity');
    expect(msiSet).toBeDefined();
    expect(msiSet?.uiDefinition?.displayName).toBe('Managed identity');
  });

  describe('ManagedServiceIdentity parameter set', () => {
    const msiSet = parameterSets.find((s) => s.name === 'ManagedServiceIdentity');
    const params = msiSet?.parameters ?? {};

    it('should have serverUrl, identity, and audience parameters', () => {
      expect(params).toHaveProperty('serverUrl');
      expect(params).toHaveProperty('identity');
      expect(params).toHaveProperty('audience');
    });

    it('should have identity parameter with identitypicker editor', () => {
      const identity = params.identity;
      expect(identity).toBeDefined();
      expect(identity.type).toBe('string');
      expect(identity.uiDefinition?.constraints?.editor).toBe('identitypicker');
    });

    it('should have identity parameter as not required', () => {
      const identity = params.identity;
      expect(identity.uiDefinition?.constraints?.required).toBe('false');
    });

    it('should have serverUrl as required', () => {
      expect(params.serverUrl.uiDefinition?.constraints?.required).toBe('true');
    });

    it('should have audience as required', () => {
      expect(params.audience.uiDefinition?.constraints?.required).toBe('true');
    });
  });

  it('should include all expected authentication types', () => {
    const names = parameterSets.map((s) => s.name);
    expect(names).toContain('None');
    expect(names).toContain('Basic');
    expect(names).toContain('ClientCertificate');
    expect(names).toContain('ActiveDirectoryOAuth');
    expect(names).toContain('Raw');
    expect(names).toContain('Key');
    expect(names).toContain('ManagedServiceIdentity');
  });
});
