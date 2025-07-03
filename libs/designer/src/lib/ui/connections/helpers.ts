import { removeIdTag } from '@microsoft/logic-apps-shared';

export interface DropItem {
  id: string;
  dependencies?: string[];
  loopSources?: string[];
  graphId?: string;
  isScope?: boolean;
  isAgent?: boolean;
}

export const canDropItem = (
  item: DropItem,
  upstreamNodes: Set<string>,
  upstreamNodesDependencies: Record<string, Set<string>>,
  upstreamScopes: Set<string>,
  childId: string | undefined,
  parentId: string | undefined,
  preventDropItemInA2A: boolean,
  isWithinAgenticLoop: boolean
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
