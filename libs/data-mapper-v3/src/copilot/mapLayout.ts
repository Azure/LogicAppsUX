import type { MapPage } from '../model/mapModel';

/** Changes coordinates only; links and functoid array order remain authoritative. */
export function layoutMapPage(page: MapPage): void {
  const incoming = new Map(page.functoids.map((node) => [node.id, new Set<string>()]));
  const outgoing = new Map(page.functoids.map((node) => [node.id, new Set<string>()]));
  for (const link of page.links) {
    if (link.sourceType === 'functoid' && link.targetType === 'functoid' && outgoing.has(link.sourceId) && incoming.has(link.targetId)) {
      outgoing.get(link.sourceId)!.add(link.targetId);
      incoming.get(link.targetId)!.add(link.sourceId);
    }
  }

  const visited = new Set<string>();
  let top = 80;
  for (const node of page.functoids) {
    if (visited.has(node.id)) {
      continue;
    }
    const component = [node.id];
    visited.add(node.id);
    for (const id of component) {
      for (const neighbor of [...incoming.get(id)!, ...outgoing.get(id)!]) {
        if (!visited.has(neighbor)) {
          visited.add(neighbor);
          component.push(neighbor);
        }
      }
    }

    const pending = new Set(component);
    const ranks = new Map(component.map((id) => [id, 0]));
    const degrees = new Map(component.map((id) => [id, incoming.get(id)!.size]));
    while (pending.size > 0) {
      // A cyclic legacy graph still needs a layout. Break ties locally,
      // without removing or changing any of its links.
      const id = [...pending].reduce((best, candidate) => (degrees.get(candidate)! < degrees.get(best)! ? candidate : best));
      pending.delete(id);
      for (const target of outgoing.get(id)!) {
        if (pending.has(target)) {
          ranks.set(target, Math.max(ranks.get(target)!, ranks.get(id)! + 1));
          degrees.set(target, degrees.get(target)! - 1);
        }
      }
    }

    const layers: string[][] = [];
    for (const id of component) {
      (layers[ranks.get(id)!] ??= []).push(id);
    }
    const rows = new Map<string, number>();
    const height = Math.max(...layers.map((layer) => layer.length));
    const updateRows = (layer: string[]): void => {
      layer.forEach((id, index) => rows.set(id, index + (height - layer.length) / 2));
    };
    layers.forEach(updateRows);
    const averageRow = (neighbors: Set<string>, id: string): number =>
      neighbors.size === 0 ? rows.get(id)! : [...neighbors].reduce((sum, neighbor) => sum + rows.get(neighbor)!, 0) / neighbors.size;

    // Barycentric ordering keeps related branches together within a layer.
    for (let sweep = 0; sweep < 4; sweep++) {
      const order = sweep % 2 === 0 ? layers : [...layers].reverse();
      const neighbors = sweep % 2 === 0 ? incoming : outgoing;
      for (const layer of order) {
        layer.sort((a, b) => averageRow(neighbors.get(a)!, a) - averageRow(neighbors.get(b)!, b));
        updateRows(layer);
      }
    }
    for (const functoid of page.functoids) {
      if (ranks.has(functoid.id)) {
        functoid.x = 100 + ranks.get(functoid.id)! * 180;
        functoid.y = top + rows.get(functoid.id)! * 110;
      }
    }
    top += height * 110 + 70;
  }
}
