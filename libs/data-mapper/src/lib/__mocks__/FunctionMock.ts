import { NormalizedDataType } from '../models';
import type { FunctionData } from '../models/Function';
import { FunctionCategory } from '../models/Function';

export const concatFunction: FunctionData = {
  key: 'Concat',
  maxNumberOfInputs: -1,
  type: 'TransformationFunction',
  functionName: 'concat',
  outputValueType: NormalizedDataType.String,
  inputs: [
    {
      name: 'Value',
      allowedTypes: [NormalizedDataType.String],
      isOptional: false,
      allowCustomInput: true,
      tooltip: 'The value to use',
      placeHolder: 'The value',
    },
  ],
  displayName: 'Concatenate',
  category: FunctionCategory.String,
  description: 'Combines multiple strings together',
  tooltip: 'Combine strings',
};
