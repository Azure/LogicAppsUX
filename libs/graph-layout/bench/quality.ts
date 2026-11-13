import type { ElkNode, ElkPoint } from '../src/types';
import { extractGeometry, findOverlaps } from './geometry.ts';

interface Segment {
  edge: number;
  from: ElkPoint;
  to: ElkPoint;
}

const epsilon = 0.01;
const cross = (a: ElkPoint, b: ElkPoint) => a.x * b.y - a.y * b.x;
const subtract = (a: ElkPoint, b: ElkPoint) => ({ x: a.x - b.x, y: a.y - b.y });

const crossesSegment = (a: Segment, b: Segment): boolean => {
  const direction = subtract(a.to, a.from);
  const other = subtract(b.to, b.from);
  const determinant = cross(direction, other);
  if (Math.abs(determinant) < 1e-9) {
    return false;
  }
  const offset = subtract(b.from, a.from);
  const t = cross(offset, other) / determinant;
  const u = cross(offset, direction) / determinant;
  return t > 1e-6 && t < 1 - 1e-6 && u > 1e-6 && u < 1 - 1e-6;
};

const overlapsSegment = (a: Segment, b: Segment): boolean => {
  const direction = subtract(a.to, a.from);
  const other = subtract(b.to, b.from);
  const length = Math.hypot(direction.x, direction.y);
  const otherLength = Math.hypot(other.x, other.y);
  if (length <= epsilon || otherLength <= epsilon) {
    return false;
  }
  if (
    Math.abs(cross(direction, other)) / (length * otherLength) > 1e-6 ||
    Math.abs(cross(direction, subtract(b.from, a.from))) / length > epsilon
  ) {
    return false;
  }
  const project = (point: ElkPoint) => ((point.x - a.from.x) * direction.x + (point.y - a.from.y) * direction.y) / length;
  const first = project(b.from);
  const last = project(b.to);
  return Math.min(length, Math.max(first, last)) - Math.max(0, Math.min(first, last)) > epsilon;
};

/** Intersect open node interiors, not border contacts or a segment's enclosing rectangle. */
const hitsNode = ({ from, to }: Segment, node: ElkNode): boolean => {
  let low = 0;
  let high = 1;
  for (const [start, delta, minimum, maximum] of [
    [from.x, to.x - from.x, node.x! + epsilon, node.x! + node.width! - epsilon],
    [from.y, to.y - from.y, node.y! + epsilon, node.y! + node.height! - epsilon],
  ]) {
    if (minimum >= maximum) {
      return false;
    }
    if (Math.abs(delta) < 1e-12) {
      if (start <= minimum || start >= maximum) {
        return false;
      }
    } else {
      const a = (minimum - start) / delta;
      const b = (maximum - start) / delta;
      low = Math.max(low, Math.min(a, b));
      high = Math.min(high, Math.max(a, b));
    }
  }
  return high > low;
};

/**
 * Diagnostic only: sections are sampled as polylines, NOT rendered conservative-soft splines
 * or React Flow curves. Shared-node connectors can intentionally share segments.
 * Pairwise work runs outside the layout timing samples.
 */
export const layoutQuality = (graph: ElkNode) => {
  let collinearEdgePairs = 0;
  let crossingEdgePairs = 0;
  let edgeNodeHits = 0;
  let centerSkew = 0;
  let edgeCount = 0;
  const visit = (container: ElkNode) => {
    const nodes = container.children ?? [];
    const endpoints = new Map<string, ElkNode>();
    for (const node of nodes) {
      endpoints.set(node.id, node);
      for (const port of node.ports ?? []) {
        endpoints.set(port.id, node);
      }
    }
    const segments: Segment[] = [];
    const edges = container.edges ?? [];
    edges.forEach((edge, edgeIndex) => {
      const source = endpoints.get(edge.sources[0]);
      const target = endpoints.get(edge.targets[0]);
      if (source && target) {
        centerSkew += Math.abs(source.x! + source.width! / 2 - target.x! - target.width! / 2);
        edgeCount++;
      }
      const section = edge.sections?.[0];
      if (!section) {
        return;
      }
      const points = [section.startPoint, ...(section.bendPoints ?? []), section.endPoint];
      const path = points.slice(1).map((to, index) => ({ edge: edgeIndex, from: points[index], to }));
      segments.push(...path);
      for (const node of nodes) {
        if (node !== source && node !== target && path.some((segment) => hitsNode(segment, node))) {
          edgeNodeHits++;
        }
      }
    });
    const overlapping = new Set<string>();
    const crossing = new Set<string>();
    for (let i = 0; i < segments.length; i++) {
      for (let j = i + 1; j < segments.length; j++) {
        const a = segments[i];
        const b = segments[j];
        if (a.edge !== b.edge && overlapsSegment(a, b)) {
          overlapping.add(`${Math.min(a.edge, b.edge)}:${Math.max(a.edge, b.edge)}`);
        }
        if (a.edge !== b.edge && crossesSegment(a, b)) {
          crossing.add(`${Math.min(a.edge, b.edge)}:${Math.max(a.edge, b.edge)}`);
        }
      }
    }
    collinearEdgePairs += overlapping.size;
    crossingEdgePairs += crossing.size;
    nodes.forEach(visit);
  };
  visit(graph);
  return {
    nodeOverlaps: findOverlaps(extractGeometry(graph), epsilon).length,
    edgeNodeHits,
    collinearEdgePairs,
    crossingEdgePairs,
    meanCenterSkew: Math.round((centerSkew / Math.max(1, edgeCount)) * 100) / 100,
  };
};
