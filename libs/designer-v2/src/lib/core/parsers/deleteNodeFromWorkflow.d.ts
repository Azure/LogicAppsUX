import type { NodesMetadata, WorkflowState } from '../state/workflow/workflowInterfaces';
import type { WorkflowNode } from './models/workflowNode';
export interface DeleteNodePayload {
    nodeId: string;
    isTrigger: boolean;
}
export declare const deleteNodeFromWorkflow: (payload: DeleteNodePayload, workflowGraph: WorkflowNode, nodesMetadata: NodesMetadata, state: WorkflowState) => void;
export declare const deleteMcpServerNodeFromWorkflow: (payload: {
    toolId: string;
    agentId: string;
}, workflowGraph: WorkflowNode, nodesMetadata: NodesMetadata, state: WorkflowState) => void;
export declare const deleteWorkflowNode: (nodeId: string, graph: WorkflowNode) => void;
