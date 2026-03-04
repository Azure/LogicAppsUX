import type { Settings } from '../actions/bjsworkflow/settings';
import type { OperationMetadataState } from '../state/operation/operationMetadataSlice';
import type { WorkflowState } from '../state/workflow/workflowInterfaces';
export declare function hasSecureOutputs(nodeType: string, allSettings: Settings | undefined): boolean;
export declare function isSecureOutputsLinkedToInputs(nodeType?: string): boolean;
export declare function getSplitOnValue(workflowState: WorkflowState, operationState: OperationMetadataState): string | undefined;
