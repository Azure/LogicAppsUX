import type { ConnectionReference, ReferenceKey } from '../../../common/models/workflow';
import type { NodeData, NodeOperation } from '../../state/operation/operationMetadataSlice';
import type { RelationshipIds } from '../../state/panel/panelTypes';
import { type LogicAppsV2 } from '@microsoft/logic-apps-shared';
import type { NodeTokens } from '../../state/tokens/tokensSlice';
type CopyOperationPayload = {
    nodeId: string;
};
export declare const copyOperation: import("@reduxjs/toolkit").AsyncThunk<void, CopyOperationPayload, {
    state?: unknown;
    dispatch?: import("@reduxjs/toolkit").Dispatch<import("@reduxjs/toolkit").AnyAction> | undefined;
    extra?: unknown;
    rejectValue?: unknown;
    serializedErrorType?: unknown;
    pendingMeta?: unknown;
    fulfilledMeta?: unknown;
    rejectedMeta?: unknown;
}>;
export declare const copyScopeOperation: import("@reduxjs/toolkit").AsyncThunk<void, CopyOperationPayload, {
    state?: unknown;
    dispatch?: import("@reduxjs/toolkit").Dispatch<import("@reduxjs/toolkit").AnyAction> | undefined;
    extra?: unknown;
    rejectValue?: unknown;
    serializedErrorType?: unknown;
    pendingMeta?: unknown;
    fulfilledMeta?: unknown;
    rejectedMeta?: unknown;
}>;
interface PasteOperationPayload {
    relationshipIds: RelationshipIds;
    nodeId: string;
    nodeData: NodeData;
    nodeTokenData: NodeTokens;
    operationInfo: NodeOperation;
    connectionData?: ReferenceKey;
    comment?: string;
    isParallelBranch?: boolean;
}
export declare const pasteOperation: import("@reduxjs/toolkit").AsyncThunk<void, PasteOperationPayload, {
    state?: unknown;
    dispatch?: import("@reduxjs/toolkit").Dispatch<import("@reduxjs/toolkit").AnyAction> | undefined;
    extra?: unknown;
    rejectValue?: unknown;
    serializedErrorType?: unknown;
    pendingMeta?: unknown;
    fulfilledMeta?: unknown;
    rejectedMeta?: unknown;
}>;
interface PasteScopeOperationPayload {
    relationshipIds: RelationshipIds;
    nodeId: string;
    serializedValue: LogicAppsV2.OperationDefinition | null;
    allConnectionData: Record<string, {
        connectionReference: ConnectionReference;
        referenceKey: string;
    }>;
    staticResults: Record<string, any>;
    upstreamNodeIds: string[];
    isParallelBranch?: boolean;
}
export declare const pasteScopeOperation: import("@reduxjs/toolkit").AsyncThunk<void, PasteScopeOperationPayload, {
    state?: unknown;
    dispatch?: import("@reduxjs/toolkit").Dispatch<import("@reduxjs/toolkit").AnyAction> | undefined;
    extra?: unknown;
    rejectValue?: unknown;
    serializedErrorType?: unknown;
    pendingMeta?: unknown;
    fulfilledMeta?: unknown;
    rejectedMeta?: unknown;
}>;
export interface PasteScopeParams {
    pasteActionNames: string[];
    renamedNodes: Record<string, string>;
}
export {};
