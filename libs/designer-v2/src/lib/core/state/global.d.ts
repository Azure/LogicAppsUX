import type { UndoRedoPartialRootState } from './undoRedo/undoRedoTypes';
export declare const resetWorkflowState: import("@reduxjs/toolkit").ActionCreatorWithoutPayload<"resetWorkflowState">;
export declare const resetNodesLoadStatus: import("@reduxjs/toolkit").ActionCreatorWithoutPayload<"resetNodesLoadStatus">;
export declare const setStateAfterUndoRedo: import("@reduxjs/toolkit").ActionCreatorWithPayload<UndoRedoPartialRootState, string>;
export declare const resetTemplatesState: import("@reduxjs/toolkit").ActionCreatorWithoutPayload<"resetTemplatesState">;
export declare const resetMcpState: import("@reduxjs/toolkit").ActionCreatorWithoutPayload<"resetMcpState">;
export declare const useIsDesignerDirty: () => boolean;
export declare const resetDesignerDirtyState: import("@reduxjs/toolkit").AsyncThunk<void, unknown, {
    state?: unknown;
    dispatch?: import("@reduxjs/toolkit").Dispatch<import("@reduxjs/toolkit").AnyAction> | undefined;
    extra?: unknown;
    rejectValue?: unknown;
    serializedErrorType?: unknown;
    pendingMeta?: unknown;
    fulfilledMeta?: unknown;
    rejectedMeta?: unknown;
}>;
export declare const useChangeCount: () => number;
