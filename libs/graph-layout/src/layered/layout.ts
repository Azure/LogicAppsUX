import { GraphLayoutError } from '../options';
import type { ElkEdgeSection, ElkExtendedEdge, ElkNode, ElkPoint, ElkPort, LayoutOptions } from '../types';
import { balancedCenters } from './horizontal';
import { layeredOptions, readOption, sizeOption, type LayeredOptions } from './options';

interface Vertex {
  node?: ElkNode;
  width: number;
  height: number;
  order: number;
  rank: number;
  x: number;
  y: number;
}

const orderLayers = (vertices: Vertex[], layers: number[][], links: Link[], options: LayeredOptions): void => {
  if (options.forceModelOrder) {
    return;
  }
  const neighbors = vertices.map(() => ({ incoming: [] as number[], outgoing: [] as number[] }));
  for (const link of links) {
    for (let i = 1; i < link.chain.length; i++) {
      neighbors[link.chain[i - 1]].outgoing.push(link.chain[i]);
      neighbors[link.chain[i]].incoming.push(link.chain[i - 1]);
    }
  }
  const positions = new Float64Array(vertices.length);
  const updatePositions = () => {
    for (const layer of layers) {
      layer.forEach((index, position) => {
        positions[index] = position;
      });
    }
  };
  updatePositions();
  const sweepLayers = (down: boolean) => {
    for (let step = 1; step < layers.length; step++) {
      const rank = down ? step : layers.length - 1 - step;
      const layer = layers[rank];
      const barycenters = new Map<number, number>();
      for (const index of layer) {
        const adjacent = down ? neighbors[index].incoming : neighbors[index].outgoing;
        barycenters.set(
          index,
          adjacent.length ? adjacent.reduce((sum, neighbor) => sum + positions[neighbor], 0) / adjacent.length : positions[index]
        );
      }
      layer.sort(
        (a, b) =>
          barycenters.get(a)! - barycenters.get(b)! ||
          (options.placement === 'SIMPLE' ? vertices[a].order - vertices[b].order : positions[a] - positions[b])
      );
      layer.forEach((index, position) => {
        positions[index] = position;
      });
    }
  };
  if (options.placement === 'SIMPLE') {
    for (let sweep = 0; sweep < 4; sweep++) {
      sweepLayers(sweep % 2 === 0);
    }
    return;
  }
  // Count adjacent segment inversions with a Fenwick tree. Batch each
  // source's queries before inserting its targets: shared endpoints do
  // not count as crossings, nor do equal target positions.
  const crossings = () => {
    let count = 0;
    for (let rank = 0; rank < layers.length - 1; rank++) {
      const tree = new Float64Array(layers[rank + 1].length + 1);
      let inserted = 0;
      for (const source of layers[rank]) {
        for (const target of neighbors[source].outgoing) {
          let prefix = 0;
          for (let i = positions[target] + 1; i > 0; i -= i & -i) {
            prefix += tree[i];
          }
          count += inserted - prefix;
        }
        for (const target of neighbors[source].outgoing) {
          for (let i = positions[target] + 1; i < tree.length; i += i & -i) {
            tree[i]++;
          }
          inserted++;
        }
      }
    }
    return count;
  };
  let bestScore = crossings();
  let best = layers.map((layer) => [...layer]);
  for (let sweep = 0; sweep < 8 && bestScore > 0; sweep++) {
    sweepLayers(sweep % 2 === 0);
    const score = crossings();
    if (score <= bestScore) {
      bestScore = score;
      best = layers.map((layer) => [...layer]);
    }
  }
  const restore = () => {
    layers.forEach((layer, rank) => {
      for (let i = 0; i < layer.length; i++) {
        layer[i] = best[rank][i];
      }
    });
    updatePositions();
  };
  restore();
  // An UP sweep may reorder ancestors after their children were processed.
  // Reconcile descendants top-down, but never discard a better ordering.
  sweepLayers(true);
  if (crossings() > bestScore) {
    restore();
  }
};

