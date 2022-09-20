import type { SchemaNodeDataType } from './Schema';

export interface FunctionData {
  name: string;
  numberOfInputs: number;
  type: string;
  userExpression?: string;
  xsltExpression?: string;
  isSequenceInputSupported: boolean;
  isXsltOperatorExpression: boolean;

  // Made up
  inputs: FunctionInput[];
  outputType: SchemaNodeDataType;
  allowCustom: boolean;

  functionCategory: FunctionCategory;
  iconFileName?: string;
  detailedDescription: string;
  tooltip: string;
}

export interface FunctionInput {
  inputName: string;
  acceptableInputTypes: SchemaNodeDataType[];
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
