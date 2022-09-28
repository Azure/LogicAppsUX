import type { ParentDataType } from './Schema';

export interface FunctionData {
  key: string;
  functionName: string;
  type: string;

  maxNumberOfInputs: number; // -1 for unlimited
  inputs: FunctionInput[];
  outputValueType: ParentDataType;

  displayName: string;
  category: FunctionCategory;
  iconFileName?: string;
  description: string;
  tooltip: string;
}

export interface FunctionInput {
  name: string;
  allowedTypes: ParentDataType[];
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
