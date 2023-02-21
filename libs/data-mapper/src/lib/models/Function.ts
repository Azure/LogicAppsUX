import { mapNodeParams } from '../constants/MapDefinitionConstants';
import { NormalizedDataType } from './Schema';

export interface FunctionManifest {
  version: string;
  transformFunctions: FunctionData[];
}

export enum FunctionType {
  PseudoFunction = 'PseudoFunction',
  TransformationFunction = 'TransformationFunction',
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
  type: FunctionType.PseudoFunction,
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
  type: FunctionType.PseudoFunction,
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

export const directAccessPseudoFunctionKey = 'directAccess';
export const directAccessPseudoFunction: FunctionData = {
  key: directAccessPseudoFunctionKey,
  maxNumberOfInputs: 3,
  type: FunctionType.PseudoFunction,
  functionName: '',
  outputValueType: NormalizedDataType.Any,
  inputs: [
    {
      name: 'Source Index',
      allowedTypes: [NormalizedDataType.Number, NormalizedDataType.Any],
      isOptional: false,
      allowCustomInput: true,
      placeHolder: 'The source index value',
    },
    {
      name: 'Scope',
      allowedTypes: [NormalizedDataType.ComplexType],
      isOptional: false,
      allowCustomInput: false,
      placeHolder: 'Where to apply the index',
    },
    {
      name: 'Output property',
      allowedTypes: [NormalizedDataType.Any],
      isOptional: false,
      allowCustomInput: false,
      placeHolder: 'The value to generate',
    },
  ],
  displayName: 'Direct Access',
  category: FunctionCategory.Collection,
  description: 'Directly access the value specified by the index and the given property',
};

export const pseudoFunctions: FunctionData[] = [indexPseudoFunction, ifPseudoFunction, directAccessPseudoFunction];

// Used in Standalone when the function host isn't running, or for testing
export const functionMock: FunctionData[] = [
  {
    key: 'Maximum',
    maxNumberOfInputs: 2,
    type: FunctionType.TransformationFunction,
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
    type: FunctionType.TransformationFunction,
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
    type: FunctionType.TransformationFunction,
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
    type: FunctionType.TransformationFunction,
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
    type: FunctionType.TransformationFunction,
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
    type: FunctionType.TransformationFunction,
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
    type: FunctionType.TransformationFunction,
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
    type: FunctionType.TransformationFunction,
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
    type: FunctionType.TransformationFunction,
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
  {
    key: 'Multiply',
    maxNumberOfInputs: -1,
    type: FunctionType.TransformationFunction,
    functionName: 'multiply',
    outputValueType: NormalizedDataType.Number,
    inputs: [
      {
        name: 'Multiplicand',
        allowedTypes: [NormalizedDataType.Number, NormalizedDataType.Integer, NormalizedDataType.Decimal],
        isOptional: false,
        allowCustomInput: true,
        placeHolder: 'The number to multiply',
      },
    ],
    displayName: 'Multiply',
    category: FunctionCategory.Math,
    iconFileName: 'dm_category_math.svg',
    description: 'Returns the product from multiplying two or more numbers.',
  },
  {
    key: 'IsEqual',
    maxNumberOfInputs: 2,
    type: FunctionType.TransformationFunction,
    functionName: 'is-equal',
    outputValueType: NormalizedDataType.Boolean,
    inputs: [
      {
        name: 'Object A',
        allowedTypes: [NormalizedDataType.Any],
        isOptional: false,
        allowCustomInput: true,
        placeHolder: 'An object to compare',
      },
      {
        name: 'Object B',
        allowedTypes: [NormalizedDataType.Any],
        isOptional: false,
        allowCustomInput: true,
        placeHolder: 'An object to compare',
      },
    ],
    displayName: 'Is equal',
    category: FunctionCategory.Logical,
    iconFileName: 'dm_category_logical.svg',
    description: 'Returns whether two objects are equal',
  },
  {
    key: 'SubString',
    maxNumberOfInputs: 3,
    type: FunctionType.TransformationFunction,
    functionName: 'substring',
    outputValueType: NormalizedDataType.String,
    inputs: [
      {
        name: 'String',
        allowedTypes: [NormalizedDataType.String],
        isOptional: false,
        allowCustomInput: true,
        placeHolder: 'The source string',
      },
      {
        name: 'Start index',
        allowedTypes: [NormalizedDataType.Integer],
        isOptional: false,
        allowCustomInput: true,
        placeHolder: 'The index to start the substring at',
      },
      {
        name: 'End index',
        allowedTypes: [NormalizedDataType.Integer],
        isOptional: false,
        allowCustomInput: true,
        placeHolder: 'The index to end the substring at',
      },
    ],
    displayName: 'Substring',
    category: FunctionCategory.String,
    iconFileName: 'dm_category_string.svg',
    description: 'Returns a substring of the current string',
  },
  {
    key: 'Count',
    maxNumberOfInputs: 1,
    type: FunctionType.TransformationFunction,
    functionName: 'count',
    outputValueType: NormalizedDataType.Integer,
    inputs: [
      {
        name: 'Value',
        allowedTypes: [NormalizedDataType.Any],
        isOptional: false,
        allowCustomInput: false,
        placeHolder: '',
      },
    ],
    displayName: 'Count',
    category: FunctionCategory.Collection,
    iconFileName: 'dm_category_collection.svg',
    description: 'Returns the count of an item in a collection.',
  },
  {
    key: 'Divide',
    maxNumberOfInputs: 2,
    type: FunctionType.TransformationFunction,
    functionName: 'divide',
    outputValueType: NormalizedDataType.Number,
    inputs: [
      {
        name: 'Dividend',
        allowedTypes: [NormalizedDataType.Number, NormalizedDataType.Integer, NormalizedDataType.Decimal],
        isOptional: false,
        allowCustomInput: true,
        placeHolder: 'The number to divide by the divisor',
      },
      {
        name: 'Divisor',
        allowedTypes: [NormalizedDataType.Number, NormalizedDataType.Integer, NormalizedDataType.Decimal],
        isOptional: false,
        allowCustomInput: true,
        placeHolder: 'The number that divides the dividend.',
        tooltip: `Can't be zero.`,
      },
    ],
    displayName: 'Divide',
    category: FunctionCategory.Math,
    iconFileName: 'dm_category_math.svg',
    description: 'Returns the result from dividing two numbers.',
  },
  ...pseudoFunctions,
];
