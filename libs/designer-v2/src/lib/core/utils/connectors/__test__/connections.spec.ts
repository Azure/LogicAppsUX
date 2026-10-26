import { describe, expect, it } from 'vitest';
import type { Connection } from '@microsoft/logic-apps-shared';
import { getManagedIdentityFromConnection } from '../connections';

describe('getManagedIdentityFromConnection', () => {
  const uami = '/subscriptions/sub/resourceGroups/rg/providers/Microsoft.ManagedIdentity/userAssignedIdentities/myUami';
  const otherUami = '/subscriptions/sub/resourceGroups/rg/providers/Microsoft.ManagedIdentity/userAssignedIdentities/otherUami';

  it('returns the UAMI from parameterValueSet.values.identity.value (multi-auth shape)', () => {
    const connection = {
      id: 'c1',
      properties: {
        parameterValueSet: {
          name: 'managedServiceIdentity',
          values: {
            identity: { value: uami },
          },
        },
      },
    } as unknown as Connection;

    expect(getManagedIdentityFromConnection(connection)).toBe(uami);
  });

  it('returns the UAMI from parameterValues.identity (single-auth Alternative shape)', () => {
    const connection = {
      id: 'c1',
      properties: {
        parameterValues: {
          identity: uami,
        },
      },
    } as unknown as Connection;

    expect(getManagedIdentityFromConnection(connection)).toBe(uami);
  });

  it('prefers parameterValueSet.values.identity.value over parameterValues.identity when both are present', () => {
    const connection = {
      id: 'c1',
      properties: {
        parameterValueSet: {
          name: 'managedServiceIdentity',
          values: {
            identity: { value: uami },
          },
        },
        parameterValues: {
          identity: otherUami,
        },
      },
    } as unknown as Connection;

    expect(getManagedIdentityFromConnection(connection)).toBe(uami);
  });

  it('returns undefined when neither shape has an identity stored', () => {
    const connection = {
      id: 'c1',
      properties: {
        parameterValueSet: {
          name: 'managedServiceIdentity',
          values: {},
        },
        parameterValues: {},
      },
    } as unknown as Connection;

    expect(getManagedIdentityFromConnection(connection)).toBeUndefined();
  });

  it('returns the UAMI from parameterValues.authentication.identity (managed MCP shape)', () => {
    const connection = {
      id: 'c1',
      properties: {
        parameterValues: {
          authentication: {
            type: 'ManagedServiceIdentity',
            identity: uami,
          },
        },
      },
    } as unknown as Connection;

    expect(getManagedIdentityFromConnection(connection)).toBe(uami);
  });

  it('ignores parameterValues.authentication.identity when the auth type is not ManagedServiceIdentity', () => {
    const connection = {
      id: 'c1',
      properties: {
        parameterValues: {
          authentication: {
            type: 'ApiKey',
            identity: uami,
          },
        },
      },
    } as unknown as Connection;

    expect(getManagedIdentityFromConnection(connection)).toBeUndefined();
  });

  it('returns undefined for undefined connection', () => {
    expect(getManagedIdentityFromConnection(undefined)).toBeUndefined();
  });
});
