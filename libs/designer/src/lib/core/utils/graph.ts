import type { WorkflowNode } from '../parsers/models/workflowNode';
import type { NodesMetadata } from '../state/workflowSlice';
import { equals } from '@microsoft-logic-apps/utils';

export const isRootNode = (graph: WorkflowNode, nodeId: string, nodesMetadata: NodesMetadata): boolean => {
  return nodesMetadata[nodeId]?.graphId === graph.id && !graph?.edges?.some((edge) => equals(edge.target, nodeId));
};
