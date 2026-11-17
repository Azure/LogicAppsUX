import type { ElkExtendedEdge, ElkNode, ElkPoint } from '../src/types';

export interface NodeBox {
  x: number;
  y: number;
  width: number;
  height: number;
  parent?: string;
}

export interface EdgeRoute {
  container?: string;
  points: ElkPoint[];
}

/** The parts of an ELK result Logic Apps consumes: relative node boxes and the first edge section. */
export interface LayoutGeometry {
  nodes: Record<string, NodeBox>;
  edges: Record<string, EdgeRoute>;
}

const round = (value: number | undefined) => Math.round((value ?? 0) * 100) / 100;

export const extractGeometry = (graph: ElkNode): LayoutGeometry => {
  const geometry: LayoutGeometry = { nodes: {}, edges: {} };
  const visit = (node: ElkNode, parent?: string) => {
    // Logic Apps can emit duplicate ids (e.g. handoff nodes); elkjs tolerates them, so keep each occurrence.
    let key = node.id;
    for (let n = 2; key in geometry.nodes; n++) {
      key = `${node.id}#${n}`;
    }
    geometry.nodes[key] = { x: round(node.x), y: round(node.y), width: round(node.width), height: round(node.height), parent };
    for (const edge of (node.edges ?? []) as ElkExtendedEdge[]) {
      const section = edge.sections?.[0];
      geometry.edges[edge.id] = {
        container: edge.container,
        points: section
          ? [section.startPoint, ...(section.bendPoints ?? []), section.endPoint].map(({ x, y }) => ({ x: round(x), y: round(y) }))
          : [],
      };
    }
    for (const child of node.children ?? []) {
      visit(child, node.id);
    }
  };
  visit(graph);
  return geometry;
};

/** Returns id pairs of sibling nodes whose boxes overlap by more than `tolerance` px. */
export const findOverlaps = (geometry: LayoutGeometry, tolerance = 0.5): [string, string][] => {
  const entries = Object.entries(geometry.nodes);
  const overlaps: [string, string][] = [];
  for (let i = 0; i < entries.length; i++) {
    const [idA, a] = entries[i];
    for (let j = i + 1; j < entries.length; j++) {
      const [idB, b] = entries[j];
      if (
        a.parent !== undefined &&
        a.parent === b.parent &&
        Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x) > tolerance &&
        Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y) > tolerance
      ) {
        overlaps.push([idA, idB]);
      }
    }
  }
  return overlaps;
};

export interface GeometryDiff {
  missingNodes: string[];
  nodeMismatches: { id: string; delta: number }[];
  edgeMismatches: { id: string; reason: string }[];
  maxNodeDelta: number;
}

/** Compares node boxes within `tolerance` px; edge routes only by container and endpoints (bend points may differ). */
export const compareGeometry = (expected: LayoutGeometry, actual: LayoutGeometry, tolerance = 0.5): GeometryDiff => {
  const diff: GeometryDiff = { missingNodes: [], nodeMismatches: [], edgeMismatches: [], maxNodeDelta: 0 };
  for (const [id, want] of Object.entries(expected.nodes)) {
    const got = actual.nodes[id];
    if (!got) {
      diff.missingNodes.push(id);
      continue;
    }
    const delta = Math.max(
      Math.abs(want.x - got.x),
      Math.abs(want.y - got.y),
      Math.abs(want.width - got.width),
      Math.abs(want.height - got.height)
    );
    diff.maxNodeDelta = Math.max(diff.maxNodeDelta, round(delta));
    if (delta > tolerance || want.parent !== got.parent) {
      diff.nodeMismatches.push({ id, delta });
    }
  }
  for (const [id, want] of Object.entries(expected.edges)) {
    const got = actual.edges[id];
    if (!got) {
      diff.edgeMismatches.push({ id, reason: 'missing' });
    } else if (want.container !== got.container) {
      diff.edgeMismatches.push({ id, reason: `container ${got.container} !== ${want.container}` });
    } else if (want.points.length > 0) {
      const ends = [
        [want.points[0], got.points[0]],
        [want.points[want.points.length - 1], got.points[got.points.length - 1]],
      ];
      if (ends.some(([a, b]) => !b || Math.abs(a.x - b.x) > tolerance || Math.abs(a.y - b.y) > tolerance)) {
        diff.edgeMismatches.push({ id, reason: 'endpoints differ' });
      }
    }
  }
  return diff;
};
