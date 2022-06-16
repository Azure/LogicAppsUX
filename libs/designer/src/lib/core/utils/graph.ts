import type { WorkflowGraph } from '../parsers/models/workflowNode';
import type { NodesMetadata } from '../state/workflowSlice';
import { equals } from '@microsoft-logic-apps/utils';

export const isRootNode = (graph: WorkflowGraph, nodeId: string, nodesMetadata: NodesMetadata): boolean => {
  return nodesMetadata[nodeId]?.graphId === graph.id && !graph.edges.some((edge) => equals(edge.target, nodeId));
};
