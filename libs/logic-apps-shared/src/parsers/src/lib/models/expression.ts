export const ExpressionType = {
  NullLiteral: 'NullLiteral',
  BooleanLiteral: 'BooleanLiteral',
  NumberLiteral: 'NumberLiteral',
  StringLiteral: 'StringLiteral',
  Function: 'Function',
  StringInterpolation: 'StringInterpolation',
} as const;
export type ExpressionType = (typeof ExpressionType)[keyof typeof ExpressionType];

export const ExpressionFunctionNames = {
  PARAMETERS: 'PARAMETERS',
  APPSETTING: 'APPSETTING',
} as const;
export type ExpressionFunctionNames = (typeof ExpressionFunctionNames)[keyof typeof ExpressionFunctionNames];

export const ExpressionTokenType = {
  Dot: 'Dot',
  Comma: 'Comma',
  LeftParenthesis: 'LeftParenthesis',
  RightParenthesis: 'RightParenthesis',
  LeftSquareBracket: 'LeftSquareBracket',
  RightSquareBracket: 'RightSquareBracket',
  QuestionMark: 'QuestionMark',
  StringLiteral: 'StringLiteral',
  IntegerLiteral: 'IntegerLiteral',
  FloatLiteral: 'FloatLiteral',
  Identifier: 'Identifier',
  EndOfData: 'EndOfData',
} as const;
export type ExpressionTokenType = (typeof ExpressionTokenType)[keyof typeof ExpressionTokenType];

export interface Dereference {
  isSafe: boolean;
  isDotNotation: boolean;
  expression: ParserExpression;
}

export type ParserExpression = ExpressionLiteral | ExpressionFunction | ExpressionStringInterpolation;

export interface ExpressionLiteral extends ExpressionBase {
  value: string;
}

export interface ExpressionFunction extends ExpressionBase {
  expression: string;
  name: string;
  startPosition: number;
  endPosition: number;
  arguments: ParserExpression[];
  dereferences: Dereference[];
}

export interface ExpressionStringInterpolation extends ExpressionBase {
  segments: ParserExpression[];
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
