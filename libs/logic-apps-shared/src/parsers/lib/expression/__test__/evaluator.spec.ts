import { ExpressionEvaluator } from '../evaluator';

describe('libs/workflow/expressions/evaluator', () => {
  describe('fuzzy evaluation', () => {
    it('should evaluate template expressions correctly', () => {
      const evaluator = new ExpressionEvaluator({ fuzzyEvaluation: true });
      expect(evaluator.evaluate('@@triggerBody()')).toEqual('@triggerBody()');
      expect(evaluator.evaluate('abc@@{def')).toEqual('abc@{def');
    });

    it('should throw exception when value is null/undefined', () => {
      const evaluator = new ExpressionEvaluator({ fuzzyEvaluation: true });
      expect(() => evaluator.evaluate(null as unknown as string)).toThrow();
      expect(() => evaluator.evaluate(undefined as unknown as string)).toThrow();
    });

    it('should throw exception when value cannot be evaluated', () => {
      const evaluator = new ExpressionEvaluator({ fuzzyEvaluation: true });
      expect(() => evaluator.evaluate('@triggerBody()')).toThrow();
      expect(() => evaluator.evaluate('@{triggerBody()}')).toThrow();
      expect(() => evaluator.evaluate('a@{triggerBody()}')).toThrow();
    });

    it('should evaluate parameters correctly', () => {
      const evaluator = new ExpressionEvaluator({
        fuzzyEvaluation: true,
        context: { parameters: { foo: 'foo', bar: true }, appsettings: {} },
      });
      expect(evaluator.evaluate("@{parameters('foo')}")).toEqual('foo');
      expect(evaluator.evaluate("@parameters('foo')")).toEqual('foo');
      expect(evaluator.evaluate("@parameters('bar')")).toEqual(true);
      expect(evaluator.evaluate("@parameters('aaa')")).toBeUndefined();
    });

    it('should evaluate parameters correctly for appsetting expression', () => {
      const evaluator = new ExpressionEvaluator({
        fuzzyEvaluation: true,
        context: { parameters: {}, appsettings: { foo: 'foo', bar: true } },
      });
      expect(evaluator.evaluate("@{appsetting('foo')}")).toEqual('foo');
      expect(evaluator.evaluate("@appsetting('foo')")).toEqual('foo');
      expect(evaluator.evaluate("@appsetting('bar')")).toEqual(true);
      expect(evaluator.evaluate("@appsetting('aaa')")).toBeUndefined();
    });

    it('should throw exception when parameters should not be evaluated', () => {
      const evaluator = new ExpressionEvaluator({
        fuzzyEvaluation: true,
        context: { parameters: {}, appsettings: { foo: 'foo', bar: true } },
      });
      expect(() => evaluator.evaluate("@{function('bar')}")).toThrow();
    });

    it('should throw exception when parameters cannot be evaluated', () => {
      const evaluator = new ExpressionEvaluator({
        fuzzyEvaluation: true,
        context: { parameters: { foo: 'foo', bar: true }, appsettings: {} },
      });
      expect(() => evaluator.evaluate("@{parameters('bar')}")).toThrow();
    });
  });
});
