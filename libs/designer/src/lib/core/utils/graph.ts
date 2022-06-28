import { WORKFLOW_EDGE_TYPES, WORKFLOW_NODE_TYPES } from '../parsers/models/workflowNode';
import type { WorkflowEdge, WorkflowNode, WorkflowEdgeType, WorkflowNodeType } from '../parsers/models/workflowNode';
import type { NodesMetadata } from '../state/workflowSlice';
import { equals } from '@microsoft-logic-apps/utils';
import type { ElkExtendedEdge, ElkNode } from 'elkjs';

export const isRootNode = (graph: WorkflowNode, nodeId: string, nodesMetadata: NodesMetadata) => {
  return nodesMetadata[nodeId]?.graphId === graph.id && !graph?.edges?.some((edge) => equals(edge.target, nodeId));
};

// This is the starting size for all nodes
const DEFAULT_NODE_SIZE = {
  width: 200,
  height: 40,
};

// Creating generic layout nodes and edges below

export const createWorkflowNode = (id: string, type?: WorkflowNodeType): WorkflowNode => ({
  id,
  ...DEFAULT_NODE_SIZE,
  type: type ?? WORKFLOW_NODE_TYPES.TEST_NODE,
});

export const createElkNode = (id: string, type?: WorkflowNodeType): ElkNode => ({
  id,
  ...DEFAULT_NODE_SIZE,
  layoutOptions: {
    nodeType: type ?? WORKFLOW_NODE_TYPES.TEST_NODE,
  },
});

export const createWorkflowEdge = (source: string, target: string, type?: WorkflowEdgeType): WorkflowEdge => ({
  id: `${source}-${target}`,
  source,
  target,
  type: type ?? WORKFLOW_EDGE_TYPES.BUTTON_EDGE,
});

export const createElkEdge = (source: string, target: string, type?: WorkflowEdgeType): ElkExtendedEdge => ({
  id: `${source}-${target}`,
  sources: [source],
  targets: [target],
  layoutOptions: {
    edgeType: type ?? WORKFLOW_EDGE_TYPES.BUTTON_EDGE,
  },
});
