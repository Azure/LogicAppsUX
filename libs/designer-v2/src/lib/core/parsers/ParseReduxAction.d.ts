import type { Workflow } from '../../common/models/workflow';
import type { RootState } from '../store';
import type { DeserializedWorkflow } from './BJSWorkflow/BJSDeserializer';
import type { WorkflowNode } from './models/workflowNode';
import type { LogicAppsV2 } from '@microsoft/logic-apps-shared';
interface InitWorkflowPayload {
    deserializedWorkflow: DeserializedWorkflow;
    originalDefinition: LogicAppsV2.WorkflowDefinition;
}
export declare const initializeGraphState: import("@reduxjs/toolkit").AsyncThunk<InitWorkflowPayload, {
    workflowDefinition: Workflow;
    runInstance: LogicAppsV2.RunInstanceDefinition | null | undefined;
    isMultiVariableEnabled?: boolean | undefined;
}, {
    state: RootState;
    dispatch?: import("@reduxjs/toolkit").Dispatch<import("@reduxjs/toolkit").AnyAction> | undefined;
    extra?: unknown;
    rejectValue?: unknown;
    serializedErrorType?: unknown;
    pendingMeta?: unknown;
    fulfilledMeta?: unknown;
    rejectedMeta?: unknown;
}>;
export declare function updateChildrenDimensions(currentChildren: WorkflowNode[], previousChildren: WorkflowNode[]): void;
export declare function flattenWorkflowNodes(nodes: WorkflowNode[]): WorkflowNode[];
export declare const detectSequentialInitializeVariables: (definition: LogicAppsV2.WorkflowDefinition) => boolean;
/**
 * Checks if a variable value contains references to other variables.
 * Detects variables() calls in any context including:
 * - Direct references: @variables('name') or @{variables('name')}
 * - Nested in expressions: @{substring(variables('name'), ...)}
 * - Inside other functions: @{length(variables('name'))}
 */
export declare const hasVariableReference: (value: any) => boolean;
export declare const combineSequentialInitializeVariables: (definition: LogicAppsV2.WorkflowDefinition) => LogicAppsV2.WorkflowDefinition;
export {};
