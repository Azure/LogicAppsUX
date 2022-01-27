import { ExpressionType } from '../helpers/expression';
import { ExpressionTokenType } from '../helpers/scanner';

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
