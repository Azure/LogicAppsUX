import type { RootState } from '../../store';
import type { NodeOperation, OperationMetadataState } from '../operation/operationMetadataSlice';
import type { OperationManifest } from '@microsoft/logic-apps-shared';
import type { UseQueryResult } from '@tanstack/react-query';
interface QueryResult {
    isLoading?: boolean;
    result: any;
}
export declare const getOperationsState: (state: RootState) => OperationMetadataState;
export declare const useIsConnectionRequired: (operationInfo: NodeOperation) => boolean;
export declare const useAllowUserToChangeConnection: (op: NodeOperation) => boolean;
export declare const useNodeConnectionName: (nodeId: string) => QueryResult;
export declare const useAllOperations: () => Record<string, NodeOperation>;
export declare const useOperationInfo: (nodeId: string) => NodeOperation;
export declare const useAllOutputParameters: () => Record<string, import("../operation/operationMetadataSlice").NodeOutputs>;
export declare const useOutputParameters: (nodeId: string) => import("../operation/operationMetadataSlice").NodeOutputs | undefined;
export declare const useOperationManifest: (operationInfo?: NodeOperation, enabled?: boolean) => UseQueryResult<OperationManifest | undefined, unknown>;
export declare const useOperationQuery: (nodeId: string) => import("@tanstack/react-query").QueryObserverRefetchErrorResult<OperationManifest | undefined, unknown> | import("@tanstack/react-query").QueryObserverSuccessResult<OperationManifest | undefined, unknown> | import("@tanstack/react-query").QueryObserverLoadingErrorResult<OperationManifest | undefined, unknown> | import("@tanstack/react-query").QueryObserverLoadingResult<OperationManifest | undefined, unknown> | import("@tanstack/react-query").QueryObserverRefetchErrorResult<import("@microsoft/logic-apps-shared").Connector | undefined, unknown> | import("@tanstack/react-query").QueryObserverSuccessResult<import("@microsoft/logic-apps-shared").Connector | undefined, unknown>;
export declare const useConnectorName: (operationInfo: NodeOperation) => QueryResult;
export declare const useOperationDescription: (operationInfo: NodeOperation) => QueryResult;
export declare const useOperationDocumentation: (operationInfo: NodeOperation) => QueryResult;
export declare const useOperationSummary: (operationInfo: NodeOperation) => QueryResult;
export declare const useOperationUploadChunkMetadata: (operationInfo: NodeOperation) => QueryResult;
export declare const useOperationDownloadChunkMetadata: (operationInfo: NodeOperation) => QueryResult;
export declare const useConnectorDescription: (operationInfo: NodeOperation) => QueryResult;
export declare const useConnectorDocumentation: (operationInfo: NodeOperation) => QueryResult;
export declare const useConnectorEnvironmentBadge: (operationInfo: NodeOperation) => QueryResult;
export declare const useConnectorStatusBadge: (operationInfo: NodeOperation) => QueryResult;
export {};
