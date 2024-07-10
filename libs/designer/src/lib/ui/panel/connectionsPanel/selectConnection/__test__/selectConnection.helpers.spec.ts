import { describe, vi, beforeEach, afterEach, beforeAll, afterAll, it, test, expect } from 'vitest';
import { compareFlattenedConnections, flattenConnection } from '../selectConnection.helpers';
import { Connection } from '@microsoft/logic-apps-shared';

const mockApi: Connection['properties']['api'] = {
  brandColor: '#008372',
  category: 'Standard',
  description: 'Bing Maps',
  displayName: 'Bing Maps',
  iconUri: 'https://connectoricons-prod.azureedge.net/releases/v1.0.1567/1.0.1567.2748/bingmaps/icon.png',
  id: '/subscriptions/f34b22a3-2202-4fb1-b040-1332bd928c84/providers/Microsoft.Web/locations/westus/managedApis/bingmaps',
  name: 'bingmaps',
  type: 'Microsoft.Web/locations/managedApis',
};

const mockConnectionWithErrors: Connection = {
  id: 'id',
  name: 'name',
  properties: {
    api: mockApi,
    createdTime: 'createdTime',
    displayName: 'displayName',
    overallStatus: 'Error',
    statuses: [{ status: 'Error' }],
  },
  type: 'type',
};

const mockConnectionWithNoErrors: Connection = {
  id: 'id',
  name: 'name',
  properties: {
    api: mockApi,
    createdTime: 'createdTime',
    displayName: 'displayName',
    overallStatus: 'Connected',
    statuses: [{ status: 'Connected' }],
  },
  type: 'type',
};

describe('selectConnection helpers', () => {
  describe('compareFlattenedConnections', () => {
    it('should sort flattened connections properly', () => {
      const connectionA = { ...flattenConnection(mockConnectionWithErrors), displayName: 'Connection A' };
      const connectionB = { ...flattenConnection(mockConnectionWithErrors), displayName: 'Connection B' };
      const connectionC = { ...flattenConnection(mockConnectionWithNoErrors), displayName: 'Connection C' };
      const connectionD = { ...flattenConnection(mockConnectionWithNoErrors), displayName: 'Connection D' };
      const connectionE = { ...flattenConnection(mockConnectionWithNoErrors), displayName: 'Connection E' };

      expect([connectionA, connectionB, connectionE, connectionD, connectionC].sort(compareFlattenedConnections)).toEqual([
        connectionC,
        connectionD,
        connectionE,
        connectionA,
        connectionB,
      ]);
    });
  });

  describe('flattenConnection', () => {
    it('should return a connection with flattened properties if valid', () => {
      const result = flattenConnection(mockConnectionWithNoErrors);
      expect(result).toEqual({
        api: mockApi,
        createdTime: 'createdTime',
        displayName: 'displayName',
        id: 'id',
        invalid: false,
        name: 'name',
        overallStatus: 'Connected',
        statuses: [{ status: 'Connected' }],
        type: 'type',
      });
    });

    it('should return a connection with flattened properties if invalid', () => {
      const result = flattenConnection(mockConnectionWithErrors);
      expect(result).toEqual({
        api: mockApi,
        createdTime: 'createdTime',
        displayName: 'displayName',
        id: 'id',
        invalid: true,
        name: 'name',
        overallStatus: 'Error',
        statuses: [{ status: 'Error' }],
        type: 'type',
      });
    });
  });
});
