import type { WorkflowParameter } from '../../../common/models/workflow';
import type { WorkflowParameterUpdateEvent } from '@microsoft/designer-ui';
import type { PayloadAction } from '@reduxjs/toolkit';
export interface WorkflowParameterDefinition extends WorkflowParameter {
    name: string;
    isEditable: boolean;
}
export interface WorkflowParametersState {
    definitions: Record<string, WorkflowParameterDefinition>;
    validationErrors: Record<string, Record<string, string | undefined>>;
    isDirty: boolean;
    changeCount: number;
}
export declare const initialState: WorkflowParametersState;
export declare const validateParameter: (id: string, data: {
    name?: string;
    type?: string;
    value?: string;
    defaultValue?: string;
}, keyToValidate: string, allDefinitions: Record<string, WorkflowParameterDefinition>, required?: boolean) => string | undefined;
export declare const workflowParametersSlice: import("@reduxjs/toolkit").Slice<WorkflowParametersState, {
    initializeParameters: (state: import("immer/dist/internal").WritableDraft<WorkflowParametersState>, action: PayloadAction<Record<string, WorkflowParameterDefinition>>) => void;
    addParameter: (state: import("immer/dist/internal").WritableDraft<WorkflowParametersState>) => void;
    deleteParameter: (state: import("immer/dist/internal").WritableDraft<WorkflowParametersState>, action: PayloadAction<string>) => void;
    updateParameter: (state: import("immer/dist/internal").WritableDraft<WorkflowParametersState>, action: PayloadAction<WorkflowParameterUpdateEvent>) => void;
    setIsWorkflowParametersDirty: (state: import("immer/dist/internal").WritableDraft<WorkflowParametersState>, action: PayloadAction<boolean>) => void;
}, "workflowParameters">;
export declare const initializeParameters: import("@reduxjs/toolkit").ActionCreatorWithPayload<Record<string, WorkflowParameterDefinition>, "workflowParameters/initializeParameters">, addParameter: import("@reduxjs/toolkit").ActionCreatorWithoutPayload<"workflowParameters/addParameter">, deleteParameter: import("@reduxjs/toolkit").ActionCreatorWithPayload<string, "workflowParameters/deleteParameter">, updateParameter: import("@reduxjs/toolkit").ActionCreatorWithPayload<WorkflowParameterUpdateEvent, "workflowParameters/updateParameter">, setIsWorkflowParametersDirty: import("@reduxjs/toolkit").ActionCreatorWithPayload<boolean, "workflowParameters/setIsWorkflowParametersDirty">;
declare const _default: import("@reduxjs/toolkit").Reducer<WorkflowParametersState, import("@reduxjs/toolkit").AnyAction>;
export default _default;
