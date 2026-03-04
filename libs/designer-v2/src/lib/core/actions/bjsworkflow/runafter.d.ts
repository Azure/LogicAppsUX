export interface EdgeRunAfterPayload {
    parentOperationId: string;
    childOperationId: string;
}
export declare const addOperationRunAfter: import("@reduxjs/toolkit").AsyncThunk<void, EdgeRunAfterPayload, {
    state?: unknown;
    dispatch?: import("@reduxjs/toolkit").Dispatch<import("@reduxjs/toolkit").AnyAction> | undefined;
    extra?: unknown;
    rejectValue?: unknown;
    serializedErrorType?: unknown;
    pendingMeta?: unknown;
    fulfilledMeta?: unknown;
    rejectedMeta?: unknown;
}>;
export declare const removeOperationRunAfter: import("@reduxjs/toolkit").AsyncThunk<void, EdgeRunAfterPayload, {
    state?: unknown;
    dispatch?: import("@reduxjs/toolkit").Dispatch<import("@reduxjs/toolkit").AnyAction> | undefined;
    extra?: unknown;
    rejectValue?: unknown;
    serializedErrorType?: unknown;
    pendingMeta?: unknown;
    fulfilledMeta?: unknown;
    rejectedMeta?: unknown;
}>;
