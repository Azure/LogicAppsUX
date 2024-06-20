import { describe, expect, it } from 'vitest';
import { normalizeConnectorId } from '../helper';

describe('templates/utils/helper', () => {
  describe('normalizeConnectorId', () => {
    const armConnectorId = '/subscriptions/#subscription#/providers/Microsoft.Web/locations/#location#/managedApis/sql';
    const spConnectorId = '/serviceProviders/sql';
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
  });
});
