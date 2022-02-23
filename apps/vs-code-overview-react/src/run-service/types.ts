export interface IRunService {
  getContent(contentLink: ContentLink): Promise<any>;
  getMoreRuns(continuationToken: string): Promise<Runs>;
  getRun(runId: string): Promise<Run | RunError>;
  getRuns(workflowId: string): Promise<Runs>;
  runTrigger(callbackInfo: CallbackInfo): Promise<any>;
}

export interface ArmResources<T> {
  nextLink?: string;
  value: T[];
}

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

export interface ContentLink {
  contentHash?: ContentHash;
  contentSize: number;
  contentVersion?: string;
  metadata?: Record<string, unknown>;
  secureData?: {
    properties: string[];
  };
  uri?: string;
}

export type Run = ArmResource<RunProperties>;

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

export interface Runs {
  nextLink?: string;
  runs: Run[];
}

interface ArmResource<TProperties> {
  id: string;
  kind?: string;
  location?: string;
  name: string;
  properties: TProperties;
  tags?: Record<string, string>;
  type: string;
}

interface ContentHash {
  algorithm: string;
  value: string;
}

interface Correlation {
  clientTrackingId: string;
}

interface ExtendedErrorInfo {
  code: string;
  details?: ExtendedErrorInfo[];
  innerError?: unknown;
  message: string;
}

interface Retry {
  clientRequestId: string;
  code: string;
  endTime?: string;
  error?: any;
  serviceRequestId?: string;
  startTime: string;
}

interface RunActionProperties {
  code: string;
  correlation?: {
    actionTrackingId: string;
    correlationId: string;
  };
  endTime?: string;
  error?: ExtendedErrorInfo;
  inputsLink: ContentLink;
  iterationCount?: number;
  outputsLink?: ContentLink;
  repetitionCount?: number;
  retryHistory?: Retry[];
  startTime: string;
  status: string;
}

interface RunProperties {
  actions?: Record<string, RunActionProperties>;
  code?: string;
  correlation?: Correlation;
  endTime?: string;
  error?: RunError;
  outputs: Record<string, any>;
  startTime: string;
  status: string;
  trigger: RunTriggerHistoryProperties;
  waitEndTime?: string;
  workflow: {
    id: string;
    name: string;
    type: string;
  };
}

interface RunTriggerHistoryProperties {
  code?: string;
  correlation?: Correlation;
  endTime?: string;
  error?: ExtendedErrorInfo;
  inputsLink?: ContentLink;
  name: string;
  originHistoryName?: string;
  outputsLink?: ContentLink;
  startTime: string;
  status: string;
}
