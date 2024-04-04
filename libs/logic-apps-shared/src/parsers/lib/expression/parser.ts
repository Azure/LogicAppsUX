import { ExpressionExceptionCode } from '../common/exceptions/expression';
import { ParserException } from '../common/exceptions/parser';
import { isTemplateExpression } from '../common/helpers/expression';
import type {
  Dereference,
  Expression,
  ExpressionFunction,
  ExpressionStringInterpolation,
  ExpressionToken,
  ExpressionLiteral,
} from '../models/expression';
import { ExpressionType, ExpressionTokenType } from '../models/expression';
import { ExpressionScanner } from './scanner';
import { equals } from '../../../utils/src';

interface TokenToParse {
  tokenType: ExpressionTokenType;
  responseExpressionType: ExpressionType;
  value?: string;
}

export class ExpressionParser {
  private static _tokenList: TokenToParse[] = [
    {
      tokenType: ExpressionTokenType.StringLiteral,
      responseExpressionType: ExpressionType.StringLiteral,
    },
    {
      tokenType: ExpressionTokenType.IntegerLiteral,
      responseExpressionType: ExpressionType.NumberLiteral,
    },
    {
      tokenType: ExpressionTokenType.FloatLiteral,
      responseExpressionType: ExpressionType.NumberLiteral,
    },
    {
      tokenType: ExpressionTokenType.Identifier,
      value: 'null',
      responseExpressionType: ExpressionType.NullLiteral,
    },
    {
      tokenType: ExpressionTokenType.Identifier,
      value: 'true',
      responseExpressionType: ExpressionType.BooleanLiteral,
    },
    {
      tokenType: ExpressionTokenType.Identifier,
      value: 'false',
      responseExpressionType: ExpressionType.BooleanLiteral,
    },
  ];

  public static parseExpression(expression: string, isAliasPathParsingEnabled = false): Expression {
    const scanner = new ExpressionScanner(expression);
    const parsedExpression = ExpressionParser._parseExpressionRecursively(scanner, 0, isAliasPathParsingEnabled);
    scanner.getTokenForTypeAndValue(ExpressionTokenType.EndOfData);
    return parsedExpression;
  }

  public static parseTemplateExpression(expression: string, isAliasPathParsingEnabled = false): Expression {
    if (!isTemplateExpression(expression)) {
      throw new ParserException(ExpressionExceptionCode.UNRECOGNIZED_EXPRESSION, ExpressionExceptionCode.UNRECOGNIZED_EXPRESSION);
    }

    if (expression.charAt(0) === '@' && expression.charAt(1) !== '{') {
      if (expression.charAt(1) === '@') {
        return {
          type: ExpressionType.StringLiteral,
          value: expression.substring(1),
        };
      } else {
        return ExpressionParser.parseExpression(expression.substring(1), isAliasPathParsingEnabled);
      }
    } else {
      return ExpressionParser._parseStringInterpolationExpression(expression, isAliasPathParsingEnabled);
    }
  }

  private static _parseExpressionRecursively(scanner: ExpressionScanner, index = 0, isAliasPathParsingEnabled: boolean): Expression {
    if (index < this._tokenList.length) {
      const token = scanner.getTokenForTypeAndValue(ExpressionParser._tokenList[index].tokenType, ExpressionParser._tokenList[index].value);
      if (token) {
        return {
          type: this._tokenList[index].responseExpressionType,
          value: token.value,
        };
      }
      return ExpressionParser._parseExpressionRecursively(scanner, index + 1, isAliasPathParsingEnabled);
    } else {
      return this._parseFunctionExpression(scanner, isAliasPathParsingEnabled);
    }
  }

  private static _getTokenOrThrowException(scanner: ExpressionScanner, type: ExpressionTokenType, value?: string): ExpressionToken {
    const token = scanner.getTokenForTypeAndValue(type, value);
    if (token) {
      return token;
    }
    throw new ParserException(ExpressionExceptionCode.UNRECOGNIZED_EXPRESSION, ExpressionExceptionCode.UNRECOGNIZED_EXPRESSION);
  }

