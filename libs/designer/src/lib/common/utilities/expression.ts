import { Expression, ExpressionFunctionNames, ExpressionKind } from "../models/expression";
import { equals, isNullOrEmpty } from "./Utils";

export function isTemplateExpression(value: string): boolean {
    if (isNullOrEmpty(value) || value.length < 2) {
        return false;
    }

    return value.charAt(0) === '@' || value.indexOf('@{') > 0;
}

export function isStringLiteral(expression: Expression): boolean {
    return equals(expression.kind, ExpressionKind.StringLiteral);
}

export function isLiteralExpression(expression: Expression): boolean {
    return isStringLiteral(expression) || isNumberLiteral(expression) || isBooleanLiteral(expression) || isNullLiteral(expression);
}

export function isFunction(expression: Expression): boolean {
    return equals(expression.kind, ExpressionKind.Function);
}

export function isStringInterpolation(expression: Expression): boolean {
    return equals(expression.kind, ExpressionKind.StringInterpolation);
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
    return equals(expression.kind, ExpressionKind.NullLiteral);
}

function isBooleanLiteral(expression: Expression): boolean {
    return equals(expression.kind, ExpressionKind.BooleanLiteral);
}

function isNumberLiteral(expression: Expression): boolean {
    return equals(expression.kind, ExpressionKind.NumberLiteral);
}