/**
 * https://schema.management.azure.com/providers/Microsoft.Logic/schemas/2016-04-01-preview/workflowdefinition.json#
 * https://schema.management.azure.com/providers/Microsoft.Logic/schemas/2016-06-01/workflowdefinition.json#
 */
import type * as LogicApps from './logicApps';
import type * as Expression from './logicAppsV2Expression';
import type * as Integration from './logicAppsV2Integration';
import type * as Swagger from './swagger';

/* Action types */
export interface Action extends Operation {
  runAfter?: RunAfter;
  trackedProperties?: any;
}

export type ActionDefinition =
  | ApiConnectionAction
  | ApiConnectionWebhookAction
  | ApiManagementAction
  | AppendToArrayVariableAction
  | AppendToStringVariableAction
  | ChildWorkflow
  | ComposeAction
  | DecrementVariableAction
  | Expression.ExpressionAction
  | ForEachAction
  | FunctionAction
  | HttpAction
  | HttpWebhookAction
  | IfAction
  | IncrementVariableAction
  | InitializeVariableAction
  | JoinAction
  | OpenApiOperationAction
  | ParseJsonAction
  | QueryAction
  | ScopeAction
  | SelectAction
  | SendToBatchAction
  | SwitchAction
  | TableAction
  | UntilAction
  | WaitAction
  | Integration.FlatFileDecodingAction
  | Integration.FlatFileEncodingAction
  | Integration.IntegrationAccountArtifactLookupAction
  | Integration.LiquidAction
  | Integration.XmlValidationAction
  | Integration.XsltAction;

export type OperationDefinition = ActionDefinition | TriggerDefinition;

export type Actions = Record<string, ActionDefinition>;

/* Service provider Actions and Triggers */

export interface ServiceProvider {
  inputs: ServiceProviderConfiguration;
}

export interface ServiceProviderConfiguration {
  serviceProviderConfiguration: {
    connectionName: string;
  };
}

/* API Connection actions and triggers */

export interface ApiConnectionAction extends TimeoutableAction {
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

export interface OpenApiOperationAction extends TimeoutableAction {
  inputs: OpenApiOperationInputs;
}

export interface OpenApiConnectionTrigger extends RecurrenceTrigger {
  inputs: OpenApiOperationInputs;
}

export interface OpenApiConnectionWebhookTrigger extends Trigger {
  inputs: OpenApiOperationInputs;
}

export interface OpenApiOperationInputs extends RetryableActionInputs {
  host: OpenApiConnectionHost;
  parameters?: any;
}

export interface HybridTriggerOperation extends Trigger {
  inputs: HybridTriggerConnectionInfo;
}

export interface HybridTriggerConnectionInfo {
  host: HybridTriggerConnectionHost;
  schema?: any;
  operationId: string;
  parameters: any;
}

export type OpenApiConnectionNotificationTrigger = OpenApiConnectionWebhookTrigger;

export type ApiConnectionHeaders = string | Record<string, string>;

export type ApiConnectionHost = string | ApiConnectionHostType;

export interface OpenApiConnectionHost {
  apiId: string;
  operationId: string;
  connection: ApiConnectionHostConnection;
}

export interface HybridTriggerConnectionHost {
  connection: HybridTriggerConnectionHostType;
}

export interface HybridTriggerConnectionHostType {
  name: string;
}

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
  referenceName: string;
}

export type ApiConnectionQueries = string | Record<string, any>;

/* API Connection Webhook actions and triggers */

export interface ApiConnectionWebhookAction extends TimeoutableAction {
  inputs: ApiConnectionWebhookInputs;
}

export interface ApiConnectionWebhookTrigger extends Trigger {
  inputs: ApiConnectionWebhookInputs;
}

export interface ApiConnectionWebhookInputs extends ApiConnectionInputs {
  schema?: any;
}

/* Api Management action and trigger */

export interface ApiConnectionNotificationInputs extends RetryableActionInputs {
  host: ApiConnectionHost;
  subscribe: {
    pathTempate: PathTemplate;
    body?: any;
    headers?: ApiConnectionHeaders;
    queries?: ApiConnectionQueries;
  };
  fetch: {
    pathTempate: PathTemplate;
    body?: any;
    headers?: ApiConnectionHeaders;
    queries?: ApiConnectionQueries;
  };
}

export interface ApiConnectionNotificationTrigger extends Trigger {
  inputs: ApiConnectionNotificationInputs;
}

export interface ApiManagementAction extends TimeoutableAction {
  inputs: ApiManagementInputs;
}

export interface ApiManagementTrigger extends RecurrenceTrigger {
  inputs: ApiManagementInputs;
}

