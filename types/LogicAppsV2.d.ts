/**
 * https://schema.management.azure.com/providers/Microsoft.Logic/schemas/2016-04-01-preview/workflowdefinition.json#
 * https://schema.management.azure.com/providers/Microsoft.Logic/schemas/2016-06-01/workflowdefinition.json#
 */
declare namespace LogicAppsV2 {
  /* Action types */
  interface Action extends Operation {
    runAfter?: RunAfter;
    trackedProperties?: any;
  }

  type ActionDefinition =
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

  type OperationDefinition = ActionDefinition | TriggerDefinition;

  type Actions = Record<string, ActionDefinition>;

  /* Service provider Actions and Triggers */

  interface ServiceProvider {
    inputs: ServiceProviderConfiguration;
  }

  interface ServiceProviderConfiguration {
    serviceProviderConfiguration: {
      connectionName: string;
    };
  }

  /* API Connection actions and triggers */

  interface ApiConnectionAction extends TimeoutableAction {
    inputs: ApiConnectionInputs;
  }

  interface ApiConnectionTrigger extends RecurrenceTrigger {
    inputs: ApiConnectionInputs;
  }

  interface ApiConnectionInputs extends RetryableActionInputs {
    host: ApiConnectionHost;
    path: string;
    body?: any;
    headers?: ApiConnectionHeaders;
    method?: string;
    queries?: ApiConnectionQueries;
  }

  interface OpenApiOperationAction extends TimeoutableAction {
    inputs: OpenApiOperationInputs;
  }

  interface OpenApiConnectionTrigger extends RecurrenceTrigger {
    inputs: OpenApiOperationInputs;
  }

  interface OpenApiConnectionWebhookTrigger extends Trigger {
    inputs: OpenApiOperationInputs;
  }

  interface OpenApiOperationInputs extends RetryableActionInputs {
    host: OpenApiConnectionHost;
    parameters?: any;
  }

  type OpenApiConnectionNotificationTrigger = OpenApiConnectionWebhookTrigger;

  type ApiConnectionHeaders = string | Record<string, string>;

  type ApiConnectionHost = string | ApiConnectionHostType;

  interface OpenApiConnectionHost {
    apiId: string;
    operationId: string;
    connection: ApiConnectionHostConnection;
  }

  interface ApiConnectionHostType {
    api: ApiConnectionHostApi;
    connection: ApiConnectionHostConnection;
  }

  type ApiConnectionHostApi = string | ApiConnectionHostApiType;

  interface ApiConnectionHostApiType {
    runtimeUrl?: string;
  }

  type ApiConnectionHostConnection = string | ApiConnectionHostConnectionType;

  interface ApiConnectionHostConnectionType {
    referenceName: string;
  }

  type ApiConnectionQueries = string | Record<string, any>;

  /* API Connection Webhook actions and triggers */

  interface ApiConnectionWebhookAction extends TimeoutableAction {
    inputs: ApiConnectionWebhookInputs;
  }

  interface ApiConnectionWebhookTrigger extends Trigger {
    inputs: ApiConnectionWebhookInputs;
  }

  interface ApiConnectionWebhookInputs extends ApiConnectionInputs {
    schema?: any;
  }

  /* Api Management action and trigger */

  interface ApiConnectionNotificationInputs extends RetryableActionInputs {
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

  interface ApiConnectionNotificationTrigger extends Trigger {
    inputs: ApiConnectionNotificationInputs;
  }

  interface ApiManagementAction extends TimeoutableAction {
    inputs: ApiManagementInputs;
  }

  interface ApiManagementTrigger extends RecurrenceTrigger {
    inputs: ApiManagementInputs;
  }

  interface ApiManagementInputs extends RetryableActionInputs {
    api: ApiManagementId;
    body?: any;
    headers?: ApiManagementHeaders;
    method?: string;
    pathTemplate: PathTemplate;
    queries?: ApiManagementQueries;
    subscriptionKey?: string;
  }

  type ApiManagementHeaders = string | Record<string, string>;
  type ApiManagementQueries = string | Record<string, any>;

  interface PathTemplate {
    template: string;
    parameters: Record<string, any>;
  }

  interface ApiManagementId {
    id: string;
    name?: string;
    type?: string;
  }

  /* Authentication types */

  interface ActiveDirectoryOAuthAuthentication {
    type: string;
    tenant: string;
    audience: string;
    clientId: string;
    secret: string;
  }

  type Authentication = string | ActiveDirectoryOAuthAuthentication | BasicAuthentication | ClientCertificateAuthentication;

  interface BasicAuthentication {
    type: string;
    username: string;
    password: string;
  }

