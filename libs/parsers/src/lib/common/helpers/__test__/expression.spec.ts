import {
  ExpressionType,
  isStringLiteral,
  isLiteralExpression,
  isTemplateExpression,
  isFunction,
  isStringInterpolation,
  isParameterOrAppSettingExpression,
} from '../expression';

describe('Expression helper Tests', () => {
  it('isTemplateExpression', () => {
    expect(isTemplateExpression('')).toBeFalsy();
    expect(isTemplateExpression('@@')).toBeTruthy();
    expect(isTemplateExpression('exp')).toBeFalsy();
    expect(isTemplateExpression('@exp')).toBeTruthy();
  });

  it('isStringLiteral', () => {
    expect(
      isStringLiteral({
        value: 'literal-val',
        type: ExpressionType.StringLiteral,
      })
    ).toBeTruthy();

    expect(
      isStringLiteral({
        value: 'literal-val',
        type: ExpressionType.NullLiteral,
      })
    ).toBeFalsy();
  });

  it('isLiteralExpression', () => {
    expect(
      isLiteralExpression({
        value: 'literal-val',
        type: ExpressionType.StringLiteral,
      })
    ).toBeTruthy();

    expect(
      isLiteralExpression({
        value: 'literal-val',
        type: ExpressionType.NumberLiteral,
      })
    ).toBeTruthy();

    expect(
      isLiteralExpression({
        value: 'literal-val',
        type: ExpressionType.Function,
      })
    ).toBeFalsy();
  });

  it('isFunction', () => {
    expect(
      isFunction({
        value: 'literal-val',
        type: ExpressionType.Function,
      })
    ).toBeTruthy();

    expect(
      isFunction({
        value: 'literal-val',
        type: ExpressionType.NullLiteral,
      })
    ).toBeFalsy();
  });

  it('isStringInterpolation', () => {
    expect(
      isStringInterpolation({
        value: 'literal-val',
        type: ExpressionType.StringInterpolation,
      })
    ).toBeTruthy();

    expect(
      isStringInterpolation({
        value: 'literal-val',
        type: ExpressionType.NullLiteral,
      })
    ).toBeFalsy();
  });

  it('isParameterOrAppSettingExpression', () => {
    expect(isParameterOrAppSettingExpression('')).toBeFalsy();

    expect(isParameterOrAppSettingExpression('paramETERS')).toBeTruthy();
  });
});
