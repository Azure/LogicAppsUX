import Constants from '../../../common/constants';
import { getInterpolatedExpression } from './helper';
import { isOutputTokenValueSegment, isTokenValueSegment } from './segment';
import { equals, format } from '@microsoft-logic-apps/utils';
import type { ValueSegment } from '@microsoft/designer-ui';

/**
 * @arg {string} fromFormat - A string with the original format of the expression being cast.
 * @arg {string} toFormat - A string with the desired format for the expression being cast.
 * @arg {string} expression - A string with an expression to be cast.
 * @arg {string} [fromType] - A string with the original type of the expression being cast.
 * @arg {string} [toType] - A string with the desired type for the expression being cast.
 * @return {string} - A string with the casting function applied to the expression.
 */
export function addCastToExpression(fromFormat: string, toFormat: string, expression: string, fromType?: string, toType?: string): string {
  if (!expression) {
    return expression;
  }

  const template = getCastingTemplate(fromType ?? '', fromFormat, toType ?? '', toFormat);
  return template ? format(template, expression) : expression;
}

/**
 * @arg {string} convertingTo - A string with the desired type for the expression being cast.
 * @arg {ValueSegment[]} valueSegments - An array of mixed literals and tokens to be cast together.
 * @arg {string} parameterType - Used by getInterpolatedExpression to determine when to emit interpolated syntax.
 * @arg {string} parameterFormat - Used by getInterpolatedExpression to determine when to emit interpolated syntax.
 * @return {string} - A string with the casting function(s) applied to the expressions.
 */
export function addFoldingCastToExpression(
  convertingTo: string,
  valueSegments: ValueSegment[],
  parameterType: string,
  parameterFormat: string
): string | undefined {
  if (!valueSegments) {
    return parameterType === Constants.SWAGGER.TYPE.STRING ? '' : undefined;
  }

  const template = getCastingTemplate('', '', parameterType, convertingTo);
  if (template) {
    const stringifiedExpressions = valueSegments.map((expression) => {
      const { token, value } = expression;
      return isOutputTokenValueSegment(expression)
        ? addCastToExpression(token?.format ?? '', '', value, token?.type, Constants.SWAGGER.TYPE.STRING)
        : `'${value}'`;
    });
    const concatExpression = foldWithConcat(stringifiedExpressions, parameterType);
    const appliedTemplate = format(template, concatExpression);
    return getInterpolatedExpression(appliedTemplate, parameterType, parameterFormat);
  } else {
    return concatenateAndInterpolateExpressions(valueSegments);
  }
}

/**
 * @arg {string} tokenType - The type of token segment that needs casting.
 * @arg {string} tokenFormat - The format associated with the token segment that needs casting.
 * @arg {string} parameterType - The type of the parameter where token is added.
 * @arg {string} parameterFormat - The format associated with the parameter where token is added.
 * @return {boolean} - Returns if casting needs to be applied.
 */
export function shouldCastTokenSegment(tokenType: string, tokenFormat: string, parameterType: string, parameterFormat: string): boolean {
  const castingTemplate = getCastingTemplate(tokenType, tokenFormat, parameterType, parameterFormat);
  return castingTemplate === undefined ? false : true;
}

/**
 * The 'byte' format is base64. The 'type' of the token and parameter field must match for the token to have not been
 * filtered out, so both are of type string.
 *
 * base64: string -> byte
 * base64ToString: bytes -> string
 * decodeDataUri: dataUri -> binary
 *
 * To v From > Byte                        Binary/File                               DataUri                            Other
 * Byte        N/A                         base64(x)                                 base64(decodeDataUri(x))           base64(x)
 * Binary/File base64ToBinary(x)           N/A                                       decodeDataUri(x)                   N/A
 * DataUri     concat('data:;base64,',x)   concat('data:;base64,',base64(x))         N/A                                concat('data:,',encodeURIComponent(x))
 * Other       base64ToString(x)           N/A                                       decodeDataUri(x)                   N/A
 */
