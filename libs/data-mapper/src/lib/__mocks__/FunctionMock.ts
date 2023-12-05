import type { FunctionData } from '../models/Function';
import { FunctionCategory } from '../models/Function';
import { NormalizedDataType } from '@microsoft/utils-logic-apps';

export const addFunction: FunctionData = {
  key: 'Add',
  maxNumberOfInputs: -1,
  functionName: 'add',
  outputValueType: NormalizedDataType.Number,
  inputs: [
    {
      name: 'Summand',
      allowedTypes: [NormalizedDataType.Number, NormalizedDataType.Integer, NormalizedDataType.Decimal],
      isOptional: false,
      allowCustomInput: true,
      placeHolder: 'The numbers to add',
    },
  ],
  displayName: 'Add',
  category: FunctionCategory.Math,
  description: 'Returns the result from adding two or more numbers.',
};

export const minFunction: FunctionData = {
  key: 'Minimum',
  maxNumberOfInputs: 2,
  functionName: 'min',
  outputValueType: NormalizedDataType.Number,
  inputs: [
    {
      name: 'Value',
      allowedTypes: [NormalizedDataType.Decimal],
      isOptional: false,
      allowCustomInput: false,
      tooltip: 'The value to use',
      placeHolder: 'The value',
    },
    {
      name: 'Scope',
      allowedTypes: [NormalizedDataType.Any],
      isOptional: true,
      allowCustomInput: false,
      tooltip: 'The scope to use',
      placeHolder: 'The scope',
    },
  ],
  displayName: 'Min',
  category: FunctionCategory.Math,
  description: 'The min between 2 numbers',
  tooltip: 'The min',
};

export const concatFunction: FunctionData = {
  key: 'Concat',
  maxNumberOfInputs: -1,
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
  displayName: 'Condition',
  functionName: '$if',
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

export const sortFunction: FunctionData = {
  key: 'sort',
  maxNumberOfInputs: 2,
  functionName: 'sort',
  outputValueType: NormalizedDataType.Complex,
  inputs: [
    {
      name: 'Scope',
      allowedTypes: [NormalizedDataType.Complex, NormalizedDataType.Object],
      isOptional: false,
      allowCustomInput: false,
      placeHolder: 'The source sequence',
    },
    {
      name: 'Sort property',
      allowedTypes: [NormalizedDataType.Any],
      isOptional: false,
      allowCustomInput: false,
      placeHolder: 'The property to sort on',
    },
  ],
  displayName: 'Sort',
  category: FunctionCategory.Collection,
  description: 'Sort the sequence by a given property',
};
