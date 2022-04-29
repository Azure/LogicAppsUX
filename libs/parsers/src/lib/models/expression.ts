export enum ExpressionType {
  NullLiteral = 'NullLiteral',
  BooleanLiteral = 'BooleanLiteral',
  NumberLiteral = 'NumberLiteral',
  StringLiteral = 'StringLiteral',
  Function = 'Function',
  StringInterpolation = 'StringInterpolation',
}

export enum ExpressionFunctionNames {
  PARAMETERS = 'PARAMETERS',
  APPSETTING = 'APPSETTING',
}

export enum ExpressionTokenType {
  Dot = 'Dot',
  Comma = 'Comma',
  LeftParenthesis = 'LeftParenthesis',
  RightParenthesis = 'RightParenthesis',
  LeftSquareBracket = 'LeftSquareBracket',
  RightSquareBracket = 'RightSquareBracket',
  QuestionMark = 'QuestionMark',
  StringLiteral = 'StringLiteral',
  IntegerLiteral = 'IntegerLiteral',
  FloatLiteral = 'FloatLiteral',
  Identifier = 'Identifier',
  EndOfData = 'EndOfData',
}

export interface Dereference {
  isSafe: boolean;
  isDotNotation: boolean;
  expression: Expression;
}

export type Expression = ExpressionLiteral | ExpressionFunction | ExpressionStringInterpolation;

export interface ExpressionLiteral extends ExpressionBase {
  value: string;
}

export interface ExpressionFunction extends ExpressionBase {
  expression: string;
  name: string;
  startPosition: number;
  endPosition: number;
  arguments: Expression[];
  dereferences: Dereference[];
}

export interface ExpressionStringInterpolation extends ExpressionBase {
  segments: Expression[];
}

export interface ExpressionEvaluationContext {
  /**
   * @member {Record<string, any>} parameters - The parameters.
   */
  parameters: Record<string, any>;

  /**
   * @member {Record<string, any>} appsettings - The appsettings.
   */
  appsettings: Record<string, any>;
}

export interface ExpressionToken {
  type: ExpressionTokenType;
  value: string;
  startPosition: number;
  endPosition: number;
}

interface ExpressionBase {
  type: ExpressionType;
}
