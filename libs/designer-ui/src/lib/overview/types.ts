import { isObject } from '@microsoft-logic-apps/utils';

export type CallbackInfo = CallbackInfoWithRelativePath | CallbackInfoWithValue;

export interface CallbackInfoWithRelativePath {
  basePath?: string;
  method: string;
  relativeParameters?: unknown[];
  relativePath: string;
  queries?: Record<string, string>;
}

export interface CallbackInfoWithValue {
  value: string;
}

export interface Run {
  id: string;
  name: string;
  properties: RunProperties;
  kind?: string;
  location?: string;
  tags?: string;
  type: string;
}

export interface RunDisplayItem {
  duration: string;
  id: string;
  identifier: string;
  startTime: string;
  status: string;
}

export interface RunError {
  error: {
    code: string;
    message: string;
  };
}

export interface RunProperties {
  actions?: Record<string, unknown>;
  code?: string;
  correlation?: unknown;
  correlationId?: string;
  endTime?: string;
  error?: RunError;
  outputs: Record<string, unknown>;
  startTime: string;
  status: string;
  trigger: unknown;
  workflow: unknown;
}

export interface Runs {
  nextLink?: string;
  runs: Run[];
}

export function isCallbackInfoWithRelativePath(value: any): value is CallbackInfoWithRelativePath {
  return isObject(value) && typeof value.relativePath === 'string';
}
