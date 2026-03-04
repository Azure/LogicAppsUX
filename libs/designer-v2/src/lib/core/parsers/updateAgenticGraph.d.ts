import type { WorkflowState } from '../state/workflow/workflowInterfaces';
import type { WorkflowNode } from './models/workflowNode';
export interface UpdateAgenticGraphPayload {
    nodeId: string;
    scopeRepetitionRunData: Record<string, any>;
}
export declare const updateAgenticSubgraph: (payload: UpdateAgenticGraphPayload, agentGraph: WorkflowNode, state: WorkflowState) => void;
