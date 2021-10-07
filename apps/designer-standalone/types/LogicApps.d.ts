/**
 * https://schema.management.azure.com/providers/Microsoft.Logic/schemas/2015-08-01-preview/workflowdefinition.json#
 */
declare namespace LogicApps {

    /* Action types */

    interface Action {
        type: string;
        kind?: string;
        description?: string;
        conditions?: Condition[];
        foreach?: string;   // BUG foreach can be any[], like repeat
        metadata?: any;
    }

    type ActionDefinition = ApiConnectionAction
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

    type OperationDefinition = ActionDefinition | TriggerDefinition;

    interface Actions {
        [action: string]: ActionDefinition;
    }

    /* API Connection actions and triggers */
    interface ApiConnectionAction extends Action {
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

    type ApiConnectionHeaders = string | Record<string, string>;

    type ApiConnectionHost = string | ApiConnectionHostType;

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
        name: string;
    }

    type ApiConnectionQueries = string | Record<string, any>;

    /* API Connection Webhook actions and triggers */

    interface ApiConnectionWebhookAction extends Action {
        inputs: ApiConnectionWebhookInputs;
    }

    interface ApiConnectionWebhookTrigger extends Trigger {
        inputs: ApiConnectionWebhookInputs;
    }

    interface ApiConnectionWebhookInputs extends ApiConnectionInputs {
        schema?: any;
    }

    /* Authentication types */

    interface ActiveDirectoryOAuthAuthentication {
        type: string;
        tenant: string;
        audience: string;
        clientId: string;
        secret: string;
    }

    type Authentication =
        string |
        ActiveDirectoryOAuthAuthentication |
        BasicAuthentication |
        ClientCertificateAuthentication;

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

    /* Child (nested) Workflow actions */

    interface ChildWorkflow extends Action {
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

    /* HTTP action and trigger types */

    interface HttpAction extends Action {
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

    interface HttpWebhookAction extends Action {
        inputs: HttpWebhookInputs;
    }

    interface HttpWebhookTrigger extends Trigger {
        inputs: HttpWebhookInputs;
    }

    interface HttpWebhookInputs extends ManualActionInputs {
        subscribe: HttpInputs;
        unsubscribe: HttpInputsOptional;
    }

    /* Manual action input types */

    interface ManualActionInputs {
        schema?: any;
    }

    /* Manual trigger types */

    interface ManualTrigger extends Trigger {
        inputs?: ManualTriggerInputs;
    }

    interface ManualTriggerInputs {
        method?: string;
        relativePath?: string;
        schema?: any;
    }

    /* Function types */

    interface FunctionAction extends Action {
        inputs: FunctionInputs;
    }

    interface FunctionInputs extends RetryableActionInputs {
        body?: any;
        function?: {
            id: string;
            name?: string;
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

    /* Recurrence trigger types */

    interface Recurrence {
        count?: number;
        endTime?: string;
        frequency: string;
        interval: number | string;  // NOTE(lakshmia): String to support expressions/ARM template.
        schedule?: RecurrenceSchedule;
        startTime?: string;
        timeZone?: string;
    }

    interface RecurrenceSchedule {
        hours?: number[];
        minutes?: number[];
        monthDays?: number[];
        monthlyOccurrences?: RecurrenceScheduleOccurrence[];
        weekDays?: string[];
    }

    interface RecurrenceScheduleOccurrence {
        dayOfWeek: string;
        occurrence: number;
    }

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

    type RetryPolicy = string | RetryPolicyType;

    interface RetryPolicyType {
        count?: number;
        interval?: string; /* TimeSpan, e.g., 1.02:03:04 */
        type?: string;
        minimumInterval?: string;
        maximumInterval?: string;
    }

    interface RetryableActionInputs {
        authentication?: Authentication;
        operationOptions?: any;
        retryPolicy?: RetryPolicy;
    }

    /* Trigger types */

    interface Trigger {
        type: string;
        kind?: string;
        description?: string;
        conditions?: Condition[];
        metadata?: any;
        splitOn?: string;
    }

    type TriggerDefinition = ApiConnectionTrigger
        | ApiConnectionWebhookTrigger
        | HttpTrigger
        | HttpWebhookTrigger
        | ManualTrigger
        | RecurrenceTrigger;

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
        count?: number | string;
        unit?: string;
    }

    interface WaitUntil {
        timestamp: string;
    }

    /* Workflow definition types */

    interface WorkflowDefinition {
        $schema?: string;
        description?: string;
        contentVersion?: string;
        metadata?: any;
        parameters?: Parameters;
        triggers?: Triggers;
        actions?: Actions;
        outputs?: Outputs;
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
            ForcedDisabled,
            HonorSchemaNodeProperty,
            ForcedEnabled
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
            xsltParameters?: Record<string, string>;
            transformOptions?: string;
        }

        interface XsltAction extends Action {
            inputs: XsltInputs;
        }

        interface FunctionInput {
            id: string;
        }
    }
}
