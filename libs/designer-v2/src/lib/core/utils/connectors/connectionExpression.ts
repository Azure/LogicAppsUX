import type { ConnectionMapping } from '../../../common/models/workflow';
import {
  ExpressionBuilder,
  ExpressionParser,
  isFunction,
  isStringInterpolation,
  isStringLiteral,
  isTemplateExpression,
  type Expression,
} from '@microsoft/logic-apps-shared';

export function getServiceProviderConnectionMapping(connectionName: string): ConnectionMapping[string] {
  if (!isTemplateExpression(connectionName)) {
    return connectionName;
  }
  try {
    const expression = ExpressionParser.parseTemplateExpression(connectionName);
    if (isStringLiteral(expression) && connectionName.charAt(0) === '@' && connectionName.charAt(1) === '@') {
      return expression.value;
    }
    if (isStringInterpolation(expression) && expression.segments.every(isStringLiteral) && !/(^|[^@])@\{/.test(connectionName)) {
      return expression.segments.map((segment) => (isStringLiteral(segment) ? segment.value : '')).join('');
    }
  } catch {
    // Malformed expressions must survive import, not become connection resource IDs.
  }
  return { kind: 'expression', expression: connectionName };
}

export function isConnectionExpressionValid(expression: string): boolean {
  try {
    ExpressionParser.parseTemplateExpression(expression);
    return typeof getServiceProviderConnectionMapping(expression) === 'object';
  } catch {
    return false;
  }
}

export function remapConnectionExpression(
  value: string,
  actionNames: Record<string, string> = {},
  parameterNames: Record<string, string> = {}
): string {
  if (!isConnectionExpressionValid(value)) {
    return value;
  }
  const expression = ExpressionParser.parseTemplateExpression(value);
  let changed = false;
  const visit = (node: Expression): void => {
    if (isStringInterpolation(node)) {
      node.segments.forEach(visit);
    } else if (isFunction(node)) {
      const name = node.name.toLowerCase();
      const replacements =
        name === 'parameters'
          ? parameterNames
          : ['outputs', 'body', 'actions', 'actionoutputs', 'actionbody', 'items', 'iterationindexes', 'result'].includes(name)
            ? actionNames
            : {};
      const argument = node.arguments[0];
      if (argument && isStringLiteral(argument) && Object.hasOwn(replacements, argument.value)) {
        argument.value = replacements[argument.value];
        changed = true;
      }
      node.arguments.forEach(visit);
      node.dereferences.forEach((dereference) => visit(dereference.expression));
    }
  };
  visit(expression);
  if (!changed) {
    return value;
  }
  return new ExpressionBuilder().buildTemplateExpression(expression);
}

export function serializeServiceProviderConnectionKey(referenceKey: string): string {
  return referenceKey.charAt(0) === '@' ? `@${referenceKey}` : referenceKey.replace(/@\{/g, '@@{');
}

export function remapConnectionExpressionValue(
  value: any,
  actionNames: Record<string, string>,
  parameterNames: Record<string, string> = {}
): any {
  if (typeof value === 'string') {
    return remapConnectionExpression(value, actionNames, parameterNames);
  }
  if (Array.isArray(value)) {
    return value.map((child) => remapConnectionExpressionValue(child, actionNames, parameterNames));
  }
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, child]) => [key, remapConnectionExpressionValue(child, actionNames, parameterNames)])
    );
  }
  return value;
}
