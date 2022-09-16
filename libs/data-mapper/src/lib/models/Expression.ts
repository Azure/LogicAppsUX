import type { SchemaNodeDataType } from './Schema';

export interface Expression {
  name: string;
  numberOfInputs: number;
  type: string;
  userExpression?: string;
  xsltExpression?: string;
  isSequenceInputSupported: boolean;
  isXsltOperatorExpression: boolean;

  // Made up
  inputs: ExpressionInput[];
  outputType: SchemaNodeDataType;
  allowCustom: boolean;

  expressionCategory: ExpressionCategory;
  iconFileName?: string;
  detailedDescription: string;
  tooltip: string;
}

export interface ExpressionInput {
  inputName: string;
  acceptableInputTypes: SchemaNodeDataType[];
}

export enum ExpressionCategory {
  Collection = 'collection',
  DateTime = 'dateTime',
  Logical = 'logical',
  Math = 'math',
  String = 'string',
  Utility = 'utility',
}

export type ExpressionDictionary = { [key: string]: Expression };