  interface ClientCertificateAuthentication {
    type: string;
    pfx: string;
    password: string;
  }

  /* Batch trigger types */

  interface BatchTrigger extends Trigger {
    inputs: BatchTriggerInputs;
  }

  interface BatchReleaseCriteria {
    messageCount?: number;
    batchSize?: number;
    recurrence?: LogicApps.Recurrence;
  }

  interface BatchConfiguration {
    releaseCriteria: BatchReleaseCriteria;
  }

  interface BatchTriggerInputs {
    mode: string;
    batchGroupName?: string;
    configurations?: Record<string, BatchConfiguration>;
  }

  /* Send to batch action */
  interface SendToBatchAction extends Action {
    inputs: SendToBatchActionInputs;
  }

  interface SendToBatchActionInputs extends RetryableActionInputs {
    batchName: string;
    content: any;
    host: ChildWorkflowHost;
    partitionName?: string;
    messageId?: string;
  }

  /* Child (nested) Workflow actions */

  interface ChildWorkflow extends TimeoutableAction {
    inputs: ChildWorkflowInputs;
  }

  interface ChildWorkflowInputs extends RetryableActionInputs {
    body?: any;
    headers?: ChildWorkflowHeaders;
    host: ChildWorkflowHost;
  }

  type ChildWorkflowHeaders = string | Record<string, string>;

  interface ChildWorkflowHost {
    triggerName: string;
    workflow: ChildWorkflowHostWorkflow;
  }

  interface ChildWorkflowHostWorkflow {
    id: string;
    name?: string;
    type?: string;
  }

  /* Compose action type */

  interface ComposeAction extends Action {
    inputs: any;
  }

  /* Condition types */

  interface Condition {
    dependsOn?: string;
    expression?: string;
  }

  interface AppendToArrayVariableAction extends Action {
    inputs: AppendToArrayVariableInputs;
  }

  interface AppendToArrayVariableInputs extends RetryableActionInputs {
    name: string;
    value: any;
  }

  interface AppendToStringVariableAction extends Action {
    inputs: AppendToStringVariableInputs;
  }

  interface AppendToStringVariableInputs extends RetryableActionInputs {
    name: string;
    value: any;
  }

  interface DecrementVariableAction extends Action {
    inputs: DecrementVariableInputs;
  }

  interface DecrementVariableInputs extends RetryableActionInputs {
    name: string;
    value?: any;
  }

  namespace Expression {
    interface ExpressionAction extends Action {
      kind: string;
      inputs: AddSubtractTimeInputs | ConvertTimeZoneInputs | OffsetTimeInputs | CurrentTimeInputs;
    }

    type AddSubtractTimeInputs = string | AddSubtractTimeInputsType;

    type ConvertTimeZoneInputs = string | ConvertTimeZoneInputsType;

    type OffsetTimeInputs = string | OffsetTimeInputsType;

    type CurrentTimeInputs = string | Record<string, unknown>;

    interface AddSubtractTimeInputsType {
      baseTime: string;
      interval: number | string;
      timeUnit: string;
    }

    interface ConvertTimeZoneInputsType {
      baseTime: string;
      formatString: string;
      sourceTimeZone: string;
      destinationTimeZone: string;
    }

    interface OffsetTimeInputsType {
      interval: number | string;
      timeUnit: string;
    }
  }

  /* HTTP action and trigger types */

  interface HttpAction extends TimeoutableAction {
    inputs: HttpInputs;
    metadata?: Record<string, string>;
  }

  interface HttpTrigger extends RecurrenceTrigger {
    inputs: HttpInputs;
    metadata?: Record<string, string>;
  }

  type HttpHeaders = string | HttpHeadersType;

  interface HttpHeadersType {
    [header: string]: string;
  }

  interface HttpInputs extends RetryableActionInputs {
    body?: any;
    cookie?: string;
    headers?: HttpHeaders;
    method: string;
    queries?: HttpQueries;
    uri: string;
  }

  interface HttpInputsOptional extends RetryableActionInputs {
    body?: any;
    cookie?: string;
    headers?: HttpHeaders;
    method?: string;
    queries?: HttpQueries;
    uri?: string;
  }

  type HttpQueries = string | HttpQueriesType;

  interface HttpQueriesType {
    [query: string]: string;
  }

  /* HTTP webhook action and trigger types */

  interface HttpWebhookAction extends TimeoutableAction {
    inputs: HttpWebhookInputs;
  }

  interface HttpWebhookTrigger extends Trigger {
    inputs: HttpWebhookInputs;
  }

  interface HttpWebhookInputs extends ManualActionInputs, RetryableActionInputs {
    subscribe: HttpInputs;
    unsubscribe: HttpInputsOptional;
  }

