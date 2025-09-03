import type { XYPosition } from '@xyflow/system';

export function getEdgeCenter({
  sourceX,
  sourceY,
  targetX,
  targetY,
}: {
  sourceX: number;
  sourceY: number;
  targetX: number;
  targetY: number;
}): [number, number, number, number] {
  const xOffset = Math.abs(targetX - sourceX) / 2;
  const centerX = targetX < sourceX ? targetX + xOffset : targetX - xOffset;

  const yOffset = Math.abs(targetY - sourceY) / 2;
  const centerY = targetY < sourceY ? targetY + yOffset : targetY - yOffset;

  return [centerX, centerY, xOffset, yOffset];
}

export function buildSvgSpline(points: XYPosition[]): string {
  if (points.length === 2) {
    return `M ${points[0].x},${points[0].y} L ${points[1].x},${points[1].y}`;
  }

  if (points.length < 4 || (points.length - 1) % 3 !== 0) {
    return '';
  }

  let d = `M ${points[0].x},${points[0].y}`;
  for (let i = 1; i < points.length; i += 3) {
    const c1 = points[i];
    const c2 = points[i + 1];
    const end = points[i + 2];
    d += ` C ${c1.x},${c1.y} ${c2.x},${c2.y} ${end.x},${end.y}`;
  }
  return d;
}
