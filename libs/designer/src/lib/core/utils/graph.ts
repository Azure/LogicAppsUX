import { isWorkflowGraph } from '../parsers/models/workflowNode';
import type { WorkflowEdge, WorkflowNode } from '../parsers/models/workflowNode';
import type { NodesMetadata, Operations, WorkflowState } from '../state/workflow/workflowInterfaces';
import type { WorkflowEdgeType, WorkflowNodeType } from '@microsoft/utils-logic-apps';
import { equals, WORKFLOW_EDGE_TYPES, WORKFLOW_NODE_TYPES } from '@microsoft/utils-logic-apps';
import type { ElkExtendedEdge, ElkNode } from 'elkjs';

export const isRootNodeInGraph = (nodeId: string, graphId: string, nodesMetadata: NodesMetadata): boolean => {
  return nodesMetadata[nodeId]?.graphId === graphId && !!nodesMetadata[nodeId]?.isRoot;
};

export const isRootNode = (nodeId: string, nodesMetadata: NodesMetadata) => {
  return !!nodesMetadata[nodeId]?.isRoot;
};

export const getTriggerNode = (state: WorkflowState): WorkflowNode => {
  const rootGraph = state.graph as WorkflowNode;
  const rootNode = rootGraph.children?.find((child) => isRootNode(child.id, state.nodesMetadata)) as WorkflowNode;
  return rootNode;
};

export const getTriggerNodeId = (state: WorkflowState): string => {
  return getTriggerNode(state)?.id;
};

export const isLeafNodeFromEdges = (edges: WorkflowEdge[]) => {
  return edges.filter((edge) => edge.type !== WORKFLOW_EDGE_TYPES.HIDDEN_EDGE).length === 0;
};

// This is the starting size for all nodes
export const DEFAULT_NODE_SIZE = {
  width: 200,
  height: 40,
};

// Creating generic layout nodes and edges below

export const createWorkflowNode = (id: string, type?: WorkflowNodeType): WorkflowNode => ({
  id,
  ...DEFAULT_NODE_SIZE,
  type: type ?? WORKFLOW_NODE_TYPES.OPERATION_NODE,
});

export const createElkNode = (id: string, type?: WorkflowNodeType): ElkNode => ({
  id,
  ...DEFAULT_NODE_SIZE,
  layoutOptions: {
    nodeType: type ?? WORKFLOW_NODE_TYPES.OPERATION_NODE,
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

export const getUpstreamNodeIds = (
  nodeId: string,
  rootGraph: WorkflowNode,
  nodesMetadata: NodesMetadata,
  operationMap: Record<string, string>
): string[] => {
  const graph = getGraphNode(nodeId, rootGraph, nodesMetadata) as WorkflowNode;
  const sourceNodeIds = isWorkflowGraph(graph) ? getAllSourceNodeIds(graph, nodeId, operationMap) : [];
  const allParentNodeIds = getAllParentsForNode(nodeId, nodesMetadata);

  for (const parentNodeId of allParentNodeIds) {
    const graphContainingNode = getGraphNode(parentNodeId, rootGraph, nodesMetadata);
    if (graphContainingNode) {
      sourceNodeIds.push(...getAllSourceNodeIds(graphContainingNode, parentNodeId, operationMap));
    }
  }

  return sourceNodeIds;
};

export const getNode = (nodeId: string, currentNode: WorkflowNode): WorkflowNode | undefined => {
  if (currentNode.id === nodeId) {
    return currentNode;
  } else {
    let result;
    for (const child of currentNode.children ?? []) {
      result = getNode(nodeId, child as WorkflowNode);

      if (result) {
        return result;
      }
    }

    return result;
  }
};

export const getGraphNode = (nodeId: string, node: WorkflowNode, nodesMetadata: NodesMetadata): WorkflowNode | undefined => {
  if (!nodesMetadata[nodeId]) return undefined;
  return getNode(nodesMetadata[nodeId].graphId, node);
};

export const getImmediateSourceNodeIds = (graph: WorkflowNode, nodeId: string): string[] => {
  return (graph.edges ?? []).filter((edge) => edge.target === nodeId && !edge.id.includes('#')).map((edge) => edge.source);
};

export const getNewNodeId = (state: WorkflowState, nodeId: string): string => {
  let newNodeId = nodeId;
  let count = 1;
  while (state.operations[newNodeId]) {
    newNodeId = `${nodeId}_${count}`;
    count++;
  }

  return newNodeId;
};
const getAllSourceNodeIds = (graph: WorkflowNode, nodeId: string, operationMap: Record<string, string>): string[] => {
  const visited: string[] = [];
  const visit = [...getImmediateSourceNodeIds(graph, nodeId)];

  while (visit.length) {
    const current = visit.shift() as string;
    if (visited.indexOf(current) < 0) {
      visited.push(current);
      visited.push(...getAllNodesInsideNode(current, graph, operationMap));
      visit.push(...getImmediateSourceNodeIds(graph, current));
    }
  }
  return visited;
};

export const getAllParentsForNode = (nodeId: string, nodesMetadata: NodesMetadata): string[] => {
  let currentParent = nodesMetadata[nodeId].parentNodeId;
  const result: string[] = [];

  while (currentParent) {
    result.push(currentParent);
    currentParent = nodesMetadata[currentParent].parentNodeId;
  }

  return result;
};

export const getAllNodesInsideNode = (nodeId: string, graph: WorkflowNode, operationMap: Record<string, string>): string[] => {
  const currentGraph = getNode(nodeId, graph) as WorkflowNode;
  const result: string[] = [];

  if (isWorkflowGraph(currentGraph)) {
    for (const child of currentGraph.children as WorkflowNode[]) {
      const childId = child.id;
      if (operationMap[childId]) {
        result.push(childId);
      }

      result.push(...getAllNodesInsideNode(childId, child, operationMap));
    }
  }

  return result;
};

export const getFirstParentOfType = (
  nodeId: string,
  type: string,
  nodesMetadata: NodesMetadata,
  operations: Operations
): string | undefined => {
  const parentNodeId = nodesMetadata[nodeId]?.parentNodeId;

  if (parentNodeId) {
    if (equals(operations[parentNodeId]?.type, type)) {
      return parentNodeId;
    }

    return nodesMetadata[parentNodeId]?.parentNodeId
      ? getFirstParentOfType(nodesMetadata[parentNodeId].parentNodeId as string, type, nodesMetadata, operations)
      : getFirstParentOfType(parentNodeId, type, nodesMetadata, operations);
  }

  return undefined;
};
