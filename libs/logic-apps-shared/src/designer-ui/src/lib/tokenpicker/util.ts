import type { Token } from './models/token';
import type { ParserExpression, ExpressionFunction, ExpressionLiteral } from '@microsoft/parsers-logic-apps';
import { ExpressionType } from '@microsoft/parsers-logic-apps';
import { UnsupportedException } from '@microsoft/utils-logic-apps';

export function getExpressionTokenTitle(expression: ParserExpression): string {
  switch (expression.type) {
    case ExpressionType.NullLiteral:
    case ExpressionType.BooleanLiteral:
    case ExpressionType.NumberLiteral:
    case ExpressionType.StringLiteral:
      return (expression as ExpressionLiteral).value;
    case ExpressionType.Function:
      // eslint-disable-next-line no-case-declarations
      const functionExpression = expression as ExpressionFunction;
      return `${functionExpression.name}(${functionExpression.arguments.length > 0 ? '...' : ''})`;
    default:
      throw new UnsupportedException(`Unsupported expression type ${expression.type}.`);
  }
}

export function getExpressionOutput(expression: ParserExpression, outputTokenMap: Record<string, Token>): Token | undefined {
  switch (expression.type) {
    case ExpressionType.NullLiteral:
    case ExpressionType.BooleanLiteral:
    case ExpressionType.NumberLiteral:
    case ExpressionType.StringLiteral:
      return undefined;
    case ExpressionType.Function:
      // eslint-disable-next-line no-case-declarations
      const functionExpression = expression as ExpressionFunction;
      return outputTokenMap[functionExpression.expression] ?? undefined;
    default:
      throw new UnsupportedException(`Unsupported expression type ${expression.type}.`);
  }
}
