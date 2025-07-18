import { equals } from '@microsoft/logic-apps-shared';
import type { WorkflowNode } from '../../../core/parsers/models/workflowNode';
import type { WorkflowState } from './workflowInterfaces';

/**
 * Recursively clones a node while pruning (removing) any nodes that are in the nodesToRemove set.
 * Also, if the node’s id is in collapsedIds, its type is set to "COLLAPSED_NODE" and its children are not cloned.
 * @param {WorkflowNode} node - The current node to clone and prune.
 * @param {Set<string>} nodesToRemove - Set of node ids that should be removed.
 * @param {Record<string, any>} collapsedIds - An object whose keys are node ids to be collapsed.
 * @returns {WorkflowNode | null} - A new node object with pruned children/edges, or null if this node is removed.
 */
const pruneTree = (node: WorkflowNode, nodesToRemove: Set<string>, collapsedIds: Record<string, any>): WorkflowNode | null => {
  // If the current node is marked for removal, skip it.
  if (nodesToRemove.has(node.id)) {
    return null;
  }

  // Create a shallow clone so we don't mutate the original.
  const newNode = { ...node };

  // If the node is one that should be collapsed,
  // update its type and remove its children/edges.
  if (collapsedIds[node.id]) {
    newNode.type = 'COLLAPSED_NODE';
    delete newNode.children;
    delete newNode.edges;
    return newNode;
  }

  // Otherwise, recursively process children if they exist.
  if (Array.isArray(node.children)) {
    newNode.children = node.children
      .map((child) => pruneTree(child, nodesToRemove, collapsedIds))
      .filter((child): child is WorkflowNode => child !== null);
  }

  // Filter out any edges that reference removed nodes.
  if (Array.isArray(node.edges)) {
    newNode.edges = node.edges.filter((edge) => {
      return !nodesToRemove.has(edge.source) && !nodesToRemove.has(edge.target);
    });
  }

  return newNode;
};

/**
 * Traverses the tree to build two mappings:
 * - nodeMap: node id -> node
 * - edgeGraph: source node id -> array of target node ids
 */
const traverseForMapping = (node: WorkflowNode, nodeMap: Record<string, WorkflowNode>, edgeGraph: Record<string, string[]>): void => {
  nodeMap[node.id] = node;

  if (node.edges && Array.isArray(node.edges)) {
    node.edges.forEach((edge) => {
      if (!edgeGraph[edge.source]) {
        edgeGraph[edge.source] = [];
      }
      edgeGraph[edge.source].push(edge.target);
    });
  }
  if (node.children && Array.isArray(node.children)) {
    node.children.forEach((child) => traverseForMapping(child, nodeMap, edgeGraph));
  }
};

/**
 * A variant of markDownstream that computes the downstream nodes (nodestream) for a given node id.
 * The results are stored in the provided localSet to avoid reprocessing.
 */
const markDownstreamForCollapsed = (nodeId: string, edgeGraph: Record<string, string[]>, localSet: Set<string>): void => {
  if (edgeGraph[nodeId]) {
    edgeGraph[nodeId].forEach((targetId: string) => {
      if (!localSet.has(targetId)) {
        localSet.add(targetId);
        markDownstreamForCollapsed(targetId, edgeGraph, localSet);
      }
    });
  }
};

/**
 * Collapses the flow tree based on the given collapsedIds.
 * Nodes that are marked for collapsing will have their downstream nodes removed
 * and their type updated to "COLLAPSED_NODE".
 *
 * Additionally, this function builds a mapping (collapsedMapping) where for each key
 * (a collapsed node id) we have the array of node ids that were removed as part of its nodestream.
 *
 * @param {WorkflowNode} tree - The full tree structure.
 * @param {Record<string, any>} collapsedIds - An object whose keys are node ids to collapse.
 * @returns {{ prunedTree: WorkflowNode, collapsedMapping: Record<string, string[]> }}
 *          An object containing the pruned tree and the collapsedMapping.
 */
export const collapseFlowTree = (
  tree: WorkflowNode,
  collapsedIds: Record<string, any>
): { graph: WorkflowNode; collapsedMapping: Record<string, string[]> } => {
  // Build lookups: nodeMap and edgeGraph.
  const nodeMap: Record<string, WorkflowNode> = {};
  const edgeGraph: Record<string, string[]> = {};
  traverseForMapping(tree, nodeMap, edgeGraph);

  // Global set for all nodes to be removed.
  const nodesToRemove = new Set<string>();
  // For each collapsed node, store its downstream (collapsed) nodes.
  const collapsedMapping: Record<string, Set<string>> = {};

  // For every node id in collapsedIds, compute its downstream nodestream.
  Object.keys(collapsedIds).forEach((collapsedId) => {
    const localSet = new Set<string>();
    markDownstreamForCollapsed(collapsedId, edgeGraph, localSet);
    collapsedMapping[collapsedId] = localSet;
    // Add these nodes to the global removal set.
    localSet.forEach((id) => nodesToRemove.add(id));
  });

  // Clone and prune the tree.
  const prunedTree = pruneTree(tree, nodesToRemove, collapsedIds) as WorkflowNode;

  // Convert each set in collapsedMapping to an array.
  const collapsedMappingArrays: Record<string, string[]> = {};
  Object.keys(collapsedMapping).forEach((key) => {
    collapsedMappingArrays[key] = Array.from(collapsedMapping[key]);
  });

  return { graph: prunedTree, collapsedMapping: collapsedMappingArrays };
};

export const isA2AWorkflow = (state: WorkflowState): boolean => {
  return equals(state.workflowKind, 'agent');
};
