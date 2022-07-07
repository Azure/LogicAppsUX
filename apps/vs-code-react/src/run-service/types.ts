export interface IRunService {
  getContent(contentLink: ContentLink): Promise<any>;
  getMoreRuns(continuationToken: string): Promise<Runs>;
  getRun(runId: string): Promise<Run | RunError>;
  getRuns(workflowId: string): Promise<Runs>;
  runTrigger(callbackInfo: CallbackInfo): Promise<any>;
}

export interface IApiService {
  getWorkflows(subscriptionId: string, iseId: string): Promise<any>;
  getSubscriptions(): Promise<any>;
  getIse(selectedSubscription: string): Promise<any>;
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

export enum ProjectName {
  export = 'export',
  overview = 'overview',
}

export interface WorkflowProperties {
  id: string;
  name: string;
  type: string;
  location: string;
  tags: Record<string, string>;
  properties: Record<string, any>;
}

export interface Workflows {
  value: Array<WorkflowProperties>;
}

export interface WorkflowsList {
  key: string;
  name: string;
  resourceGroup: string;
}

export interface OutletContext {
  accessToken: string;
  baseUrl: string;
  selectedWorkflows: Array<WorkflowsList>;
}

export enum QueryKeys {
  workflowsData = 'workflowsData',
  subscriptionData = 'subscriptionData',
  runsData = 'runsData',
  iseData = 'iseData',
}

export interface ISubscription {
  id: string;
  subscriptionId: string;
  subscriptionName: string;
}

export type ExportData = {
  selectedWorkflows: Array<any>;
  selectedSubscription: string;
  selectedIse: string;
};

export enum ResourceType {
  workflows = 'workflows',
  subscriptions = 'subscriptions',
  ise = 'ise',
}

export interface IIse {
  id: string;
  subscriptionId: string;
  iseName: string;
  location: string;
  resourceGroup: string;
}

export interface IDropDownOption {
  key: string;
  text: string;
}

export enum RouteName {
  export = 'export',
  instance_selection = 'instance-selection',
  workflows_selection = 'workflows-selection',
  overview = 'overview',
}
