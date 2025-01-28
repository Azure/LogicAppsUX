import type { WorkflowNodeType } from '@microsoft/logic-apps-shared';
import type { WorkflowNode } from '../../../core/parsers/models/workflowNode';

export const getCollapsedGraph = (
  collapsedIds: Record<string, boolean>,
  rootNode: WorkflowNode,
  isUnderCollapsed = false // New parameter to track if we're under a collapsed node
): WorkflowNode => {
  // Handle base case
  if (!rootNode || !rootNode.children || !rootNode.edges) {
    return rootNode;
  }

  // Create a set of IDs to remove, starting with the collapsed IDs
  const idsToRemove = new Set<string>(Object.keys(collapsedIds));

  // Iteratively find downstream nodes to remove based on edges
  let hasChanges = true;
  while (hasChanges) {
    hasChanges = false;

    // Find edges where the source or target is in idsToRemove
    for (const edge of rootNode.edges) {
      if (idsToRemove.has(edge.source) && !idsToRemove.has(edge.target)) {
        idsToRemove.add(edge.target);
        hasChanges = true;
      }
    }
  }

  // Filter edges to exclude those connecting removed nodes
  const filteredEdges = rootNode.edges.filter((edge) => !(idsToRemove.has(edge.source) && idsToRemove.has(edge.target)));

  // Process children recursively
  const processChildren = (children: WorkflowNode[], parentIsCollapsed: boolean): WorkflowNode[] => {
    return children
      .map((child) => {
        // If the child is marked for removal
        if (idsToRemove.has(child.id)) {
          // If it's directly in collapsedIds
          if (collapsedIds[child.id]) {
            // If parent is already collapsed, remove this collapsed child
            if (parentIsCollapsed) {
              return null;
            }
            return {
              ...child,
              type: 'COLLAPSED_NODE' as WorkflowNodeType,
              // Process children with parentIsCollapsed set to true
              children: processChildren(child.children ?? [], true),
              edges: (child.edges ?? []).filter((edge) => !(idsToRemove.has(edge.source) && idsToRemove.has(edge.target))),
            };
          }
          // If it's downstream of a collapsed node, remove it
          return null;
        }

        // If not marked for removal, process normally
        return {
          ...child,
          children: processChildren(child.children ?? [], parentIsCollapsed),
          edges: (child.edges ?? []).filter((edge) => !(idsToRemove.has(edge.source) && idsToRemove.has(edge.target))),
        };
      })
      .filter((node) => node !== null);
  };

  // Create the final result
  return {
    ...rootNode,
    children: processChildren(rootNode.children, isUnderCollapsed),
    edges: filteredEdges,
  };
};
