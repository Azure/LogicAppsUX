import type { WorkflowNode } from '../../../core/parsers/models/workflowNode';

/**
 * Recursively clones a node while pruning (removing) any nodes that are in the nodesToRemove set.
 * Also, if the node’s id is in collapsedIds, its type is set to "COLLAPSED_NODE" and its children are not cloned.
 * @param {Object} node - The current node to clone and prune.
 * @param {Set} nodesToRemove - Set of node ids that should be removed.
 * @param {Object} collapsedIds - An object whose keys are node ids to be collapsed.
 * @returns {Object|null} - A new node object with pruned children/edges, or null if this node is removed.
 */
const pruneTree = (node: WorkflowNode, nodesToRemove: Set<string>, collapsedIds: Record<string, any>): WorkflowNode | null => {
  // If the current node is marked for removal, return null so it will be filtered out.
  if (nodesToRemove.has(node.id)) {
    return null;
  }

  // Create a shallow clone of the node (to avoid mutating the original).
  // We make sure to clone children and edges separately.
  const newNode = { ...node };

  // If the current node is one that should be collapsed,
  // update its type to "COLLAPSED_NODE" and remove its children and edges.
  if (collapsedIds[node.id]) {
    newNode.type = 'COLLAPSED_NODE';
    // Remove any children or edges, as the node is now collapsed.
    delete newNode.children;
    delete newNode.edges;
    return newNode;
  }

  // Otherwise, process children (if they exist) by recursively cloning and pruning.
  if (Array.isArray(node.children)) {
    newNode.children = node.children
      .map((child) => pruneTree(child, nodesToRemove, collapsedIds))
      .filter((child) => child !== null) as WorkflowNode[];
  }

  // Filter out any edges that reference nodes that have been removed.
  if (Array.isArray(node.edges)) {
    newNode.edges = node.edges.filter((edge) => {
      return !nodesToRemove.has(edge.source) && !nodesToRemove.has(edge.target);
    });
  }

  return newNode;
};

const traverseForMapping = (node: WorkflowNode, nodeMap: Record<string, any>, edgeGraph: Record<string, any>) => {
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

const markDownstream = (nodeId: string, edgeGraph: Record<string, any>, nodesToRemove: Set<string>) => {
  if (edgeGraph[nodeId]) {
    edgeGraph[nodeId].forEach((targetId: any) => {
      if (!nodesToRemove.has(targetId)) {
        nodesToRemove.add(targetId);
        markDownstream(targetId, edgeGraph, nodesToRemove);
      }
    });
  }
};

/**
 * Collapses the flow tree based on the given collapsedIds.
 * Nodes that are marked for collapsing will have their downstream nodes removed
 * and their type updated to "COLLAPSED_NODE".
 *
 * @param {Object} tree - The full tree structure.
 * @param {Object} collapsedIds - An object whose keys are node ids to collapse.
 * @return {Object} - A new tree with collapsed (downstream) nodes removed and collapsed nodes updated.
 */
export const collapseFlowTree = (tree: WorkflowNode, collapsedIds: Record<string, any>): WorkflowNode => {
  // Build a lookup for nodes and an edge graph mapping source // e.g., { "Initialize_variable": ["Delay", ...], ... }
  const nodeMap: Record<string, any> = {};
  const edgeGraph: Record<string, any> = {};

  traverseForMapping(tree, nodeMap, edgeGraph);

  // Find all nodes that should be removed.
  const nodesToRemove = new Set<string>();

  // Recursively traverse downstream from a given node id.
  // For every collapsed node, mark its downstream nodes.
  Object.keys(collapsedIds).forEach((collapsedId) => {
    markDownstream(collapsedId, edgeGraph, nodesToRemove);
  });

  // Instead of modifying the tree in place, clone and prune it.
  return pruneTree(tree, nodesToRemove, collapsedIds) as WorkflowNode;
};
