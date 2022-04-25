import { ExpressionException, ExpressionExceptionCode } from '../common/exceptions/expression';
import {
  ExpressionFunctionNames,
  ExpressionType,
  isFunction,
  isLiteralExpression,
  isStringInterpolation,
  isStringLiteral,
  isTemplateExpression,
} from '../common/helpers/expression';
import ExpressionParser from '../expression/parser';
import type {
  Expression,
  ExpressionEvaluationContext,
  ExpressionFunction,
  ExpressionLiteral,
  ExpressionStringInterpolation,
} from '../models/expression';
import { isParametersObject } from '../models/parameters';
import { copy, equals, isNullOrUndefined } from '@microsoft-logic-apps/utils';

export class ResolutionService {
  private _context: ExpressionEvaluationContext;

  constructor(parameters: Record<string, unknown>, appsettings: Record<string, unknown>) {
    const parsedOutParameters: Record<string, any> = {};
    for (const key in parameters) {
      const value = parameters[key];
      if (isParametersObject(value)) {
        parsedOutParameters[key] = value.value;
      } else {
        parsedOutParameters[key] = value;
      }
    }
    this._context = { parameters: parsedOutParameters, appsettings };
  }

  resolve(root: any) {
    if (this._isContextEmptyOrUndefined) {
      return root;
    }

    return this._resolve(root);
  }

  private get _isContextEmptyOrUndefined() {
    return (
      !this._context ||
      ((!this._context.parameters || Object.keys(this._context.parameters).length === 0) &&
        (!this._context.appsettings || Object.keys(this._context.appsettings).length === 0))
    );
  }

  private _resolve(root: any) {
    if (!!root && typeof root === 'object') {
      return this._resolveObject(root);
    } else if (typeof root === 'string') {
      return this._resolveString(root);
    }

    return root;
  }

  private _resolveString(root: string) {
    let parsedExpression: Expression = { value: '', type: ExpressionType.StringLiteral };

    if (isTemplateExpression(root)) {
      parsedExpression = ExpressionParser.parseTemplateExpression(root);
    } else {
      return root;
    }

    if (isStringInterpolation(parsedExpression)) {
      return this._resolveStringInterpolationExpression(parsedExpression);
    } else if (isFunction(parsedExpression)) {
      return this._resolveFunction(parsedExpression);
    } else if (isLiteralExpression(parsedExpression)) {
      return this._resolveLiteralExpression(parsedExpression);
    } else {
      throw new ExpressionException(ExpressionExceptionCode.UNEXPECTED_CHARACTER, ExpressionExceptionCode.UNEXPECTED_CHARACTER);
    }
  }

  private _resolveStringInterpolationExpression(expression: ExpressionStringInterpolation) {
    let resolvedExpression = '';

    for (const segment of expression.segments) {
      if (isFunction(segment) && this._isFunctionParameterOrAppSetting(segment.name)) {
        resolvedExpression = `${resolvedExpression}${this._evaluate(
          `@${segment.expression.substring(segment.startPosition, segment.endPosition)}`
        )}`;
      } else if (isLiteralExpression(segment)) {
        resolvedExpression = `${resolvedExpression}${segment.value}`;
      }
    }

    return resolvedExpression;
  }

  private _resolveLiteralExpression(expression: ExpressionLiteral) {
    return expression.value;
  }

  private _resolveFunction(functionExpression: ExpressionFunction) {
    const expression = `@${functionExpression.expression}`;
    if (this._isFunctionParameterOrAppSetting(functionExpression.name)) {
      return this._evaluate(expression);
    } else {
      return expression;
    }
  }

  private _resolveObject(root: any) {
    const rootCopy = copy({ copyNonEnumerableProps: false }, {}, root);

    for (const key of Object.keys(rootCopy)) {
      rootCopy[key] = this._resolve(rootCopy[key]);
    }

    return rootCopy;
  }

  private _evaluate(expression: string): any {
    if (!expression) {
      throw new ExpressionException(ExpressionExceptionCode.EMPTY_VALUE, ExpressionExceptionCode.EMPTY_VALUE);
    }

    const parsedTemplateExpression = ExpressionParser.parseTemplateExpression(expression);

    let segment = parsedTemplateExpression;
    let isStringInterpolationExpression = false;
    if (isStringInterpolation(parsedTemplateExpression)) {
      if (parsedTemplateExpression.segments.length === 1) {
        segment = parsedTemplateExpression.segments[0];
        isStringInterpolationExpression = true;
      }
    }

    if (isFunction(segment)) {
      const evaluatedExpression = this._evaluateFunctionExpression(segment, isStringInterpolationExpression);
      return !isNullOrUndefined(evaluatedExpression) ? evaluatedExpression : expression;
    }

    return this._evaluateUsingRegex(expression);
  }

  private _evaluateFunctionExpression(expression: ExpressionFunction, isStringInterpolationExpression: boolean): string | undefined {
    const functionName = expression.name;
    if (
      equals(functionName, ExpressionFunctionNames.PARAMETERS) ||
      (equals(functionName, ExpressionFunctionNames.APPSETTING) && expression.arguments.length === 1)
    ) {
      const argument = expression.arguments[0];
      if (isStringLiteral(argument)) {
        const result = equals(functionName, ExpressionFunctionNames.PARAMETERS)
          ? this._context.parameters[argument.value]
          : this._context.appsettings[argument.value];
        if (isStringInterpolationExpression) {
          if (!result && typeof result === 'string') {
            return result;
          }
        } else {
          return result;
        }
      } else if (isFunction(argument)) {
        return this._evaluateFunctionExpression(argument, false) as string;
      }
    }
    return undefined;
  }

  private _evaluateUsingRegex(expression: string): string {
    if (/^@@/.test(expression)) {
      return expression.substring(1);
    }

    if (/@@{/.test(expression)) {
      return expression.replace(/@@{/g, '@{');
    }

    if (/^@/.test(expression) || /@{/.test(expression)) {
      throw new ExpressionException(ExpressionExceptionCode.UNRECOGNIZED_EXPRESSION, ExpressionExceptionCode.UNRECOGNIZED_EXPRESSION);
    }

    return expression;
  }

  private _isFunctionParameterOrAppSetting(name: string) {
    return equals(name, ExpressionFunctionNames.PARAMETERS) || equals(name, ExpressionFunctionNames.APPSETTING);
  }
}
