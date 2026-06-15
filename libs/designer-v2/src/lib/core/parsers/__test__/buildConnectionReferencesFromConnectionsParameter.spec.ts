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

  it('preserves connectionProperties so managed-identity workflows surface auth on load', () => {
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
      },
    };

    const result = buildConnectionReferencesFromConnectionsParameter(connectionsParam);

    expect(result.mcp).toEqual({
      api: { id: connectionsParam.mcp.id },
      connection: { id: connectionsParam.mcp.connectionId },
      connectionName: 'mcp',
      connectionProperties: { authentication: identity },
    });
  });

  it('falls back to the key when connectionName is missing and omits connectionProperties when not present', () => {
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
  });

  it('does not pass through legacy optional fields the base shape never emitted', () => {
    const result = buildConnectionReferencesFromConnectionsParameter({
      mcp: {
        id: '/subscriptions/sub/providers/Microsoft.Web/locations/eastus/managedApis/mcp',
        connectionId: '/subscriptions/sub/resourceGroups/rg/providers/Microsoft.Web/connections/mcp',
        connectionRuntimeUrl: 'https://runtime.example.com',
        authentication: { type: 'Raw', scheme: 'Key', parameter: 'k' },
        impersonation: { source: 'invoker' },
      },
    });

    expect(result.mcp).not.toHaveProperty('connectionRuntimeUrl');
    expect(result.mcp).not.toHaveProperty('authentication');
    expect(result.mcp).not.toHaveProperty('impersonation');
  });
});
