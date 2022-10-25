import { getFunctionOutputValue } from '../Function.Utils';

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
});
