import type { Expression, ExpressionFunction, ExpressionLiteral, ExpressionStringInterpolation } from '../../models/expression';
import { equals, isNullOrEmpty } from '@microsoft-logic-apps/utils';

export enum ExpressionType {
  NullLiteral = 'NullLiteral',
  BooleanLiteral = 'BooleanLiteral',
  NumberLiteral = 'NumberLiteral',
  StringLiteral = 'StringLiteral',
  Function = 'Function',
  StringInterpolation = 'StringInterpolation',
}

export enum ExpressionFunctionNames {
  PARAMETERS = 'PARAMETERS',
  APPSETTING = 'APPSETTING',
}

export function isNumeric(ch: string) {
  return /[0-9]/g.test(ch);
}

export function isWhitespace(ch: string) {
  // NOTE(joechung): https://msdn.microsoft.com/en-us/library/system.char.iswhitespace.aspx
  switch (ch) {
    case '\u0020':
    case '\u1680':
    case '\u2000':
    case '\u2001':
    case '\u2002':
    case '\u2003':
    case '\u2004':
    case '\u2005':
    case '\u2006':
    case '\u2007':
    case '\u2008':
    case '\u2009':
    case '\u200a':
    case '\u202f':
    case '\u205f':
    case '\u3000':
    case '\u2028':
    case '\u2029':
    case '\u0009':
    case '\u000a':
    case '\u000b':
    case '\u000c':
    case '\u000d':
    case '\u0085':
    case '\u00a0':
      return true;

    default:
      return false;
  }
}

export function isTemplateExpression(value: string): boolean {
  if (isNullOrEmpty(value) || value.length < 2) {
    return false;
  }

  return value.charAt(0) === '@' || value.indexOf('@{') > 0;
}

export function isStringLiteral(expression: Expression): expression is ExpressionLiteral {
  return equals(expression.type, ExpressionType.StringLiteral);
}

export function isLiteralExpression(expression: Expression): expression is ExpressionLiteral {
  return isStringLiteral(expression) || isNumberLiteral(expression) || isBooleanLiteral(expression) || isNullLiteral(expression);
}

export function isFunction(expression: Expression): expression is ExpressionFunction {
  return equals(expression.type, ExpressionType.Function);
}

export function isStringInterpolation(expression: Expression): expression is ExpressionStringInterpolation {
  return equals(expression.type, ExpressionType.StringInterpolation);
}

export function isParameterOrAppSettingExpression(functionName: string): boolean {
  return isParameterExpression(functionName) || isAppSettingExpression(functionName);
}

function isParameterExpression(functionName: string) {
  return equals(functionName, ExpressionFunctionNames.PARAMETERS);
}

function isAppSettingExpression(functionName: string) {
  return equals(functionName, ExpressionFunctionNames.APPSETTING);
}

function isNullLiteral(expression: Expression): boolean {
  return equals(expression.type, ExpressionType.NullLiteral);
}

function isBooleanLiteral(expression: Expression): boolean {
  return equals(expression.type, ExpressionType.BooleanLiteral);
}

function isNumberLiteral(expression: Expression): boolean {
  return equals(expression.type, ExpressionType.NumberLiteral);
}
