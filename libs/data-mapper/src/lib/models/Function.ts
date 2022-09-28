import type { NormalizedDataType } from './Schema';

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
