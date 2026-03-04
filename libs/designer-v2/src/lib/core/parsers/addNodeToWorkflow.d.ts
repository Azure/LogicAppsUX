import type { RelationshipIds } from '../state/panel/panelTypes';
import type { NodesMetadata, WorkflowState } from '../state/workflow/workflowInterfaces';
import type { WorkflowEdge, WorkflowNode } from './models/workflowNode';
import type { DiscoveryOperation, DiscoveryResultTypes } from '@microsoft/logic-apps-shared';
export interface AddNodePayload {
    operation: DiscoveryOperation<DiscoveryResultTypes>;
    nodeId: string;
    relationshipIds: RelationshipIds;
    isParallelBranch?: boolean;
    isTrigger?: boolean;
}
export declare const addNodeToWorkflow: (payload: AddNodePayload, workflowGraph: WorkflowNode, nodesMetadata: NodesMetadata, state: WorkflowState) => void;
export declare const addChildNode: (graph: WorkflowNode, node: WorkflowNode) => void;
export declare const addChildEdge: (graph: WorkflowNode, edge: WorkflowEdge) => void;
export declare const addSwitchCaseToWorkflow: (caseId: string, switchNode: WorkflowNode, nodesMetadata: NodesMetadata, state: WorkflowState) => void;
export declare const addAgentToolToWorkflow: (toolId: string, agentNode: WorkflowNode, nodesMetadata: NodesMetadata, state: WorkflowState) => void;
export declare const addMcpServerToWorkflow: (toolId: string, agentNode: WorkflowNode, nodesMetadata: NodesMetadata, state: WorkflowState, operation?: DiscoveryOperation<DiscoveryResultTypes>) => void;
