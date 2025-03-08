import { isObject } from '../helpers';
import type { CallbackInfo, CallbackInfoWithRelativePath, LogicAppsV2 } from '../models';

export function isCallbackInfoWithRelativePath(value: any): value is CallbackInfoWithRelativePath {
  return isObject(value) && typeof value.relativePath === 'string';
}

export function getCallbackUrl(callbackInfo: CallbackInfo | undefined): string | undefined {
  if (!callbackInfo) {
    return undefined;
  }

  if (!isCallbackInfoWithRelativePath(callbackInfo)) {
    return callbackInfo.value;
  }

  const { basePath = '', queries = {}, relativePath } = callbackInfo;
  const queryString = Object.entries(queries)
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
    .join('&');

  return basePath + (relativePath.startsWith('/') ? relativePath : `/${relativePath}`) + (queryString ? `?${queryString}` : '');
}

/**
 * Determines if a callback URL is supported for a given Logic Apps workflow definition.
 * @param {LogicAppsV2.WorkflowDefinition} definition  - The workflow definition to check.
 * @returns An object containing the trigger name and a boolean indicating if a callback URL is supported.
 */
export const getIsCallbackUrlSupported = (
  definition: LogicAppsV2.WorkflowDefinition
): { triggerName: string | undefined; isCallbackUrlSupported: boolean } => {
  if (definition) {
    for (const trigger in definition.triggers) {
      if (trigger) {
        const { type, kind } = definition.triggers[trigger];
        return { triggerName: trigger, isCallbackUrlSupported: type === 'Request' && kind === 'Http' };
      }
    }
  }
  return { triggerName: undefined, isCallbackUrlSupported: false };
};

/**
 * Retrieves the name of the request trigger from a Logic Apps V2 workflow definition.
 * @param {LogicAppsV2.WorkflowDefinition} definition - The workflow definition object.
 * @returns The name of the request trigger, or undefined if not found.
 */
export const getRequestTriggerName = (definition: LogicAppsV2.WorkflowDefinition): string | undefined => {
  const { triggers = {} } = definition;
  for (const triggerName of Object.keys(triggers)) {
    if (triggers[triggerName].type.toLowerCase() === 'request') {
      return triggerName;
    }
  }

  return undefined;
};

/**
 * Retrieves the name of the trigger from a Logic Apps V2 workflow definition.
 * @param {LogicAppsV2.WorkflowDefinition} definition - The workflow definition object.
 * @returns The name of the trigger if there is only one, otherwise undefined.
 */
export function getTriggerName(definition: LogicAppsV2.WorkflowDefinition): string | undefined {
  const { triggers = {} } = definition;
  const triggerNames = Object.keys(triggers);
  return triggerNames.length === 1 ? triggerNames[0] : undefined;
}
