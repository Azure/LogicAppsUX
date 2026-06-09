import { getLegacyDynamicValues, getListDynamicValues } from '../connector';
import { ConnectorService, InitConnectorService, InitLoggerService } from '@microsoft/logic-apps-shared';
import { expect, describe, test, beforeAll, vitest } from 'vitest';

describe('ConnectorDynamicQueries', () => {
  describe('getLegacyDynamicValues', () => {
    const connectionId = '/connections/test';
    const connectorId = '/connectionProviders/test';
    const extension = {
      operationId: 'test',
      parameters: {},
      'value-collection': '',
      'value-path': 'value',
      'value-title': 'title',
      'value-selectable': 'selectable',
    };

    const loggerService: any = {
      log() {},
    };
    const connectorService: any = {
      getLegacyDynamicContent() {
        return Promise.resolve({
          items: collectionData,
          nested: { values: collectionData },
          empty: [],
          object: { a: 'a' },
          primitive: [1, 2, 3],
          objectArray: { a: 'b', values: [{ value: 5, title: '5' }] },
        });
      },
    };
    const collectionData = [
      { key: 'key1', value: 1, title: 'title1' },
      { key: 'key2', value: 2, title: 'title2', selectable: false },
    ];
    const expectedValued = [
      { value: 1, displayName: 'title1', disabled: false },
      { value: 2, displayName: 'title2', disabled: true },
    ];

    beforeAll(() => {
      InitLoggerService([loggerService]);
      InitConnectorService(connectorService);
    });

    test('should return dynamic values correctly from collection specified path', async () => {
      const collectionIsEmpty = { ...extension, 'value-collection': 'empty' };
      let dynamicValues = await getLegacyDynamicValues(connectionId, connectorId, {}, collectionIsEmpty, 'object');
      expect(dynamicValues).toBeDefined();
      expect(dynamicValues.length).toEqual(0);
      expect(dynamicValues).toEqual([]);

      const collectionAtSingleLevel = { ...extension, 'value-collection': 'items' };
      dynamicValues = await getLegacyDynamicValues(connectionId, connectorId, {}, collectionAtSingleLevel, 'object');
      expect(dynamicValues).toBeDefined();
      expect(dynamicValues.length).toEqual(2);
      expect(dynamicValues).toEqual(expectedValued);

      const collectionAtNestedLevel = { ...extension, 'value-collection': 'nested/values' };
      dynamicValues = await getLegacyDynamicValues(connectionId, connectorId, {}, collectionAtNestedLevel, 'object');
      expect(dynamicValues).toBeDefined();
      expect(dynamicValues.length).toEqual(2);
      expect(dynamicValues).toEqual(expectedValued);
    });

    test('should return dynamic values correctly when response is an array', async () => {
      vitest.spyOn(ConnectorService(), 'getLegacyDynamicContent').mockResolvedValue(collectionData);

      const dynamicValues = await getLegacyDynamicValues(connectionId, connectorId, {}, extension, 'object');
      expect(dynamicValues).toBeDefined();
      expect(dynamicValues.length).toEqual(2);
      expect(dynamicValues).toEqual(expectedValued);
    });

    test('should return dynamic values correctly when array type is not an object', async () => {
      const result = [
        expect.objectContaining({ value: 1, displayName: '1' }),
        expect.objectContaining({ value: 2, displayName: '2' }),
        expect.objectContaining({ value: 3, displayName: '3' }),
      ];

      const collectionAtSingleLevel = { ...extension, 'value-collection': 'primitive' };
      const dynamicValues = await getLegacyDynamicValues(connectionId, connectorId, {}, collectionAtSingleLevel, 'number');
      expect(dynamicValues).toBeDefined();
      expect(dynamicValues.length).toEqual(3);
      expect(dynamicValues).toEqual(result);
    });

    test('should return an array from first available array from response or empty array when collection path cannot find array from response', async () => {
      const collectionSpecifiedNotPresent = { ...extension, 'value-collection': 'absent' };
      let dynamicValues = await getLegacyDynamicValues(connectionId, connectorId, {}, collectionSpecifiedNotPresent, 'object');
      expect(dynamicValues).toBeDefined();
      expect(dynamicValues.length).toEqual(2);
      expect(dynamicValues).toEqual(expectedValued);

      const collectionSpecifiedIsObject = { ...extension, 'value-collection': 'object' };
      dynamicValues = await getLegacyDynamicValues(connectionId, connectorId, {}, collectionSpecifiedIsObject, 'object');
      expect(dynamicValues).toBeDefined();
      expect(dynamicValues.length).toEqual(0);
      expect(dynamicValues).toEqual([]);

      const collectionSpecifiedAsObjectAndPresentInTwoLevels = { ...extension, 'value-collection': 'objectArray' };
      dynamicValues = await getLegacyDynamicValues(
        connectionId,
        connectorId,
        {},
        collectionSpecifiedAsObjectAndPresentInTwoLevels,
        'object'
      );
      expect(dynamicValues).toBeDefined();
      expect(dynamicValues.length).toEqual(1);
      expect(dynamicValues).toEqual([{ value: 5, displayName: '5', disabled: false }]);
    });
  });

  describe('getListDynamicValues', () => {
    const connectionId = '/connections/test';
    const connectorId = '/connectionProviders/test';
    const operationId = 'listMcpTools';
    const dynamicState = { operationId: 'listMcpTools', apiType: 'mcp' };

    const loggerService: any = { log() {} };
    const connectorService: any = {
      getListDynamicValues: vitest.fn().mockResolvedValue([]),
    };

    beforeAll(() => {
      InitLoggerService([loggerService]);
      InitConnectorService(connectorService);
    });

    test('passes the identity through to the connector service as the 8th argument', async () => {
      const spy = vitest.spyOn(ConnectorService(), 'getListDynamicValues').mockResolvedValue([]);
      const uami = '/subscriptions/sub/resourceGroups/rg/providers/Microsoft.ManagedIdentity/userAssignedIdentities/u1';

      await getListDynamicValues(connectionId, connectorId, operationId, {}, dynamicState, undefined, uami);

      expect(spy).toHaveBeenCalledTimes(1);
      expect(spy).toHaveBeenCalledWith(connectionId, connectorId, operationId, {}, dynamicState, undefined, undefined, uami);
    });

    test('separates cache entries by identity so different identities trigger separate fetches', async () => {
      const spy = vitest.spyOn(ConnectorService(), 'getListDynamicValues').mockResolvedValue([]);
      const uamiA = '/subscriptions/sub/resourceGroups/rg/providers/Microsoft.ManagedIdentity/userAssignedIdentities/uA';
      const uamiB = '/subscriptions/sub/resourceGroups/rg/providers/Microsoft.ManagedIdentity/userAssignedIdentities/uB';

      await getListDynamicValues(connectionId, connectorId, operationId, {}, dynamicState, undefined, uamiA);
      await getListDynamicValues(connectionId, connectorId, operationId, {}, dynamicState, undefined, uamiB);

      expect(spy).toHaveBeenCalledTimes(2);
      expect(spy).toHaveBeenNthCalledWith(1, connectionId, connectorId, operationId, {}, dynamicState, undefined, undefined, uamiA);
      expect(spy).toHaveBeenNthCalledWith(2, connectionId, connectorId, operationId, {}, dynamicState, undefined, undefined, uamiB);
    });
  });
});
