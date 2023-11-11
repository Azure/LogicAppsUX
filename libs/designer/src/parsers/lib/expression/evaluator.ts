import { isFunction, isStringLiteral, isStringInterpolation } from '../common/helpers/expression';
import type { ExpressionEvaluationContext } from '../models/expression';
import { ExpressionFunctionNames } from '../models/expression';
import { ExpressionParser } from './parser';
import { getIntl , BaseException } from '@microsoft/logic-apps-designer';

/**
 * The expression evaluator exception name.
 */
export const ExpressionEvaluatorExceptionName = 'Workflow.ExpressionEvaluatorException';

/**
 * The expression evaluator error code.
 */
export enum ExpressionEvaluatorErrorCode {
  UNRECOGNIZED_EXPRESSION = 'UnrecognizedExpression',
  EMPTY_VALUE = 'EmptyValue',
}

/**
 * The expression evaluator exception.
 */
export class ExpressionEvaluatorException extends BaseException {
  constructor(message: string, code: ExpressionEvaluatorErrorCode) {
    super(ExpressionEvaluatorExceptionName, message, code);
  }
}

/**
 * The expression evaluator options.
 */
export interface ExpressionEvaluatorOptions {
  /**
   * @member {boolean} [fuzzyEvaluation] - The value indicating whether to fuzzy evaluate the expression.
   */
  fuzzyEvaluation?: boolean;

  /**
   * @member {ExpressionEvaluationContext} [context] - The evaluation context.
   */
  context?: ExpressionEvaluationContext;
}

/**
 * The expression evaluator.
 */
export class ExpressionEvaluator {
  private _options: ExpressionEvaluatorOptions;

  constructor(options?: ExpressionEvaluatorOptions) {
    this._options = options ? options : {};
  }

  /**
   * Evaluates the template expression.
   * @arg {string} expression - The template expression.
   * @return {any} - The evaluation result.
   */
  evaluate(expression: string): any {
    if (this._options.fuzzyEvaluation) {
      return this._fuzzyEvaluate(expression);
    } else {
      return this._evaluate(expression);
    }
  }

  private _evaluate(expression: string): any {
    // TODO: Fully evaluate the expression.
    return this._fuzzyEvaluate(expression);
  }

  private _fuzzyEvaluate(expression: string): any {
    const intl = getIntl();
    // NOTE: This method is best effort to evaluate if the value is template expression,
    if (!expression) {
      throw new ExpressionEvaluatorException(
        intl.formatMessage({ defaultMessage: 'Empty value', description: 'Error message on expression evaluation' }),
        ExpressionEvaluatorErrorCode.EMPTY_VALUE
      );
    }

    const { context } = this._options;
    if (context) {
      const ast = ExpressionParser.parseTemplateExpression(expression);

      let func = ast;
      let isInterpolated = false;
      if (isStringInterpolation(ast) && ast.segments.length === 1) {
        func = ast.segments[0];
        isInterpolated = true;
      }

      if (isFunction(func)) {
        const functionName = func.name.toUpperCase();
        if (
          functionName === ExpressionFunctionNames.PARAMETERS ||
          (functionName === ExpressionFunctionNames.APPSETTING && func.arguments.length === 1)
        ) {
          const arg = func.arguments[0];
          if (isStringLiteral(arg)) {
            const result =
              functionName === ExpressionFunctionNames.PARAMETERS ? context.parameters[arg.value] : context.appsettings[arg.value];
            if (isInterpolated) {
              if (result === undefined || result === null || typeof result === 'string') {
                return result;
              }
            } else {
              return result;
            }
          }
        }
      }
    }

    if (/^@@/.test(expression)) {
      return expression.substr(1);
    }

    if (/@@{/.test(expression)) {
      return expression.replace(/@@{/g, '@{');
    }

    if (/^@/.test(expression)) {
      throw new ExpressionEvaluatorException(
        intl.formatMessage(
          { defaultMessage: `Unrecognized expression ''{expression}''`, description: 'Error message on invalid expression' },
          { expression }
        ),
        ExpressionEvaluatorErrorCode.UNRECOGNIZED_EXPRESSION
      );
    }

    if (/@{/.test(expression)) {
      throw new ExpressionEvaluatorException(
        intl.formatMessage(
          { defaultMessage: `Unrecognized expression ''{expression}''`, description: 'Error message on invalid expression' },
          { expression }
        ),
        ExpressionEvaluatorErrorCode.UNRECOGNIZED_EXPRESSION
      );
    }

    return expression;
  }
}
