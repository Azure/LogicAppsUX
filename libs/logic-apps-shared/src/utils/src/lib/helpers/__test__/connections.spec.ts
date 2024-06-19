import { ConnectionParameterTypes, Connector } from '../../models';
import { lighten } from '../color';
import { describe, vi, beforeEach, afterEach, beforeAll, afterAll, it, test, expect } from 'vitest';
import { isUsingAadAuthentication } from '../connections';

describe('lib/helpers/connections', () => {
  it('should properly classify AAD vs non-AAD connector authentication', () => {
    const getAadConnector = (isAAD: boolean): Connector => ({
      id: 'aad-connector',
      type: 'aad-connector',
      name: 'aad-connector',
      properties: {
        displayName: 'AAD Connector',
        iconUri: 'https://example.com/icon.png',
        connectionParameters: {
          'oauth-param': {
            type: ConnectionParameterTypes.oauthSetting,
            oAuthSettings: {
              identityProvider: isAAD ? 'aadcertificate' : 'other',
              clientId: '123',
              redirectUrl: 'https://example.com',
              scopes: ['scope1'],
              properties: {
                IsFirstParty: 'true',
              },
            },
          },
        },
      },
    });
    expect(isUsingAadAuthentication(getAadConnector(true))).toBe(true);
    expect(isUsingAadAuthentication(getAadConnector(false))).toBe(false);
  });
});
