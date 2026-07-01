import type { Connection } from '@microsoft/logic-apps-shared';
import { describe, it, expect } from 'vitest';
import { readBuiltInMcpConnectionData } from '../serializer';

// The helper resolves the MCP server URL and authentication out of a Connection object.
// Two shapes exist in the wild:
//  - flat `properties.parameterValues.*` (Consumption + reconstructor)
//  - nested `properties.connectionParameters.*.metadata.value` (Standard)
// Both must yield the same downstream serialization.
describe('readBuiltInMcpConnectionData', () => {
  it('returns undefined when the connection has no properties', () => {
    expect(readBuiltInMcpConnectionData(undefined)).toBeUndefined();
    expect(readBuiltInMcpConnectionData({} as Connection)).toBeUndefined();
  });

  it('reads flat parameterValues shape (Consumption / reconstructed)', () => {
    const connection = {
      properties: {
        parameterValues: {
          mcpServerUrl: 'https://example.com/mcp',
          authenticationType: 'Key',
          key: 'secret-value',
          keyHeaderName: 'x-api-key',
        },
      },
    } as unknown as Connection;

    expect(readBuiltInMcpConnectionData(connection)).toEqual({
      mcpServerUrl: 'https://example.com/mcp',
      authenticationType: 'Key',
      authParams: { key: 'secret-value', keyHeaderName: 'x-api-key' },
    });
  });

  it('reads flat parameterValues shape with authenticationType None', () => {
    const connection = {
      properties: {
        parameterValues: {
          mcpServerUrl: 'https://example.com/mcp',
          authenticationType: 'None',
        },
      },
    } as unknown as Connection;

    expect(readBuiltInMcpConnectionData(connection)).toEqual({
      mcpServerUrl: 'https://example.com/mcp',
      authenticationType: 'None',
      authParams: {},
    });
  });

  it('reads nested connectionParameters shape with auth object (Standard fresh-create)', () => {
    const connection = {
      properties: {
        connectionParameters: {
          mcpServerUrl: { type: 'string', metadata: { value: 'https://gateway.example.com/mcp' } },
          authentication: {
            type: 'object',
            metadata: {
              value: { type: 'Key', key: "@appsetting('mcp_key')", keyHeaderName: '123' },
            },
          },
        },
      },
    } as unknown as Connection;

    expect(readBuiltInMcpConnectionData(connection)).toEqual({
      mcpServerUrl: 'https://gateway.example.com/mcp',
      authenticationType: 'Key',
      authParams: { key: "@appsetting('mcp_key')", keyHeaderName: '123' },
    });
  });

  it('reads nested connectionParameters shape with auth string None', () => {
    const connection = {
      properties: {
        connectionParameters: {
          mcpServerUrl: { type: 'string', metadata: { value: 'https://gateway.example.com/mcp' } },
          authentication: { type: 'string', metadata: { value: 'None' } },
        },
      },
    } as unknown as Connection;

    expect(readBuiltInMcpConnectionData(connection)).toEqual({
      mcpServerUrl: 'https://gateway.example.com/mcp',
      authenticationType: 'None',
      authParams: {},
    });
  });

  it('reads nested connectionParameters shape with no auth metadata', () => {
    const connection = {
      properties: {
        connectionParameters: {
          mcpServerUrl: { type: 'string', metadata: { value: 'https://gateway.example.com/mcp' } },
        },
      },
    } as unknown as Connection;

    expect(readBuiltInMcpConnectionData(connection)).toEqual({
      mcpServerUrl: 'https://gateway.example.com/mcp',
      authenticationType: undefined,
      authParams: {},
    });
  });

  it('prefers flat parameterValues when both shapes are present', () => {
    const connection = {
      properties: {
        parameterValues: {
          mcpServerUrl: 'https://flat.example.com/mcp',
          authenticationType: 'None',
        },
        connectionParameters: {
          mcpServerUrl: { metadata: { value: 'https://nested.example.com/mcp' } },
        },
      },
    } as unknown as Connection;

    expect(readBuiltInMcpConnectionData(connection)?.mcpServerUrl).toBe('https://flat.example.com/mcp');
  });

  it('returns undefined when neither shape yields an mcpServerUrl', () => {
    const connection = {
      properties: {
        parameterValues: { authenticationType: 'None' },
        connectionParameters: {},
      },
    } as unknown as Connection;

    expect(readBuiltInMcpConnectionData(connection)).toBeUndefined();
  });

  it('extracts every MCP_AUTH_PROPERTY_KEYS entry when present in nested auth object', () => {
    const connection = {
      properties: {
        connectionParameters: {
          mcpServerUrl: { metadata: { value: 'https://example.com/mcp' } },
          authentication: {
            metadata: {
              value: {
                type: 'ActiveDirectoryOAuth',
                audience: 'aud',
                identity: 'id',
                key: 'k',
                keyHeaderName: 'khn',
                username: 'u',
                password: 'p',
                value: 'v',
                clientId: 'cid',
                secret: 's',
                tenant: 't',
                authority: 'a',
                pfx: 'x',
              },
            },
          },
        },
      },
    } as unknown as Connection;

    const result = readBuiltInMcpConnectionData(connection);
    expect(result?.authenticationType).toBe('ActiveDirectoryOAuth');
    expect(result?.authParams).toEqual({
      audience: 'aud',
      identity: 'id',
      key: 'k',
      keyHeaderName: 'khn',
      username: 'u',
      password: 'p',
      value: 'v',
      clientId: 'cid',
      secret: 's',
      tenant: 't',
      authority: 'a',
      pfx: 'x',
    });
  });
});
