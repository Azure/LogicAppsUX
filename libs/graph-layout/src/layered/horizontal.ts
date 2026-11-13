import { GraphLayoutError } from '../options';
import type { ElkNode } from '../types';
import type { LayeredOptions } from './options';

interface HorizontalVertex {
  node?: ElkNode;
  width: number;
}

export const horizontalGap = (left: HorizontalVertex, right: HorizontalVertex, options: LayeredOptions): number =>
  left.node && right.node ? options.nodeSpacing : left.node || right.node ? options.edgeNodeSpacing : options.edgeSpacing;

const segmentKey = (a: number, b: number): string => (a < b ? `${a}:${b}` : `${b}:${a}`);

/**
 * Mark segments crossing an inner (dummy-to-dummy) segment. Prefix/suffix
 * extrema also detect inner-to-inner conflicts, without comparing every pair.
 */
const markConflicts = (vertices: HorizontalVertex[], layers: number[][], incoming: number[][], position: Int32Array): Set<string> => {
  const conflicts = new Set<string>();
  for (let rank = 1; rank < layers.length; rank++) {
    const layer = layers[rank];
    const inner = layer.map((v) => (!vertices[v].node && !vertices[incoming[v][0]]?.node ? incoming[v][0] : undefined));
    const before = new Float64Array(layer.length);
    const after = new Float64Array(layer.length);
    let maximum = Number.NEGATIVE_INFINITY;
    for (let i = 0; i < layer.length; i++) {
      before[i] = maximum;
      if (inner[i] !== undefined) {
        maximum = Math.max(maximum, position[inner[i]!]);
      }
    }
    let minimum = Number.POSITIVE_INFINITY;
    for (let i = layer.length - 1; i >= 0; i--) {
      after[i] = minimum;
      if (inner[i] !== undefined) {
        minimum = Math.min(minimum, position[inner[i]!]);
      }
    }
    layer.forEach((v, i) => {
      for (const u of incoming[v]) {
        if (position[u] < before[i] || position[u] > after[i]) {
          conflicts.add(segmentKey(u, v));
        }
      }
    });
  }
  return conflicts;
};

/** Compact aligned blocks using the longest paths of their separation DAG. */
const compactBlocks = (
  vertices: HorizontalVertex[],
  layers: number[][],
  root: Int32Array,
  right: boolean,
  options: LayeredOptions
): Float64Array => {
  const adjacency = vertices.map(() => [] as { target: number; distance: number }[]);
  const indegree = new Int32Array(vertices.length);
  for (const layer of layers) {
    for (let i = 1; i < layer.length; i++) {
      const left = layer[i - 1];
      const next = layer[i];
      const source = root[right ? next : left];
      const target = root[right ? left : next];
      if (source === target) {
        throw new GraphLayoutError('Horizontal alignment placed two same-layer vertices in one block.');
      }
      adjacency[source].push({
        target,
        distance: (vertices[left].width + vertices[next].width) / 2 + horizontalGap(vertices[left], vertices[next], options),
      });
      indegree[target]++;
    }
  }
  const blocks = vertices.flatMap((_, v) => (root[v] === v ? [v] : []));
  const queue = blocks.filter((v) => indegree[v] === 0);
  const coordinates = new Float64Array(vertices.length);
  for (const source of queue) {
    for (const { target, distance } of adjacency[source]) {
      coordinates[target] = Math.max(coordinates[target], coordinates[source] + distance);
      if (--indegree[target] === 0) {
        queue.push(target);
      }
    }
  }
  if (queue.length !== blocks.length) {
    throw new GraphLayoutError('Horizontal alignment produced cyclic block constraints.');
  }
  return Float64Array.from(vertices, (_, v) => (right ? -1 : 1) * coordinates[root[v]]);
};

/**
 * Brandes–Köpf BALANCED placement: conflict-free median alignment in four
 * sweep directions, block compaction, then the mean of the two middle centers.
 * Centers (not left borders) keep unequal-width aligned nodes truly centered.
 * Port anchor offsets are routed afterward, not optimized by this placement.
 */
export const balancedCenters = (
  vertices: HorizontalVertex[],
  layers: number[][],
  chains: readonly number[][],
  options: LayeredOptions
): Float64Array => {
  const incoming = vertices.map(() => [] as number[]);
  const outgoing = vertices.map(() => [] as number[]);
  for (const chain of chains) {
    for (let i = 1; i < chain.length; i++) {
      incoming[chain[i]].push(chain[i - 1]);
      outgoing[chain[i - 1]].push(chain[i]);
    }
  }
  const position = new Int32Array(vertices.length);
  for (const layer of layers) {
    layer.forEach((v, i) => {
      position[v] = i;
    });
  }
  for (const neighbors of [...incoming, ...outgoing]) {
    neighbors.sort((a, b) => position[a] - position[b]);
  }
  const conflicts = markConflicts(vertices, layers, incoming, position);
  const placements: { centers: Float64Array; left: number; right: number; fromRight: boolean }[] = [];
  for (const down of [true, false]) {
    for (const right of [false, true]) {
      const root = Int32Array.from(vertices, (_, v) => v);
      for (let step = 0; step < layers.length; step++) {
        const layer = layers[down ? step : layers.length - 1 - step];
        let boundary = right ? Number.POSITIVE_INFINITY : Number.NEGATIVE_INFINITY;
        for (let i = 0; i < layer.length; i++) {
          const v = layer[right ? layer.length - 1 - i : i];
          const neighbors = down ? incoming[v] : outgoing[v];
          if (!neighbors.length) {
            continue;
          }
          const first = Math.floor((neighbors.length - 1) / 2);
          const last = Math.floor(neighbors.length / 2);
          const medians = right ? [last, first] : [first, last];
          for (const median of medians) {
            const u = neighbors[median];
            if ((right ? position[u] < boundary : position[u] > boundary) && !conflicts.has(segmentKey(u, v))) {
              root[v] = root[u];
              boundary = position[u];
              break;
            }
          }
        }
      }
      const centers = compactBlocks(vertices, layers, root, right, options);
      let left = Number.POSITIVE_INFINITY;
      let farRight = Number.NEGATIVE_INFINITY;
      vertices.forEach((vertex, v) => {
        left = Math.min(left, centers[v] - vertex.width / 2);
        farRight = Math.max(farRight, centers[v] + vertex.width / 2);
      });
      placements.push({ centers, left, right: farRight, fromRight: right });
    }
  }
  const narrowest = placements.reduce((best, candidate) => (candidate.right - candidate.left < best.right - best.left ? candidate : best));
  for (const placement of placements) {
    const shift = placement.fromRight ? narrowest.right - placement.right : narrowest.left - placement.left;
    for (let v = 0; v < vertices.length; v++) {
      placement.centers[v] += shift;
    }
  }
  // Every directional solution satisfies x[b] >= x[a] + gap(a,b). Order
  // statistics commute with translation and are monotone, so balancing
  // preserves these inequalities, including real/dummy spacing.
  return Float64Array.from(vertices, (_, v) => {
    const values = placements.map((placement) => placement.centers[v]).sort((a, b) => a - b);
    return (values[1] + values[2]) / 2;
  });
};
