import { mapNodeParams } from '../constants/MapDefinitionConstants';
import { NormalizedDataType } from './Schema';

export interface FunctionManifest {
  version: string;
  transformFunctions: FunctionData[];
}

export interface FunctionData {
  key: string;
  functionName: string;
  type: string;

  maxNumberOfInputs: number; // -1 for unlimited
  inputs: FunctionInput[];
  outputValueType: NormalizedDataType;

  displayName: string;
  category: FunctionCategory;
  iconFileName?: string;
  description: string;
  tooltip?: string;
}

export interface FunctionInput {
  name: string;
  allowedTypes: NormalizedDataType[];
  isOptional: boolean;
  allowCustomInput: boolean;

  tooltip?: string;
  placeHolder: string;
}

// NOTE: These values must be in alphabetical order (used in sorting within FunctionsList)
export enum FunctionCategory {
  Collection = 'Collection',
  Conversion = 'Conversion',
  DateTime = 'Date time',
  Logical = 'Logical',
  Math = 'Math',
  String = 'String',
  Utility = 'Utilities',
}

export type FunctionDictionary = { [key: string]: FunctionData };

export const indexPseudoFunctionKey = 'index';
export const indexPseudoFunction: FunctionData = {
  key: indexPseudoFunctionKey,
  maxNumberOfInputs: 1,
  type: 'PseudoFunction',
  functionName: '',
  outputValueType: NormalizedDataType.Any,
  inputs: [
    {
      name: 'Loop',
      allowedTypes: [NormalizedDataType.ComplexType],
      isOptional: false,
      allowCustomInput: false,
      placeHolder: 'The source loop.',
    },
  ],
  displayName: 'Index',
  category: FunctionCategory.Collection,
  description: 'Adds an index value to the loop',
};

export const ifPseudoFunctionKey = 'if';
export const ifPseudoFunction: FunctionData = {
  key: ifPseudoFunctionKey,
  maxNumberOfInputs: 2,
  type: 'PseudoFunction',
  functionName: mapNodeParams.if,
  outputValueType: NormalizedDataType.Any,
  inputs: [
    {
      name: 'Condition',
      allowedTypes: [NormalizedDataType.Boolean],
      isOptional: false,
      allowCustomInput: false,
      placeHolder: 'The condition to generate off of',
    },
    {
      name: 'Value',
      allowedTypes: [NormalizedDataType.Any],
      isOptional: false,
      allowCustomInput: false,
      placeHolder: 'The value to generate',
    },
  ],
  displayName: 'If',
  category: FunctionCategory.Logical,
  description: 'Generate child values when condition is true',
};

export const pseudoFunctions: FunctionData[] = [indexPseudoFunction, ifPseudoFunction];

// Temp until we get the manifest plugged in
export const functionMock: FunctionData[] = [
  {
    key: 'Maximum',
    maxNumberOfInputs: 2,
    type: 'TransformationFunction',
    functionName: 'max',
    outputValueType: NormalizedDataType.Number,
    inputs: [
      {
        name: 'Value',
        allowedTypes: [NormalizedDataType.Number, NormalizedDataType.Decimal, NormalizedDataType.Integer],
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
    displayName: 'Max',
    category: FunctionCategory.Math,
    description: 'The max between two values',
    tooltip: 'Max between two values',
  },
  {
    key: 'Minimum',
    maxNumberOfInputs: 2,
    type: 'TransformationFunction',
    functionName: 'min',
    outputValueType: NormalizedDataType.Number,
    inputs: [
      {
        name: 'Value',
        allowedTypes: [NormalizedDataType.Number, NormalizedDataType.Decimal, NormalizedDataType.Integer],
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
    iconFileName: '',
    description: 'The min between 2 numbers',
    tooltip: 'The min',
  },
  {
    key: 'Average',
    maxNumberOfInputs: 2,
    type: 'TransformationFunction',
    functionName: 'avg',
    outputValueType: NormalizedDataType.Number,
    inputs: [
      {
        name: 'Value',
        allowedTypes: [NormalizedDataType.Number, NormalizedDataType.Decimal, NormalizedDataType.Integer],
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
    displayName: 'Average',
    category: FunctionCategory.Math,
    description: 'The average between two numbers',
    tooltip: 'The average',
  },
  {
    key: 'CurrentDate',
    maxNumberOfInputs: 0,
    type: 'TransformationFunction',
    functionName: 'current-date',
    outputValueType: NormalizedDataType.DateTime,
    inputs: [],
    displayName: 'Current Date',
    category: FunctionCategory.DateTime,
    description: 'Current date in the current time zone',
    tooltip: 'Current date',
  },
  {
    key: 'ToLower',
    maxNumberOfInputs: 1,
    type: 'TransformationFunction',
    functionName: 'lower-case',
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
    displayName: 'To Lower',
    category: FunctionCategory.String,
    description: 'Sets a string to be all lower case',
    tooltip: 'Lower case',
  },
  {
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
  },
  {
    key: 'ToString',
    maxNumberOfInputs: 1,
    type: 'TransformationFunction',
    functionName: 'string',
    outputValueType: NormalizedDataType.String,
    inputs: [
      {
        name: 'Value',
        allowedTypes: [NormalizedDataType.Any],
        isOptional: false,
        allowCustomInput: true,
        tooltip: 'The value to use',
        placeHolder: 'The value',
      },
    ],
    displayName: 'To String',
    category: FunctionCategory.Conversion,
    description: 'Converts the input into a string',
    tooltip: 'Converts to string',
  },
  {
    key: 'IsNull',
    maxNumberOfInputs: 1,
    type: 'TransformationFunction',
    functionName: 'is-null',
    outputValueType: NormalizedDataType.Boolean,
    inputs: [
      {
        name: 'Value',
        allowedTypes: [NormalizedDataType.Any],
        isOptional: false,
        allowCustomInput: false,
        placeHolder: 'The value to check.',
      },
    ],
    displayName: 'Is null',
    category: FunctionCategory.Logical,
    iconFileName: 'dm_category_logical.svg',
    description: 'Checks whether the value is Null.',
  },
  {
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
    iconFileName: 'dm_category_logical.svg',
    description: 'Checks whether the first value is greater than the second value.',
  },
  ...pseudoFunctions,
];
