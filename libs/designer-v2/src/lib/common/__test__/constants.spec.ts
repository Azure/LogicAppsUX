import { describe, expect, it } from 'vitest';
import { connectorDeclaresOwnAuth, isManagedMcpConnector, usesMcpManagedIdentityFallback } from '../constants';

const managedApiId = (name: string) => `/subscriptions/sub/providers/Microsoft.Web/locations/eastus2/managedApis/${name}`;

describe('isManagedMcpConnector', () => {
  it('should match connectors of type McpClient', () => {
    expect(isManagedMcpConnector({ id: managedApiId('anything'), type: 'McpClient' })).toBe(true);
  });

  it('should match managed API connectors whose name contains mcp', () => {
    expect(isManagedMcpConnector({ id: managedApiId('foundrygithubmcp') })).toBe(true);
    expect(isManagedMcpConnector({ id: managedApiId('a365mcp') })).toBe(true);
  });

  it('should not match built-in connectors', () => {
    expect(isManagedMcpConnector({ id: managedApiId('githubmcp'), properties: { capabilities: ['builtin'] } })).toBe(false);
  });

  it('should not match unrelated managed API connectors', () => {
    expect(isManagedMcpConnector({ id: managedApiId('github') })).toBe(false);
  });
});

describe('connectorDeclaresOwnAuth', () => {
  it('should be true for multi-auth connectors', () => {
    expect(
      connectorDeclaresOwnAuth({
        properties: { connectionParameterSets: { values: [{ name: 'oauth' }, { name: 'managedIdentity' }] } },
      })
    ).toBe(true);
  });

  it('should be true for single-auth connectors that declare connection parameters', () => {
    expect(connectorDeclaresOwnAuth({ properties: { connectionParameters: { token: { type: 'oauthSetting' } } } })).toBe(true);
  });

  it('should be false when the connector declares no auth at all', () => {
    expect(connectorDeclaresOwnAuth({ properties: { connectionParameters: {} } })).toBe(false);
    expect(connectorDeclaresOwnAuth({ properties: { connectionParameterSets: { values: [] } } })).toBe(false);
    expect(connectorDeclaresOwnAuth({ properties: {} })).toBe(false);
    expect(connectorDeclaresOwnAuth({})).toBe(false);
  });
});

describe('usesMcpManagedIdentityFallback', () => {
  it('should be true for a managed MCP connector that declares no auth of its own', () => {
    expect(usesMcpManagedIdentityFallback({ id: managedApiId('customservermcp'), properties: { capabilities: [] } })).toBe(true);
  });

  it('should be false for an OAuth-backed managed MCP connector', () => {
    expect(
      usesMcpManagedIdentityFallback({
        id: managedApiId('foundrygithubmcp'),
        properties: {
          capabilities: [],
          connectionParameters: { token: { type: 'oauthSetting' } },
        },
      })
    ).toBe(false);
  });

  it('should be false for a managed MCP connector that declares its own parameter sets', () => {
    expect(
      usesMcpManagedIdentityFallback({
        id: managedApiId('stripemcp'),
        properties: { capabilities: [], connectionParameterSets: { values: [{ name: 'oauth' }] } },
      })
    ).toBe(false);
  });

  it('should be false for connectors that are not managed MCP connectors', () => {
    expect(usesMcpManagedIdentityFallback({ id: managedApiId('github'), properties: { capabilities: [] } })).toBe(false);
  });
});
