import type { Connector, OperationApi } from '../../models';
import {
  getAllConnectorProperties,
  getBrandColorFromConnector,
  getDescriptionFromConnector,
  getDisplayNameFromConnector,
  getIconUriFromConnector,
  normalizeConnectorId,
  normalizeConnectorIds,
} from '../index';
import { describe, it, test, expect } from 'vitest';
describe('utils/src/lib/helpers/connectors', () => {
  describe('getAllConnectorProperties', () => {
    test('works for a Connector', () => {
      const connector = {
        id: '/connector/id',
        properties: {
          brandColor: 'red',
        },
      } as Connector;
      expect(getAllConnectorProperties(connector)).toEqual({
        brandColor: 'red',
        id: '/connector/id',
      });
    });

    test('works for an OperationApi', () => {
      const connector = {
        brandColor: 'red',
        id: '/connector/id',
      } as OperationApi;
      expect(getAllConnectorProperties(connector)).toEqual({
        brandColor: 'red',
        id: '/connector/id',
      });
    });

    test('works for undefined', () => {
      expect(getAllConnectorProperties(undefined)).toEqual({});
    });
  });

  describe('getBrandColorFromConnector', () => {
    describe('works for a Connector with', () => {
      test('standard field only', () => {
        const connector = {
          properties: {
            brandColor: 'red',
          },
        } as Connector;
        expect(getBrandColorFromConnector(connector)).toBe('red');
      });

      test('metadata field only', () => {
        const connector = {
          properties: {
            metadata: {
              brandColor: 'red',
            },
          },
        } as Connector;
        expect(getBrandColorFromConnector(connector)).toBe('red');
      });

      test('standard field and metadata field', () => {
        const connector = {
          properties: {
            brandColor: 'red',
            metadata: {
              brandColor: 'blue',
            },
          },
        } as Connector;
        expect(getBrandColorFromConnector(connector)).toBe('red');
      });
    });

    test('works for an OperationApi', () => {
      const connector = {
        brandColor: 'red',
      } as OperationApi;
      expect(getBrandColorFromConnector(connector)).toBe('red');
    });

    test('works for undefined', () => {
      expect(getBrandColorFromConnector(undefined)).toBe('#000000');
    });
  });

  describe('getDescriptionFromConnector', () => {
    describe('works for a Connector with', () => {
      test('standard field only', () => {
        const connector = {
          properties: {
            description: 'My connector',
          },
        } as Connector;
        expect(getDescriptionFromConnector(connector)).toBe('My connector');
      });

      test('general information only', () => {
        const connector = {
          properties: {
            generalInformation: {
              description: 'My connector',
            },
          },
        } as Connector;
        expect(getDescriptionFromConnector(connector)).toBe('My connector');
      });

      test('general information and standard field', () => {
        const connector = {
          properties: {
            description: 'My connector 1',
            generalInformation: {
              description: 'My connector 2',
            },
          },
        } as Connector;
        expect(getDescriptionFromConnector(connector)).toBe('My connector 1');
      });
    });

    test('works for an OperationApi', () => {
      const connector = {
        description: 'My connector',
      } as OperationApi;
      expect(getDescriptionFromConnector(connector)).toBe('My connector');
    });

    test('works for undefined', () => {
      expect(getDescriptionFromConnector(undefined)).toBe('');
    });
  });

  describe('getDisplayNameFromConnector', () => {
    test('works for a Connector', () => {
      const connector = {
        properties: {
          displayName: 'My connector',
        },
      } as Connector;
      expect(getDisplayNameFromConnector(connector)).toBe('My connector');
    });

    test('works for an OperationApi', () => {
      const connector = {
        displayName: 'My connector',
      } as OperationApi;
      expect(getDisplayNameFromConnector(connector)).toBe('My connector');
    });

    test('works for undefined', () => {
      expect(getDisplayNameFromConnector(undefined)).toBe('');
    });
  });

  describe('getIconUriFromConnector', () => {
    describe('works for a Connector with', () => {
      test('standard iconUrl field only', () => {
        const connector = {
          properties: {
            iconUrl: 'https://example.com/icon.png',
          },
        } as Connector;
        expect(getIconUriFromConnector(connector)).toBe('https://example.com/icon.png');
      });

      test('standard iconUri only', () => {
        const connector = {
          properties: {
            iconUri: 'https://example.com/icon.png',
          },
        } as Connector;
        expect(getIconUriFromConnector(connector)).toBe('https://example.com/icon.png');
      });

      test('general information only', () => {
        const connector = {
          properties: {
            generalInformation: {
              iconUrl: 'https://example.com/icon.png',
            },
          },
        } as Connector;
        expect(getIconUriFromConnector(connector)).toBe('https://example.com/icon.png');
      });

      test('general information and standard fields', () => {
        const connector = {
          properties: {
            iconUri: 'https://example.com/icon1.png',
            iconUrl: 'https://example.com/icon2.png',
            generalInformation: {
              iconUrl: 'https://example.com/icon3.png',
            },
          },
        } as Connector;
        expect(getIconUriFromConnector(connector)).toBe('https://example.com/icon2.png');
      });
    });

    test('works for an OperationApi', () => {
      const connector = {
        description: 'https://example.com/icon.png',
      } as OperationApi;
      expect(getDescriptionFromConnector(connector)).toBe('https://example.com/icon.png');
    });

    test('works for undefined', () => {
      expect(getDescriptionFromConnector(undefined)).toBe('');
    });
  });

  describe('normalizeConnectorId', () => {
    const armConnectorId = '/subscriptions/#subscription#/providers/Microsoft.Web/locations/#location#/managedApis/sql';
    const armConnectorId2 = '/subscriptions/#subscription#/providers/Microsoft.Web/locations/#location#/managedApis/gmail';
    const armConnectorIds = [armConnectorId, armConnectorId2];
    const subscriptionId = '00000000-0000-0000-0000-000000000000';
    const location = 'eastus';

    it('should replace subscriptionId and location correctly in arm connector id', async () => {
      const expectedConnectorId = `/subscriptions/${subscriptionId}/providers/Microsoft.Web/locations/${location}/managedApis/sql`;
      expect(normalizeConnectorId(armConnectorId, subscriptionId, location)).toEqual(expectedConnectorId);

      expect(normalizeConnectorId(armConnectorId, '', '')).toEqual('/subscriptions//providers/Microsoft.Web/locations//managedApis/sql');
    });

    it('should not change connectorId when not an arm resource', async () => {
      expect(normalizeConnectorId('', subscriptionId, location)).toEqual('');
      expect(normalizeConnectorId('/serviceProviders/sql', subscriptionId, location)).toEqual('/serviceProviders/sql');
      expect(normalizeConnectorId('/dataOperations', '', '')).toEqual('/dataOperations');
    });

    it('check casing', async () => {
      expect(normalizeConnectorId('Hello', subscriptionId, location)).not.toEqual('hello');
      expect(normalizeConnectorId('Hello', subscriptionId, location, true)).toEqual('hello');
      expect(normalizeConnectorId('/serviceProviders/sql', subscriptionId, location)).not.toEqual('/serviceProviders/SQL'.toLowerCase());
      expect(normalizeConnectorId('/serviceProviders/sql', subscriptionId, location, true)).toEqual('/serviceProviders/SQL'.toLowerCase());
    });
  });

  describe('normalizeConnectorIds', () => {
    const armConnectorId = '/subscriptions/#subscription#/providers/Microsoft.Web/locations/#location#/managedApis/sql';
    const armConnectorId2 = '/subscriptions/#subscription#/providers/Microsoft.Web/locations/#location#/managedApis/gmail';
    const nonArmConnectorId = '';
    const nonArmConnectorId2 = '/serviceProviders/sql';
    const connectorIds = [armConnectorId, armConnectorId2, nonArmConnectorId, nonArmConnectorId2];
    const subscriptionId = '00000000-0000-0000-0000-000000000000';
    const location = 'eastus';

    it('should replace all subscriptionIds and locations correctly in arm connector ids only', async () => {
      const expectedConnectorId = `/subscriptions/${subscriptionId}/providers/Microsoft.Web/locations/${location}/managedApis/sql`;
      const expectedConnectorId2 = `/subscriptions/${subscriptionId}/providers/Microsoft.Web/locations/${location}/managedApis/gmail`;

      expect(normalizeConnectorIds(connectorIds, subscriptionId, location)).not.toEqual([
        expectedConnectorId,
        expectedConnectorId2,
        '',
        '/serviceProviders/Sql',
      ]);
      expect(normalizeConnectorIds(connectorIds, subscriptionId, location, true)).toEqual([
        expectedConnectorId.toLowerCase(),
        expectedConnectorId2.toLowerCase(),
        '',
        '/serviceProviders/Sql'.toLowerCase(),
      ]);
    });
  });
});
