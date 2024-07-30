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
