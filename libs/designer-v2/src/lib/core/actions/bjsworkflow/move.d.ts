import type { MoveNodePayload } from '../../parsers/moveNodeInWorkflow';
export declare const moveOperation: import("@reduxjs/toolkit").AsyncThunk<void, MoveNodePayload, {
    state?: unknown;
    dispatch?: import("@reduxjs/toolkit").Dispatch<import("@reduxjs/toolkit").AnyAction> | undefined;
    extra?: unknown;
    rejectValue?: unknown;
    serializedErrorType?: unknown;
    pendingMeta?: unknown;
    fulfilledMeta?: unknown;
    rejectedMeta?: unknown;
}>;
