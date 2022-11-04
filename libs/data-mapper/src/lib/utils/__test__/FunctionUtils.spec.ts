import type { ConnectionDictionary } from '../../models/Connection';
import type { FunctionData } from '../../models/Function';
import { functionInputHasInputs, getFunctionOutputValue } from '../Function.Utils';

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

    it('Test function input that doesnt have inputs', () => {
      expect(functionInputHasInputs(mockReactFlowKey, mockConnections)).toEqual(false);
    });

    it('Test function input that has inputs', () => {
      mockConnections[mockReactFlowKey].inputs[0] = ['testInput'];
      expect(functionInputHasInputs(mockReactFlowKey, mockConnections)).toEqual(true);
    });
  });
});
