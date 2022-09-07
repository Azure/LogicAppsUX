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
  expressionCategory: ExpressionCategory;
  iconSpecification: string;
  iconSource: ExpressionIconSource;
  outputType: SchemaNodeDataType; // Maybe make this type generic
  detailedDescription: string;
  tooltip: string;
}

export enum ExpressionCategory {
  Collection = 'collection',
  DateTime = 'dateTime',
  Logical = 'logical',
  Math = 'math',
  String = 'string',
  Utility = 'utility',
}

export enum ExpressionIconSource {
  MDL2 = 'mdl2',
  Fluent = 'fluent',
  Windows = 'windows',
  Custom = 'custom',
  None = 'none',
}
