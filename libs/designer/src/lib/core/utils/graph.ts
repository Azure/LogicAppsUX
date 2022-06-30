import { isWorkflowGraph, WORKFLOW_EDGE_TYPES, WORKFLOW_NODE_TYPES } from '../parsers/models/workflowNode';
import type { WorkflowEdge, WorkflowNode, WorkflowEdgeType, WorkflowNodeType} from '../parsers/models/workflowNode';
import type { NodesMetadata } from '../state/workflowSlice';
import { equals } from '@microsoft-logic-apps/utils';
import type { ElkExtendedEdge, ElkNode } from 'elkjs';

export const isRootNode = (graph: WorkflowNode, nodeId: string, nodesMetadata: NodesMetadata) => {
  return nodesMetadata[nodeId]?.graphId === graph.id && !graph.edges?.some((edge) => equals(edge.target, nodeId));
};

export const isLeafNodeFromEdges = (edges: WorkflowEdge[]) => {
  return edges.filter((edge) => !edge.target.endsWith('#footer')).length === 0;
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

export const getUpstreamNodeIds = (nodeId: string, rootGraph: WorkflowNode, nodesMetadata: NodesMetadata): string[] => {
  const graph = getGraphNode(nodeId, rootGraph, nodesMetadata) as WorkflowNode;
  const sourceNodeIds = isWorkflowGraph(graph) ? getAllSourceNodeIds(graph, nodeId) : [];
  const allParentNodeIds = getAllParentsForNode(nodeId, nodesMetadata);

  for (const parentNodeId of allParentNodeIds) {
    const graphContainingNode = getGraphNode(parentNodeId, rootGraph, nodesMetadata);
    if (graphContainingNode) {
      sourceNodeIds.push(...getAllSourceNodeIds(graphContainingNode, parentNodeId));
    }
  }

  return sourceNodeIds;
}

const getNode = (nodeId: string, currentNode: WorkflowNode): WorkflowNode | undefined => {
  if (currentNode.id === nodeId) {
    return currentNode;
  } else {
    let result;
    for (const child of currentNode.children ?? []) {
      result = getNode(nodeId, child as unknown as WorkflowNode);
    }

    return result;
  }
}

const getGraphNode = (nodeId: string, node: WorkflowNode, nodesMetadata: NodesMetadata): WorkflowNode | undefined => {
  return getNode(nodesMetadata[nodeId].graphId, node);
}

const getImmediateSourceNodeIds = (graph: WorkflowNode, nodeId: string): string[] => {
  return (graph.edges ?? []).filter(edge => edge.target === nodeId && !edge.id.includes('#')).map(edge => edge.source);
}

const getAllSourceNodeIds = (graph: WorkflowNode, nodeId: string): string[] => {
  const sourceNodeIds: string[] = [];
  const visited: string[] = [];
  const visit = [nodeId];

  while (visit.length) {
    const current = visit.shift() as string;
    if (visited.indexOf(current) < 0) {
        visited.push(current);
        sourceNodeIds.push(...getImmediateSourceNodeIds(graph, current));
    }
  }
  return sourceNodeIds;
}

const getAllParentsForNode = (nodeId: string, nodesMetadata: NodesMetadata): string[] => {
  let currentParent = nodesMetadata[nodeId].parentNodeId;
  const result: string[] = [];

  while (currentParent) {
    result.push(currentParent);
    currentParent = nodesMetadata[currentParent].parentNodeId;
  }

  return result;
}

export const getAllNodesInsideNode = (nodeId: string, graph: WorkflowNode, operationMap: Record<string, string>): string[] => {
  const currentGraph = getNode(nodeId, graph) as WorkflowNode;
  const result: string[] = [];

  if (isWorkflowGraph(currentGraph)) {
    for (const child of currentGraph.children as WorkflowNode[]) {
      const childId = child.id;
      if (operationMap[childId]) {
        result.push(childId);
      }

      result.push(...getAllNodesInsideNode(childId, child, operationMap))
    }
  }

  return result;
}
