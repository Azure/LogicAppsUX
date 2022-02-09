import { isObject } from '@microsoft-logic-apps/utils';
import type { CallbackInfo, RunError } from './types';

export function getCallbackUrl(callbackInfo: CallbackInfo | undefined): string | undefined {
  if (!callbackInfo) {
    return undefined;
  }

  const { relativePath } = callbackInfo;
  if (relativePath === undefined) {
    return callbackInfo.value;
  }

  const { basePath, queries } = callbackInfo;
  const queryString = queries
    ? Object.entries(queries)
        .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
        .join('&')
    : undefined;

  return basePath + (relativePath.startsWith('/') ? relativePath : `/${relativePath}`) + (queryString ? `?${queryString}` : '');
}

export function isRunError(value: any): value is RunError {
  return isObject(value) && isObject(value.error) && typeof value.error.code === 'string' && typeof value.error.message === 'string';
}
