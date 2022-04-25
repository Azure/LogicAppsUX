import { ExpressionExceptionCode } from '../common/exceptions/expression';
import { ScannerException } from '../common/exceptions/scanner';
import type { ExpressionToken } from '../models/expression';
import { equals } from '@microsoft-logic-apps/utils';
import { ExpressionConstants } from '../common/constants';
import { isNumeric, isWhitespace } from '../common/helpers/expression';

export enum ExpressionTokenType {
  Dot = 'Dot',
  Comma = 'Comma',
  LeftParenthesis = 'LeftParenthesis',
  RightParenthesis = 'RightParenthesis',
  LeftSquareBracket = 'LeftSquareBracket',
  RightSquareBracket = 'RightSquareBracket',
  QuestionMark = 'QuestionMark',
  StringLiteral = 'StringLiteral',
  IntegerLiteral = 'IntegerLiteral',
  FloatLiteral = 'FloatLiteral',
  Identifier = 'Identifier',
  EndOfData = 'EndOfData',
}

export class ExpressionScanner {
  private _expression: string;
  private _startPosition: number;
  private _currentToken: ExpressionToken;

  constructor(expression: string, prefetch = true) {
    if (expression.length > ExpressionConstants.Expression.maxExpressionLimit) {
      throw new ScannerException(ExpressionExceptionCode.LIMIT_EXCEEDED, ExpressionExceptionCode.LIMIT_EXCEEDED);
    }

    this._expression = expression;
    this._startPosition = 0;
    this._currentToken = this._createToken('', ExpressionTokenType.EndOfData, 0, 0);

    if (prefetch) {
      this._currentToken = this._readNextToken();
    }
  }

  /**
   * Gets the expression.
   * @return {string}
   */
  public get expression(): string {
    return this._expression;
  }

  /**
   * Gets the token with specified expression token type.
   * @arg {ExpressionTokenType} type - The expression token type.
   * @arg {string} value - The expression token value.
   * @return {ExpressionToken}
   */
  public getTokenForTypeAndValue(type: ExpressionTokenType, value?: string): ExpressionToken | undefined {
    if (this._currentToken.type === type && (!value || equals(value, this._currentToken.value))) {
      return this._getToken();
    }
    return undefined;
  }

  /**
   * Gets the next token.
   * @return {ExpressionToken}
   */
  public getNextToken(): ExpressionToken {
    this._readNextToken();
    return this._currentToken;
  }

  private _getToken(): ExpressionToken {
    const token = this._currentToken;
    this._currentToken = this._readNextToken();
    return token;
  }

  private _readNextToken() {
    const expression = this._expression;
    const initialStartPos = this._startPosition;
    let currentPos = initialStartPos;
    let token: ExpressionToken | undefined;
    while (currentPos < expression.length && isWhitespace(expression.charAt(currentPos))) {
      ++currentPos;
    }

    if (currentPos < expression.length) {
      const currentChar = expression.charAt(currentPos);
      token = this._checkAndReturnValidToken(currentPos);
      if (!token) {
        if (equals(currentChar, ExpressionConstants.TokenValue.singleQuote)) {
          token = this._processAndgetTokenForSingleQuote(currentPos);
        } else {
          token = this._processAndGetToken(currentPos);
        }
      }
    } else {
      this._startPosition = currentPos;
      token = this._createToken('', ExpressionTokenType.EndOfData, initialStartPos, this._startPosition);
    }

    return token;
  }

  private _processAndGetToken(currentPos: number): ExpressionToken {
    const ch = this._expression.charAt(currentPos);

    if (equals(ch, '+') || equals(ch, '-') || isNumeric(ch)) {
      return this._processAndGetTokenForNumber(currentPos);
    } else if (this._isSupportedIdentifierCharacter(ch)) {
      return this._processAndGetTokenForIdentifier(currentPos);
    } else {
      throw new ScannerException(ExpressionExceptionCode.UNEXPECTED_CHARACTER, ExpressionExceptionCode.UNEXPECTED_CHARACTER);
    }
  }

  private _processAndGetTokenForNumber(currentPos: number): ExpressionToken {
    const expression = this._expression;
    const startPos = currentPos;
    const initialStartPos = this._startPosition;
    let ch = expression.charAt(currentPos);

    currentPos = equals(ch, '+') || equals(ch, '-') ? currentPos + 1 : currentPos;
    let isFloat = false;
    currentPos = this._scanForwardUsingPredicate(currentPos, (c) => isNumeric(c));

    if (currentPos < expression.length && equals(expression.charAt(currentPos), 'e')) {
      isFloat = true;
      ch = expression.charAt(currentPos + 1);
      currentPos = equals(ch, '+') || equals(ch, '-') ? currentPos + 2 : currentPos + 1;
      currentPos = this._scanForwardUsingPredicate(currentPos, (c) => isNumeric(c));
    }

    this._startPosition = currentPos;
    const value = expression.substring(startPos, currentPos);

    return isFloat
      ? this._createToken(value, ExpressionTokenType.FloatLiteral, initialStartPos, this._startPosition)
      : this._createToken(value, ExpressionTokenType.IntegerLiteral, initialStartPos, this._startPosition);
  }

