import type { NodesMetadata } from '../../state/workflowSlice';
import { equals } from '@microsoft-logic-apps/utils';

export type WorkflowNodeType = 'graphNode' | 'testNode' | 'scopeNode' | 'subgraphHeader' | 'hiddenNode';

export interface WorkflowNode {
  id: string;
  type: WorkflowNodeType;
  children?: WorkflowNode[];
  edges?: WorkflowEdge[]; // Graph nodes only
  height?: number; // Action nodes only
  width?: number; // Action Nodes only
}

export type WorkflowEdgeType = 'buttonEdge' | 'onlyEdge' | 'hiddenEdge';

export interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  type?: WorkflowEdgeType;
}

export const isWorkflowNode = (node: WorkflowNode) => node.type !== 'graphNode';
export const isWorkflowGraph = (node: WorkflowNode) => node.type === 'graphNode';

export const isRootNode = (graph: WorkflowNode, nodeId: string, nodesMetadata: NodesMetadata) => {
  return nodesMetadata[nodeId]?.graphId === graph.id && !graph?.edges?.some((edge) => equals(edge.target, nodeId));
};
