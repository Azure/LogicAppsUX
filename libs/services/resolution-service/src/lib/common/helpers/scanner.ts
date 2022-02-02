import { equals } from '@microsoft-logic-apps/utils';
import { CommonConstants, isNumeric, isWhitespace } from '../constants';
import { ExpressionExceptionCode } from '../exceptions/expression';
import { ScannerException } from '../exceptions/scanner';
import { ExpressionToken } from '../models/expression';

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

export default class ExpressionScanner {
  private _expression: string;
  private _startPosition: number;
  private _currentToken: ExpressionToken;

  constructor(expression: string, prefetch = true) {
    if (expression.length > CommonConstants.Expression.maxExpressionLimit) {
      throw new ScannerException(ExpressionExceptionCode.LIMIT_EXCEEDED, ExpressionExceptionCode.LIMIT_EXCEEDED);
    }

    this._expression = expression;
    this._startPosition = 0;
    this._currentToken = this._createToken('', ExpressionTokenType.EndOfData, 0, 0);

    if (prefetch) {
      this._currentToken = this._readNextToken();
    }
  }

  public get expression(): string {
    return this._expression;
  }

  public getTokenForTypeAndValue(type: ExpressionTokenType, value?: string): ExpressionToken | undefined {
    if (this._currentToken.type === type && (!value || equals(value, this._currentToken.value))) {
      return this._getToken();
    }
    return undefined;
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
        if (equals(currentChar, CommonConstants.TokenValue.singleQuote)) {
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
      currentPos = this._scanForwardUsingPredicate(currentPos + 1, (c) => c !== CommonConstants.TokenValue.singleQuote);

      if (currentPos + 1 < expression.length && expression.charAt(currentPos + 1) === CommonConstants.TokenValue.singleQuote) {
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

    const litervalValue = expression.substring(startPos + 1, currentPos).replace(/''/g, CommonConstants.TokenValue.singleQuote);
    const token = this._createToken(litervalValue, ExpressionTokenType.StringLiteral, this._startPosition, currentPos + 1);
    this._startPosition = currentPos + 1;
    return token;
  }

  private _checkAndReturnValidToken(currentPos: number): ExpressionToken | undefined {
    let tokenType;
    let tokenValue;
    switch (this._expression.charAt(currentPos)) {
      case CommonConstants.TokenValue.dot: {
        tokenType = ExpressionTokenType.Dot;
        tokenValue = CommonConstants.TokenValue.dot;
        break;
      }
      case CommonConstants.TokenValue.comma: {
        tokenType = ExpressionTokenType.Comma;
        tokenValue = CommonConstants.TokenValue.comma;
        break;
      }
      case CommonConstants.TokenValue.leftParenthesis: {
        tokenType = ExpressionTokenType.LeftParenthesis;
        tokenValue = CommonConstants.TokenValue.leftParenthesis;
        break;
      }
      case CommonConstants.TokenValue.rightParenthesis: {
        tokenType = ExpressionTokenType.RightParenthesis;
        tokenValue = CommonConstants.TokenValue.rightParenthesis;
        break;
      }
      case CommonConstants.TokenValue.leftSquareBracket: {
        tokenType = ExpressionTokenType.LeftSquareBracket;
        tokenValue = CommonConstants.TokenValue.leftSquareBracket;
        break;
      }
      case CommonConstants.TokenValue.rightSquareBracket: {
        tokenType = ExpressionTokenType.RightSquareBracket;
        tokenValue = CommonConstants.TokenValue.rightSquareBracket;
        break;
      }
      case CommonConstants.TokenValue.questionMark: {
        tokenType = ExpressionTokenType.QuestionMark;
        tokenValue = CommonConstants.TokenValue.questionMark;
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
