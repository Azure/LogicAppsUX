/**
 * https://schema.management.azure.com/providers/Microsoft.Logic/schemas/2015-08-01-preview/workflowdefinition.json#
 */
import type * as Integration from './logicAppsIntegration';

/* Action types */

export interface Action {
  type: string;
  kind?: string;
  description?: string;
  conditions?: Condition[];
  foreach?: string; // BUG foreach can be any[], like repeat
  metadata?: any;
}

export type ActionDefinition =
  | ApiConnectionAction
  | ApiConnectionWebhookAction
  | ChildWorkflow
  | ComposeAction
  | FunctionAction
  | HttpAction
  | HttpWebhookAction
  | WaitAction
  | Integration.FlatFileDecodingAction
  | Integration.FlatFileEncodingAction
  | Integration.IntegrationAccountArtifactLookupAction
  | Integration.XmlValidationAction
  | Integration.XsltAction;

export type OperationDefinition = ActionDefinition | TriggerDefinition;

export interface Actions {
  [action: string]: ActionDefinition;
}

/* API Connection actions and triggers */
export interface ApiConnectionAction extends Action {
  inputs: ApiConnectionInputs;
}

export interface ApiConnectionTrigger extends RecurrenceTrigger {
  inputs: ApiConnectionInputs;
}

export interface ApiConnectionInputs extends RetryableActionInputs {
  host: ApiConnectionHost;
  path: string;
  body?: any;
  headers?: ApiConnectionHeaders;
  method?: string;
  queries?: ApiConnectionQueries;
}

export type ApiConnectionHeaders = string | Record<string, string>;

export type ApiConnectionHost = string | ApiConnectionHostType;

export interface ApiConnectionHostType {
  api: ApiConnectionHostApi;
  connection: ApiConnectionHostConnection;
}

export type ApiConnectionHostApi = string | ApiConnectionHostApiType;

export interface ApiConnectionHostApiType {
  runtimeUrl?: string;
}

export type ApiConnectionHostConnection = string | ApiConnectionHostConnectionType;

export interface ApiConnectionHostConnectionType {
  name: string;
}

export type ApiConnectionQueries = string | Record<string, any>;

/* API Connection Webhook actions and triggers */

export interface ApiConnectionWebhookAction extends Action {
  inputs: ApiConnectionWebhookInputs;
}

export interface ApiConnectionWebhookTrigger extends Trigger {
  inputs: ApiConnectionWebhookInputs;
}

export interface ApiConnectionWebhookInputs extends ApiConnectionInputs {
  schema?: any;
}

/* Authentication types */

export interface ActiveDirectoryOAuthAuthentication {
  type: string;
  tenant: string;
  audience: string;
  clientId: string;
  secret: string;
}

export type Authentication = string | ActiveDirectoryOAuthAuthentication | BasicAuthentication | ClientCertificateAuthentication;

export interface BasicAuthentication {
  type: string;
  username: string;
  password: string;
}

export interface ClientCertificateAuthentication {
  type: string;
  pfx: string;
  password: string;
}

/* Child (nested) Workflow actions */

export interface ChildWorkflow extends Action {
  inputs: ChildWorkflowInputs;
}

export interface ChildWorkflowInputs extends RetryableActionInputs {
  body?: any;
  headers?: ChildWorkflowHeaders;
  host: ChildWorkflowHost;
}

export type ChildWorkflowHeaders = string | Record<string, string>;

export interface ChildWorkflowHost {
  triggerName: string;
  workflow: ChildWorkflowHostWorkflow;
}

export interface ChildWorkflowHostWorkflow {
  id: string;
  name?: string;
  type?: string;
}

/* Compose action type */

export interface ComposeAction extends Action {
  inputs: any;
}

/* Condition types */

export interface Condition {
  dependsOn?: string;
  expression?: string;
}

/* HTTP action and trigger types */

export interface HttpAction extends Action {
  inputs: HttpInputs;
  metadata?: Record<string, string>;
}

export interface HttpTrigger extends RecurrenceTrigger {
  inputs: HttpInputs;
  metadata?: Record<string, string>;
}

export type HttpHeaders = string | HttpHeadersType;

export interface HttpHeadersType {
  [header: string]: string;
}

export interface HttpInputs extends RetryableActionInputs {
  body?: any;
  cookie?: string;
  headers?: HttpHeaders;
  method: string;
  queries?: HttpQueries;
  uri: string;
}

