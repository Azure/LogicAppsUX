import type { WorkflowNode } from '../parsers/models/workflowNode';
import type { WorkflowState } from '../state/workflow/workflowInterfaces';
import { getWorkflowNodeFromGraphState } from '../state/workflow/workflowGraphTraversal';
import { getImmediateSourceNodeIds } from './graph';
import { getRecordEntry } from '@microsoft/logic-apps-shared';

/**
 * Returns the graphId shared by every node in `nodeIds`, or undefined if they
 * do not all live on the same graph level.
 */
export const getCommonGraphId = (state: WorkflowState, nodeIds: string[]): string | undefined => {
  if (nodeIds.length === 0) {
    return undefined;
  }
  const firstGraphId = getRecordEntry(state.nodesMetadata, nodeIds[0])?.graphId;
  if (firstGraphId === undefined) {
    return undefined;
  }
  for (const nodeId of nodeIds) {
    if (getRecordEntry(state.nodesMetadata, nodeId)?.graphId !== firstGraphId) {
      return undefined;
    }
  }
  return firstGraphId;
};

const getChildEdgeTargets = (graph: WorkflowNode, nodeId: string): string[] =>
  (graph?.edges ?? []).filter((edge) => edge.source === nodeId && !/%(scope|subgraph|footer)/i.test(edge.id)).map((edge) => edge.target);

/**
 * Determines whether the selected nodes form a contiguous connected subgraph on
 * the same graph level — either a simple chain or a tree/DAG with parallel
 * branches. The selection must have a single entry node (no selected parent),
 * all nodes must be reachable from that entry through selected edges, and no
 * unselected node may sit on a path between two selected nodes (convexity).
 * Returns a topological ordering when valid, otherwise undefined.
 */
export const getOrderedSelectedChain = (state: WorkflowState, nodeIds: string[]): string[] | undefined => {
  if (nodeIds.length === 0) {
    return undefined;
  }

  // A single node is trivially a valid chain — it can be wrapped in a scope by itself.
  if (nodeIds.length === 1) {
    const metadata = getRecordEntry(state.nodesMetadata, nodeIds[0]);
    if (metadata?.isTrigger || metadata?.isRoot) {
      return undefined;
    }
    return nodeIds;
  }

  const graphId = getCommonGraphId(state, nodeIds);
  if (graphId === undefined) {
    return undefined;
  }

  // Triggers / root nodes cannot be wrapped.
  for (const nodeId of nodeIds) {
    const metadata = getRecordEntry(state.nodesMetadata, nodeId);
    if (metadata?.isTrigger || metadata?.isRoot) {
      return undefined;
    }
  }

  const graph = getWorkflowNodeFromGraphState(state, graphId);
  if (!graph) {
    return undefined;
  }

  const selected = new Set(nodeIds);

  // Map each selected node to its selected children / parents within the graph.
  const selectedChildren = new Map<string, string[]>();
  const selectedParents = new Map<string, string[]>();
  for (const nodeId of nodeIds) {
    selectedChildren.set(
      nodeId,
      getChildEdgeTargets(graph, nodeId).filter((target) => selected.has(target))
    );
    selectedParents.set(
      nodeId,
      getImmediateSourceNodeIds(graph, nodeId).filter((source) => selected.has(source))
    );
  }

  // The subgraph must have a single entry node (no selected parent).
  const startNodes = nodeIds.filter((nodeId) => (selectedParents.get(nodeId)?.length ?? 0) === 0);
  if (startNodes.length !== 1) {
    return undefined;
  }

  // Topological sort (BFS / Kahn's algorithm) — produces a valid ordering that
  // respects parent-before-child ordering, including parallel branches.
  const inDegree = new Map<string, number>();
  for (const nodeId of nodeIds) {
    inDegree.set(nodeId, selectedParents.get(nodeId)?.length ?? 0);
  }

  const queue: string[] = [startNodes[0]];
  const ordered: string[] = [];

  while (queue.length > 0) {
    const current = queue.shift() as string;
    ordered.push(current);
    for (const child of selectedChildren.get(current) ?? []) {
      const newDegree = (inDegree.get(child) ?? 1) - 1;
      inDegree.set(child, newDegree);
      if (newDegree === 0) {
        queue.push(child);
      }
    }
  }

  // Every selected node must be reachable from the entry (connected subgraph, no cycles).
  if (ordered.length !== nodeIds.length) {
    return undefined;
  }

  // Convexity: no unselected node may sit on a path between two selected nodes.
  // For every edge selected -> unselected, that unselected node must not be able
  // to reach back into the selection.
  for (const nodeId of nodeIds) {
    const unselectedChildren = getChildEdgeTargets(graph, nodeId).filter((target) => !selected.has(target));
    for (const boundary of unselectedChildren) {
      if (reachesSelection(graph, boundary, selected)) {
        return undefined;
      }
    }
  }

  return ordered;
};

const reachesSelection = (graph: WorkflowNode, startId: string, selected: Set<string>): boolean => {
  const stack = [startId];
  const seen = new Set<string>();
  while (stack.length > 0) {
    const nodeId = stack.pop() as string;
    if (seen.has(nodeId)) {
      continue;
    }
    seen.add(nodeId);
    if (selected.has(nodeId)) {
      return true;
    }
    for (const target of getChildEdgeTargets(graph, nodeId)) {
      stack.push(target);
    }
  }
  return false;
};

/**
 * Filters a set of selected node IDs down to only those that sit on the
 * outermost common graph level. Nodes nested inside another selected scope
 * are excluded — they will stay inside their scope when wrapping.
 */
export const getTopLevelSelectedNodes = (state: WorkflowState, nodeIds: string[]): string[] => {
  if (nodeIds.length <= 1) {
    return nodeIds;
  }

  const selected = new Set(nodeIds);
  return nodeIds.filter((nodeId) => {
    // Walk up the graph hierarchy; if any ancestor is also selected, exclude this node.
    let currentGraphId = getRecordEntry(state.nodesMetadata, nodeId)?.graphId;
    while (currentGraphId && currentGraphId !== 'root') {
      // The graphId IS the parent scope node id.
      if (selected.has(currentGraphId)) {
        return false;
      }
      currentGraphId = getRecordEntry(state.nodesMetadata, currentGraphId)?.graphId;
    }
    return true;
  });
};

/**
 * Whether the current selection can be wrapped in a scope-style container.
 */
export const canWrapSelectedNodes = (state: WorkflowState, nodeIds: string[]): boolean => {
  const topLevel = getTopLevelSelectedNodes(state, nodeIds);
  return getOrderedSelectedChain(state, topLevel) !== undefined;
};