interface Link {
  edge: ElkExtendedEdge;
  source: number;
  target: number;
  sourcePort?: ElkPort;
  targetPort?: ElkPort;
  reversed: boolean;
  chain: number[];
}

interface NodeGeometry {
  x: number;
  y: number;
  width: number;
  height: number;
}

const finite = (value: number | undefined, name: string, nonnegative = false): number => {
  const result = value ?? 0;
  if (!Number.isFinite(result) || (nonnegative && result < 0)) {
    throw new GraphLayoutError(`${name} must be finite${nonnegative ? ' and non-negative' : ''}.`);
  }
  return result;
};

const outgoing = (count: number, links: Link[]): number[][] => {
  const adjacency = Array.from({ length: count }, () => [] as number[]);
  links.forEach((link, index) => adjacency[link.source].push(index));
  return adjacency;
};

/** Reverse DFS back edges locally, without changing the caller's source/target identities. */
const breakCycles = (vertices: Vertex[], links: Link[]): void => {
  const adjacency = outgoing(vertices.length, links);
  const state = new Uint8Array(vertices.length);
  for (let root = 0; root < vertices.length; root++) {
    if (state[root]) {
      continue;
    }
    state[root] = 1;
    const stack = [{ node: root, next: 0 }];
    while (stack.length) {
      const frame = stack[stack.length - 1];
      if (frame.next === adjacency[frame.node].length) {
        state[frame.node] = 2;
        stack.pop();
        continue;
      }
      const link = links[adjacency[frame.node][frame.next++]];
      if (state[link.target] === 1) {
        [link.source, link.target] = [link.target, link.source];
        link.reversed = true;
      } else if (state[link.target] === 0) {
        state[link.target] = 1;
        stack.push({ node: link.target, next: 0 });
      }
    }
  }
};

const assignLayers = (vertices: Vertex[], links: Link[]): number[][] => {
  const adjacency = outgoing(vertices.length, links);
  const degrees = new Int32Array(vertices.length);
  links.forEach((link) => degrees[link.target]++);
  const positioned = vertices
    .map((vertex, index) => ({ index, y: vertex.node?.y }))
    .filter((entry): entry is { index: number; y: number } => entry.y !== undefined)
    .sort((a, b) => a.y - b.y || a.index - b.index);
  let initialRank = 0;
  for (let i = 0; i < positioned.length; i++) {
    if (i > 0 && positioned[i].y !== positioned[i - 1].y) {
      initialRank++;
    }
    vertices[positioned[i].index].rank = initialRank;
  }
  const queue = vertices.flatMap((_, index) => (degrees[index] === 0 ? [index] : []));
  for (const source of queue) {
    for (const linkIndex of adjacency[source]) {
      const target = links[linkIndex].target;
      vertices[target].rank = Math.max(vertices[target].rank, vertices[source].rank + 1);
      if (--degrees[target] === 0) {
        queue.push(target);
      }
    }
  }
  if (queue.length !== vertices.length) {
    throw new GraphLayoutError('Cycle breaking did not produce an acyclic layout graph.');
  }
  const ranks = [...new Set(vertices.map((vertex) => vertex.rank))].sort((a, b) => a - b);
  const compressed = new Map(ranks.map((rank, index) => [rank, index]));
  const layers = ranks.map(() => [] as number[]);
  vertices.forEach((vertex, index) => {
    vertex.rank = compressed.get(vertex.rank)!;
    layers[vertex.rank].push(index);
  });
  for (const link of links) {
    const chain = [link.source];
    for (let rank = vertices[link.source].rank + 1; rank < vertices[link.target].rank; rank++) {
      if (vertices.length >= 100_000) {
        throw new GraphLayoutError('Layered layout requires more than 100,000 real and virtual nodes.');
      }
      const index = vertices.length;
      vertices.push({ width: 0, height: 0, order: index, rank, x: 0, y: 0 });
      layers[rank].push(index);
      chain.push(index);
    }
    link.chain = [...chain, link.target];
  }
  return layers;
};