export interface HttpInputsOptional extends RetryableActionInputs {
  body?: any;
  cookie?: string;
  headers?: HttpHeaders;
  method?: string;
  queries?: HttpQueries;
  uri?: string;
}

export type HttpQueries = string | HttpQueriesType;

export interface HttpQueriesType {
  [query: string]: string;
}

/* HTTP webhook action and trigger types */

export interface HttpWebhookAction extends Action {
  inputs: HttpWebhookInputs;
}

export interface HttpWebhookTrigger extends Trigger {
  inputs: HttpWebhookInputs;
}

export interface HttpWebhookInputs extends ManualActionInputs {
  subscribe: HttpInputs;
  unsubscribe: HttpInputsOptional;
}

/* Manual action input types */

export interface ManualActionInputs {
  schema?: any;
}

/* Manual trigger types */

export interface ManualTrigger extends Trigger {
  inputs?: ManualTriggerInputs;
}

export interface ManualTriggerInputs {
  method?: string;
  relativePath?: string;
  schema?: any;
}

/* Function types */

export interface FunctionAction extends Action {
  inputs: FunctionInputs;
}

export interface FunctionInputs extends RetryableActionInputs {
  body?: any;
  function: {
    id: string;
    name?: string;
    connectionName: string;
    type?: string;
  };
  functionApp?: {
    id: string;
    name?: string;
  };
  headers?: HttpHeaders;
  method?: string;
  queries?: HttpQueries;
  uri?: string;
}

/* Output types */

export interface Outputs {
  [output: string]: OutputValue;
}

export interface OutputValue {
  type: string;
  value: any;
  description?: string;
}

/* Parameter types */

export interface Parameter {
  type: string;
  description?: string;
  defaultValue?: any;
  allowedValues?: any[];
  metadata?: Metadata;
}

export interface Parameters {
  [parameter: string]: Parameter;
}

export interface Metadata {
  [metadata: string]: ParameterMetadata;
}

export interface ParameterMetadata {
  name: string;
  value: any;
}

/* Recurrence trigger types */

export interface LARecurrence {
  count?: number;
  endTime?: string;
  frequency: string;
  interval: number | string; // Note: String to support expressions/ARM template.
  schedule?: RecurrenceSchedule;
  startTime?: string;
  timeZone?: string;
}

export interface RecurrenceSchedule {
  hours?: number[];
  minutes?: number[];
  monthDays?: number[];
  monthlyOccurrences?: RecurrenceScheduleOccurrence[];
  weekDays?: string[];
}

export interface RecurrenceScheduleOccurrence {
  dayOfWeek: string;
  occurrence: number;
}

export interface RecurrenceTrigger extends Trigger {
  recurrence?: LARecurrence;
}

/* Response action types */

export interface ResponseAction extends Action {
  inputs: ResponseInputs;
}

export interface ResponseInputs {
  statusCode: string;
  body?: any;
  headers?: HttpHeaders;
  schema?: any;
}

/* Retryable action inputs types (authentication, operation options, retry policy) */

export type RetryPolicy = string | RetryPolicyType;

export interface RetryPolicyType {
  count?: number;
  interval?: string /* TimeSpan, e.g., 1.02:03:04 */;
  type?: string;
  minimumInterval?: string;
  maximumInterval?: string;
}

export interface RetryableActionInputs {
  authentication?: Authentication;
  operationOptions?: any;
  retryPolicy?: RetryPolicy;
}

/* Trigger types */

export interface Trigger {
  type: string;
  kind?: string;
  description?: string;
  conditions?: Condition[];
  metadata?: any;
  splitOn?: string;
}

export type TriggerDefinition =
  | ApiConnectionTrigger
  | ApiConnectionWebhookTrigger
  | HttpTrigger
  | HttpWebhookTrigger
  | ManualTrigger
  | RecurrenceTrigger;

export interface Triggers {
  [trigger: string]: TriggerDefinition;
}

/* Wait action types */

export interface WaitAction extends Action {
  inputs: WaitInputs;
}

export interface WaitInputs {
  interval?: WaitInterval;
  until?: WaitUntil;
}

export interface WaitInterval {
  count?: number | string;
  unit?: string;
}

export interface WaitUntil {
  timestamp: string;
}

/* Workflow definition types */

export interface WorkflowDefinition {
  $schema?: string;
  description?: string;
  contentVersion?: string;
  metadata?: any;
  parameters?: Parameters;
  triggers?: Triggers;
  actions?: Actions;
  outputs?: Outputs;
}
