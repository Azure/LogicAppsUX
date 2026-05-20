import type { ICallbackUrlResponse } from '@microsoft/vscode-extension-logic-apps';

export function shouldUpdateOverviewCallbackInfo(
  current: ICallbackUrlResponse | undefined,
  updated: ICallbackUrlResponse | undefined
): updated is ICallbackUrlResponse {
  if (!updated) {
    return false;
  }

  return (
    updated.value !== current?.value ||
    updated.method !== current?.method ||
    updated.basePath !== current?.basePath ||
    updated.relativePath !== current?.relativePath ||
    !areQueriesEqual(updated.queries, current?.queries)
  );
}

export function areQueriesEqual(a: Record<string, any> | undefined, b: Record<string, any> | undefined): boolean {
  const left = a ?? {};
  const right = b ?? {};
  const leftKeys = Object.keys(left);
  const rightKeys = Object.keys(right);

  if (leftKeys.length !== rightKeys.length) {
    return false;
  }

  for (const key of leftKeys) {
    if (!Object.prototype.hasOwnProperty.call(right, key) || left[key] !== right[key]) {
      return false;
    }
  }

  return true;
}
