import { getOption, GraphLayoutError } from '../options';
import type { ElkNode, LayoutOptions } from '../types';

interface Box {
  node: ElkNode;
  x: number;
  y: number;
  width: number;
  height: number;
}

const option = (sources: (LayoutOptions | undefined)[], keys: string[]): string | undefined =>
  sources.map((source) => getOption(source, keys)).find((value) => value !== undefined);

const numericValue = (value: number | undefined, name: string, nonnegative = false): number => {
  const result = value ?? 0;
  if (!Number.isFinite(result) || (nonnegative && result < 0)) {
    throw new GraphLayoutError(`${name} must be ${nonnegative ? 'a finite non-negative number' : 'finite'}.`);
  }
  return result;
};

const collides = (a: Box, b: Box, spacing: number): boolean =>
  a.x < b.x + b.width + spacing && b.x < a.x + a.width + spacing && a.y < b.y + b.height + spacing && b.y < a.y + a.height + spacing;

/** Place a box at its nearest collision-free horizontal or vertical displacement. */
const place = (box: Box, placed: Box[], spacing: number): void => {
  if (placed.every((other) => !collides(box, other, spacing))) {
    return;
  }
  const originalX = box.x;
  const originalY = box.y;
  let bestX = originalX;
  let bestY = originalY;
  let bestDistance = Number.POSITIVE_INFINITY;
  const consider = (x: number, y: number) => {
    const distance = (x - originalX) ** 2 + (y - originalY) ** 2;
    if (distance >= bestDistance) {
      return;
    }
    box.x = x;
    box.y = y;
    if (placed.every((other) => !collides(box, other, spacing))) {
      bestX = x;
      bestY = y;
      bestDistance = distance;
    }
  };
  for (const other of placed) {
    consider(other.x - box.width - spacing, originalY);
    consider(other.x + other.width + spacing, originalY);
    consider(originalX, other.y - box.height - spacing);
    consider(originalX, other.y + other.height + spacing);
  }
  if (!Number.isFinite(bestDistance)) {
    throw new GraphLayoutError('sporeOverlap could not place a node with finite coordinates.');
  }
  box.x = bestX;
  box.y = bestY;
};

/** Grow a deterministic minimum spanning tree and remove collisions against already placed nodes. */
const growTree = (boxes: Box[], spacing: number): void => {
  const count = boxes.length;
  const distances = new Array<number>(count).fill(Number.POSITIVE_INFINITY);
  const parents = new Array<number>(count).fill(-1);
  const visited = new Array<boolean>(count).fill(false);
  const offsets = boxes.map(() => ({ x: 0, y: 0 }));
  const placed: Box[] = [];
  distances[0] = 0;

  for (let step = 0; step < count; step++) {
    let index = -1;
    for (let i = 0; i < count; i++) {
      if (!visited[i] && (index === -1 || distances[i] < distances[index])) {
        index = i;
      }
    }
    visited[index] = true;
    const box = boxes[index];
    const parentOffset = parents[index] === -1 ? { x: 0, y: 0 } : offsets[parents[index]];
    const originalX = box.x;
    const originalY = box.y;

    // Update the spanning tree using original centers before moving this node.
    for (let i = 0; i < count; i++) {
      if (!visited[i]) {
        const other = boxes[i];
        const dx = originalX + box.width / 2 - other.x - other.width / 2;
        const dy = originalY + box.height / 2 - other.y - other.height / 2;
        const distance = dx * dx + dy * dy;
        if (distance < distances[i]) {
          distances[i] = distance;
          parents[i] = index;
        }
      }
    }
    box.x += parentOffset.x;
    box.y += parentOffset.y;
    place(box, placed, spacing);
    offsets[index] = { x: box.x - originalX, y: box.y - originalY };
    placed.push(box);
  }
};

/**
 * Deterministic overlap removal for the flat data-mapper input. This is not a pixel-identical
 * implementation of ELK's randomized SPOrE algorithm.
 */
export const removeOverlaps = (graph: ElkNode, sources: (LayoutOptions | undefined)[]): ElkNode => {
  const direction = option(sources, ['elk.direction', 'org.eclipse.elk.direction', 'direction']);
  if (direction !== undefined && direction !== 'LEFT') {
    throw new GraphLayoutError(`Unsupported sporeOverlap direction '${direction}'; only LEFT is supported.`);
  }
  const rawSpacing = option(sources, ['elk.spacing.nodeNode', 'org.eclipse.elk.spacing.nodeNode', 'spacing.nodeNode']);
  const spacing = rawSpacing === undefined ? 8 : Number(rawSpacing);
  if (rawSpacing?.trim() === '' || !Number.isFinite(spacing) || spacing < 0) {
    throw new GraphLayoutError('sporeOverlap spacing.nodeNode must be a finite non-negative number.');
  }
  if (graph.edges?.length || graph.ports?.length) {
    throw new GraphLayoutError('sporeOverlap supports flat graphs without edges or ports.');
  }
  const children = graph.children ?? [];
  const boxes = children.map((node) => {
    if (node.children?.length || node.edges?.length || node.ports?.length) {
      throw new GraphLayoutError('sporeOverlap supports flat graphs without edges or ports.');
    }
    return {
      node,
      x: numericValue(node.x, `Node '${node.id}' x`),
      y: numericValue(node.y, `Node '${node.id}' y`),
      width: numericValue(node.width, `Node '${node.id}' width`, true),
      height: numericValue(node.height, `Node '${node.id}' height`, true),
    };
  });

  if (boxes.length === 0) {
    graph.x = 0;
    graph.y = 0;
    graph.width = 0;
    graph.height = 0;
    return graph;
  }

  if (children.every((node) => node.x === undefined && node.y === undefined)) {
    const maxWidth = boxes.reduce((max, box) => Math.max(max, box.width), 0);
    const maxHeight = boxes.reduce((max, box) => Math.max(max, box.height), 0);
    const scale = Math.sqrt(maxWidth + spacing) * Math.sqrt(maxHeight + spacing) * 0.55;
    if (!Number.isFinite(scale)) {
      throw new GraphLayoutError('sporeOverlap input is too large to calculate finite coordinates.');
    }
    for (let i = 0; i < boxes.length; i++) {
      const radius = scale * Math.sqrt(i);
      boxes[i].x = radius * Math.cos(i * 2.399963229728653);
      boxes[i].y = radius * Math.sin(i * 2.399963229728653);
    }
  }

  growTree(boxes, spacing);
  const minX = boxes.reduce((min, box) => Math.min(min, box.x), Number.POSITIVE_INFINITY);
  const minY = boxes.reduce((min, box) => Math.min(min, box.y), Number.POSITIVE_INFINITY);
  let maxX = 0;
  let maxY = 0;
  for (const box of boxes) {
    box.x = box.x - minX + 8;
    box.y = box.y - minY + 8;
    maxX = Math.max(maxX, box.x + box.width);
    maxY = Math.max(maxY, box.y + box.height);
  }
  if (!Number.isFinite(maxX + 8) || !Number.isFinite(maxY + 8)) {
    throw new GraphLayoutError('sporeOverlap input is too large to calculate finite coordinates.');
  }
  for (const box of boxes) {
    box.node.x = box.x;
    box.node.y = box.y;
  }
  graph.x = 0;
  graph.y = 0;
  graph.width = maxX + 8;
  graph.height = maxY + 8;
  return graph;
};