  /* Manual action input types */

  interface ManualActionInputs {
    schema?: any;
  }

  /* Manual trigger types */

  interface ManualTrigger extends Trigger {
    kind: string;
    inputs?: ManualTriggerInputs;
  }

  interface ManualTriggerInputs {
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

  interface GeofenceTrigger extends Trigger {
    inputs?: GeofenceTriggerInputs;
  }

  interface GeofenceTriggerInputs {
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

  interface FunctionAction extends TimeoutableAction {
    inputs: FunctionInputs;
  }

  type FunctionInputs = LogicApps.FunctionInputs;

  /* IncrementVariable type */

  interface IncrementVariableAction extends Action {
    inputs: IncrementVariableInputs;
  }

  interface IncrementVariableInputs extends RetryableActionInputs {
    name: string;
    value?: any;
  }

  /* InitializeVariable type */

  interface InitializeVariableAction extends Action {
    inputs: InitializeVariableInputs;
  }

  interface InitializeVariableInputs extends RetryableActionInputs {
    variables: VariableInitialization[];
  }

  interface VariableInitialization {
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

  interface SetVariableAction extends Action {
    inputs: SetVariableInputs;
  }

  interface SetVariableInputs extends RetryableActionInputs {
    name: string;
    value?: any;
  }

  /* Join type */

  interface JoinAction extends Action {
    inputs: JoinActionInputs;
  }

  interface JoinActionInputs {
    from: any[] | string;
    joinWith: string;
  }

  /* Output types */

  interface Outputs {
    [output: string]: OutputValue;
  }

  interface OutputValue {
    type: string;
    value: any;
    description?: string;
  }

  /* Parameter types */

  interface Parameter {
    type: string;
    description?: string;
    defaultValue?: any;
    allowedValues?: any[];
    metadata?: Metadata;
  }

  interface Parameters {
    [parameter: string]: Parameter;
  }

  interface Metadata {
    [metadata: string]: ParameterMetadata;
  }

  interface ParameterMetadata {
    name: string;
    value: any;
  }

  /* Query type */

  interface QueryAction extends Action {
    inputs: QueryInputs;
  }

  interface QueryInputs {
    from: string;
    where: string;
  }

  interface RuntimeConfiguration {
    paginationPolicy?: PaginationPolicy;
    secureData?: SecureData;
  }

  interface PaginationPolicy {
    minimumItemCount?: number;
  }

  interface SecureData {
    properties: string[];
  }

  interface TimeoutableAction extends Action {
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

  interface TerminateAction extends Action {
    inputs: TerminateInputs;
  }

  interface TerminateInputs extends RetryableActionInputs {
    runStatus: string;
    runError?: {
      code: string;
      message: string;
    };
  }

  /* Recurrence trigger types */

  type Recurrence = LogicApps.Recurrence;
  type RecurrenceSchedule = LogicApps.RecurrenceSchedule;
  type RecurrenceScheduleOccurrence = LogicApps.RecurrenceScheduleOccurrence;

  interface RecurrenceTrigger extends Trigger {
    recurrence?: Recurrence;
  }

  /* Response action types */

  interface ResponseAction extends Action {
    inputs: ResponseInputs;
  }

  interface ResponseInputs {
    statusCode: string;
    body?: any;
    headers?: HttpHeaders;
    schema?: any;
  }

  /* Retryable action inputs types (authentication, operation options, retry policy) */

  interface RetryPolicy {
    count?: number;
    interval?: string /* TimeSpan, e.g., 1.02:03:04 */;
    type?: string; // None, Exponential or Fixed
    minimumInterval?: string;
    maximumInterval?: string;
  }

  interface RetryableActionInputs {
    authentication?: Authentication;
    operationOptions?: any;
    retryPolicy?: RetryPolicy;
  }

  /* Run after object specifying an action's dependencies */

  interface RunAfter {
    [actionName: string]: string[];
  }

  /* Select action types */

  interface SelectAction extends Action {
    inputs: SelectActionInputs;
  }

  interface SelectActionInputs {
    from: any[] | string;
    select: Record<string, any> | string;
  }

  interface Correlation {
    clientTrackingId?: string;
  }

  interface SplitOnConfiguration {
    correlation?: Correlation;
  }

  /* SlidingWindow types */

  interface SlidingWindowTrigger extends RecurrenceTrigger {
    inputs?: SlidingWindowInputs;
  }

  interface SlidingWindowInputs {
    delay?: string;
  }

  /* Trigger types */

  interface Trigger extends Operation {
    conditions?: Condition[];
    splitOn?: string;
    correlation?: Correlation;
    splitOnConfiguration?: SplitOnConfiguration;
  }

