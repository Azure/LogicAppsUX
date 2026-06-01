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
  (graph?.edges ?? []).filter((edge) => edge.source === nodeId && !/#(scope|subgraph|footer)/i.test(edge.id)).map((edge) => edge.target);

/**
 * Determines whether the selected nodes form a single contiguous chain on the
 * same graph level: connected to one another with no unselected node sitting
 * between two selected nodes, and with at most one selected predecessor/successor
 * each (a simple path). Returns the ordered chain when valid, otherwise undefined.
 */
export const getOrderedSelectedChain = (state: WorkflowState, nodeIds: string[]): string[] | undefined => {
  if (nodeIds.length < 2) {
    return undefined;
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

  // Simple-path requirement: each node has at most one selected parent and child.
  for (const nodeId of nodeIds) {
    if ((selectedChildren.get(nodeId)?.length ?? 0) > 1 || (selectedParents.get(nodeId)?.length ?? 0) > 1) {
      return undefined;
    }
  }

  // The chain must have a single entry node (no selected parent).
  const startNodes = nodeIds.filter((nodeId) => (selectedParents.get(nodeId)?.length ?? 0) === 0);
  if (startNodes.length !== 1) {
    return undefined;
  }

  // Walk the chain from the entry node; it must cover every selected node.
  const ordered: string[] = [];
  const visited = new Set<string>();
  let current: string | undefined = startNodes[0];
  while (current !== undefined) {
    if (visited.has(current)) {
      return undefined;
    }
    visited.add(current);
    ordered.push(current);
    const children: string[] = selectedChildren.get(current) ?? [];
    current = children[0];
  }

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
 * Whether the current selection can be wrapped in a scope-style container.
 */
export const canWrapSelectedNodes = (state: WorkflowState, nodeIds: string[]): boolean =>
  getOrderedSelectedChain(state, nodeIds) !== undefined;
