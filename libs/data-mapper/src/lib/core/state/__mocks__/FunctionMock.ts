import { NormalizedDataType } from '../../../models';
import { FunctionCategory } from '../../../models/Function';

export const concatFunction = {
  key: 'Concat',
  maxNumberOfInputs: -1,
  type: 'TransformationFunction',
  functionName: 'concat',
  outputValueType: NormalizedDataType.String,
  inputs: [
    {
      name: 'value',
      allowedTypes: [NormalizedDataType.String],
      isOptional: false,
      allowCustomInput: true,
      displayName: 'Value',
      tooltip: 'The value to use',
      placeholder: 'The value',
    },
  ],
  displayName: 'Concatenate',
  category: FunctionCategory.String,
  description: 'Combines multiple strings together',
  tooltip: 'Combine strings',
};
