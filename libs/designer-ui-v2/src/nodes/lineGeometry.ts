import { nodeMetrics } from './metrics';

export type NodeLineArrowDirection = 'right' | 'down' | 'left' | 'up';

const ARROW_VECTORS: Record<NodeLineArrowDirection, { x: number; y: number }> = {
  right: { x: 1, y: 0 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  up: { x: 0, y: -1 },
};

/**
 * Open chevron with its tip at the supplied endpoint. Keep this numeric module free of UI
 * imports so layout hosts can use exactly the same geometry through the `/metrics` entry.
 */
export function getNodeLineArrowPath(
  x: number,
  y: number,
  direction: NodeLineArrowDirection = 'right',
  size: number = nodeMetrics.lineArrowSize
): string {
  const { x: ux, y: uy } = ARROW_VECTORS[direction];
  return `M ${x - size * (ux - uy)} ${y - size * (uy + ux)} L ${x} ${y} L ${x - size * (ux + uy)} ${y - size * (uy - ux)}`;
}
