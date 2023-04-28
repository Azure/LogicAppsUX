import type { OpenApiConnectionSerializedInputs } from '../inputsbuilder';
import { OpenApiOperationInputsBuilder } from '../inputsbuilder';

describe('OpenApiOperationInputsBuilder', () => {
  describe('loadStaticInputValuesFromDefinition', () => {
    test('handles undefined definition', () => {
      const builder = new OpenApiOperationInputsBuilder();

      const inputParameters = [{ key: 'inputs.$.to', name: 'to', type: 'string' }];
      const result = builder.loadStaticInputValuesFromDefinition(undefined, inputParameters);

      expect(result).toEqual(inputParameters);
    });

    test('handles undefined parameters', () => {
      const builder = new OpenApiOperationInputsBuilder();

      const inputParameters = [{ key: 'inputs.$.to', name: 'to', type: 'string' }];
      const result = builder.loadStaticInputValuesFromDefinition(
        { authentication: '@parameters("$authentication")', host: {} } as OpenApiConnectionSerializedInputs,
        inputParameters
      );

      expect(result).toEqual(inputParameters);
    });

    test('handles parameters using name', () => {
      const builder = new OpenApiOperationInputsBuilder();

      const inputParameters = [{ key: 'inputs.$.to', name: 'to', type: 'string' }];
      const result = builder.loadStaticInputValuesFromDefinition(
        {
          authentication: '@parameters("$authentication")',
          host: {},
          parameters: { toAliased: '1', to: '2' },
        } as OpenApiConnectionSerializedInputs,
        inputParameters
      );

      expect(result).toEqual([
        {
          ...inputParameters[0],
          value: '2',
        },
      ]);
    });

    test('handles parameters using alias', () => {
      const builder = new OpenApiOperationInputsBuilder();

      const inputParameters = [{ alias: 'toAliased', key: 'inputs.$.to', name: 'to', type: 'string' }];
      const result = builder.loadStaticInputValuesFromDefinition(
        {
          authentication: '@parameters("$authentication")',
          host: {},
          parameters: { toAliased: '1', to: '2' },
        } as OpenApiConnectionSerializedInputs,
        inputParameters
      );

      expect(result).toEqual([
        {
          ...inputParameters[0],
          value: '1',
        },
      ]);
    });
  });
});
