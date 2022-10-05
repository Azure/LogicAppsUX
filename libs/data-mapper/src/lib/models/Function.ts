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
  tooltip: string;
}

export interface FunctionInput {
  name: string;
  allowedTypes: NormalizedDataType[];
  isOptional: boolean;
  allowCustomInput: boolean;

  displayName: string;
  tooltip: string;
  placeholder: string;
}

export enum FunctionCategory {
  Collection = 'collection',
  DateTime = 'dateTime',
  Logical = 'logical',
  Math = 'math',
  String = 'string',
  Utility = 'utility',
}

export type FunctionDictionary = { [key: string]: FunctionData };

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
        name: 'value',
        allowedTypes: [NormalizedDataType.Number, NormalizedDataType.Decimal, NormalizedDataType.Integer],
        isOptional: false,
        allowCustomInput: false,
        displayName: 'Value',
        tooltip: 'The value to use',
        placeholder: 'The value',
      },
      {
        name: 'scope',
        allowedTypes: [NormalizedDataType.Any],
        isOptional: true,
        allowCustomInput: false,
        displayName: 'Scope',
        tooltip: 'The scope to use',
        placeholder: 'The scope',
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
        name: 'value',
        allowedTypes: [NormalizedDataType.Number, NormalizedDataType.Decimal, NormalizedDataType.Integer],
        isOptional: false,
        allowCustomInput: false,
        displayName: 'Value',
        tooltip: 'The value to use',
        placeholder: 'The value',
      },
      {
        name: 'scope',
        allowedTypes: [NormalizedDataType.Any],
        isOptional: true,
        allowCustomInput: false,
        displayName: 'Scope',
        tooltip: 'The scope to use',
        placeholder: 'The scope',
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
        name: 'value',
        allowedTypes: [NormalizedDataType.Number, NormalizedDataType.Decimal, NormalizedDataType.Integer],
        isOptional: false,
        allowCustomInput: false,
        displayName: 'Value',
        tooltip: 'The value to use',
        placeholder: 'The value',
      },
      {
        name: 'scope',
        allowedTypes: [NormalizedDataType.Any],
        isOptional: true,
        allowCustomInput: false,
        displayName: 'Scope',
        tooltip: 'The scope to use',
        placeholder: 'The scope',
      },
    ],
    displayName: 'Average',
    category: FunctionCategory.Math,
    description: 'The average between two numbers',
    tooltip: 'The average',
  },
  {
    key: 'ForEach',
    maxNumberOfInputs: 2,
    type: 'TransformationControlFunction',
    functionName: '$for',
    outputValueType: NormalizedDataType.Any,
    inputs: [
      {
        name: 'collection',
        allowedTypes: [NormalizedDataType.Any],
        isOptional: false,
        allowCustomInput: false,
        displayName: 'Scope',
        tooltip: 'The scope to use',
        placeholder: 'The scope',
      },
      {
        name: 'indexVariable',
        allowedTypes: [NormalizedDataType.String],
        isOptional: true,
        allowCustomInput: true,
        displayName: 'Index',
        tooltip: 'The index of the loop',
        placeholder: 'The index',
      },
    ],
    displayName: 'For Each',
    category: FunctionCategory.Utility,
    description: 'Step through your loop',
    tooltip: 'A basic For Each',
  },
  {
    key: 'Condition',
    maxNumberOfInputs: 1,
    type: 'TransformationControlFunction',
    functionName: '$if',
    outputValueType: NormalizedDataType.Any,
    inputs: [
      {
        name: 'condition',
        allowedTypes: [NormalizedDataType.Boolean],
        isOptional: false,
        allowCustomInput: true,
        displayName: 'Scope',
        tooltip: 'The scope to use',
        placeholder: 'The scope',
      },
    ],
    displayName: 'Condition',
    category: FunctionCategory.Utility,
    description: 'The condition to evaluate',
    tooltip: 'Input condition',
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
        name: 'value',
        allowedTypes: [NormalizedDataType.String],
        isOptional: false,
        allowCustomInput: true,
        displayName: 'Value',
        tooltip: 'The value to use',
        placeholder: 'The value',
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
  },
  {
    key: 'ToString',
    maxNumberOfInputs: 1,
    type: 'TransformationFunction',
    functionName: 'string',
    outputValueType: NormalizedDataType.String,
    inputs: [
      {
        name: 'value',
        allowedTypes: [NormalizedDataType.Any],
        isOptional: false,
        allowCustomInput: true,
        displayName: 'Value',
        tooltip: 'The value to use',
        placeholder: 'The value',
      },
    ],
    displayName: 'To String',
    category: FunctionCategory.String,
    description: 'Converts the input into a string',
    tooltip: 'Converts to string',
  },
];
