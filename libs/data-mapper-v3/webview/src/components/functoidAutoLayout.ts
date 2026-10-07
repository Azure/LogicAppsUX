import type { MapFunctoid, MapLink } from '../../../src/model/mapModel';

interface Point {
  x: number;
  y: number;
}

export interface FunctoidLayoutInput {
  functoids: MapFunctoid[];
  links: MapLink[];
  // Schema node connector positions keyed `src:<path>` / `tgt:<path>`, in mapping-area pixels.
  positions: Map<string, Point>;
  offsetY: number;
  scrollLeft: number;
  scrollTop: number;
  // Canvas origin (model units) the layout starts from.
  layoutLeft: number;
  layoutTop: number;
  zoom: number;
  viewportWidth: number;
  viewportHeight: number;
  functoidWidth: number;
  functoidHeight: number;
  gridSize: number;
  padding: number;
  snap(value: number): number;
}

// Room kept free on the right so a vertical scrollbar appearing after the layout does not force a horizontal one.
const scrollbarAllowance = 20;
const minColumnGap = 24;
const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value));
const average = (values: number[]): number => values.reduce((sum, value) => sum + value, 0) / values.length;

// Arranges functoids in left-to-right columns by dependency depth, ordered by where their schema links attach, with no overlaps.
export function layoutFunctoids(input: FunctoidLayoutInput): Map<string, Point> {
  const { functoids, links, positions, zoom, functoidWidth, functoidHeight, gridSize, padding, snap } = input;
  const result = new Map<string, Point>();
  if (functoids.length === 0) {
    return result;
  }

  const ids = new Set(functoids.map((functoid) => functoid.id));
  const predecessors = new Map<string, string[]>();
  const neighbors = new Map<string, string[]>();
  const anchors = new Map<string, number[]>();
  const toCanvasY = (point: Point): number => (point.y - input.offsetY + input.scrollTop) / zoom;

  for (const link of links) {
    const fromFunctoid = link.sourceType === 'functoid' && ids.has(link.sourceId);
    const toFunctoid = link.targetType === 'functoid' && ids.has(link.targetId);
    if (fromFunctoid && toFunctoid) {
      predecessors.set(link.targetId, [...(predecessors.get(link.targetId) ?? []), link.sourceId]);
      neighbors.set(link.targetId, [...(neighbors.get(link.targetId) ?? []), link.sourceId]);
      neighbors.set(link.sourceId, [...(neighbors.get(link.sourceId) ?? []), link.targetId]);
    } else if (toFunctoid && link.sourceType === 'schemaNode' && link.sourcePath) {
      const point = positions.get(`src:${link.sourcePath}`);
      if (point) {
        anchors.set(link.targetId, [...(anchors.get(link.targetId) ?? []), toCanvasY(point)]);
      }
    } else if (fromFunctoid && link.targetType === 'schemaNode' && link.targetPath) {
      const point = positions.get(`tgt:${link.targetPath}`);
      if (point) {
        anchors.set(link.sourceId, [...(anchors.get(link.sourceId) ?? []), toCanvasY(point)]);
      }
    }
  }

  const depths = new Map<string, number>();
  const visiting = new Set<string>();
  const depthOf = (id: string): number => {
    const known = depths.get(id);
    if (known !== undefined) {
      return known;
    }
    if (visiting.has(id)) {
      return 0;
    }
    visiting.add(id);
    const depth = Math.max(-1, ...(predecessors.get(id) ?? []).map(depthOf)) + 1;
    visiting.delete(id);
    depths.set(id, depth);
    return depth;
  };
  for (const functoid of functoids) {
    depthOf(functoid.id);
  }

  const desired = new Map<string, number>();
  for (const functoid of functoids) {
    const values = anchors.get(functoid.id);
    if (values?.length) {
      desired.set(functoid.id, average(values));
    }
  }
  for (let pass = 0; pass < 4; pass++) {
    for (const functoid of functoids) {
      if (desired.has(functoid.id)) {
        continue;
      }
      const known = (neighbors.get(functoid.id) ?? []).map((id) => desired.get(id)).filter((value): value is number => value !== undefined);
      if (known.length) {
        desired.set(functoid.id, average(known));
      }
    }
  }
  for (const functoid of functoids) {
    if (!desired.has(functoid.id)) {
      desired.set(functoid.id, functoid.y);
    }
  }

  const top = input.layoutTop / zoom + padding + functoidHeight / 2;
  const availableHeight = Math.max(functoidHeight, (input.viewportHeight - scrollbarAllowance) / zoom - padding * 2 - functoidHeight);
  const desiredValues = [...desired.values()];
  const desiredMin = Math.min(...desiredValues);
  const desiredRange = Math.max(...desiredValues) - desiredMin;
  const normalized = new Map<string, number>();
  for (const [id, value] of desired) {
    normalized.set(
      id,
      desiredRange > availableHeight
        ? top + (value - desiredMin) * (availableHeight / desiredRange)
        : clamp(value, top, top + availableHeight)
    );
  }

  const roundUp = (value: number): number => Math.ceil(value / gridSize) * gridSize;
  const preferredRowStep = roundUp(functoidHeight + 20);
  const minRowStep = roundUp(functoidHeight + 4);
  const capacity = Math.floor(availableHeight / minRowStep) + 1;

  // Each dependency column holds as many functoids as fit vertically; extra ones spill into an additional column.
  const dependencyColumnCount = Math.max(...depths.values()) + 1;
  const columns: MapFunctoid[][] = [];
  for (let column = 0; column < dependencyColumnCount; column++) {
    const members = functoids
      .filter((functoid) => depths.get(functoid.id) === column)
      .sort((a, b) => (normalized.get(a.id) ?? 0) - (normalized.get(b.id) ?? 0) || a.y - b.y);
    for (let start = 0; start < members.length; start += capacity) {
      columns.push(members.slice(start, start + capacity));
    }
  }

  const availableWidth = (input.viewportWidth - scrollbarAllowance) / zoom - padding * 2;
  const columnStep =
    columns.length > 1
      ? clamp((availableWidth - functoidWidth) / (columns.length - 1), functoidWidth + minColumnGap, functoidWidth + 140)
      : 0;
  const totalWidth = functoidWidth + columnStep * (columns.length - 1);
  const firstX = input.layoutLeft / zoom + padding + Math.max(0, (availableWidth - totalWidth) / 2) + functoidWidth / 2;

  columns.forEach((members, column) => {
    const rowStep =
      members.length > 1
        ? clamp(Math.floor(availableHeight / (members.length - 1) / gridSize) * gridSize, minRowStep, preferredRowStep)
        : preferredRowStep;
    const placed: number[] = [];
    for (const member of members) {
      const wanted = normalized.get(member.id) ?? top;
      placed.push(placed.length === 0 ? Math.max(top, wanted) : Math.max(wanted, placed[placed.length - 1] + rowStep));
    }
    const drift = average(members.map((member, index) => (normalized.get(member.id) ?? top) - placed[index]));
    const shift = Math.max(Math.min(drift, top + availableHeight - placed[placed.length - 1]), top - placed[0]);
    members.forEach((member, index) => {
      result.set(member.id, { x: snap(firstX + column * columnStep), y: snap(placed[index] + shift) });
    });
  });

  return result;
}
