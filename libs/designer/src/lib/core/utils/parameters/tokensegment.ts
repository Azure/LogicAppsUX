import Constants from '../../../common/constants';
import { getNormalizedName } from './helper';
import { createOutputToken, createParameterToken, createTokenValueSegment, createVariableToken } from './segment';
import { encodePropertySegment, ExpressionType, isStringLiteral, OutputKeys, OutputSource } from '@microsoft-logic-apps/parsers';
import type { Dereference, Expression, ExpressionFunction, ExpressionLiteral } from '@microsoft-logic-apps/parsers';
import { equals } from '@microsoft-logic-apps/utils';
import { TokenType } from '@microsoft/designer-ui';
import type { ValueSegment } from '@microsoft/designer-ui';

/**
 * The token segment convertor.
 */
export class TokenSegmentConvertor {
  /**
   * Tries to convert a function expression into a dynamic content token segment.
   * @arg {ExpressionFunction} expression - The function expression.
   * @return {ValueSegment | null}
   */
  public tryConvertToDynamicContentTokenSegment(expression: ExpressionFunction): ValueSegment | null {
    if (TokenSegmentConvertor.isOutputToken(expression)) {
      const source = this._getTokenSource(expression);
      const step = TokenSegmentConvertor.getTokenStep(expression.arguments);
      const name = this._getTokenName(expression, source);
      const outputKey = this._getOutputKey(expression);
      const required = !!this._isTokenRequired(expression, source);
      const value =
        expression.startPosition === 0
          ? expression.expression
          : expression.expression.substring(expression.startPosition, expression.endPosition);

      return createTokenValueSegment(createOutputToken(outputKey, step, source, name, required), value);
    } else if (this._isParameterToken(expression)) {
      const parameterName = (expression.arguments[0] as ExpressionLiteral).value;
      const value =
        expression.startPosition === 0
          ? expression.expression
          : expression.expression.substring(expression.startPosition, expression.endPosition);
      return createTokenValueSegment(createParameterToken(parameterName), value);
    } else if (TokenSegmentConvertor.isVariableToken(expression)) {
      const variableName = (expression.arguments[0] as ExpressionLiteral).value;
      const value =
        expression.startPosition === 0
          ? expression.expression
          : expression.expression.substring(expression.startPosition, expression.endPosition);
      return createTokenValueSegment(createVariableToken(variableName), value);
    } else if (TokenSegmentConvertor.isItemToken(expression)) {
      // TODO - Implement for item tokens
      return null;
    } else if (TokenSegmentConvertor.isItemsToken(expression)) {
      // TODO - Implement for items tokens
      return null;
    } else if (TokenSegmentConvertor.isIterationIndexesToken(expression)) {
      const functionArguments = expression.arguments;
      const actionExpression = functionArguments[0] as ExpressionLiteral;
      const loopSource = actionExpression.value;
      const value =
        expression.startPosition === 0
          ? expression.expression
          : expression.expression.substring(expression.startPosition, expression.endPosition);
      return createTokenValueSegment(
        {
          arrayDetails: { loopSource },
          tokenType: TokenType.ITERATIONINDEX,
          type: Constants.SWAGGER.TYPE.INTEGER,
          key: 'builtin.$.currentIterationIndexes',
          title: 'Item',
        },
        value
      );
    } else {
      return null;
    }
  }

  public static isOutputToken(expression: ExpressionFunction): boolean {
    const functionArguments = expression.arguments;
    const numberOfArguments = functionArguments.length;

    switch (expression.name.toUpperCase()) {
      case 'TRIGGERBODY':
      case 'TRIGGEROUTPUTS':
        if (numberOfArguments !== 0) {
          return false;
        }
        break;

      case 'BODY':
      case 'OUTPUTS':
      case 'ACTIONBODY':
      case 'ACTIONOUTPUTS':
        if (numberOfArguments !== 1) {
          return false;
        }
        break;

      default:
        return false;
    }

    if (numberOfArguments === 1 && functionArguments[0].type !== ExpressionType.StringLiteral) {
      return false;
    }

    if (expression.dereferences.filter((dereference) => dereference.expression.type !== ExpressionType.StringLiteral).length > 0) {
      return false;
    }

    return true;
  }

  public static isVariableToken(expression: ExpressionFunction): boolean {
    const functionArguments = expression.arguments;
    const numberOfArguments = functionArguments.length;

    if (!equals(expression.name, Constants.FUNCTION_NAME.VARIABLES)) {
      return false;
    }

    if (numberOfArguments !== 1) {
      return false;
    }

    if (functionArguments[0].type !== ExpressionType.StringLiteral) {
      return false;
    }

    if (expression.dereferences.length > 0) {
      return false;
    }

    return true;
  }

  private _isParameterToken(expression: ExpressionFunction): boolean {
    const functionArguments = expression.arguments;
    const numberOfArguments = functionArguments.length;

    if (!equals(expression.name, Constants.FUNCTION_NAME.PARAMETERS)) {
      return false;
    }

    if (numberOfArguments !== 1) {
      return false;
    }

    if (functionArguments[0].type !== ExpressionType.StringLiteral) {
      return false;
    }

    if (expression.dereferences.length > 0) {
      return false;
    }

    return true;
  }

