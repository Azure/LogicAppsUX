import type { RootState } from '../../store';
import type { WorkflowParametersState } from './workflowparametersSlice';
export declare const getWorkflowParametersState: (state: RootState) => WorkflowParametersState;
export declare const useWorkflowParameters: () => Record<string, import("./workflowparametersSlice").WorkflowParameterDefinition>;
export declare const useWorkflowParameterValidationErrors: () => Record<string, Record<string, string | undefined>>;
export declare const useIsWorkflowParametersDirty: () => boolean;
export declare const useWorkflowParametersChangeCount: () => number;
