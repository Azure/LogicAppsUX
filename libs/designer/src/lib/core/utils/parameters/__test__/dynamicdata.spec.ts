import { getDynamicInputsFromSchema } from '../dynamicdata';
import { InitOperationManifestService } from '@microsoft/logic-apps-shared';
import { expect, describe, test } from 'vitest';

describe('DynamicData', () => {
  describe('getDynamicInputsFromSchema', () => {
    const manifestService: any = {
      isSupported: () => true,
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
  });
});
