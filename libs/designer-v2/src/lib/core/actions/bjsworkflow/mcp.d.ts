import { type IConnectionParameterEditorService, type IConnectionService, type IConnectorService, type IGatewayService, type ILoggerService, type IOAuthService, type IResourceService, type ISearchService, type ITenantService, type IWorkflowService } from '@microsoft/logic-apps-shared';
import { type NodeOperation } from '../../state/operation/operationMetadataSlice';
export interface McpServiceOptions {
    connectionService: IConnectionService;
    gatewayService?: IGatewayService;
    tenantService?: ITenantService;
    oAuthService: IOAuthService;
    connectionParameterEditorService?: IConnectionParameterEditorService;
    connectorService: IConnectorService;
    resourceService: IResourceService;
    searchService?: ISearchService;
    loggerService?: ILoggerService;
    workflowService?: IWorkflowService;
    hostService?: any;
}
export declare const initializeMcpServices: import("@reduxjs/toolkit").AsyncThunk<boolean, McpServiceOptions, {
    state?: unknown;
    dispatch?: import("@reduxjs/toolkit").Dispatch<import("@reduxjs/toolkit").AnyAction> | undefined;
    extra?: unknown;
    rejectValue?: unknown;
    serializedErrorType?: unknown;
    pendingMeta?: unknown;
    fulfilledMeta?: unknown;
    rejectedMeta?: unknown;
}>;
export declare const resetMcpStateOnResourceChange: import("@reduxjs/toolkit").AsyncThunk<boolean, Partial<McpServiceOptions>, {
    state?: unknown;
    dispatch?: import("@reduxjs/toolkit").Dispatch<import("@reduxjs/toolkit").AnyAction> | undefined;
    extra?: unknown;
    rejectValue?: unknown;
    serializedErrorType?: unknown;
    pendingMeta?: unknown;
    fulfilledMeta?: unknown;
    rejectedMeta?: unknown;
}>;
export declare const initializeOperationsMetadata: import("@reduxjs/toolkit").AsyncThunk<void, {
    operations: NodeOperation[];
    area: string;
}, {
    state?: unknown;
    dispatch?: import("@reduxjs/toolkit").Dispatch<import("@reduxjs/toolkit").AnyAction> | undefined;
    extra?: unknown;
    rejectValue?: unknown;
    serializedErrorType?: unknown;
    pendingMeta?: unknown;
    fulfilledMeta?: unknown;
    rejectedMeta?: unknown;
}>;
export declare const initializeConnectionMappings: import("@reduxjs/toolkit").AsyncThunk<void, {
    operations: string[];
    connectorId: string;
    area: string;
}, {
    state?: unknown;
    dispatch?: import("@reduxjs/toolkit").Dispatch<import("@reduxjs/toolkit").AnyAction> | undefined;
    extra?: unknown;
    rejectValue?: unknown;
    serializedErrorType?: unknown;
    pendingMeta?: unknown;
    fulfilledMeta?: unknown;
    rejectedMeta?: unknown;
}>;
export declare const deinitializeOperations: import("@reduxjs/toolkit").AsyncThunk<string[], {
    operationIds: string[];
}, {
    state?: unknown;
    dispatch?: import("@reduxjs/toolkit").Dispatch<import("@reduxjs/toolkit").AnyAction> | undefined;
    extra?: unknown;
    rejectValue?: unknown;
    serializedErrorType?: unknown;
    pendingMeta?: unknown;
    fulfilledMeta?: unknown;
    rejectedMeta?: unknown;
}>;