const placeLayers = (vertices: Vertex[], layers: number[][], options: LayeredOptions): number => {
  const widths: number[] = [];
  const gap = (left: Vertex, right: Vertex) =>
    left.node && right.node ? options.nodeSpacing : left.node || right.node ? options.edgeNodeSpacing : options.edgeSpacing;
  for (const layer of layers) {
    let width = 0;
    layer.forEach((index, position) => {
      const vertex = vertices[index];
      if (position) {
        width += gap(vertices[layer[position - 1]], vertex);
      }
      vertex.x = width;
      width += vertex.width;
    });
    widths.push(width);
  }
  const contentWidth = widths.reduce((max, width) => Math.max(max, width), 0);
  layers.forEach((layer, rank) => {
    for (const index of layer) {
      vertices[index].x += options.padding.left + (contentWidth - widths[rank]) / 2;
    }
  });
  return options.padding.left + contentWidth + options.padding.right;
};

const placeBalancedLayers = (vertices: Vertex[], layers: number[][], links: Link[], options: LayeredOptions): number => {
  const centers = balancedCenters(
    vertices,
    layers,
    links.map((link) => link.chain),
    options
  );
  let left = Number.POSITIVE_INFINITY;
  let right = Number.NEGATIVE_INFINITY;
  vertices.forEach((vertex, v) => {
    left = Math.min(left, centers[v] - vertex.width / 2);
    right = Math.max(right, centers[v] + vertex.width / 2);
  });
  vertices.forEach((vertex, v) => {
    vertex.x = options.padding.left + centers[v] - vertex.width / 2 - left;
  });
  return options.padding.left + right - left + options.padding.right;
};

/** Below this horizontal offset ELK's spline router draws a hop straight (MAX_VERTICAL_DIFF_FOR_STRAIGHT). */
const STRAIGHT_TOLERANCE = 0.2;
/** ELK trims each spline segment 5% at both ends before testing slot overlap (HYPEREDGE_POS_OUTER_RATE). */
const SEGMENT_TRIM = 0.05;

/**
 * Stacks ranks top-down with ELK's spline-router gap rule: a gap holding non-straight hops needs
 * `2 * edgeNodeBetweenLayers + (slots - 1) * edgeEdgeBetweenLayers`, at least `nodeNodeBetweenLayers`.
 * ELK ranks pairwise slot dependencies; the maximum overlap depth of the trimmed hop intervals is its
 * lower bound and is computed by an O(s log s) sweep per gap.
 */
const stackLayers = (vertices: Vertex[], layers: number[][], links: Link[], options: LayeredOptions, anchors: Anchors): number => {
  const gaps: number[][] = layers.map(() => []);
  for (const link of links) {
    const start = anchorX(vertices, link, true, anchors);
    const end = anchorX(vertices, link, false, anchors);
    const xs = link.chain.map((index, position) =>
      position === 0
        ? link.reversed
          ? end
          : start
        : position === link.chain.length - 1
          ? link.reversed
            ? start
            : end
          : vertices[index].x
    );
    const firstRank = vertices[link.chain[0]].rank;
    for (let hop = 1; hop < xs.length; hop++) {
      const low = Math.min(xs[hop - 1], xs[hop]);
      const high = Math.max(xs[hop - 1], xs[hop]);
      if (high - low >= STRAIGHT_TOLERANCE) {
        const trim = (high - low) * SEGMENT_TRIM;
        gaps[firstRank + hop - 1].push(low + trim, high - trim);
      }
    }
  }
  let y = options.padding.top;
  layers.forEach((layer, rank) => {
    let height = 0;
    for (const v of layer) {
      vertices[v].y = y;
      height = Math.max(height, vertices[v].height);
    }
    y += height;
    if (rank < layers.length - 1) {
      const slots = maxOverlap(gaps[rank]);
      y += slots
        ? Math.max(options.layerSpacing, 2 * options.edgeNodeLayerSpacing + (slots - 1) * options.edgeEdgeLayerSpacing)
        : options.layerSpacing;
    }
  });
  return y + options.padding.bottom;
};

