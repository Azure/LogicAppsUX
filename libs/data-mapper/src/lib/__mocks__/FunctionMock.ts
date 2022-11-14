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

export const greaterThanFunction: FunctionData = {
  key: 'IsGreater',
  maxNumberOfInputs: 2,
  type: 'TransformationFunction',
  functionName: 'is-greater-than',
  outputValueType: NormalizedDataType.Boolean,
  inputs: [
    {
      name: 'Value',
      allowedTypes: [NormalizedDataType.Any],
      isOptional: false,
      allowCustomInput: true,
      placeHolder: 'The value to check.',
    },
    {
      name: '',
      allowedTypes: [NormalizedDataType.Any],
      isOptional: false,
      allowCustomInput: true,
      placeHolder: '',
    },
  ],
  displayName: 'Greater',
  category: FunctionCategory.Logical,
  description: 'Checks whether the first value is greater than the second value.',
};

export const conditionalFunction: FunctionData = {
  category: FunctionCategory.Logical,
  description: 'Evaluates the condition of the input value.',
  key: 'Condition',
  maxNumberOfInputs: 1,
  outputValueType: NormalizedDataType.Any,
  type: 'TransformationControlFunction',
  displayName: 'Condition',
  functionName: '$if',
  iconFileName: 'dm_category_logical.svg',
  inputs: [
    {
      allowCustomInput: true,
      allowedTypes: [NormalizedDataType.Boolean],
      isOptional: false,
      name: 'Condition',
      placeHolder: 'The condition to evaluate.',
    },
  ],
};
