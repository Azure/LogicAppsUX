import type { Expression, ExpressionFunction } from '../../models/expression';
import { ExpressionType } from '../../models/expression';
import { ExpressionBuilder, ExpressionBuilderErrorCode, ExpressionBuilderException } from '../builder';
import { ExpressionParser } from '../parser';
import { describe, it, expect } from 'vitest';

const stringLiteral = (value: string): Expression => ({ type: ExpressionType.StringLiteral, value });

describe('lib/parsers/expression/builder', () => {
  const builder = new ExpressionBuilder();

  describe('buildExpression', () => {
    it('returns the raw value for null, boolean and number literals', () => {
      expect(builder.buildExpression({ type: ExpressionType.NullLiteral, value: 'null' })).toBe('null');
      expect(builder.buildExpression({ type: ExpressionType.BooleanLiteral, value: 'true' })).toBe('true');
      expect(builder.buildExpression({ type: ExpressionType.NumberLiteral, value: '5' })).toBe('5');
    });

    it('wraps string literals in single quotes and doubles embedded quotes', () => {
      expect(builder.buildExpression(stringLiteral('hello'))).toBe("'hello'");
      expect(builder.buildExpression(stringLiteral("a'b"))).toBe("'a''b'");
    });

    it('builds a function call with comma-space separated arguments', () => {
      const fn = ExpressionParser.parseExpression("concat('a', 5)");
      expect(builder.buildExpression(fn)).toBe("concat('a', 5)");
    });

    it('throws INVALID_TYPE when asked to build a string-interpolation node directly', () => {
      const interpolation = ExpressionParser.parseTemplateExpression("@{concat('a')}");
      const build = () => builder.buildExpression(interpolation);
      expect(build).toThrowError(expect.objectContaining({ code: ExpressionBuilderErrorCode.INVALID_TYPE }));
      expect(build).toThrow(ExpressionBuilderException);
    });
  });

  describe('buildExpression - dereferences', () => {
    it('emits dot notation only when the dereference explicitly sets isDotNotation', () => {
      const fn: ExpressionFunction = {
        type: ExpressionType.Function,
        expression: 'body()',
        startPosition: 0,
        endPosition: 6,
        name: 'body',
        arguments: [],
        dereferences: [{ isSafe: false, isDotNotation: true, expression: stringLiteral('foo') }],
      };
      expect(builder.buildExpression(fn)).toBe('body().foo');
    });
  });

  describe('buildTemplateExpression', () => {
    it('returns a plain string literal unchanged', () => {
      expect(builder.buildTemplateExpression(stringLiteral('plain text'))).toBe('plain text');
    });

    it('escapes a leading @ on a string literal by doubling it', () => {
      expect(builder.buildTemplateExpression(stringLiteral('@foo'))).toBe('@@foo');
    });

    it('escapes an embedded @{ sequence in a string literal', () => {
      expect(builder.buildTemplateExpression(stringLiteral('abc@{def'))).toBe('abc@@{def');
    });

    it('prefixes @ for a function expression', () => {
      const fn = ExpressionParser.parseExpression('triggerBody()');
      expect(builder.buildTemplateExpression(fn)).toBe('@triggerBody()');
    });

    it('collapses a single string-literal interpolation segment to a single string', () => {
      const interpolation: Expression = {
        type: ExpressionType.StringInterpolation,
        segments: [stringLiteral('only')],
      };
      expect(builder.buildTemplateExpression(interpolation)).toBe('only');
    });

    it('merges adjacent string-literal segments before building', () => {
      const interpolation: Expression = {
        type: ExpressionType.StringInterpolation,
        segments: [stringLiteral('a'), stringLiteral('b')],
      };
      expect(builder.buildTemplateExpression(interpolation)).toBe('ab');
    });

    it('wraps a literal segment ending with @ so the following @{ is not misread', () => {
      const fn = ExpressionParser.parseExpression("concat('a')");
      const interpolation: Expression = {
        type: ExpressionType.StringInterpolation,
        segments: [stringLiteral('x@'), fn],
      };
      expect(builder.buildTemplateExpression(interpolation)).toBe("@{'x@'}@{concat('a')}");
    });
  });

  describe('parse -> build round-trips (canonical forms)', () => {
    it('preserves scalar literals', () => {
      for (const input of ['5', 'true', 'null']) {
        expect(builder.buildExpression(ExpressionParser.parseExpression(input))).toBe(input);
      }
    });

    it('preserves string literals with escaped quotes', () => {
      expect(builder.buildExpression(ExpressionParser.parseExpression("'a''b'"))).toBe("'a''b'");
    });

    it('preserves a function call with mixed arguments and canonical spacing', () => {
      expect(builder.buildExpression(ExpressionParser.parseExpression("concat('a', 5, inner('b'))"))).toBe("concat('a', 5, inner('b'))");
    });

    it('round-trips @@ escaped template literals', () => {
      const parsed = ExpressionParser.parseTemplateExpression('@@triggerBody()');
      expect(builder.buildTemplateExpression(parsed)).toBe('@@triggerBody()');
    });

    it('round-trips a mixed literal + interpolation template', () => {
      const parsed = ExpressionParser.parseTemplateExpression("abc@{concat('a')}def");
      expect(builder.buildTemplateExpression(parsed)).toBe("abc@{concat('a')}def");
    });

    it('canonicalizes an enabled alias path split into chained bracket accesses (lossy asymmetry)', () => {
      const parsed = ExpressionParser.parseExpression("body()['body/value']", /* isAliasPathParsingEnabled */ true);
      expect(builder.buildExpression(parsed)).toBe("body()['body']['value']");
    });
  });
});