function getCastingTemplate(fromType: string, fromFormat: string, toType: string, toFormat: string): string | undefined {
  /* eslint-disable no-param-reassign */
  fromType = fromType ? fromType.toLowerCase() : '';
  fromFormat = fromFormat ? fromFormat.toLowerCase() : '';
  toType = toType ? toType.toLowerCase() : '';
  toFormat = toFormat ? toFormat.toLowerCase() : '';

  // NOTE(shimedh): If toType is any, we should not add any casting function.
  if (toType === Constants.SWAGGER.TYPE.ANY) {
    return undefined;
  }

  // NOTE(tonytang): Below code assumed the type is string, thus handle file type here.
  if (fromType === Constants.SWAGGER.TYPE.FILE || toType === Constants.SWAGGER.TYPE.FILE) {
    if (toType === Constants.SWAGGER.TYPE.FILE) {
      if (fromType === Constants.SWAGGER.TYPE.STRING) {
        switch (fromFormat) {
          case Constants.SWAGGER.FORMAT.BYTE:
            return 'base64ToBinary({0})';
          case Constants.SWAGGER.FORMAT.DATAURI:
            return 'decodeDataUri({0})';
          default:
            return undefined;
        }
      } else {
        return undefined;
      }
    }

    if (fromType === Constants.SWAGGER.TYPE.FILE) {
      if (toType === Constants.SWAGGER.TYPE.STRING) {
        switch (toFormat) {
          case Constants.SWAGGER.FORMAT.BYTE:
            return 'base64({0})';
          case Constants.SWAGGER.FORMAT.DATAURI:
            return `concat('data:;base64,',base64({0}))`;
          default:
            return undefined;
        }
      } else {
        return undefined;
      }
    }

    return undefined;
  }

  if (equals(fromFormat, toFormat)) {
    return undefined;
  }

  if (toFormat === Constants.SWAGGER.FORMAT.BINARY) {
    switch (fromFormat) {
      case Constants.SWAGGER.FORMAT.BYTE:
        return 'base64ToBinary({0})';
      case Constants.SWAGGER.FORMAT.DATAURI:
        return 'decodeDataUri({0})';
      default:
        return undefined;
    }
  }

  if (toFormat === Constants.SWAGGER.FORMAT.BYTE) {
    switch (fromFormat) {
      case Constants.SWAGGER.FORMAT.DATAURI:
        return 'base64(decodeDataUri({0}))';
      default:
        return 'base64({0})';
    }
  }

  if (toFormat === Constants.SWAGGER.FORMAT.DATAURI) {
    switch (fromFormat) {
      case Constants.SWAGGER.FORMAT.BINARY:
        return `concat('data:;base64,',base64({0}))`;
      case Constants.SWAGGER.FORMAT.BYTE:
        return `concat('data:;base64,',{0})`;
      default:
        return `concat('data:,',encodeURIComponent({0}))`;
    }
  }

  // Converting to string
  switch (fromFormat) {
    case Constants.SWAGGER.FORMAT.BYTE:
      return 'base64ToString({0})';
    case Constants.SWAGGER.FORMAT.DATAURI:
      return 'decodeDataUri({0})';
    default:
      return undefined;
  }
}

function concatenateAndInterpolateExpressions(valueSegments: ValueSegment[]): string {
  const strings = valueSegments.map((segment) => {
    const { value } = segment;
    return isTokenValueSegment(segment) ? `@{${value}}` : value;
  });

  return strings.join('');
}

function foldWithConcat(expressions: string[], type: string): string | null {
  if (expressions.length === 0) {
    return type === Constants.SWAGGER.TYPE.STRING ? '' : null;
  } else if (expressions.length === 1) {
    return expressions[0];
  } else {
    return `concat(${expressions.join(',')})`;
  }
}