  interface Operation {
    type: string;
    kind?: string;
    description?: string;
    metadata?: any;
    operationOptions?: string;
    runtimeConfiguration?: any;
  }

  type TriggerDefinition =
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

  interface Triggers {
    [trigger: string]: TriggerDefinition;
  }

  /* Wait action types */

  interface WaitAction extends Action {
    inputs: WaitInputs;
  }

  interface WaitInputs {
    interval?: WaitInterval;
    until?: WaitUntil;
  }

  interface WaitInterval {
    count?: number;
    unit?: string;
  }

  interface WaitUntil {
    timestamp: string;
  }

  /* Workflow definition types */

  interface WorkflowDefinition {
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

  interface ScopeAction extends Action {
    actions?: Actions;
  }

  /* Foreach scope type */

  interface ForEachAction extends ScopeAction {
    foreach: string | any[];
  }

  /* Until scope types */

  interface UntilAction extends ScopeAction {
    expression: string;
    limit: Limit;
  }

  interface Limit {
    count?: string | number;
    timeout?: string;
  }

  /* If scope types */

  interface IfAction extends ScopeAction {
    // NOTE(joechung): When did Record<string, any> become a valid value for an If scope's expression?
    expression: string | Record<string, any>;
    else?: ActionsNode;
  }

  interface ActionsNode {
    actions?: Actions;
  }

  /* Parse JSON action types */

  interface ParseJsonAction extends Action {
    inputs: ParseJsonActionInputs;
  }

  interface ParseJsonActionInputs {
    content: any;
    schema: any;
  }

  /* Switch scope types */

  interface SwitchCase {
    actions?: Actions;
    case?: string | number;
  }

  interface SwitchAction extends Action {
    cases?: Record<string, SwitchCase>;
    default?: SwitchCase;
    expression: string;
  }

  /* Table action types */

  interface TableAction extends Action {
    inputs: TableActionInputs;
  }

  interface TableActionColumn {
    header?: string;
    value: any;
  }

  interface TableActionInputs {
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
  interface TraceExpression extends TraceSubexpression {
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
  interface TraceExpressionRecord {
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
  interface TraceInputsRecord {
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
  type TraceRecord = TraceExpressionRecord | TraceInputsRecord;

  /**
   * @interface TraceSubexpression
   * A subexpression record.  Expressions may contain 0 or more subexpressions, each of which may contain 0 or more
   * subexpressions.
   */
  interface TraceSubexpression {
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

  namespace Integration {
    /* Content and Schema actions common types */

    interface ContentAndSchemaInputs {
      content: string;
      integrationAccount: IntegrationAccountSchemaInformation;
    }

    interface IntegrationAccountSchemaInformation {
      schema: ArtifactInformation;
    }

    interface ArtifactInformation {
      name: string;
    }

    /* XML Validation action types */

    interface XmlValidationAction extends Action {
      inputs: ContentAndSchemaInputs;
    }

    /* Flat file encoding action types */

    interface FlatFileEncodingAction extends Action {
      inputs: FlatFileEncodingInputs;
    }

    interface FlatFileEncodingInputs extends ContentAndSchemaInputs {
      emptyNodeGenerationMode?: EmptyNodeGenerationMode;
    }

    const enum EmptyNodeGenerationMode {
      ForcedDisabled = 'ForcedDisabled',
      HonorSchemaNodeProperty = 'HonorSchemaNodeProperty',
      ForcedEnabled = 'ForcedEnabled',
    }

    /* Flat file decoding action types */

    interface FlatFileDecodingAction extends Action {
      inputs: ContentAndSchemaInputs;
    }

    /* Integration account artifact lookup action types */

    interface IntegrationAccountArtifactLookupInputs {
      artifactType: string;
      artifactName: string;
    }

    interface IntegrationAccountArtifactLookupAction extends Action {
      inputs: IntegrationAccountArtifactLookupInputs;
    }

    /* XSL transform action types */

    interface IntegrationAccountMapInformation {
      map: ArtifactInformation;
    }

    interface XsltInputs {
      function?: FunctionInput;
      content: string;
      integrationAccount: IntegrationAccountMapInformation;
    }

    interface XsltAction extends Action {
      inputs: XsltInputs;
    }

    interface FunctionInput {
      id: string;
    }

    /* Liquid action */
    interface LiquidAction extends Action {
      inputs: LiquidActionInputs;
      kind: string;
    }

    interface LiquidActionInputs extends RetryableActionInputs {
      content: any;
      transformedContentSchema?: any;
      integrationAccount: IntegrationAccountMapInformation;
    }
  }
}