/** Maximum number of closed intervals sharing a point; `bounds` holds [low0, high0, low1, high1, ...]. */
const maxOverlap = (bounds: number[]): number => {
  const count = bounds.length / 2;
  if (count < 2) {
    return count;
  }
  const lows = new Float64Array(count);
  const highs = new Float64Array(count);
  for (let i = 0; i < count; i++) {
    lows[i] = bounds[2 * i];
    highs[i] = bounds[2 * i + 1];
  }
  lows.sort();
  highs.sort();
  let depth = 0;
  let best = 0;
  for (let i = 0, j = 0; i < count; i++) {
    // Closed intervals: one ending exactly where another starts still overlaps (ELK uses `>`).
    while (highs[j] < lows[i]) {
      j++;
      depth--;
    }
    best = Math.max(best, ++depth);
  }
  return best;
};

interface Anchors {
  source: Map<Link, number>;
  target: Map<Link, number>;
}

/** Horizontal attachment offsets, spread symmetrically per endpoint and sorted by the opposite end's x. */
const anchorOffsets = (vertices: Vertex[], links: Link[], portSpacing: number): Anchors => {
  const sourceGroups = new Map<number, Link[]>();
  const targetGroups = new Map<number, Link[]>();
  for (const link of links) {
    const source = link.reversed ? link.target : link.source;
    const target = link.reversed ? link.source : link.target;
    if (!sourceGroups.has(source)) {
      sourceGroups.set(source, []);
    }
    if (!targetGroups.has(target)) {
      targetGroups.set(target, []);
    }
    sourceGroups.get(source)!.push(link);
    targetGroups.get(target)!.push(link);
  }
  for (const group of sourceGroups.values()) {
    group.sort((a, b) => vertices[a.reversed ? a.source : a.target].x - vertices[b.reversed ? b.source : b.target].x);
  }
  for (const group of targetGroups.values()) {
    group.sort((a, b) => vertices[a.reversed ? a.target : a.source].x - vertices[b.reversed ? b.target : b.source].x);
  }
  const offsets = (groups: Map<number, Link[]>) => {
    const result = new Map<Link, number>();
    for (const [index, group] of groups) {
      const width = vertices[index].width;
      const spacing = Math.min(portSpacing, width / Math.max(1, group.length));
      group.forEach((link, position) => {
        result.set(link, width / 2 + (position - (group.length - 1) / 2) * spacing);
      });
    }
    return result;
  };
  return { source: offsets(sourceGroups), target: offsets(targetGroups) };
};

/** Drawn-source (`atSource`) or drawn-target anchor x of a link. */
const anchorX = (vertices: Vertex[], link: Link, atSource: boolean, anchors: Anchors): number => {
  const vertex = vertices[atSource !== link.reversed ? link.source : link.target];
  const port = atSource ? link.sourcePort : link.targetPort;
  return port ? vertex.x + (port.x ?? 0) + (port.width ?? 0) / 2 : vertex.x + (atSource ? anchors.source : anchors.target).get(link)!;
};

const portPoint = (vertex: Vertex, port: ElkPort | undefined, atSource: boolean, offset: number): ElkPoint =>
  port
    ? { x: vertex.x + (port.x ?? 0) + (port.width ?? 0) / 2, y: vertex.y + (port.y ?? 0) + (port.height ?? 0) / 2 }
    : { x: vertex.x + offset, y: vertex.y + (atSource ? vertex.height : 0) };

const cubicBends = (start: ElkPoint, bends: ElkPoint[], end: ElkPoint): ElkPoint[] => {
  const points = [start];
  for (const point of [...bends, end]) {
    const previous = points[points.length - 1];
    if (point.x !== previous.x || point.y !== previous.y) {
      points.push(point);
    }
  }
  if (points.length === 1) {
    points.push(end);
  }
  const result: ElkPoint[] = [];
  // Duplicate endpoints as cubic controls so each waypoint remains on the rendered path.
  for (let index = 1; index < points.length; index++) {
    result.push({ ...points[index - 1] }, { ...points[index] });
    if (index < points.length - 1) {
      result.push({ ...points[index] });
    }
  }
  return result;
};

