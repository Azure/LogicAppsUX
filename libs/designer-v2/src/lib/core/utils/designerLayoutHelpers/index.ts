import type { Size } from '@microsoft/logic-apps-shared';
import type { Node } from '@xyflow/react';

export const DesignerFlowViewPadding = 64 + 24;

export const getTargetPositionForWorkflow = (firstNode: Node, windowSize: Size, defaultNodeSize: Size): [number, number] => {
  const firstNodeWidth = firstNode.width ?? defaultNodeSize.width;
  const firstNodeHeight = firstNode.height ?? defaultNodeSize.height;

  // Center X on node midpoint
  const xTarget = (firstNode.position?.x ?? 0) + firstNodeWidth / 2;

  // TODO (#31643562) Base this on Y coordinate of designer instead of a rough padding estimate.
  // Adjust Y based on window height so flow appears at top (or 150 for default centering)
  const yPadding = DesignerFlowViewPadding + 24;
  const yTarget = windowSize.height / 2 - firstNodeHeight / 2 - yPadding;

  return [xTarget, yTarget];
};