  public static isItemToken(expression: ExpressionFunction): boolean {
    const functionArguments = expression.arguments;
    const numberOfArguments = functionArguments.length;

    if (expression.name.toUpperCase() !== 'ITEM') {
      return false;
    }

    if (numberOfArguments > 0) {
      return false;
    }

    if (expression.dereferences.filter((deref) => deref.expression.type !== ExpressionType.StringLiteral).length > 0) {
      return false;
    }

    return true;
  }

  public static isItemsToken(expression: ExpressionFunction): boolean {
    const functionArguments = expression.arguments;
    const numberOfArguments = functionArguments.length;

    if (expression.name.toUpperCase() !== 'ITEMS') {
      return false;
    }

    if (numberOfArguments !== 1) {
      return false;
    }

    if (functionArguments[0].type !== ExpressionType.StringLiteral) {
      return false;
    }

    if (expression.dereferences.filter((deref) => deref.expression.type !== ExpressionType.StringLiteral).length > 0) {
      return false;
    }

    return true;
  }

  public static isIterationIndexesToken(expression: ExpressionFunction): boolean {
    const functionArguments = expression.arguments;
    const numberOfArguments = functionArguments.length;

    if (expression.name.toUpperCase() !== 'ITERATIONINDEXES') {
      return false;
    }

    if (numberOfArguments !== 1) {
      return false;
    }

    if (functionArguments[0].type !== ExpressionType.StringLiteral) {
      return false;
    }

    if (expression.dereferences.length > 0) {
      return false;
    }

    return true;
  }

  public static getTokenStep(functionArguments: Expression[]): string | undefined {
    if (functionArguments.length > 0) {
      return (functionArguments[0] as ExpressionLiteral).value;
    } else {
      return undefined;
    }
  }

  private _getTokenSource(expression: ExpressionFunction): string {
    const dereferences = expression.dereferences;
    switch (expression.name.toUpperCase()) {
      case 'BODY':
      case 'ACTIONBODY':
      case 'TRIGGERBODY':
        return OutputSource.Body;
      default:
        break;
    }

    // TODO(tonytang): Please fix the below logic, it seems redundant to check and return the same output source.
    if (dereferences.length >= 1) {
      const dereferenceExpression = dereferences[0].expression;
      if (isStringLiteral(dereferenceExpression)) {
        const value = dereferenceExpression.value;
        if (equals(value, OutputSource.StatusCode)) {
          return OutputSource.StatusCode;
        } else if (equals(value, OutputSource.Queries)) {
          return OutputSource.Queries;
        } else if (equals(value, OutputSource.Headers)) {
          return OutputSource.Headers;
        } else if (equals(value, OutputSource.Body)) {
          return OutputSource.Body;
        }
      }
    }

    return OutputSource.Outputs;
  }

  private _getExpressionFunctionDeferences(expression: ExpressionFunction, source: string): Dereference[] {
    let dereferences: Dereference[] = [];
    switch (source) {
      case OutputSource.StatusCode:
      case OutputSource.Queries:
      case OutputSource.Headers:
        dereferences = expression.dereferences.slice(1);
        break;
      default:
        dereferences = expression.dereferences;
        break;
    }

    return dereferences;
  }

  private _getOutputKey(expression: ExpressionFunction): string {
    let prefix: string;
    switch (expression.name.toUpperCase()) {
      case 'TRIGGERBODY':
      case 'BODY':
      case 'ACTIONBODY':
        prefix = 'outputs.$.body';
        break;

      default:
        prefix = 'outputs.$';
    }

    const path = expression.dereferences.map((deref) => encodePropertySegment((deref.expression as ExpressionLiteral).value)).join('.');

    return path !== '' ? `${prefix}.${path}` : prefix;
  }

  private _isTokenRequired(expression: ExpressionFunction, source: string): boolean | undefined {
    const dereferences: Dereference[] = this._getExpressionFunctionDeferences(expression, source);

    if (dereferences.length === 0) {
      return undefined;
    } else if (dereferences.every((dref) => dref.isSafe)) {
      return false;
    } else if (dereferences.every((dref) => !dref.isSafe)) {
      return true;
    } else {
      return undefined;
    }
  }

  private _getTokenName(expression: ExpressionFunction, source: string, isItem = false, parentArray?: string): string {
    const dereferences: Dereference[] = this._getExpressionFunctionDeferences(expression, source);
    const path = dereferences
      .map((deref) => {
        const { expression: ExpressionLiteral, isSafe } = deref;
        const encodedPropertyName = encodePropertySegment((ExpressionLiteral as ExpressionLiteral).value);
        return isSafe ? `?${encodedPropertyName}` : encodedPropertyName;
      })
      .join('.');

    if (path) {
      return path;
    } else if (source === OutputSource.Headers) {
      return OutputKeys.Headers;
    } else if (source === OutputSource.Outputs) {
      return OutputKeys.Outputs;
    } else if (source === OutputSource.StatusCode) {
      return OutputKeys.StatusCode;
    } else if (source === OutputSource.Queries) {
      return OutputKeys.Queries;
    } else if (isItem) {
      return parentArray ? `${getNormalizedName(parentArray)}-${OutputKeys.Item}` : OutputKeys.Item;
    } else {
      return OutputKeys.Body;
    }
  }
}
