import { removeIdTag } from '@microsoft/logic-apps-shared';

export interface DropItem {
  id: string;
  dependencies?: string[];
  loopSources?: string[];
  graphId?: string;
  isScope?: boolean;
  isAgent?: boolean;
}

/**
 * Computes the set of nodes that depend on the given node (downstream dependencies)
 * @param nodeId - The node to find dependents for
 * @param allNodesDependencies - Map of all nodes and their dependencies
 * @returns Set of node IDs that depend on the given node
 */
export const getDownstreamDependencies = (nodeId: string, allNodesDependencies: Record<string, Set<string>>): Set<string> => {
  const downstreamNodes = new Set<string>();
  const nodeIdWithoutTag = removeIdTag(nodeId);

  // Check all nodes to see if they depend on this node
  for (const [node, dependencies] of Object.entries(allNodesDependencies)) {
    if (dependencies.has(nodeId) || dependencies.has(nodeIdWithoutTag)) {
      downstreamNodes.add(node);
    }
  }

  return downstreamNodes;
};

export const canDropItem = (
  item: DropItem,
  upstreamNodes: Set<string>,
  upstreamNodesDependencies: Record<string, Set<string>>,
  upstreamScopes: Set<string>,
  childId: string | undefined,
  parentId: string | undefined,
  preventDropItemInA2A: boolean,
  isWithinAgenticLoop: boolean,
  allNodesDependencies?: Record<string, Set<string>>
): boolean => {
  // Prevent dropping agents within agentic loops
  if (item.isAgent && isWithinAgenticLoop) {
    return false;
  }
  // Prevent dropping nodes if there's an upstream agentic loop
  if (preventDropItemInA2A) {
    return false;
  }

  // Prevent dropping nodes with a dependency above its upstream node
  for (const dec of item.dependencies ?? []) {
    if (!upstreamNodes.has(dec)) {
      return false;
    }
  }

  // This supports preventing moving a node with a loop source outside of the loop
  for (const loopSource of item.loopSources ?? []) {
    if (!upstreamScopes.has(loopSource)) {
      return false;
    }
  }

  const nodeId = removeIdTag(item.id);

  // Prevent moving a node after any nodes that depend on it
  if (allNodesDependencies) {
    const downstreamDependencies = getDownstreamDependencies(item.id, allNodesDependencies);

    // Check if any downstream dependencies would become upstream after the move
    for (const downstreamNode of downstreamDependencies) {
      if (upstreamNodes.has(downstreamNode)) {
        // This node has outputs that are used by a node that would be upstream after the move
        return false;
      }
    }
  }

  delete upstreamNodesDependencies[nodeId];
  upstreamNodes.delete(nodeId);

  if (item.isScope) {
    if (upstreamScopes.has(nodeId)) {
      return false;
    }
  }

  for (const node of upstreamNodes) {
    if (
      upstreamNodesDependencies[node].has(item.id) ||
      (upstreamNodesDependencies[item.id] && upstreamNodesDependencies[item.id].has(node))
    ) {
      return false;
    }
  }

  // TODO: Support calculating dependencies when dragging of scopes
  return nodeId !== removeIdTag(childId ?? '') && nodeId !== removeIdTag(parentId ?? '');
};