  private _processAndGetTokenForIdentifier(currentPos: number): ExpressionToken {
    const initialStartPos = this._startPosition;
    this._startPosition = this._scanForwardUsingPredicate(currentPos, (c) => this._isSupportedIdentifierCharacter(c));
    const value = this._expression.substring(currentPos, this._startPosition);
    return this._createToken(value, ExpressionTokenType.Identifier, initialStartPos, this._startPosition);
  }

  private _processAndgetTokenForSingleQuote(currentPos: number): ExpressionToken {
    const expression = this._expression;
    const startPos = currentPos;
    while (currentPos < expression.length) {
      currentPos = this._scanForwardUsingPredicate(currentPos + 1, (c) => c !== ExpressionConstants.TokenValue.singleQuote);

      if (currentPos + 1 < expression.length && expression.charAt(currentPos + 1) === ExpressionConstants.TokenValue.singleQuote) {
        currentPos++;
      } else {
        break;
      }
    }

    if (currentPos >= expression.length) {
      throw new ScannerException(
        ExpressionExceptionCode.STRING_LITERAL_NOT_TERMINATED,
        ExpressionExceptionCode.STRING_LITERAL_NOT_TERMINATED
      );
    }

    const litervalValue = expression.substring(startPos + 1, currentPos).replace(/''/g, ExpressionConstants.TokenValue.singleQuote);
    const token = this._createToken(litervalValue, ExpressionTokenType.StringLiteral, this._startPosition, currentPos + 1);
    this._startPosition = currentPos + 1;
    return token;
  }

  private _checkAndReturnValidToken(currentPos: number): ExpressionToken | undefined {
    let tokenType;
    let tokenValue;
    switch (this._expression.charAt(currentPos)) {
      case ExpressionConstants.TokenValue.dot: {
        tokenType = ExpressionTokenType.Dot;
        tokenValue = ExpressionConstants.TokenValue.dot;
        break;
      }
      case ExpressionConstants.TokenValue.comma: {
        tokenType = ExpressionTokenType.Comma;
        tokenValue = ExpressionConstants.TokenValue.comma;
        break;
      }
      case ExpressionConstants.TokenValue.leftParenthesis: {
        tokenType = ExpressionTokenType.LeftParenthesis;
        tokenValue = ExpressionConstants.TokenValue.leftParenthesis;
        break;
      }
      case ExpressionConstants.TokenValue.rightParenthesis: {
        tokenType = ExpressionTokenType.RightParenthesis;
        tokenValue = ExpressionConstants.TokenValue.rightParenthesis;
        break;
      }
      case ExpressionConstants.TokenValue.leftSquareBracket: {
        tokenType = ExpressionTokenType.LeftSquareBracket;
        tokenValue = ExpressionConstants.TokenValue.leftSquareBracket;
        break;
      }
      case ExpressionConstants.TokenValue.rightSquareBracket: {
        tokenType = ExpressionTokenType.RightSquareBracket;
        tokenValue = ExpressionConstants.TokenValue.rightSquareBracket;
        break;
      }
      case ExpressionConstants.TokenValue.questionMark: {
        tokenType = ExpressionTokenType.QuestionMark;
        tokenValue = ExpressionConstants.TokenValue.questionMark;
        break;
      }
      default: {
        tokenType = undefined;
        tokenValue = undefined;
        break;
      }
    }

    if (!!tokenType && !!tokenValue) {
      const token = this._createToken(tokenValue, tokenType, this._startPosition, currentPos + 1);
      this._startPosition = currentPos + 1;
      return token;
    }
    return undefined;
  }

  private _isSupportedIdentifierCharacter(ch: string) {
    return !/[.,(){}@[\]?{}@']{1}/i.test(ch) && !isWhitespace(ch);
  }

  private _scanForwardUsingPredicate(startPosition: number, predicate: (c: string) => boolean) {
    const expression = this._expression;
    while (startPosition < expression.length && predicate(expression.charAt(startPosition))) {
      startPosition++;
    }

    return startPosition;
  }

  private _createToken(value: string, type: ExpressionTokenType, startPos: number, endPos: number): ExpressionToken {
    return {
      type,
      value,
      startPosition: startPos,
      endPosition: endPos,
    };
  }
}
