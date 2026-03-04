import type { NodeOperation } from '../../state/operation/operationMetadataSlice';
import { WorkflowKind } from '../../state/workflow/workflowInterfaces';
import type { SwaggerParser, LogicAppsV2, OperationManifest } from '@microsoft/logic-apps-shared';
/**
 * @interface RetryPolicy - The retry policy operation setting.
 */
interface RetryPolicy {
    type: string;
    count?: number | string;
    interval?: string;
    minimumInterval?: string;
    maximumInterval?: string;
}
/**
 * @interface SimpleSetting - A setting that has a value of some type that can be disabled or enabled.
 */
export interface SimpleSetting<T> {
    enabled: boolean;
    value?: T;
}
interface ConcurrencySettings {
    enabled: boolean;
    runs?: number;
    maximumWaitingRuns?: number;
}
interface CorrelationSettings {
    clientTrackingId?: string;
}
interface RequestOptions {
    timeout?: string;
}
interface SplitOnConfiguration {
    correlation?: CorrelationSettings;
}
interface UploadChunk {
    transferMode?: string;
    uploadChunkSize?: number;
}
export interface GraphEdge {
    predecessorId: string;
    successorId?: string;
    metadata?: string;
    statuses: string[];
}
export interface SettingData<T> {
    isSupported: boolean;
    value?: T;
}
export interface Settings {
    asynchronous?: SettingData<boolean>;
    correlation?: SettingData<CorrelationSettings>;
    secureInputs?: SettingData<boolean>;
    secureOutputs?: SettingData<boolean>;
    disableAsyncPattern?: SettingData<boolean>;
    disableAutomaticDecompression?: SettingData<boolean>;
    splitOn?: SettingData<SimpleSetting<string>>;
    retryPolicy?: SettingData<RetryPolicy>;
    concurrency?: SettingData<ConcurrencySettings>;
    requestOptions?: SettingData<RequestOptions>;
    sequential?: boolean;
    singleInstance?: boolean;
    splitOnConfiguration?: SplitOnConfiguration;
    suppressWorkflowHeaders?: SettingData<boolean>;
    suppressWorkflowHeadersOnResponse?: SettingData<boolean>;
    timeout?: SettingData<string>;
    paging?: SettingData<SimpleSetting<number>>;
    trackedProperties?: SettingData<any>;
    requestSchemaValidation?: SettingData<boolean>;
    conditionExpressions?: SettingData<string[]>;
    uploadChunk?: SettingData<UploadChunk>;
    downloadChunkSize?: SettingData<number>;
    runAfter?: SettingData<GraphEdge[]>;
    invokerConnection?: SettingData<SimpleSetting<boolean>>;
    count?: SettingData<string | number>;
    shouldFailOperation?: SettingData<boolean>;
}
/**
 * Gets the operation options for the specified node based on the definition of the operation in a reload, or from swagger information.
 * @arg {string} isTrigger - Specifies if this is trigger operation node.
 * @arg {NodeOperation} operationInfo - The operation information about the node.
 * @arg {OperationManifest} [manifest] - The operation manifest if node type supports.
 * @arg {SwaggerParser} [swagger] - The swagger if the node type supports.
 * @arg {LogicAppsV2.OperationDefinition} [operation] - The JSON from the definition for the given operation.
 * @return {Settings}
 */
export declare const getOperationSettings: (isTrigger: boolean, operationInfo: NodeOperation, manifest?: OperationManifest, swagger?: SwaggerParser, operation?: LogicAppsV2.OperationDefinition, workflowKind?: WorkflowKind) => Settings;
export declare const getSplitOnValue: (manifest?: OperationManifest, swagger?: SwaggerParser, operationId?: string, definition?: LogicAppsV2.TriggerDefinition) => string | undefined;
export declare const isChunkedTransferModeSupported: (isTrigger: boolean, nodeType: string, manifest?: OperationManifest, swagger?: SwaggerParser, operationId?: string) => boolean;
export {};