export interface ApiManagementInputs extends RetryableActionInputs {
  api: ApiManagementId;
  body?: any;
  headers?: ApiManagementHeaders;
  method?: string;
  pathTemplate: PathTemplate;
  queries?: ApiManagementQueries;
  subscriptionKey?: string;
}

export type ApiManagementHeaders = string | Record<string, string>;
export type ApiManagementQueries = string | Record<string, any>;

export interface PathTemplate {
  template: string;
  parameters: Record<string, any>;
}

export interface ApiManagementId {
  id: string;
  name?: string;
  type?: string;
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

/* Batch trigger types */

export interface BatchTrigger extends Trigger {
  inputs: BatchTriggerInputs;
}

export interface BatchReleaseCriteria {
  messageCount?: number;
  batchSize?: number;
  recurrence?: LogicApps.Recurrence;
}

export interface BatchConfiguration {
  releaseCriteria: BatchReleaseCriteria;
}

export interface BatchTriggerInputs {
  mode: string;
  batchGroupName?: string;
  configurations?: Record<string, BatchConfiguration>;
}

/* Send to batch action */
export interface SendToBatchAction extends Action {
  inputs: SendToBatchActionInputs;
}

export interface SendToBatchActionInputs extends RetryableActionInputs {
  batchName: string;
  content: any;
  host: ChildWorkflowHost;
  partitionName?: string;
  messageId?: string;
}

/* Child (nested) Workflow actions */

export interface ChildWorkflow extends TimeoutableAction {
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

export interface AppendToArrayVariableAction extends Action {
  inputs: AppendToArrayVariableInputs;
}

export interface AppendToArrayVariableInputs extends RetryableActionInputs {
  name: string;
  value: any;
}

export interface AppendToStringVariableAction extends Action {
  inputs: AppendToStringVariableInputs;
}

export interface AppendToStringVariableInputs extends RetryableActionInputs {
  name: string;
  value: any;
}

export interface DecrementVariableAction extends Action {
  inputs: DecrementVariableInputs;
}

export interface DecrementVariableInputs extends RetryableActionInputs {
  name: string;
  value?: any;
}

/* HTTP action and trigger types */

export interface HttpAction extends TimeoutableAction {
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

export interface HttpWebhookAction extends TimeoutableAction {
  inputs: HttpWebhookInputs;
}

export interface HttpWebhookTrigger extends Trigger {
  inputs: HttpWebhookInputs;
}

export interface HttpWebhookInputs extends ManualActionInputs, RetryableActionInputs {
  subscribe: HttpInputs;
  unsubscribe: HttpInputsOptional;
}

/* Manual action input types */

export interface ManualActionInputs {
  schema?: any;
}

/* Manual trigger types */

export interface ManualTrigger extends Trigger {
  kind: string;
  inputs?: ManualTriggerInputs;
}

export interface ManualTriggerInputs {
  host?: ApiConnectionHost;
  method?: string;
  operationId?: string;
  parameters?: Record<string, any>;
  path?: string;
  relativePath?: string;
  schema?: Swagger.Schema;
  headersSchema?: Record<string, Swagger.Schema>;
}

/* Geofence trigger types */

export interface GeofenceTrigger extends Trigger {
  inputs?: GeofenceTriggerInputs;
}

export interface GeofenceTriggerInputs {
  parameters?: {
    serializedGeofence?: {
      type: string;
      centerLatitude: number;
      centerLongitude: number;
      radius: number;
    };
  };
}

/* Function types */

export interface FunctionAction extends TimeoutableAction {
  inputs: FunctionInputs;
}

export type FunctionInputs = LogicApps.FunctionInputs;

/* IncrementVariable type */

export interface IncrementVariableAction extends Action {
  inputs: IncrementVariableInputs;
}

export interface IncrementVariableInputs extends RetryableActionInputs {
  name: string;
  value?: any;
}

/* InitializeVariable type */

export interface InitializeVariableAction extends Action {
  inputs: InitializeVariableInputs;
}

export interface InitializeVariableInputs extends RetryableActionInputs {
  variables: VariableInitialization[];
}

export interface VariableInitialization {
  name: string;
  type: string;
  value?: any;
}

export type RetryableOperationDefinition =
  | ApiConnectionAction
  | ApiConnectionTrigger
  | ApiConnectionWebhookAction
  | ApiConnectionWebhookTrigger
  | ApiManagementAction
  | ApiManagementTrigger
  | ChildWorkflow
  | FunctionAction
  | HttpAction
  | HttpTrigger
  | HttpWebhookAction
  | HttpWebhookTrigger;

/* SetVariable type */

export interface SetVariableAction extends Action {
  inputs: SetVariableInputs;
}

export interface SetVariableInputs extends RetryableActionInputs {
  name: string;
  value?: any;
}

/* Join type */

export interface JoinAction extends Action {
  inputs: JoinActionInputs;
}

export interface JoinActionInputs {
  from: any[] | string;
  joinWith: string;
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

/* Query type */

export interface QueryAction extends Action {
  inputs: QueryInputs;
}

export interface QueryInputs {
  from: string;
  where: string;
}

export interface RuntimeConfiguration {
  paginationPolicy?: PaginationPolicy;
  secureData?: SecureData;
}

export interface PaginationPolicy {
  minimumItemCount?: number;
}

export interface SecureData {
  properties: string[];
}

export interface TimeoutableAction extends Action {
  limit?: Limit;
}

export type TimeoutableActionDefinition =
  | ApiConnectionAction
  | ApiConnectionWebhookAction
  | ApiManagementAction
  | ChildWorkflow
  | FunctionAction
  | HttpAction
  | HttpWebhookAction
  | UntilAction;

/* Terminate type */

export interface TerminateAction extends Action {
  inputs: TerminateInputs;
}

export interface TerminateInputs extends RetryableActionInputs {
  runStatus: string;
  runError?: {
    code: string;
    message: string;
  };
}

/* Recurrence trigger types */

export type Recurrence = LogicApps.Recurrence;
export type RecurrenceSchedule = LogicApps.RecurrenceSchedule;
export type RecurrenceScheduleOccurrence = LogicApps.RecurrenceScheduleOccurrence;

export interface RecurrenceTrigger extends Trigger {
  recurrence?: Recurrence;
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

export interface RetryPolicy {
  count?: number;
  interval?: string /* TimeSpan, e.g., 1.02:03:04 */;
  type?: string; // None, Exponential or Fixed
  minimumInterval?: string;
  maximumInterval?: string;
}

export interface RetryableActionInputs {
  authentication?: Authentication;
  operationOptions?: any;
  retryPolicy?: RetryPolicy;
}

/* Run after object specifying an action's dependencies */

export interface RunAfter {
  [actionName: string]: string[];
}

/* Select action types */

export interface SelectAction extends Action {
  inputs: SelectActionInputs;
}

export interface SelectActionInputs {
  from: any[] | string;
  select: Record<string, any> | string;
}

export interface Correlation {
  clientTrackingId?: string;
}

export interface SplitOnConfiguration {
  correlation?: Correlation;
}

/* SlidingWindow types */

export interface SlidingWindowTrigger extends RecurrenceTrigger {
  inputs?: SlidingWindowInputs;
}

export interface SlidingWindowInputs {
  delay?: string;
}

/* Trigger types */

export interface Trigger extends Operation {
  conditions?: Condition[];
  splitOn?: string;
  correlation?: Correlation;
  splitOnConfiguration?: SplitOnConfiguration;
}

export interface Operation {
  type: string;
  kind?: string;
  description?: string;
  metadata?: any;
  operationOptions?: string;
  runtimeConfiguration?: any;
}

export type TriggerDefinition =
  | ApiConnectionTrigger
  | ApiConnectionWebhookTrigger
  | ApiManagementTrigger
  | ApiConnectionNotificationTrigger
  | BatchTrigger
  | HttpTrigger
  | HttpWebhookTrigger
  | ManualTrigger
  | OpenApiConnectionTrigger
  | OpenApiConnectionWebhookTrigger
  | OpenApiConnectionNotificationTrigger
  | RecurrenceTrigger
  | SlidingWindowTrigger;

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
  count?: number;
  unit?: string;
}

export interface WaitUntil {
  timestamp: string;
}

export interface StaticResults {
  [staticResult: string]: any;
}

/* Workflow definition types */

export interface WorkflowDefinition {
  $schema: string;
  description?: string;
  contentVersion: string;
  metadata?: any;
  parameters?: Parameters;
  triggers?: Triggers;
  actions?: Actions;
  outputs?: Outputs;
  staticResults?: Record<string, any>;
}

/* Scope type */

export interface ScopeAction extends Action {
  actions?: Actions;
}

/* Foreach scope type */

export interface ForEachAction extends ScopeAction {
  foreach: string | any[];
}

/* Until scope types */

export interface UntilAction extends ScopeAction {
  expression: string;
  limit: Limit;
}

export interface Limit {
  count?: string | number;
  timeout?: string;
}

/* If scope types */

export interface IfAction extends ScopeAction {
  // Note: When did Record<string, any> become a valid value for an If scope's expression?
  expression: string | Record<string, any>;
  else?: ActionsNode;
}

export interface ActionsNode {
  actions?: Actions;
}

/* Parse JSON action types */

export interface ParseJsonAction extends Action {
  inputs: ParseJsonActionInputs;
}

export interface ParseJsonActionInputs {
  content: any;
  schema: any;
}

/* Switch scope types */

export interface SwitchCase {
  actions?: Actions;
  case?: string | number;
}

export interface SwitchAction extends Action {
  cases?: Record<string, SwitchCase>;
  default?: SwitchCase;
  expression: string;
}

/* Table action types */

export interface TableAction extends Action {
  inputs: TableActionInputs;
}

export interface TableActionColumn {
  header?: string;
  value: any;
}

export interface TableActionInputs {
  columns?: TableActionColumn[];
  format: string;
  from: string | any[];
}

/* Expression trace types */

/**
 * @interface TraceExpression
 * @extends TraceSubexpression
 * An expression trace record with one or more expression records, each of which may contain subexpression records.
 */
export interface TraceExpression extends TraceSubexpression {
  /**
   * @member {string} path - A string with the property path used to identify which input parameter is associated
   * with the trace.
   */
  path: string;
}

/**
 * @interface TraceExpressionRecord
 * An expression trace record generated for If and Switch scopes for their expression results.
 */
export interface TraceExpressionRecord {
  /**
   * @member {TraceExpression[]} expression - An array of expression records with traces for the expression evaluated
   * for the "expressionResult" value.
   */
  expression: TraceExpression[];
}

/**
 * @interface TraceInputsRecord
 * An expression trace record generated for all other actions with expression results for their inputs.
 */
export interface TraceInputsRecord {
  /**
   * @member {TraceExpression[]} inputs - An array of expression records with traces for each input with evaluated
   * expressions.
   */
  inputs: TraceExpression[];
}

/**
 * @type TraceRecord
 * A trace record returned by the listExpressionTraces API.
 */
export type TraceRecord = TraceExpressionRecord | TraceInputsRecord;

/**
 * @interface TraceSubexpression
 * A subexpression record.  Expressions may contain 0 or more subexpressions, each of which may contain 0 or more
 * subexpressions.
 */
export interface TraceSubexpression {
  /**
   * @member {TraceSubexpression[]} [subexpressions=[]] - An optional array of subexpression records, one for each
   * subexpression within this subexpression. If the property is missing, consider this to be an empty array ([]).
   */
  subexpressions?: TraceSubexpression[];

