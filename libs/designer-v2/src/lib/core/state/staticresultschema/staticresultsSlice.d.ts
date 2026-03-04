import type { OpenApiSchema } from '@microsoft/logic-apps-shared';
import type { PayloadAction } from '@reduxjs/toolkit';
export interface StaticResultsState {
    schemas: Record<string, OpenApiSchema>;
    properties: Record<string, any>;
}
interface StaticResultsSchemaUpdateEvent {
    id: string;
    schema: OpenApiSchema;
}
export declare const initialState: StaticResultsState;
export declare const staticResultsSlice: import("@reduxjs/toolkit").Slice<StaticResultsState, {
    initializeStaticResultProperties: (state: import("immer/dist/internal").WritableDraft<StaticResultsState>, action: PayloadAction<Record<string, any>>) => void;
    initScopeCopiedStaticResultProperties: (state: import("immer/dist/internal").WritableDraft<StaticResultsState>, action: PayloadAction<Record<string, any>>) => void;
    deinitializeStaticResultProperty: (state: import("immer/dist/internal").WritableDraft<StaticResultsState>, action: PayloadAction<{
        id: string;
    }>) => void;
    addResultSchema: (state: import("immer/dist/internal").WritableDraft<StaticResultsState>, action: PayloadAction<StaticResultsSchemaUpdateEvent>) => void;
    updateStaticResultProperties: (state: import("immer/dist/internal").WritableDraft<StaticResultsState>, action: PayloadAction<{
        name: string;
        properties: any;
    }>) => void;
}, "staticResults">;
export declare const initializeStaticResultProperties: import("@reduxjs/toolkit").ActionCreatorWithPayload<Record<string, any>, "staticResults/initializeStaticResultProperties">, initScopeCopiedStaticResultProperties: import("@reduxjs/toolkit").ActionCreatorWithPayload<Record<string, any>, "staticResults/initScopeCopiedStaticResultProperties">, deinitializeStaticResultProperty: import("@reduxjs/toolkit").ActionCreatorWithPayload<{
    id: string;
}, "staticResults/deinitializeStaticResultProperty">, addResultSchema: import("@reduxjs/toolkit").ActionCreatorWithPayload<StaticResultsSchemaUpdateEvent, "staticResults/addResultSchema">, updateStaticResultProperties: import("@reduxjs/toolkit").ActionCreatorWithPayload<{
    name: string;
    properties: any;
}, "staticResults/updateStaticResultProperties">;
declare const _default: import("@reduxjs/toolkit").Reducer<StaticResultsState, import("@reduxjs/toolkit").AnyAction>;
export default _default;