const routeEdges = (container: ElkNode, vertices: Vertex[], links: Link[], anchors: Anchors): ElkEdgeSection[] => {
  const rankHeights: number[] = [];
  for (const vertex of vertices) {
    rankHeights[vertex.rank] = Math.max(rankHeights[vertex.rank] ?? 0, vertex.height);
  }
  const sourceOffsets = anchors.source;
  const targetOffsets = anchors.target;
  return links.map((link) => {
    const source = link.reversed ? link.target : link.source;
    const target = link.reversed ? link.source : link.target;
    const start = portPoint(vertices[source], link.sourcePort, true, sourceOffsets.get(link)!);
    const end = portPoint(vertices[target], link.targetPort, false, targetOffsets.get(link)!);
    const chain = link.reversed ? [...link.chain].reverse() : link.chain;
    const bends: ElkPoint[] = [{ ...start }];
    const layoutSource = vertices[link.source];
    const lead = {
      x: link.reversed ? end.x : start.x,
      y: layoutSource.y + rankHeights[layoutSource.rank],
    };
    // Fixed endpoints may be above taller siblings' bottoms. Clear the
    // whole rank at the anchor's x before entering the inter-layer gap.
    if (!link.reversed && lead.y !== start.y) {
      bends.push(lead);
    }
    for (const index of chain.slice(1, -1)) {
      const dummy = vertices[index];
      const top = { x: dummy.x, y: dummy.y };
      const bottom = { x: dummy.x, y: dummy.y + rankHeights[dummy.rank] };
      // Stay in the dummy's free lane until below all real siblings.
      // Sloped transitions then lie in layer gaps, not inside node ranks.
      bends.push(...(link.reversed ? [bottom, top] : [top, bottom]));
    }
    if (chain.length === 2) {
      const gapStart = link.reversed ? start : lead;
      const gapEnd = link.reversed ? lead : end;
      bends.push({ x: (gapStart.x + gapEnd.x) / 2, y: (gapStart.y + gapEnd.y) / 2 });
    }
    if (link.reversed && lead.y !== end.y) {
      bends.push(lead);
    }
    if ([start, end, ...bends].some((point) => !Number.isFinite(point.x) || !Number.isFinite(point.y))) {
      throw new GraphLayoutError(`Edge '${link.edge.id}' has non-finite route geometry in '${container.id}'.`);
    }
    return {
      id: `${link.edge.id}_s0`,
      startPoint: start,
      endPoint: end,
      bendPoints: chain.length === 2 && bends.length === 2 ? bends : cubicBends(start, bends, end),
      incomingShape: link.edge.sources[0],
      outgoingShape: link.edge.targets[0],
    };
  });
};

