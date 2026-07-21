import { ExpressionConstants } from '../../common/constants';
import { ExpressionExceptionCode } from '../../common/exceptions/expression';
import { ScannerExceptionName } from '../../common/exceptions/scanner';
import type { ExpressionToken } from '../../models/expression';
import { ExpressionTokenType } from '../../models/expression';
import { ExpressionScanner } from '../scanner';
import { describe, it, expect } from 'vitest';

/**
 * Reads every token from an expression using the `prefetch = false` constructor path,
 * which lets `getNextToken()` return tokens starting from the very first one.
 * The trailing `EndOfData` token is included in the returned list.
 */
function tokenize(expression: string): ExpressionToken[] {
  const scanner = new ExpressionScanner(expression, /* prefetch */ false);
  const tokens: ExpressionToken[] = [];
  // Guard against a runaway loop if the scanner ever fails to terminate.
  for (let i = 0; i < expression.length + 5; i++) {
    const token = scanner.getNextToken();
    tokens.push(token);
    if (token.type === ExpressionTokenType.EndOfData) {
      break;
    }
  }
  return tokens;
}

function typeValuePairs(expression: string): Array<{ type: ExpressionTokenType; value: string }> {
  return tokenize(expression)
    .filter((token) => token.type !== ExpressionTokenType.EndOfData)
    .map(({ type, value }) => ({ type, value }));
}

