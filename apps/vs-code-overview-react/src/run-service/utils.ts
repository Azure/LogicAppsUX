import type { CallbackInfo, CallbackInfoWithRelativePath, Run, RunDisplayItem } from './types';
import { isObject } from '@microsoft-logic-apps/utils';
import { getDurationString } from '@microsoft/designer-ui';

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

export function isCallbackInfoWithRelativePath(value: any): value is CallbackInfoWithRelativePath {
  return isObject(value) && typeof value.relativePath === 'string';
}

export function mapToRunItem({ id, name: identifier, properties }: Run): RunDisplayItem {
  const { endTime, startTime, status } = properties;
  const duration = endTime ? getDurationString(Date.parse(endTime) - Date.parse(startTime), /* abbreviated */ false) : '--';

  return {
    duration,
    id,
    identifier,
    startTime,
    status,
  };
}
