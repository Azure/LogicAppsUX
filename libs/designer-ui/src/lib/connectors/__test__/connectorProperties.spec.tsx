import {
  getAllConnectorProperties,
  getBrandColorFromConnector,
  getDescriptionFromConnector,
  getDisplayNameFromConnector,
  getIconUriFromConnector,
} from '../index';
import type { Connector, OperationApi } from '@microsoft/logic-apps-shared';

describe('lib/connectors/connectorProperties', () => {
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
    test('works for a Connector', () => {
      const connector = {
        properties: {
          brandColor: 'red',
        },
      } as Connector;
      expect(getBrandColorFromConnector(connector)).toBe('red');
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
});
