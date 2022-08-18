import type { Expression, ExpressionFunction, ExpressionLiteral } from '@microsoft-logic-apps/parsers';
import { ExpressionType } from '@microsoft-logic-apps/parsers';
import { UnsupportedException } from '@microsoft-logic-apps/utils';

export function getExpressionTokenTitle(expression: Expression): string {
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
