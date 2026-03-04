import type { PayloadAction } from '@reduxjs/toolkit';
import type { ConnectionReferences } from '../../../common/models/workflow';
import type { UpdateConnectionPayload } from '../../actions/bjsworkflow/connections';
export interface ResourceDetails {
    subscriptionId: string;
    resourceGroup: string;
    location: string;
    workflowAppName?: string;
}
export interface ConnectionMapping {
    references: ConnectionReferences;
    mapping: Record<string, string>;
}
export interface WorkflowState {
    isConsumption?: boolean;
    isCreateView?: boolean;
    subscriptionId: string;
    resourceGroup: string;
    location: string;
    workflowAppName?: string;
    logicAppName?: string;
    connections: ConnectionMapping;
}
interface InitialWorkflowState {
    isConsumption?: boolean;
    subscriptionId: string;
    resourceGroup: string;
    location: string;
    workflowAppName?: string;
    logicAppName?: string;
    references?: ConnectionReferences;
    isCreateView?: boolean;
}
export declare const workflowSlice: import("@reduxjs/toolkit").Slice<WorkflowState, {
    setInitialData: (state: import("immer/dist/internal").WritableDraft<WorkflowState>, action: PayloadAction<InitialWorkflowState>) => void;
    changeConnectionMapping: (state: import("immer/dist/internal").WritableDraft<WorkflowState>, action: PayloadAction<UpdateConnectionPayload & {
        connectionKey: string;
    }>) => void;
    setSubscription: (state: import("immer/dist/internal").WritableDraft<WorkflowState>, action: PayloadAction<string>) => void;
    setResourceGroup: (state: import("immer/dist/internal").WritableDraft<WorkflowState>, action: PayloadAction<string>) => void;
    setLocation: (state: import("immer/dist/internal").WritableDraft<WorkflowState>, action: PayloadAction<string>) => void;
    setLogicAppDetails: (state: import("immer/dist/internal").WritableDraft<WorkflowState>, action: PayloadAction<{
        name: string;
        location: string;
        plan: string;
    }>) => void;
    setWorkflowAppDetails: (state: import("immer/dist/internal").WritableDraft<WorkflowState>, action: PayloadAction<{
        name: string;
        location: string;
    }>) => void;
}, "workflow">;
export declare const setInitialData: import("@reduxjs/toolkit").ActionCreatorWithPayload<InitialWorkflowState, "workflow/setInitialData">, changeConnectionMapping: import("@reduxjs/toolkit").ActionCreatorWithPayload<UpdateConnectionPayload & {
    connectionKey: string;
}, "workflow/changeConnectionMapping">, setSubscription: import("@reduxjs/toolkit").ActionCreatorWithPayload<string, "workflow/setSubscription">, setResourceGroup: import("@reduxjs/toolkit").ActionCreatorWithPayload<string, "workflow/setResourceGroup">, setLocation: import("@reduxjs/toolkit").ActionCreatorWithPayload<string, "workflow/setLocation">, setWorkflowAppDetails: import("@reduxjs/toolkit").ActionCreatorWithPayload<{
    name: string;
    location: string;
}, "workflow/setWorkflowAppDetails">, setLogicAppDetails: import("@reduxjs/toolkit").ActionCreatorWithPayload<{
    name: string;
    location: string;
    plan: string;
}, "workflow/setLogicAppDetails">;
declare const _default: import("@reduxjs/toolkit").Reducer<WorkflowState, import("@reduxjs/toolkit").AnyAction>;
export default _default;
