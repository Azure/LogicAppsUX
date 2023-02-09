import { heavyRepeatingMockSchema } from '../../__mocks__';
import type { Schema, SchemaExtended } from '../../models';
import type { ConnectionDictionary } from '../../models/Connection';
import type { FunctionData } from '../../models/Function';
import { calculateIndexValue, functionInputHasInputs, getFunctionOutputValue } from '../Function.Utils';
import { convertSchemaToSchemaExtended } from '../Schema.Utils';

describe('utils/Functions', () => {
  describe('getFunctionOutputValue', () => {
    const functionName = 'testFunction';
    const inputArgs: string[] = ['arg1', 'arg2', 'arg3'];

    it('Test correct output value without arguments', () => {
      expect(getFunctionOutputValue([], functionName)).toEqual(`${functionName}()`);
    });

    it('Test correct output value with arguments', () => {
      expect(getFunctionOutputValue(inputArgs, functionName)).toEqual(`${functionName}(${inputArgs[0]}, ${inputArgs[1]}, ${inputArgs[2]})`);
    });
  });

  describe('calculateIndexValue', () => {
    const sourceSchema: Schema = heavyRepeatingMockSchema;
    const extendedSourceSchema: SchemaExtended = convertSchemaToSchemaExtended(sourceSchema);

    const parentNodeUnder26 =
      extendedSourceSchema.schemaTreeRoot.children[0].children[0].children[0].children[0].children[0].children[0].children[0].children[0]
        .children[0].children[0].children[0].children[0].children[0].children[0].children[0].children[0].children[0].children[0].children[0]
        .children[0].children[0].children[0].children[0];
    const correctParentNodeOver26 =
      extendedSourceSchema.schemaTreeRoot.children[0].children[0].children[0].children[0].children[0].children[0].children[0].children[0]
        .children[0].children[0].children[0].children[0].children[0].children[0].children[0].children[0].children[0].children[0].children[0]
        .children[0].children[0].children[0].children[0].children[0].children[0].children[0].children[0];

    it('Generates loop index value less than 26 children', () => {
      const indexValue = calculateIndexValue(parentNodeUnder26);

      expect(indexValue).toEqual('$x');
    });

    it('Generates loop index value for more than 26 children', () => {
      const indexValue = calculateIndexValue(correctParentNodeOver26);

      expect(indexValue).toEqual('$zb');
    });

    it('Generates same loop index value for more than same level children', () => {
      const indexValueA = calculateIndexValue(correctParentNodeOver26.children[0]);
      const indexValueB = calculateIndexValue(correctParentNodeOver26.children[1]);

      expect(indexValueA).toEqual('$zc');
      expect(indexValueB).toEqual('$zc');
      expect(indexValueA).toEqual(indexValueB);
    });
  });

  describe('functionInputHasInputs', () => {
    const mockReactFlowKey = 'testFunctionInputKey';
    const mockConnections: ConnectionDictionary = {
      [mockReactFlowKey]: {
        self: {
          reactFlowKey: mockReactFlowKey,
          node: {} as FunctionData,
        },
        inputs: {
          0: [],
        },
        outputs: [],
      },
    };

    it('Test function input that does not have inputs', () => {
      expect(functionInputHasInputs(mockReactFlowKey, mockConnections)).toEqual(false);
    });

    it('Test function input that has inputs', () => {
      mockConnections[mockReactFlowKey].inputs[0] = ['testInput'];
      expect(functionInputHasInputs(mockReactFlowKey, mockConnections)).toEqual(true);
    });
  });
});
