import { removeIdTag } from '@microsoft/logic-apps-shared';

export const canDropItem = (
  item: {
    id: string;
    dependencies?: string[];
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

  const sanitizedItemId = removeIdTag(item.id);

  if (item.isScope) {
    if (upstreamScopes.has(sanitizedItemId)) {
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
  // TODO: Support preventing moving a node below downstream output
  // TODO: Support calculating dependencies when dragging of scopes
  return sanitizedItemId !== removeIdTag(childId ?? '') && sanitizedItemId !== removeIdTag(parentId ?? '');
};
