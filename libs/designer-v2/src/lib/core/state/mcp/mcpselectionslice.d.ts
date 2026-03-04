import type { PayloadAction } from '@reduxjs/toolkit';
export interface McpSelectionState {
    selectedConnectorId: string | undefined;
    selectedOperations: string[];
    selectedOperationId?: string;
    errors: {
        operations?: string;
        operationDetails?: Record<string, {
            general?: string;
            parameters?: string;
        }>;
    };
}
declare const initialSelectionState: McpSelectionState;
export declare const mcpSelectionSlice: import("@reduxjs/toolkit").Slice<McpSelectionState, {
    selectConnectorId: (state: import("immer/dist/internal").WritableDraft<McpSelectionState>, action: PayloadAction<string | undefined>) => void;
    selectOperations: (state: import("immer/dist/internal").WritableDraft<McpSelectionState>, action: PayloadAction<string[]>) => void;
    selectOperationIdToEdit: (state: import("immer/dist/internal").WritableDraft<McpSelectionState>, action: PayloadAction<string | undefined>) => void;
    clearSelectedOperations: (state: import("immer/dist/internal").WritableDraft<McpSelectionState>) => void;
    clearAllSelections: (state: typeof initialSelectionState) => void;
}, "mcpSelection">;
export declare const selectConnectorId: import("@reduxjs/toolkit").ActionCreatorWithOptionalPayload<string | undefined, "mcpSelection/selectConnectorId">, selectOperations: import("@reduxjs/toolkit").ActionCreatorWithPayload<string[], "mcpSelection/selectOperations">, clearSelectedOperations: import("@reduxjs/toolkit").ActionCreatorWithoutPayload<"mcpSelection/clearSelectedOperations">, clearAllSelections: import("@reduxjs/toolkit").ActionCreatorWithoutPayload<"mcpSelection/clearAllSelections">, selectOperationIdToEdit: import("@reduxjs/toolkit").ActionCreatorWithOptionalPayload<string | undefined, "mcpSelection/selectOperationIdToEdit">;
declare const _default: import("@reduxjs/toolkit").Reducer<McpSelectionState, import("@reduxjs/toolkit").AnyAction>;
export default _default;
