import type { WorkflowNode } from '../../parsers/models/workflowNode';
import type { WorkflowState } from './workflowInterfaces';
import Queue from 'yocto-queue';

/**
 * Recursively searches for a WorkflowNode by ID starting from the graph root.
 * Returns undefined if the node is not found or the graph is empty.
 */
export const getWorkflowNodeFromGraphState = (state: WorkflowState, actionId: string): WorkflowNode | undefined => {
  const graph = state.graph;
  if (!graph) {
    return undefined;
  }

  const traverseGraph = (node: WorkflowNode): WorkflowNode | undefined => {
    if (node.id === actionId) {
      return node;
    }

    for (const child of node.children ?? []) {
      const childRes = traverseGraph(child);
      if (childRes) {
        return childRes;
      }
    }
    return undefined;
  };

  return traverseGraph(graph);
};

/**
 * Returns the array of ancestor node IDs leading to the given graphId, ending with graphId itself.
 * If graphId is not found, returns [graphId].
 */
export const getWorkflowGraphPath = (graph: WorkflowNode, graphId: string): string[] => {
  const traverseGraph = (node: WorkflowNode, path: string[] = []): string[] | undefined => {
    if (node.id === graphId) {
      return path;
    }
    for (const child of node.children ?? []) {
      const childResult = traverseGraph(child, [...path, node.id]);
      if (childResult) {
        return childResult;
      }
    }
    return undefined;
  };

  return [...(traverseGraph(graph) ?? []), graphId];
};

/**
 * Builds a flat Map<string, WorkflowNode> index of all nodes via BFS.
 * Returns an empty map if graph is null.
 */
export const buildNodeIndex = (graph: WorkflowNode | null): Map<string, WorkflowNode> => {
  const index = new Map<string, WorkflowNode>();
  if (!graph) {
    return index;
  }

  const queue = new Queue<WorkflowNode>();
  queue.enqueue(graph);
  while (queue.size > 0) {
    const node = queue.dequeue();
    if (!node) {
      break;
    }
    index.set(node.id, node);
    for (const child of node.children ?? []) {
      queue.enqueue(child);
    }
  }
  return index;
};
