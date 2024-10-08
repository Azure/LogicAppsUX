import type { Expression, ExpressionFunction, ExpressionLiteral, Token } from '@microsoft/logic-apps-shared';
import { ExpressionType, UnsupportedException } from '@microsoft/logic-apps-shared';

export function getExpressionTokenTitle(expression: Expression): string {
  switch (expression.type) {
    case ExpressionType.NullLiteral:
    case ExpressionType.BooleanLiteral:
    case ExpressionType.NumberLiteral:
    case ExpressionType.StringLiteral:
      return (expression as ExpressionLiteral).value;
    case ExpressionType.Function: {
      const functionExpression = expression as ExpressionFunction;
      return `${functionExpression.name}(${functionExpression.arguments.length > 0 ? '...' : ''})`;
    }
    default:
      throw new UnsupportedException(`Unsupported expression type ${expression.type}.`);
  }
}

export function getExpressionOutput(expression: Expression, outputTokenMap: Record<string, Token>): Token | undefined {
  switch (expression.type) {
    case ExpressionType.NullLiteral:
    case ExpressionType.BooleanLiteral:
    case ExpressionType.NumberLiteral:
    case ExpressionType.StringLiteral:
      return undefined;
    case ExpressionType.Function: {
      const functionExpression = expression as ExpressionFunction;
      return outputTokenMap[functionExpression.expression] ?? undefined;
    }
    default:
      throw new UnsupportedException(`Unsupported expression type ${expression.type}.`);
  }
}