/** Locally scoped compound layout; publish geometry only after every scope succeeds. */
export const layoutLayered = (graph: ElkNode, globalSources: (LayoutOptions | undefined)[]): ElkNode => {
  const geometries = new Map<ElkNode, NodeGeometry>();
  const routes = new Map<ElkExtendedEdge, { container: string; sections: ElkEdgeSection[] }>();
  const seen = new Set<ElkNode>();
  const visit = (container: ElkNode, depth: number): NodeGeometry => {
    if (depth > 64 || seen.has(container)) {
      throw new GraphLayoutError('Layered input must be a tree with at most 64 nested scopes.');
    }
    seen.add(container);
    finite(container.x, `${container.id}.x`);
    finite(container.y, `${container.id}.y`);
    finite(container.width, `${container.id}.width`, true);
    finite(container.height, `${container.id}.height`, true);
    if (container.labels?.length) {
      throw new GraphLayoutError('Layered label placement is not supported.');
    }
    const sources = [container.layoutOptions, ...globalSources];
    const options = layeredOptions(sources);
    const [minimumWidth, minimumHeight] = sizeOption(readOption(sources, 'nodeSize.minimum'), 'nodeSize.minimum');
    const children = container.children ?? [];
    const vertices: Vertex[] = [];
    const endpoints = new Map<string, { vertex: number; port?: ElkPort }>();
    for (const node of children) {
      const geometry = visit(node, depth + 1);
      const index = vertices.length;
      if (endpoints.has(node.id)) {
        throw new GraphLayoutError(`Ambiguous duplicate node id '${node.id}' in '${container.id}'.`);
      }
      endpoints.set(node.id, { vertex: index });
      vertices.push({ node, width: geometry.width, height: geometry.height, order: index, rank: 0, x: 0, y: 0 });
      for (const port of node.ports ?? []) {
        if (endpoints.has(port.id) || readOption([node.layoutOptions], 'portConstraints') !== 'FIXED_POS') {
          throw new GraphLayoutError(`Port '${port.id}' requires a unique id and FIXED_POS constraints.`);
        }
        const side = readOption([port.layoutOptions], 'port.side');
        if (side !== 'SOUTH') {
          throw new GraphLayoutError(`Unsupported port side '${side}' on '${port.id}'.`);
        }
        const px = finite(port.x, `${port.id}.x`, true);
        const py = finite(port.y, `${port.id}.y`, true);
        const pw = finite(port.width, `${port.id}.width`, true);
        const ph = finite(port.height, `${port.id}.height`, true);
        if (px + pw > geometry.width || py !== geometry.height || ph !== 0) {
          throw new GraphLayoutError(`Fixed SOUTH port '${port.id}' must lie on the node's bottom border.`);
        }
        endpoints.set(port.id, { vertex: index, port });
      }
    }
    const edgeIds = new Set<string>();
    const links: Link[] = (container.edges ?? []).map((edge) => {
      if (edge.sources.length !== 1 || edge.targets.length !== 1 || edge.labels?.length || edgeIds.has(edge.id)) {
        throw new GraphLayoutError(`Edge '${edge.id}' requires one source, one target, a unique id, and no labels.`);
      }
      edgeIds.add(edge.id);
      const source = endpoints.get(edge.sources[0]);
      const target = endpoints.get(edge.targets[0]);
      if (!source || !target) {
        throw new GraphLayoutError(`Cross-hierarchy or missing endpoint on '${edge.id}' in '${container.id}' is not supported yet.`);
      }
      if (source.vertex === target.vertex) {
        throw new GraphLayoutError(`Self-loop '${edge.id}' is not supported.`);
      }
      return {
        edge,
        source: source.vertex,
        target: target.vertex,
        sourcePort: source.port,
        targetPort: target.port,
        reversed: false,
        chain: [],
      };
    });
    let geometry: NodeGeometry;
    if (children.length) {
      breakCycles(vertices, links);
      const layers = assignLayers(vertices, links);
      orderLayers(vertices, layers, links, options);
      const width =
        options.placement === 'SIMPLE' ? placeLayers(vertices, layers, options) : placeBalancedLayers(vertices, layers, links, options);
      const anchors = anchorOffsets(vertices, links, options.portSpacing);
      const height = stackLayers(vertices, layers, links, options, anchors);
      geometry = { x: 0, y: 0, width: Math.max(width, minimumWidth), height: Math.max(height, minimumHeight) };
      for (const vertex of vertices) {
        if (vertex.node) {
          geometries.get(vertex.node)!.x = vertex.x;
          geometries.get(vertex.node)!.y = vertex.y;
        }
      }
      const sections = routeEdges(container, vertices, links, anchors);
      links.forEach((link, index) => routes.set(link.edge, { container: container.id, sections: [sections[index]] }));
    } else {
      geometry = {
        x: 0,
        y: 0,
        width: Math.max(container.width ?? 0, minimumWidth),
        height: Math.max(container.height ?? 0, minimumHeight),
      };
    }
    if (Object.values(geometry).some((value) => !Number.isFinite(value))) {
      throw new GraphLayoutError(`Non-finite layout dimensions on '${container.id}'.`);
    }
    geometries.set(container, geometry);
    return geometry;
  };
  visit(graph, 0);
  for (const [node, geometry] of geometries) {
    Object.assign(node, geometry);
  }
  for (const [edge, route] of routes) {
    Object.assign(edge, route);
  }
  return graph;
};
