import type { Node } from '@xyflow/react';
import { WORKFLOW_NODE_TYPES } from '../models/workflowNode';
import { removeIdTag } from './stringFunctions';

export const getAdjacentNode = (
  nodes: readonly Node[],
  selectedNodeId: string | undefined,
  direction: 'next' | 'previous'
): Node | undefined => {
  const indexedNodes = nodes.flatMap((node) => {
    const index = node.data['nodeIndex'];
    const isOperation = node.type === WORKFLOW_NODE_TYPES['OPERATION_NODE'] || node.type === WORKFLOW_NODE_TYPES['SCOPE_CARD_NODE'];
    return isOperation && !node.hidden && typeof index === 'number' && Number.isFinite(index) && index > 0 ? [{ node, index }] : [];
  });
  const current = indexedNodes.find(({ node }) =>
    node.type === WORKFLOW_NODE_TYPES['SCOPE_CARD_NODE'] ? removeIdTag(node.id) === selectedNodeId : node.id === selectedNodeId
  );
  const currentIndex = current?.index ?? (direction === 'next' ? Number.NEGATIVE_INFINITY : Number.POSITIVE_INFINITY);
  let adjacent: (typeof indexedNodes)[number] | undefined;

  // Layout already assigns the tab order, including gaps for edges and other controls.
  for (const candidate of indexedNodes) {
    if (
      direction === 'next'
        ? candidate.index > currentIndex && (!adjacent || candidate.index < adjacent.index)
        : candidate.index < currentIndex && (!adjacent || candidate.index > adjacent.index)
    ) {
      adjacent = candidate;
    }
  }
  return adjacent?.node;
};
