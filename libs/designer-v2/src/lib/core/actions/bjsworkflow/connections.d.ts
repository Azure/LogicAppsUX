import type { ApiHubAuthentication } from '../../../common/models/workflow';
import type { DeserializedWorkflow } from '../../parsers/BJSWorkflow/BJSDeserializer';
import type { NodeOperation } from '../../state/operation/operationMetadataSlice';
import type { IOperationManifestService, Connection, ConnectionParameter, Connector, OperationManifest, LogicAppsV2 } from '@microsoft/logic-apps-shared';
import type { Dispatch } from '@reduxjs/toolkit';
export interface ConnectionPayload {
    nodeId: string;
    connector: Connector;
    connection: Connection;
    connectionProperties?: Record<string, any>;
    authentication?: ApiHubAuthentication;
}
export interface UpdateConnectionPayload {
    nodeId: string;
    connectorId: string;
    connectionId: string;
    connectionProperties?: Record<string, any>;
    authentication?: ApiHubAuthentication;
    connectionRuntimeUrl?: string;
    connectionParameterValues?: Record<string, any>;
}
export declare const updateMcpConnection: import("@reduxjs/toolkit").AsyncThunk<void, Omit<ConnectionPayload, "nodeId"> & {
    nodeIds: string[];
    reset?: boolean | undefined;
}, {
    state?: unknown;
    dispatch?: Dispatch<import("@reduxjs/toolkit").AnyAction> | undefined;
    extra?: unknown;
    rejectValue?: unknown;
    serializedErrorType?: unknown;
    pendingMeta?: unknown;
    fulfilledMeta?: unknown;
    rejectedMeta?: unknown;
}>;
export declare const updateTemplateConnection: import("@reduxjs/toolkit").AsyncThunk<void, ConnectionPayload & {
    connectionKey: string;
}, {
    state?: unknown;
    dispatch?: Dispatch<import("@reduxjs/toolkit").AnyAction> | undefined;
    extra?: unknown;
    rejectValue?: unknown;
    serializedErrorType?: unknown;
    pendingMeta?: unknown;
    fulfilledMeta?: unknown;
    rejectedMeta?: unknown;
}>;
export declare const updateNodeConnection: import("@reduxjs/toolkit").AsyncThunk<void, ConnectionPayload, {
    state?: unknown;
    dispatch?: Dispatch<import("@reduxjs/toolkit").AnyAction> | undefined;
    extra?: unknown;
    rejectValue?: unknown;
    serializedErrorType?: unknown;
    pendingMeta?: unknown;
    fulfilledMeta?: unknown;
    rejectedMeta?: unknown;
}>;
export declare const closeConnectionsFlow: import("@reduxjs/toolkit").AsyncThunk<void, {
    nodeId: string;
    panelMode?: "Error" | "Connection" | "Discovery" | "Operation" | "NodeSearch" | "WorkflowParameters" | "Assertions" | undefined;
}, {
    state?: unknown;
    dispatch?: Dispatch<import("@reduxjs/toolkit").AnyAction> | undefined;
    extra?: unknown;
    rejectValue?: unknown;
    serializedErrorType?: unknown;
    pendingMeta?: unknown;
    fulfilledMeta?: unknown;
    rejectedMeta?: unknown;
}>;
export declare const reloadParametersTab: import("@reduxjs/toolkit").AsyncThunk<void, void, {
    state?: unknown;
    dispatch?: Dispatch<import("@reduxjs/toolkit").AnyAction> | undefined;
    extra?: unknown;
    rejectValue?: unknown;
    serializedErrorType?: unknown;
    pendingMeta?: unknown;
    fulfilledMeta?: unknown;
    rejectedMeta?: unknown;
}>;
export declare const getConnectionProperties: (connector: Connector, userAssignedIdentity: string | undefined) => Record<string, any>;
export declare const getApiHubAuthentication: (userAssignedIdentity: string | undefined) => ApiHubAuthentication | undefined;
export declare const updateIdentityChangeInConnection: import("@reduxjs/toolkit").AsyncThunk<void, {
    nodeId: string;
    identity: string;
}, {
    state?: unknown;
    dispatch?: Dispatch<import("@reduxjs/toolkit").AnyAction> | undefined;
    extra?: unknown;
    rejectValue?: unknown;
    serializedErrorType?: unknown;
    pendingMeta?: unknown;
    fulfilledMeta?: unknown;
    rejectedMeta?: unknown;
}>;
export declare const autoCreateConnectionIfPossible: (payload: {
    connector: Connector;
    referenceKeys: string[];
    operationInfo?: NodeOperation | undefined;
    applyNewConnection: (connection: Connection) => void;
    onSuccess: (connection: Connection) => void;
    onManualConnectionCreation: () => void;
    skipOAuth?: boolean | undefined;
}) => Promise<void>;
export declare function getConnectionsMappingForNodes(deserializedWorkflow: DeserializedWorkflow): Promise<Record<string, string>>;
export declare const getConnectionMappingForNode: (operation: LogicAppsV2.OperationDefinition, nodeId: string, isTrigger: boolean, operationManifestService: IOperationManifestService) => Promise<Record<string, string> | undefined>;
export declare const isOpenApiConnectionType: (type: string) => boolean;
export declare function getConnectionsApiAndMapping(deserializedWorkflow: DeserializedWorkflow, dispatch: Dispatch): Promise<void>;
export declare function getManifestBasedConnectionMapping(nodeId: string, isTrigger: boolean, operationDefinition: LogicAppsV2.OperationDefinition): Promise<Record<string, string> | undefined>;
export declare function isConnectionRequiredForOperation(manifest: OperationManifest): boolean;
export declare function getConnectionMetadata(manifest?: OperationManifest): import("@microsoft/logic-apps-shared").ConnectionMetadata | undefined;
export declare function needsConnection(connector: Connector | undefined): boolean;
export declare function needsOAuth(connectionParameters: Record<string, ConnectionParameter>): boolean;
export declare function hasOnlyOAuthParameters(connector: Connector): boolean;
export declare function getLegacyConnectionReferenceKey(operationDefinition: any): string | undefined;
