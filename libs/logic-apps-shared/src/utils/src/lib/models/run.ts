export interface Run {
  id: string;
  name: string;
  properties: RunProperties;
  kind?: string;
  location?: string;
  tags?: Record<string, string>;
  type: string;
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

export interface ContentHash {
  algorithm: string;
  value: string;
}

export interface ContentLink {
  contentHash: ContentHash;
  contentSize: number;
  contentVersion: string;
  metadata?: Record<string, unknown>;
  secureData?: SecureData;
  uri?: string;
}

export interface SecureData {
  properties: string[];
}

export type BoundParameters = Record<string, BoundParameter<any>>;

export interface BoundParameter<T> {
  displayName: string;
  dynamicValue?: string;
  format?: string;
  language?: string;
  value: T;
  visibility?: string;
}

export type BindFunction<T> = (values: any, parameter: T) => BoundParameter<any> | undefined;

export type ReduceFunction<T, U> = (previous: T, current: U) => T;

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