  private static _parseFunctionExpression(scanner: ExpressionScanner, isAliasPathParsingEnabled: boolean): ExpressionFunction {
    let token: ExpressionToken | undefined = ExpressionParser._getTokenOrThrowException(scanner, ExpressionTokenType.Identifier);

    const startPosition = token.startPosition;
    const functionName = token.value;

    ExpressionParser._getTokenOrThrowException(scanner, ExpressionTokenType.LeftParenthesis);

    const functionArguments: Expression[] = [];
    token = scanner.getTokenForTypeAndValue(ExpressionTokenType.RightParenthesis);
    if (!token) {
      do {
        functionArguments.push(this._parseExpressionRecursively(scanner, 0, /*isAliasPathParsingEnabled*/ false));
      } while (scanner.getTokenForTypeAndValue(ExpressionTokenType.Comma));

      token = ExpressionParser._getTokenOrThrowException(scanner, ExpressionTokenType.RightParenthesis);
    }

    const dereferences: Dereference[] = [];
    let flag = true;

    while (flag) {
      const isSafe = !!scanner.getTokenForTypeAndValue(ExpressionTokenType.QuestionMark);

      if (scanner.getTokenForTypeAndValue(ExpressionTokenType.Dot)) {
        token = ExpressionParser._getTokenOrThrowException(scanner, ExpressionTokenType.Identifier);
        dereferences.push({
          isSafe,
          isDotNotation: false,
          expression: {
            type: ExpressionType.StringLiteral,
            value: token.value,
          },
        });
        continue;
      }

      if (scanner.getTokenForTypeAndValue(ExpressionTokenType.LeftSquareBracket)) {
        const expression = this._parseExpressionRecursively(scanner, 0, /*isAliasPathParsingEnabled*/ false);
        token = ExpressionParser._getTokenOrThrowException(scanner, ExpressionTokenType.RightSquareBracket);

        // TODO: This might require to support string interpolation as well.
        if (expression.type === ExpressionType.StringLiteral && isAliasPathParsingEnabled) {
          // takes care of expressions that are nested such as ['body/value']
          for (const expressionValue of (expression as ExpressionLiteral).value.split('/')) {
            dereferences.push({
              isSafe,
              isDotNotation: false,
              expression: { type: ExpressionType.StringLiteral, value: expressionValue },
            });
          }
        } else {
          dereferences.push({
            isSafe,
            isDotNotation: false,
            expression: expression,
          });
        }
        continue;
      }

      if (isSafe) {
        throw new ParserException(ExpressionExceptionCode.UNRECOGNIZED_EXPRESSION, ExpressionExceptionCode.UNRECOGNIZED_EXPRESSION);
      }

      flag = false;
    }

    return {
      type: ExpressionType.Function,
      expression: scanner.expression,
      startPosition,
      endPosition: token.endPosition,
      name: functionName,
      arguments: functionArguments,
      dereferences,
    };
  }

  private static _parseStringInterpolationExpression(
    expression: string,
    isAliasPathParsingEnabled: boolean
  ): ExpressionStringInterpolation {
    let previousPosition = 0;
    let currentPosition = 0;
    const segments: Expression[] = [];

    while (currentPosition < expression.length - 1) {
      if (!equals(expression.charAt(currentPosition), '@') || !equals(expression.charAt(currentPosition + 1), '{')) {
        ++currentPosition;
        continue;
      }

      if (previousPosition < currentPosition) {
        const value = expression.substring(previousPosition, currentPosition);
        segments.push({
          type: ExpressionType.StringLiteral,
          value: value,
        });
      }

      if (currentPosition > 0 && expression.charAt(currentPosition - 1) === '@') {
        previousPosition = ++currentPosition;
        continue;
      }

      const startPosition = currentPosition;
      let literalRegion = false;
      let found = false;

      while (currentPosition < expression.length) {
        if (equals(expression.charAt(currentPosition), "'")) {
          literalRegion = !literalRegion;
        } else if (!literalRegion && expression.charAt(currentPosition) === '}') {
          found = true;
          break;
        }

        ++currentPosition;
      }

      if (!found) {
        throw new ParserException(
          ExpressionExceptionCode.STRING_LITERAL_NOT_TERMINATED,
          ExpressionExceptionCode.STRING_LITERAL_NOT_TERMINATED
        );
      }

      segments.push(this.parseExpression(expression.substring(startPosition + 2, currentPosition), isAliasPathParsingEnabled));
      previousPosition = ++currentPosition;
    }

    if (previousPosition < expression.length) {
      segments.push({
        type: ExpressionType.StringLiteral,
        value: expression.substring(previousPosition),
      });
    }

    return {
      type: ExpressionType.StringInterpolation,
      segments,
    };
  }
}
