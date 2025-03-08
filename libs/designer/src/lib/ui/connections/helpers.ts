import { removeIdTag } from '@microsoft/logic-apps-shared';

export const canDropItem = (
  item: {
    id: string;
    dependencies?: string[];
    loopSources?: string[];
    graphId?: string;
    isScope?: boolean;
  },
  upstreamNodes: Set<string>,
  upstreamNodesDependencies: Record<string, Set<string>>,
  upstreamScopes: Set<string>,
  childId: string | undefined,
  parentId: string | undefined
): boolean => {
  // This supports preventing moving a node with a dependency above its upstream node
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
