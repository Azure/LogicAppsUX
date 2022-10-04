import type { Expression, ExpressionFunction } from '@microsoft-logic-apps/parsers';
import { isFunction, isStringLiteral } from '@microsoft-logic-apps/parsers';
import { equals } from '@microsoft-logic-apps/utils';

export interface UncastResult {
  expression: Expression;
  format: string;
}

/**
 * The utility for uncasting.
 *
 * Here's the list of functions that we uncast.
 * {
 *      expression: /^base64\((?!concat\()/i,
 *      castFromFormat: 'binary'
 *  },
 *  {
 *      expression: /^base64\(concat\(/i,
 *      castFromFormat: ''
 *  },
 *  {
 *      expression: /^encodebase64\((?!concat\()/i,
 *      castFromFormat: 'binary'
 *  },
 *  {
 *      expression: /^encodebase64\(concat\(/i,
 *      castFromFormat: ''
 *  },
 *  {
 *      expression: /^base64tobinary\(/i,
 *      castFromFormat: 'byte'
 *  },
 *  {
 *      expression: /^base64tostring\(/i,
 *      castFromFormat: 'byte'
 *  },
 *  {
 *      expression: /^concat\('data:(application\/octet-stream)?;base64,'/i,
 *      castFromFormat: 'byte'
 *  },
 *  {
 *      expression: /^concat\('data:(application\/octet-stream)?,'/i,
 *      castFromFormat: ''
 *   },
 *  {
 *      expression: /^concat\('data:,'/i,
 *      castFromFormat: ''
 *  },
 *  {
 *      expression: /^decodebase64\(/i,
 *      castFromFormat: 'byte'
 *  },
 *   {
 *      expression: /^decodedatauri\(/i,
 *      castFromFormat: 'datauri'
 *  },
 *  {
 *      expression: /^encodeuricomponent\(/i,
 *      castFromFormat: ''
 *  },
 *  {
 *      expression: /^string\(/i,
 *      castFromFormat: ''
 *  }
 */
export class UncastingUtility {
  private _expression: Expression;

  constructor(expression: Expression) {
    this._expression = expression;
  }

  /**
   * Tries to uncast the expression.
   * @return {UncastResult[] | null} - The array of uncast result, or null if no uncasting is done.
   */
  public uncast(): UncastResult[] | null {
    let result = this._uncastOnce(this._expression);
    if (result === null) {
      return null;
    }

    // Note: Continue to uncast if the result is only one expression.
    while (result.length === 1) {
      const nextResult = this._uncastOnce(result[0].expression);
      if (nextResult === null) {
        return result;
      } else {
        result = nextResult;
      }
    }

    return result;
  }

  private _uncastOnce(expression: Expression): UncastResult[] | null {
    // TODO: Remove decodebase64 and encodebase64 functions once all existing definitions are updated.
    if (isFunction(expression)) {
      switch (expression.name.toUpperCase()) {
        case 'BASE64':
        case 'ENCODEBASE64':
          return this._uncastBase64(expression);
        case 'CONCAT':
          return this._uncastConcat(expression);
        case 'BASE64TOBINARY':
          return this._uncastSingleFunction(expression, 'byte');
        case 'BASE64TOSTRING':
          return this._uncastSingleFunction(expression, 'byte');
        case 'DECODEBASE64':
          return this._uncastSingleFunction(expression, 'byte');
        case 'STRING':
          return this._uncastSingleFunction(expression, '');
        case 'ENCODEURICOMPONENT':
          return this._uncastSingleFunction(expression, '');
        case 'DECODEDATAURI':
          return this._uncastSingleFunction(expression, 'datauri');
        default:
          return null;
      }
    }

    return null;
  }

  private _uncastBase64(expression: ExpressionFunction): UncastResult[] | null {
    if (expression.dereferences.length === 0 && expression.arguments.length > 0) {
      const functionArguments = expression.arguments;
      const firstArgument = functionArguments[0];
      if (isFunction(firstArgument) && equals(firstArgument.name, 'CONCAT')) {
        const concatFunction = firstArgument;
        const concatArguments = concatFunction.arguments;
        if (concatFunction.dereferences.length === 0 && concatArguments.length > 0) {
          return concatArguments.map((argument) => ({ expression: argument, format: '' }));
        }
      } else {
        return functionArguments.map((argument) => ({ expression: argument, format: 'binary' }));
      }
    }

    return null;
  }

  private _uncastConcat(expression: ExpressionFunction): UncastResult[] | null {
    if (expression.dereferences.length === 0 && expression.arguments.length > 1) {
      const functionArguments = expression.arguments;
      const firstArgument = functionArguments[0];
      if (isStringLiteral(firstArgument)) {
        const value = firstArgument.value;
        let format: string;
        switch (value.toUpperCase()) {
          case 'DATA:APPLICATION/OCTET-STREAM;BASE64,':
          case 'DATA:;BASE64,':
            format = 'byte';
            break;
          case 'DATA:APPLICATION/OCTET-STREAM,':
          case 'DATA:,':
            format = '';
            break;
          default:
            return null;
        }

        return functionArguments.slice(1).map((argument) => ({ expression: argument, format }));
      }
    }

    return null;
  }

  private _uncastSingleFunction(expression: ExpressionFunction, format: string): UncastResult[] | null {
    const functionArguments = expression.arguments;
    if (functionArguments.length > 0 && expression.dereferences.length === 0) {
      return functionArguments.map((argument) => ({ expression: argument, format }));
    }

    return null;
  }
}
