import { ExpressionExceptionCode } from '../../common/exceptions/expression';
import { ParserExceptionName } from '../../common/exceptions/parser';
import type { ExpressionFunction, ExpressionStringInterpolation } from '../../models/expression';
import { ExpressionType } from '../../models/expression';
import { ExpressionParser } from '../parser';
import { describe, it, expect } from 'vitest';

describe('lib/parsers/expression/parser', () => {
  describe('parseExpression - literals', () => {
    it('parses a string literal', () => {
      expect(ExpressionParser.parseExpression("'hello'")).toEqual({ type: ExpressionType.StringLiteral, value: 'hello' });
    });

    it('parses integer and float literals as NumberLiteral, preserving the raw text', () => {
      expect(ExpressionParser.parseExpression('42')).toEqual({ type: ExpressionType.NumberLiteral, value: '42' });
      expect(ExpressionParser.parseExpression('1.5')).toEqual({ type: ExpressionType.NumberLiteral, value: '1.5' });
      expect(ExpressionParser.parseExpression('-3')).toEqual({ type: ExpressionType.NumberLiteral, value: '-3' });
    });

    it('parses the null / true / false identifier specials', () => {
      expect(ExpressionParser.parseExpression('null')).toEqual({ type: ExpressionType.NullLiteral, value: 'null' });
      expect(ExpressionParser.parseExpression('true')).toEqual({ type: ExpressionType.BooleanLiteral, value: 'true' });
      expect(ExpressionParser.parseExpression('false')).toEqual({ type: ExpressionType.BooleanLiteral, value: 'false' });
    });
  });

  describe('parseExpression - functions', () => {
    it('parses a zero-argument function', () => {
      const result = ExpressionParser.parseExpression('triggerBody()') as ExpressionFunction;
      expect(result).toMatchObject({ type: ExpressionType.Function, name: 'triggerBody', arguments: [], dereferences: [] });
    });

    it('parses a function with multiple arguments including a nested function', () => {
      const result = ExpressionParser.parseExpression("concat('a', 5, inner('b'))") as ExpressionFunction;
      expect(result).toMatchObject({
        type: ExpressionType.Function,
        name: 'concat',
        arguments: [
          { type: ExpressionType.StringLiteral, value: 'a' },
          { type: ExpressionType.NumberLiteral, value: '5' },
          { type: ExpressionType.Function, name: 'inner', arguments: [{ type: ExpressionType.StringLiteral, value: 'b' }] },
        ],
      });
    });

    it('records the source expression and positions on function nodes', () => {
      const result = ExpressionParser.parseExpression("concat('a')") as ExpressionFunction;
      expect(result.expression).toBe("concat('a')");
      expect(result.startPosition).toBe(0);
      expect(typeof result.endPosition).toBe('number');
    });
  });

  describe('parseExpression - dereferences', () => {
    it('parses dot-notation dereference as isSafe:false isDotNotation:false entry', () => {
      const result = ExpressionParser.parseExpression('body().foo') as ExpressionFunction;
      expect(result.dereferences).toHaveLength(1);
      // Dot notation currently parses with isDotNotation:false.
      expect(result.dereferences[0]).toEqual({
        isSafe: false,
        isDotNotation: false,
        expression: { type: ExpressionType.StringLiteral, value: 'foo' },
      });
    });

    it('parses bracket-notation dereference with a string index', () => {
      const result = ExpressionParser.parseExpression("body()['foo']") as ExpressionFunction;
      expect(result.dereferences).toEqual([
        { isSafe: false, isDotNotation: false, expression: { type: ExpressionType.StringLiteral, value: 'foo' } },
      ]);
    });

    it('parses bracket-notation dereference with a numeric index', () => {
      const result = ExpressionParser.parseExpression('body()[0]') as ExpressionFunction;
      expect(result.dereferences).toEqual([
        { isSafe: false, isDotNotation: false, expression: { type: ExpressionType.NumberLiteral, value: '0' } },
      ]);
    });

    it('marks safe-navigation dot as isSafe:true isDotNotation:false, and bracket as isSafe:true isDotNotation:false', () => {
      // Safe-dot form currently parses with isDotNotation:false.
      const dotResult = ExpressionParser.parseExpression('body()?.foo') as ExpressionFunction;
      expect(dotResult.dereferences[0]).toEqual({
        isSafe: true,
        isDotNotation: false,
        expression: { type: ExpressionType.StringLiteral, value: 'foo' },
      });

      // Bracket form must keep isDotNotation:false.
      const bracketResult = ExpressionParser.parseExpression("body()?['foo']") as ExpressionFunction;
      expect(bracketResult.dereferences[0]).toEqual({
        isSafe: true,
        isDotNotation: false,
        expression: { type: ExpressionType.StringLiteral, value: 'foo' },
      });
    });

    it('parses a chain of dereferences: dot-originated foo and bracket-originated bar are both isDotNotation:false', () => {
      const result = ExpressionParser.parseExpression("body().foo['bar']") as ExpressionFunction;
      // Both entries currently parse with isDotNotation:false.
      expect(result.dereferences).toEqual([
        { isSafe: false, isDotNotation: false, expression: { type: ExpressionType.StringLiteral, value: 'foo' } },
        { isSafe: false, isDotNotation: false, expression: { type: ExpressionType.StringLiteral, value: 'bar' } },
      ]);
    });

    it('throws UNRECOGNIZED_EXPRESSION for a dangling safe-navigation operator', () => {
      expect(() => ExpressionParser.parseExpression('body()?')).toThrowError(
        expect.objectContaining({ name: ParserExceptionName, code: ExpressionExceptionCode.UNRECOGNIZED_EXPRESSION })
      );
    });
  });

  describe('parseExpression - alias path parsing', () => {
    it('splits a slash-separated bracket path into multiple dereferences when enabled', () => {
      const result = ExpressionParser.parseExpression("body()['body/value']", /* isAliasPathParsingEnabled */ true) as ExpressionFunction;
      expect(result.dereferences).toEqual([
        { isSafe: false, isDotNotation: false, expression: { type: ExpressionType.StringLiteral, value: 'body' } },
        { isSafe: false, isDotNotation: false, expression: { type: ExpressionType.StringLiteral, value: 'value' } },
      ]);
    });

    it('keeps a slash-separated bracket path as a single dereference when disabled', () => {
      const result = ExpressionParser.parseExpression("body()['body/value']", /* isAliasPathParsingEnabled */ false) as ExpressionFunction;
      expect(result.dereferences).toEqual([
        { isSafe: false, isDotNotation: false, expression: { type: ExpressionType.StringLiteral, value: 'body/value' } },
      ]);
    });

    it('does not apply alias-path splitting inside function arguments even when enabled', () => {
      const result = ExpressionParser.parseExpression("outer(inner()['a/b'])", /* isAliasPathParsingEnabled */ true) as ExpressionFunction;
      const innerArg = result.arguments[0] as ExpressionFunction;
      expect(innerArg.dereferences).toEqual([
        { isSafe: false, isDotNotation: false, expression: { type: ExpressionType.StringLiteral, value: 'a/b' } },
      ]);
    });
  });

  describe('parseExpression - error and edge behavior', () => {
    it('throws UNRECOGNIZED_EXPRESSION when a closing parenthesis is missing', () => {
      expect(() => ExpressionParser.parseExpression("concat('a'")).toThrowError(
        expect.objectContaining({ name: ParserExceptionName, code: ExpressionExceptionCode.UNRECOGNIZED_EXPRESSION })
      );
    });

    it('throws UNRECOGNIZED_EXPRESSION when the opening parenthesis is missing', () => {
      expect(() => ExpressionParser.parseExpression('concat')).toThrowError(
        expect.objectContaining({ name: ParserExceptionName, code: ExpressionExceptionCode.UNRECOGNIZED_EXPRESSION })
      );
    });
  });

  describe('parseTemplateExpression', () => {
    it('throws UNRECOGNIZED_EXPRESSION for non-template input', () => {
      expect(() => ExpressionParser.parseTemplateExpression('plain')).toThrowError(
        expect.objectContaining({ name: ParserExceptionName, code: ExpressionExceptionCode.UNRECOGNIZED_EXPRESSION })
      );
      expect(() => ExpressionParser.parseTemplateExpression('a')).toThrowError(
        expect.objectContaining({ name: ParserExceptionName, code: ExpressionExceptionCode.UNRECOGNIZED_EXPRESSION })
      );
    });

    it('unescapes a leading @@ into a plain string literal', () => {
      // substring(1) keeps the second '@', so '@@x' becomes the literal '@x'.
      expect(ExpressionParser.parseTemplateExpression('@@triggerBody()')).toEqual({
        type: ExpressionType.StringLiteral,
        value: '@triggerBody()',
      });
    });

    it('delegates an @-prefixed non-interpolation expression to parseExpression', () => {
      expect(ExpressionParser.parseTemplateExpression('@triggerBody()')).toMatchObject({
        type: ExpressionType.Function,
        name: 'triggerBody',
      });
    });

    it('parses a pure interpolation into a single function segment', () => {
      const result = ExpressionParser.parseTemplateExpression("@{concat('a')}");
      expect(result.type).toBe(ExpressionType.StringInterpolation);
      const segments = (result as ExpressionStringInterpolation).segments;
      expect(segments).toHaveLength(1);
      expect(segments[0]).toMatchObject({ type: ExpressionType.Function, name: 'concat' });
    });

    it('parses mixed literal + interpolation into ordered segments', () => {
      const result = ExpressionParser.parseTemplateExpression("abc@{concat('a')}def");
      const segments = (result as ExpressionStringInterpolation).segments;
      expect(segments).toHaveLength(3);
      expect(segments[0]).toEqual({ type: ExpressionType.StringLiteral, value: 'abc' });
      expect(segments[1]).toMatchObject({ type: ExpressionType.Function, name: 'concat' });
      expect(segments[2]).toEqual({ type: ExpressionType.StringLiteral, value: 'def' });
    });

    it('does not treat a } inside a quoted string as an interpolation terminator', () => {
      const result = ExpressionParser.parseTemplateExpression("@{concat('}')}");
      const segments = (result as ExpressionStringInterpolation).segments;
      expect(segments[0]).toMatchObject({
        type: ExpressionType.Function,
        name: 'concat',
        arguments: [{ type: ExpressionType.StringLiteral, value: '}' }],
      });
    });

    it('treats @@{ as an escaped literal rather than an interpolation start', () => {
      const result = ExpressionParser.parseTemplateExpression('x@@{y}');
      const segments = (result as ExpressionStringInterpolation).segments;
      expect(segments.every((segment) => segment.type === ExpressionType.StringLiteral)).toBe(true);
      expect(segments.map((segment) => (segment as { value: string }).value).join('')).toBe('x@{y}');
    });

    it('throws STRING_LITERAL_NOT_TERMINATED for an unterminated interpolation', () => {
      expect(() => ExpressionParser.parseTemplateExpression('@{concat(')).toThrowError(
        expect.objectContaining({ name: ParserExceptionName, code: ExpressionExceptionCode.STRING_LITERAL_NOT_TERMINATED })
      );
    });
  });
});
