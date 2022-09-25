import { convertToStringLiteral, isStringInterpolation, isStringLiteral } from '../common/helpers/expression';
import type { Dereference, Expression, ExpressionFunction, ExpressionLiteral } from '../models/expression';
import { ExpressionType } from '../models/expression';
import { getIntl } from '@microsoft-logic-apps/intl';
import { BaseException } from '@microsoft-logic-apps/utils';

/**
 * The expression builder exception name.
 */
export const ExpressionBuilderExceptionName = 'Workflow.ExpressionBuilderException';

/**
 * The expression builder error code.
 */
export enum ExpressionBuilderErrorCode {
  INVALID_TYPE = 'InvalidType',
}

/**
 * The expression builder exception.
 */
export class ExpressionBuilderException extends BaseException {
  constructor(message: string, code: ExpressionBuilderErrorCode) {
    super(ExpressionBuilderExceptionName, message, code);
  }
}

/**
 * The expression builder.
 */
export class ExpressionBuilder {
  /**
   * Builds a template expression string from the parsed expression.
   * @arg {Expression} expression - The parsed expression.
   * @return {string}
   */
  public buildTemplateExpression(expression: Expression): string {
    if (isStringLiteral(expression)) {
      return this._buildSingleString(expression.value);
    } else if (isStringInterpolation(expression)) {
      const segments = this._mergeSegments(expression.segments);
      if (segments.length === 1 && segments[0].type === ExpressionType.StringLiteral) {
        return this._buildSingleString((segments[0] as ExpressionLiteral).value);
      } else {
        const length = segments.length;
        return segments.map((segment, index) => this._buildSegment(segment, length, index)).join('');
      }
    } else {
      return `@${this.buildExpression(expression)}`;
    }
  }

  /**
   * Builds an expression string from the parsed expression.
   * @arg {Expression} expression - The parsed expression.
   * @return {string}
   */
  public buildExpression(expression: Expression): string {
    switch (expression.type) {
      case ExpressionType.NullLiteral:
      case ExpressionType.BooleanLiteral:
      case ExpressionType.NumberLiteral:
        return (expression as ExpressionLiteral).value;

      case ExpressionType.StringLiteral:
        return convertToStringLiteral((expression as ExpressionLiteral).value);

      case ExpressionType.Function:
        return this._buildFunctionExpression(expression as ExpressionFunction);

      default:
        throw new ExpressionBuilderException(
          getIntl().formatMessage(
            {
              defaultMessage: `Invalid expression type '{type}'.`,
              description: 'Error message on invalid expression type during building',
            },
            { type: expression.type }
          ),
          ExpressionBuilderErrorCode.INVALID_TYPE
        );
    }
  }

  private _buildSingleString(value: string): string {
    if (value.length > 1 && value.charAt(0) === '@') {
      return `@${value}`;
    } else {
      return value.replace(/@{/g, '@@{');
    }
  }

  private _buildSegment(expression: Expression, length: number, index: number): string {
    if (isStringLiteral(expression)) {
      const value = expression.value;
      const isFirst = index === 0;
      const isLast = index === length - 1;

      if ((isFirst && value[0] === '@') || (!isLast && value[value.length - 1] === '@')) {
        return `@{${convertToStringLiteral(value)}}`;
      } else {
        return value.replace(/@{/g, '@@{');
      }
    } else {
      return `@{${this.buildExpression(expression)}}`;
    }
  }

  private _mergeSegments(segments: Expression[]): Expression[] {
    const merged: Expression[] = [];
    for (const segment of segments) {
      if (isStringLiteral(segment) && merged.length > 0) {
        const lastIndex = merged.length - 1;
        const previous = merged[lastIndex];
        if (isStringLiteral(previous)) {
          merged[lastIndex] = {
            type: ExpressionType.StringLiteral,
            value: previous.value + segment.value,
          };
          continue;
        }
      }

      merged.push(segment);
    }

    return merged;
  }

  private _buildFunctionExpression(expression: ExpressionFunction): string {
    const functionName = expression.name;
    const functionArguments = expression.arguments.map((arg) => this.buildExpression(arg)).join(', ');
    const dereferences = expression.dereferences.map((dereference) => this._buildDereference(dereference)).join('');
    return `${functionName}(${functionArguments})${dereferences}`;
  }

  private _buildDereference(dereference: Dereference): string {
    const optional = dereference.isSafe ? '?' : '';
    const prefix = dereference.isDotNotation ? '.' : '[';
    const name = dereference.isDotNotation
      ? (dereference.expression as ExpressionLiteral).value
      : this.buildExpression(dereference.expression);
    const suffix = dereference.isDotNotation ? '' : ']';
    return `${optional}${prefix}${name}${suffix}`;
  }
}
