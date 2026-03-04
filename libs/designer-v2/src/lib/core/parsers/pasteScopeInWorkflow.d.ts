import type { RelationshipIds } from '../state/panel/panelTypes';
import type { NodesMetadata, Operations, WorkflowState } from '../state/workflow/workflowInterfaces';
import type { WorkflowNode } from './models/workflowNode';
export interface PasteScopeNodePayload {
    relationshipIds: RelationshipIds;
    scopeNode: WorkflowNode;
    operations: Operations;
    nodesMetadata: NodesMetadata;
    allActions: string[];
    isParallelBranch?: boolean;
}
export declare const pasteScopeInWorkflow: (scopeNode: WorkflowNode, workflowGraph: WorkflowNode, relationshipIds: RelationshipIds, operations: Operations, nodesMetadata: NodesMetadata, allActions: string[], state: WorkflowState, isParallelBranch?: boolean) => void;