describe('lib/parsers/expression/scanner', () => {
  describe('constructor + prefetch behavior', () => {
    it('prefetches the first token by default and exposes the original expression', () => {
      const scanner = new ExpressionScanner('foo');
      expect(scanner.expression).toBe('foo');
      // The prefetched first token is only reachable through getTokenForTypeAndValue.
      const token = scanner.getTokenForTypeAndValue(ExpressionTokenType.Identifier);
      expect(token).toBeDefined();
      expect(token?.value).toBe('foo');
    });

    it('does not prefetch when prefetch is false; the first getNextToken returns token 0', () => {
      const scanner = new ExpressionScanner('42', /* prefetch */ false);
      const first = scanner.getNextToken();
      expect(first.type).toBe(ExpressionTokenType.IntegerLiteral);
      expect(first.value).toBe('42');
    });

    it('emits EndOfData for an empty expression', () => {
      expect(typeValuePairs('')).toEqual([]);
      const scanner = new ExpressionScanner('', /* prefetch */ false);
      expect(scanner.getNextToken().type).toBe(ExpressionTokenType.EndOfData);
    });

    it('throws LIMIT_EXCEEDED when the expression is longer than the max limit', () => {
      const tooLong = 'a'.repeat(ExpressionConstants.Expression.maxExpressionLimit + 1);
      expect(() => new ExpressionScanner(tooLong)).toThrowError(
        expect.objectContaining({ name: ScannerExceptionName, code: ExpressionExceptionCode.LIMIT_EXCEEDED })
      );
    });

    it('accepts an expression exactly at the max limit boundary', () => {
      const atLimit = 'a'.repeat(ExpressionConstants.Expression.maxExpressionLimit);
      expect(() => new ExpressionScanner(atLimit)).not.toThrow();
    });
  });

  describe('punctuation tokens', () => {
    it('scans each single-character punctuation token', () => {
      expect(typeValuePairs('.,()[]?')).toEqual([
        { type: ExpressionTokenType.Dot, value: '.' },
        { type: ExpressionTokenType.Comma, value: ',' },
        { type: ExpressionTokenType.LeftParenthesis, value: '(' },
        { type: ExpressionTokenType.RightParenthesis, value: ')' },
        { type: ExpressionTokenType.LeftSquareBracket, value: '[' },
        { type: ExpressionTokenType.RightSquareBracket, value: ']' },
        { type: ExpressionTokenType.QuestionMark, value: '?' },
      ]);
    });
  });

  describe('identifiers', () => {
    it('scans a bare identifier', () => {
      expect(typeValuePairs('triggerBody')).toEqual([{ type: ExpressionTokenType.Identifier, value: 'triggerBody' }]);
    });

    it('scans a function-call shape as identifier + parentheses', () => {
      expect(typeValuePairs('concat()')).toEqual([
        { type: ExpressionTokenType.Identifier, value: 'concat' },
        { type: ExpressionTokenType.LeftParenthesis, value: '(' },
        { type: ExpressionTokenType.RightParenthesis, value: ')' },
      ]);
    });

    it('throws MISUSED_DOUBLE_QUOTES when an identifier is wrapped in double quotes', () => {
      expect(() => tokenize('"abc"')).toThrowError(
        expect.objectContaining({ name: ScannerExceptionName, code: ExpressionExceptionCode.MISUSED_DOUBLE_QUOTES })
      );
    });
  });

  describe('numbers', () => {
    it('scans a plain integer as IntegerLiteral', () => {
      expect(typeValuePairs('123')).toEqual([{ type: ExpressionTokenType.IntegerLiteral, value: '123' }]);
    });

    it('consumes a leading sign into the numeric token', () => {
      expect(typeValuePairs('-5')).toEqual([{ type: ExpressionTokenType.IntegerLiteral, value: '-5' }]);
      expect(typeValuePairs('+7')).toEqual([{ type: ExpressionTokenType.IntegerLiteral, value: '+7' }]);
    });

    it('scans fractional and exponent forms as FloatLiteral', () => {
      expect(typeValuePairs('1.5')).toEqual([{ type: ExpressionTokenType.FloatLiteral, value: '1.5' }]);
      expect(typeValuePairs('1e3')).toEqual([{ type: ExpressionTokenType.FloatLiteral, value: '1e3' }]);
      expect(typeValuePairs('1e+3')).toEqual([{ type: ExpressionTokenType.FloatLiteral, value: '1e+3' }]);
      expect(typeValuePairs('1e-3')).toEqual([{ type: ExpressionTokenType.FloatLiteral, value: '1e-3' }]);
      expect(typeValuePairs('1.5e-2')).toEqual([{ type: ExpressionTokenType.FloatLiteral, value: '1.5e-2' }]);
    });

    it('throws UNEXPECTED_CHARACTER when a number is immediately followed by an identifier char', () => {
      expect(() => tokenize('5abc')).toThrowError(
        expect.objectContaining({ name: ScannerExceptionName, code: ExpressionExceptionCode.UNEXPECTED_CHARACTER })
      );
    });

    it('treats a leading-dot number as a Dot token followed by an integer (documents current behavior)', () => {
      expect(typeValuePairs('.5')).toEqual([
        { type: ExpressionTokenType.Dot, value: '.' },
        { type: ExpressionTokenType.IntegerLiteral, value: '5' },
      ]);
    });
  });

  describe('single-quoted string literals', () => {
    it('scans a simple string literal without the surrounding quotes', () => {
      expect(typeValuePairs("'hello world'")).toEqual([{ type: ExpressionTokenType.StringLiteral, value: 'hello world' }]);
    });

    it('collapses doubled single quotes into a single quote inside the value', () => {
      expect(typeValuePairs("'a''b'")).toEqual([{ type: ExpressionTokenType.StringLiteral, value: "a'b" }]);
      expect(typeValuePairs("''''")).toEqual([{ type: ExpressionTokenType.StringLiteral, value: "'" }]);
    });

    it('scans an empty string literal', () => {
      expect(typeValuePairs("''")).toEqual([{ type: ExpressionTokenType.StringLiteral, value: '' }]);
    });

    it('throws STRING_LITERAL_NOT_TERMINATED for an unterminated string', () => {
      expect(() => tokenize("'abc")).toThrowError(
        expect.objectContaining({ name: ScannerExceptionName, code: ExpressionExceptionCode.STRING_LITERAL_NOT_TERMINATED })
      );
    });
  });

  describe('whitespace + mixed streams', () => {
    it('skips whitespace between tokens', () => {
      expect(typeValuePairs("  concat( 'a' , 5 )  ")).toEqual([
        { type: ExpressionTokenType.Identifier, value: 'concat' },
        { type: ExpressionTokenType.LeftParenthesis, value: '(' },
        { type: ExpressionTokenType.StringLiteral, value: 'a' },
        { type: ExpressionTokenType.Comma, value: ',' },
        { type: ExpressionTokenType.IntegerLiteral, value: '5' },
        { type: ExpressionTokenType.RightParenthesis, value: ')' },
      ]);
    });
  });

  describe('invalid characters', () => {
    it('throws UNEXPECTED_CHARACTER for an unsupported character such as a lone @', () => {
      expect(() => tokenize('@')).toThrowError(
        expect.objectContaining({ name: ScannerExceptionName, code: ExpressionExceptionCode.UNEXPECTED_CHARACTER })
      );
    });
  });

  describe('getTokenForTypeAndValue', () => {
    it('returns and consumes the token when the type matches, then advances', () => {
      const scanner = new ExpressionScanner("concat('a')");
      expect(scanner.getTokenForTypeAndValue(ExpressionTokenType.Identifier)?.value).toBe('concat');
      expect(scanner.getTokenForTypeAndValue(ExpressionTokenType.LeftParenthesis)?.value).toBe('(');
      expect(scanner.getTokenForTypeAndValue(ExpressionTokenType.StringLiteral)?.value).toBe('a');
      expect(scanner.getTokenForTypeAndValue(ExpressionTokenType.RightParenthesis)?.value).toBe(')');
      expect(scanner.getTokenForTypeAndValue(ExpressionTokenType.EndOfData)).toBeDefined();
    });

    it('returns undefined without advancing when the type does not match', () => {
      const scanner = new ExpressionScanner('foo');
      expect(scanner.getTokenForTypeAndValue(ExpressionTokenType.IntegerLiteral)).toBeUndefined();
      // The identifier token is still available because the previous call did not consume it.
      expect(scanner.getTokenForTypeAndValue(ExpressionTokenType.Identifier)?.value).toBe('foo');
    });

    it('matches an identifier value case-insensitively', () => {
      const scanner = new ExpressionScanner('null');
      expect(scanner.getTokenForTypeAndValue(ExpressionTokenType.Identifier, 'NULL')?.value).toBe('null');
    });

    it('returns undefined when the value does not match even if the type matches', () => {
      const scanner = new ExpressionScanner('foo');
      expect(scanner.getTokenForTypeAndValue(ExpressionTokenType.Identifier, 'bar')).toBeUndefined();
    });
  });
});
