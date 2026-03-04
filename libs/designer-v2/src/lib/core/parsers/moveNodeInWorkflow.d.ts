import type { RelationshipIds } from '../state/panel/panelTypes';
import type { NodesMetadata, WorkflowState } from '../state/workflow/workflowInterfaces';
import type { WorkflowNode } from './models/workflowNode';
export interface MoveNodePayload {
    nodeId: string;
    oldGraphId: string;
    newGraphId: string;
    relationshipIds: RelationshipIds;
}
export declare const moveNodeInWorkflow: (currentNode: WorkflowNode, oldWorkflowGraph: WorkflowNode, newWorkflowGraph: WorkflowNode, relationshipIds: RelationshipIds, nodesMetadata: NodesMetadata, state: WorkflowState) => void;