  /**
   * @member {string} text - A string with the text of the subexpression, e.g., triggerBody()
   */
  text: string;

  /**
   * @member {any} value - A JSON value with the value of the subexpression
   */
  value: any;
}

export interface RetryHistory {
  startTime: string;
  endTime: string;
  code?: string;
  clientRequestId?: string;
  serviceRequestId?: string;
  error?: RetryHistoryError;
}

export interface RetryHistoryError {
  error?: ErrorShape;
}

export interface ErrorShape {
  code: string;
  message: string;
}

/* Run action definition types */
export interface WorkflowRunAction {
  inputsLink: {
    uri?: string;
    secureData?: Record<string, any>;
    metadata?: Record<string, any>;
    contentSize: number;
  };
  outputsLink: {
    uri?: string;
    secureData?: Record<string, any>;
    contentSize: number;
  };
  retryHistory: RetryHistory[];
  startTime: string;
  endTime: string;
  correlation: {
    actionTrackingId: string;
    clientTrackingId: string;
  };
  status: string;
  code: string;
  error: {
    code: string;
    message: string;
  };
  repetitionCount?: number;
  iterationCount?: number;
  repetitionIndexes?: Array<Record<string, any>>;
  duration?: string;
}

export interface WorkflowRunTrigger extends WorkflowRunAction {
  name: string;
}

export interface WorkflowRunProperties {
  createdTime: string;
  changedTime: string;
  version: string;
  definition: WorkflowDefinition;
  parameters: Record<string, any>;
  endpointsConfiguration: Record<string, any>;
  runtimeConfiguration: Record<string, any>;
}

export interface runInstanceProperties {
  waitEndTime: string;
  startTime: string;
  endTime: string;
  status: string;
  correlation: {
    clientTrackingId: string;
  };
  actions: Record<string, WorkflowRunAction>;
  trigger: WorkflowRunTrigger;
  workflow: {
    properties: WorkflowRunProperties;
    id: string;
    name: string;
    type: string;
  };
}

export interface RunRepetition {
  properties: WorkflowRunAction;
  id: string;
  name: string;
  type: string;
}

/* Run instance definition types */
export interface RunInstanceDefinition {
  properties: runInstanceProperties;
  id: string;
  name: string;
  type: string;
}
