import { describe, expect, it } from 'vitest';
import { buildConnectionReferencesFromConnectionsParameter } from '../ParseReduxAction';

describe('buildConnectionReferencesFromConnectionsParameter', () => {
  it('returns an empty record when input is missing', () => {
    expect(buildConnectionReferencesFromConnectionsParameter(undefined)).toEqual({});
    expect(buildConnectionReferencesFromConnectionsParameter({})).toEqual({});
  });

  it('skips entries that have no api id', () => {
    const result = buildConnectionReferencesFromConnectionsParameter({
      orphan: { connectionId: '/conn' },
    });
    expect(result).toEqual({});
  });

  it('preserves connectionProperties, authentication, connectionRuntimeUrl, and impersonation when present', () => {
    const identity = {
      type: 'UserAssigned',
      identity: '/subscriptions/sub/resourceGroups/rg/providers/Microsoft.ManagedIdentity/userAssignedIdentities/uami',
    };
    const connectionsParam = {
      mcp: {
        id: '/subscriptions/sub/providers/Microsoft.Web/locations/eastus/managedApis/mcp',
        connectionId: '/subscriptions/sub/resourceGroups/rg/providers/Microsoft.Web/connections/mcp',
        connectionName: 'mcp',
        connectionProperties: { authentication: identity },
        connectionRuntimeUrl: 'https://runtime.example.com',
        authentication: { type: 'Raw', scheme: 'Key', parameter: 'k' },
        impersonation: { source: 'invoker' },
      },
    };

    const result = buildConnectionReferencesFromConnectionsParameter(connectionsParam);

    expect(result.mcp).toEqual({
      api: { id: connectionsParam.mcp.id },
      connection: { id: connectionsParam.mcp.connectionId },
      connectionName: 'mcp',
      connectionProperties: { authentication: identity },
      connectionRuntimeUrl: 'https://runtime.example.com',
      authentication: { type: 'Raw', scheme: 'Key', parameter: 'k' },
      impersonation: { source: 'invoker' },
    });
  });

  it('falls back to the key when connectionName is missing and omits optional fields when not present', () => {
    const result = buildConnectionReferencesFromConnectionsParameter({
      simple: {
        id: '/subscriptions/sub/providers/Microsoft.Web/locations/eastus/managedApis/foo',
        connectionId: '/subscriptions/sub/resourceGroups/rg/providers/Microsoft.Web/connections/foo',
      },
    });

    expect(result.simple).toEqual({
      api: { id: '/subscriptions/sub/providers/Microsoft.Web/locations/eastus/managedApis/foo' },
      connection: { id: '/subscriptions/sub/resourceGroups/rg/providers/Microsoft.Web/connections/foo' },
      connectionName: 'simple',
    });
    expect(result.simple).not.toHaveProperty('connectionProperties');
    expect(result.simple).not.toHaveProperty('authentication');
    expect(result.simple).not.toHaveProperty('connectionRuntimeUrl');
    expect(result.simple).not.toHaveProperty('impersonation');
  });
});
