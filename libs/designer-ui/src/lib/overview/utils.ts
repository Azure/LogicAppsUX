import { getDurationString } from '../utils';
import type { CallbackInfo, Run, RunDisplayItem, RunError } from './types';
import { isCallbackInfoWithRelativePath } from './types';
import { isObject } from '@microsoft-logic-apps/utils';

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

export function isRunError(value: any): value is RunError {
  return isObject(value) && isObject(value.error) && typeof value.error.code === 'string' && typeof value.error.message === 'string';
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
