import { DynamicLoadStatus } from '@microsoft/designer-ui';
import { getDynamicInputsFromSchema, getDynamicOutputsFromSchema, getDynamicValues } from '../dynamicdata';
import { InitConnectionService, InitOperationManifestService } from '@microsoft/logic-apps-shared';
import { expect, describe, test, afterEach, vitest } from 'vitest';
import * as ConnectorQueries from '../../../queries/connector';
import { getReactQueryClient } from '../../../ReactQueryProvider';
import { testSwagger } from './mocks';

describe('DynamicData', () => {
  describe('getDynamicInputsFromSchema', () => {
    const manifestService: any = {
      isSupported: () => true,
      isAliasingSupported: () => false,
      getOperationManifest() {
        return Promise.resolve({ properties: { inputsLocationSwapMap: [] } } as any);
      },
    };
    const dynamicSchema = {
      type: 'object',
      properties: {
        details: { type: 'object', properties: { name: { type: 'string' }, code: { type: 'number' } } },
        id: { type: 'string' },
      },
    };
    const dynamicParameter = {
      key: 'inputs.$.dynamicData',
      name: 'dynamicData',
      type: 'any',
      dynamicSchema: {
        extension: {
          dynamicState: { extension: { operationId: 'getApimSchema' }, isInput: true },
          parameters: { operationId: { parameterRefernce: 'apiManagement.operationId', required: true } },
        },
        type: 'DynamicProperties',
      },
    };
    test('should return parent parameter in dynamic schema when containing template expression', async () => {
      InitOperationManifestService(manifestService);

      const dynamicInputs = await getDynamicInputsFromSchema(
        dynamicSchema,
        dynamicParameter,
        { connectorId: '/connectionProviders/test', operationId: 'test', type: 'Test' },
        ['inputs.$.operationId'],
        { inputs: { operationId: 'SomeValue', dynamicData: { id: 'abc', details: '@triggerBody()' } } }
      );

      expect(dynamicInputs).toBeDefined();
      expect(dynamicInputs.length).toEqual(2);
      expect(dynamicInputs).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ key: 'inputs.$.dynamicData.details', value: '@triggerBody()' }),
          expect.objectContaining({ key: 'inputs.$.dynamicData.id', value: 'abc' }),
        ])
      );
    });

    test('should return leaf parameters in dynamic schema when property values are present in definition', async () => {
      InitOperationManifestService(manifestService);

      const dynamicInputs = await getDynamicInputsFromSchema(
        dynamicSchema,
        dynamicParameter,
        { connectorId: '/connectionProviders/test', operationId: 'test', type: 'ApiManagement' },
        ['inputs.$.operationId'],
        { inputs: { operationId: 'SomeValue', dynamicData: { id: 'abc', details: { name: 'test', code: 123 } } } }
      );

      expect(dynamicInputs).toBeDefined();
      expect(dynamicInputs.length).toEqual(3);
      expect(dynamicInputs).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ key: 'inputs.$.dynamicData.details.name', value: 'test' }),
          expect.objectContaining({ key: 'inputs.$.dynamicData.details.code', value: 123 }),
          expect.objectContaining({ key: 'inputs.$.dynamicData.id', value: 'abc' }),
        ])
      );
    });

    test('should return only leaf parameters in dynamic schema for newly added action and not present in definition', async () => {
      InitOperationManifestService(manifestService);

      const dynamicInputs = await getDynamicInputsFromSchema(
        dynamicSchema,
        dynamicParameter,
        { connectorId: '/connectionProviders/test', operationId: 'test', type: 'ApiManagement' },
        ['inputs.$.operationId']
      );

      expect(dynamicInputs).toBeDefined();
      expect(dynamicInputs.length).toEqual(3);
      expect(dynamicInputs).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ key: 'inputs.$.dynamicData.details.name' }),
          expect.objectContaining({ key: 'inputs.$.dynamicData.details.code' }),
          expect.objectContaining({ key: 'inputs.$.dynamicData.id' }),
        ])
      );
    });

    test('should return object parameter in dynamic schema if it does not contain leaf properties', async () => {
      InitOperationManifestService(manifestService);
      const schema = {
        type: 'object',
        properties: {
          details: { type: 'object', properties: {} },
          id: { type: 'string' },
        },
      };

      const dynamicInputsWithDefinition = await getDynamicInputsFromSchema(
        schema,
        dynamicParameter,
        { connectorId: '/connectionProviders/test', operationId: 'test', type: 'ApiManagement' },
        ['inputs.$.operationId'],
        { inputs: { operationId: 'SomeValue', dynamicData: { id: 'abc', details: { name: 'test', code: 123 } } } }
      );

      expect(dynamicInputsWithDefinition).toBeDefined();
      expect(dynamicInputsWithDefinition.length).toEqual(2);
      expect(dynamicInputsWithDefinition).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ key: 'inputs.$.dynamicData.details', value: expect.objectContaining({ code: 123, name: 'test' }) }),
          expect.objectContaining({ key: 'inputs.$.dynamicData.id', value: 'abc' }),
        ])
      );

      const dynamicInputs = await getDynamicInputsFromSchema(
        schema,
        dynamicParameter,
        { connectorId: '/connectionProviders/test', operationId: 'test', type: 'ApiManagement' },
        ['inputs.$.operationId']
      );

      expect(dynamicInputs).toBeDefined();
      expect(dynamicInputs.length).toEqual(2);
      expect(dynamicInputs).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ key: 'inputs.$.dynamicData.details' }),
          expect.objectContaining({ key: 'inputs.$.dynamicData.id' }),
        ])
      );
    });

    test('should return only leaf parameters in dynamic schema with aliasing parameters for the property values are present in definition', async () => {
      InitOperationManifestService(manifestService);
      const dynamicSchemaWithAliases = {
        type: 'object',
        properties: {
          details: {
            type: 'object',
            properties: {
              name: { type: 'string', 'x-ms-alias': 'inputs/dynamicData/name' },
              code: { type: 'number', 'x-ms-alias': 'inputs/dynamicData/code' },
            },
          },
          id: { type: 'string' },
        },
      };

      const dynamicInputs = await getDynamicInputsFromSchema(
        dynamicSchemaWithAliases,
        { ...dynamicParameter, alias: 'inputs/dynamicData' },
        { connectorId: '/connectionProviders/test', operationId: 'test', type: 'ApiManagement' },
        ['inputs.$.operationId'],
        { inputs: { operationId: 'SomeValue', dynamicData: { id: 'abc', details: { name: 'test', code: 123 } } } }
      );

      expect(dynamicInputs).toBeDefined();
      expect(dynamicInputs.length).toEqual(3);
      expect(dynamicInputs).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ key: 'inputs.$.dynamicData.details.name', value: 'test' }),
          expect.objectContaining({ key: 'inputs.$.dynamicData.details.code', value: 123 }),
          expect.objectContaining({ key: 'inputs.$.dynamicData.id', value: 'abc' }),
        ])
      );
    });
  });

  describe('getDynamicOutputsFromSchema', () => {
    const manifestService: any = {
      isSupported: () => true,
      isAliasingSupported: () => false,
      getOperationManifest() {
        return Promise.resolve({ properties: { inputsLocationSwapMap: [] } } as any);
      },
    };
    const dynamicSchema = {
      type: 'object',
      properties: {
        body: {
          type: 'object',
          properties: {
            value: {
              type: 'array',
              'x-ms-property-name-alias': 'body/value',
            },
          },
          'x-ms-property-name-alias': 'body',
        },
      },
    };
    const dynamicParameter = {
      key: 'outputs.$.body',
      name: 'body',
      type: 'object',
      schema: {
        type: 'object',
        properties: {
          value: {
            type: 'array',
            'x-ms-property-name-alias': 'body/value',
          },
        },
        'x-ms-property-name-alias': 'body',
      },
      alias: 'body',
    };

    test('should not apply aliases to dynamicOutputs when aliasing is disabled', async () => {
      InitOperationManifestService(manifestService);

      const dynamicOutputs = await getDynamicOutputsFromSchema(dynamicSchema, dynamicParameter, {
        connectorId: '/connectionProviders/test',
        operationId: 'test',
        type: 'ApiManagement',
      });

      expect(dynamicOutputs).toBeDefined();

      const objectOutput = dynamicOutputs['body.$.body.body.value'];
      expect(objectOutput).toBeDefined();
      expect(objectOutput).toEqual(
        expect.objectContaining({ key: 'body.$.body.body.value', name: 'body.body.value', title: 'value', alias: undefined, type: 'array' })
      );
    });

    test('should apply aliases to dynamicOutputs when aliasing is enabled', async () => {
      manifestService.isAliasingSupported = () => true;
      InitOperationManifestService(manifestService);

      const dynamicOutputs = await getDynamicOutputsFromSchema(dynamicSchema, dynamicParameter, {
        connectorId: '/connectionProviders/testOpenAPI',
        operationId: 'testOpenAPI',
        type: 'OpenApiConnection',
      });

      expect(dynamicOutputs).toBeDefined();

      const objectOutput = dynamicOutputs['body.$.body.body.body/value'];
      expect(objectOutput).toBeDefined();
      expect(objectOutput).toEqual(
        expect.objectContaining({
          key: 'body.$.body.body.body/value',
          name: 'body/value',
          title: 'body/value',
          alias: 'body/value',
          type: 'array',
        })
      );
    });
  });

  describe('getDynamicValues', () => {
    afterEach(() => {
      vitest.clearAllMocks();
      vitest.resetAllMocks();
      vitest.resetModules();
      vitest.restoreAllMocks();

      getReactQueryClient().clear();
    });

    const dependencyInfo = {
      definition: {
        type: 'LegacyDynamicValues',
        extension: {
          operationId: 'GetLibraries',
          'value-collection': 'data',
          'value-title': 'display_name',
          'value-path': 'id',
        },
      },
      dependencyType: 'ListValues',
      dependentParameters: {},
      parameter: {
        key: 'body.$.libraryId',
        name: 'libraryId',
        required: true,
        type: 'string',
      },
    } as any;
    const nodeInputs = {
      dynamicLoadStatus: DynamicLoadStatus.NOTSTARTED,
      parameterGroups: { default: { id: 'default', parameters: [], rawInputs: [] } },
    };
    const operationInfo = { connectorId: '/connectionProviders/test', operationId: 'test', type: 'apiconnection' };
    const connectionReference = { connection: { id: 'test' }, api: { id: operationInfo.connectorId } };

    const connectionService: any = {
      getSwaggerFromConnector: () => Promise.resolve(testSwagger),
      getConnector: () => Promise.resolve({ id: operationInfo.connectorId }),
      getConnections: () => Promise.resolve([{ id: connectionReference.connection.id }]),
    };
    test('should make dynamic calls with non referenced default parameters in dynamic operation', async () => {
      InitConnectionService(connectionService);
      const spy = vitest.spyOn(ConnectorQueries, 'getLegacyDynamicValues').mockResolvedValueOnce([{ value: 'test', displayName: 'test' }]);

      await getDynamicValues(dependencyInfo, nodeInputs, operationInfo, connectionReference, {}, {});
      expect(spy).toHaveBeenCalledOnce();
      expect(spy).toHaveBeenCalledWith(
        connectionReference.connection.id,
        operationInfo.connectorId,
        expect.objectContaining({
          method: 'get',
          headers: {
            'x-im-connector-id': 'imanage-work-for-admins',
          },
          path: '/getLibraries',
        }),
        expect.objectContaining(dependencyInfo.definition.extension),
        '',
        undefined
      );
    });
  });
});
