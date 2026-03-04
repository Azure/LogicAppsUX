import type { RootState } from '../../..';
import type { WorkflowNode } from '../../parsers/models/workflowNode';
import type { Dispatch } from '@reduxjs/toolkit';
type DeleteOperationPayload = {
    nodeId: string;
    isTrigger: boolean;
    clearFocus?: boolean;
};
export type DeleteGraphPayload = {
    graphId: string;
    graphNode: WorkflowNode;
    clearFocus?: boolean;
};
export declare const deleteWorkflowParameter: import("@reduxjs/toolkit").AsyncThunk<void, string, {
    state?: unknown;
    dispatch?: Dispatch<import("@reduxjs/toolkit").AnyAction> | undefined;
    extra?: unknown;
    rejectValue?: unknown;
    serializedErrorType?: unknown;
    pendingMeta?: unknown;
    fulfilledMeta?: unknown;
    rejectedMeta?: unknown;
}>;
export declare const deleteOperation: import("@reduxjs/toolkit").AsyncThunk<void, DeleteOperationPayload, {
    state?: unknown;
    dispatch?: Dispatch<import("@reduxjs/toolkit").AnyAction> | undefined;
    extra?: unknown;
    rejectValue?: unknown;
    serializedErrorType?: unknown;
    pendingMeta?: unknown;
    fulfilledMeta?: unknown;
    rejectedMeta?: unknown;
}>;
export declare const removeAllTokensFromNode: (state: RootState, dispatch: Dispatch, nodeId?: string, parameterId?: String, isTrigger?: boolean) => void;
export declare const deleteGraphNode: import("@reduxjs/toolkit").AsyncThunk<void, DeleteGraphPayload, {
    state?: unknown;
    dispatch?: Dispatch<import("@reduxjs/toolkit").AnyAction> | undefined;
    extra?: unknown;
    rejectValue?: unknown;
    serializedErrorType?: unknown;
    pendingMeta?: unknown;
    fulfilledMeta?: unknown;
    rejectedMeta?: unknown;
}>;
export declare const deleteMcpServerNode: import("@reduxjs/toolkit").AsyncThunk<void, {
    agentId: string;
    toolId: string;
    clearFocus?: boolean | undefined;
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
export {};
