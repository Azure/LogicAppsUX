import { describe, expect, it } from 'vitest';
import { extractGeometry, findOverlaps } from '../../bench/geometry';
import { loadWorkflowFixtures } from '../../bench/fixtures';
import { layoutQuality } from '../../bench/quality';
import ELK, { GraphLayoutError, type ElkNode } from '../index';
import { balancedCenters } from '../layered/horizontal';
import { layeredOptions } from '../layered/options';

const elk = new ELK();
const options = {
  'elk.algorithm': 'layered',
  'elk.direction': 'DOWN',
  'elk.layered.nodePlacement.strategy': 'SIMPLE',
  'elk.layered.crossingMinimization.forceNodeModelOrder': 'true',
  'elk.padding': '[top=0,left=20,bottom=20,right=20]',
  'elk.layered.spacing.nodeNodeBetweenLayers': '80',
};
const chain = (): ElkNode => ({
  id: 'root',
  children: [
    { id: 'a', width: 100, height: 40 },
    { id: 'b', width: 100, height: 40 },
  ],
  edges: [{ id: 'ab', sources: ['a'], targets: ['b'] }],
});

describe('layered SIMPLE milestone', () => {
  it('lays out a chain in place with padding, spacing and container-relative edge sections', async () => {
    const graph = chain();
    const output = await elk.layout(graph, { layoutOptions: options });
    expect(output).toBe(graph);
    expect(output.children).toMatchObject([
      { x: 20, y: 0 },
      { x: 20, y: 120 },
    ]);
    expect(output).toMatchObject({ width: 140, height: 180 });
    expect(output.edges![0]).toMatchObject({
      container: 'root',
      sections: [{ startPoint: { x: 70, y: 40 }, endPoint: { x: 70, y: 120 } }],
    });
  });

  it('reverses DFS back edges without changing their public endpoints', async () => {
    const graph = chain();
    graph.edges!.push({ id: 'ba', sources: ['b'], targets: ['a'] });
    await elk.layout(graph, { layoutOptions: options });
    expect(graph.edges![1]).toMatchObject({
      sources: ['b'],
      targets: ['a'],
      sections: [{ incomingShape: 'b', outgoingShape: 'a', startPoint: { y: 160 }, endPoint: { y: 0 } }],
    });
    expect(findOverlaps(extractGeometry(graph), 0)).toEqual([]);
  });

  it('uses local container options without leaking them into descendants', async () => {
    const inner = chain();
    inner.id = 'inner';
    inner.layoutOptions = { 'elk.padding': '[top=10,left=10,bottom=10,right=10]', 'elk.nodeSize.minimum': '(180,200)' };
    const graph: ElkNode = { id: 'root', children: [inner] };
    await elk.layout(graph, { layoutOptions: options });
    expect(inner).toMatchObject({ x: 20, y: 0, width: 180, height: 200 });
    expect(inner.children).toMatchObject([
      { x: 10, y: 10 },
      { x: 10, y: 130 },
    ]);
    expect(inner.edges![0].container).toBe('inner');
  });

  it('preserves fixed SOUTH ports and routes from their exact positions', async () => {
    const graph = chain();
    graph.children![0].layoutOptions = { 'elk.portConstraints': 'FIXED_POS' };
    graph.children![0].ports = [{ id: 'a::branch', x: 25, y: 40, width: 0, height: 0, layoutOptions: { 'elk.port.side': 'SOUTH' } }];
    graph.edges![0].sources = ['a::branch'];
    await elk.layout(graph, { layoutOptions: options });
    expect(graph.children![0].ports![0]).toMatchObject({ x: 25, y: 40 });
    expect(graph.edges![0].sections![0].startPoint).toEqual({ x: 45, y: 40 });
  });

  it('keeps model order within a layer and handles long edges with virtual nodes', async () => {
    const graph = chain();
    graph.children!.push({ id: 'c', width: 100, height: 40 });
    graph.edges!.push({ id: 'bc', sources: ['b'], targets: ['c'] }, { id: 'ac', sources: ['a'], targets: ['c'] });
    await elk.layout(graph, { layoutOptions: options });
    expect(graph.children![2].y).toBe(240);
    expect(graph.edges![2].sections![0].bendPoints!.length).toBeGreaterThan(1);
  });

  it('uses layer sweeps to uncross a simple pair when model order is not forced', async () => {
    const graph: ElkNode = {
      id: 'root',
      children: ['a', 'b', 'c', 'd'].map((id) => ({ id, width: 100, height: 40 })),
      edges: [
        { id: 'ad', sources: ['a'], targets: ['d'] },
        { id: 'bc', sources: ['b'], targets: ['c'] },
      ],
    };
    await elk.layout(graph, {
      layoutOptions: { ...options, 'elk.layered.crossingMinimization.forceNodeModelOrder': 'false' },
    });
    const [a, b, c, d] = graph.children!;
    expect((a.x! - b.x!) * (d.x! - c.x!)).toBeGreaterThan(0);
  });

  it.each([
    [{ 'elk.direction': 'RIGHT' }, undefined, /direction/],
    [{ 'elk.layered.nodePlacement.strategy': 'LINEAR_SEGMENTS' }, undefined, /Unsupported layered node placement/],
    [{ 'elk.layered.nodePlacement.bk.fixedAlignment': 'LEFTUP' }, undefined, /fixedAlignment/],
    [{ 'elk.padding': 'invalid' }, undefined, /padding/],
    [{ 'elk.position': '(10,20)' }, undefined, /position/],
    [
      {},
      {
        id: 'root',
        children: [{ id: 'scope', children: [{ id: 'inner' }] }, { id: 'outside' }],
        edges: [{ id: 'cross', sources: ['inner'], targets: ['outside'] }],
      },
      /Cross-hierarchy/,
    ],
    [{}, { id: 'root', children: [{ id: 'a' }, { id: 'b' }], edges: [{ id: 'hyper', sources: ['a', 'b'], targets: ['b'] }] }, /one source/],
    [{ 'elk.layered.spacing.nodeNodeBetweenLayers': '-1' }, undefined, /non-negative/],
    [{}, { id: 'root', children: [{ id: 'a', width: Number.NaN }] }, /finite/],
    [{}, { id: 'root', children: [{ id: 'a' }], edges: [{ id: 'e', sources: ['a'], targets: ['a'] }] }, /Self-loop/],
    [{}, { id: 'root', children: [{ id: 'a' }], edges: [{ id: 'e', sources: ['a'], targets: ['missing'] }] }, /endpoint/],
  ])('rejects unsupported inputs without partial mutation', async (overrides, input, message) => {
    const graph: ElkNode = input ?? chain();
    const original = structuredClone(graph);
    const promise = elk.layout(graph, { layoutOptions: { ...options, ...overrides } });
    await expect(promise).rejects.toThrow(GraphLayoutError);
    await expect(promise).rejects.toThrow(message);
    expect(graph).toEqual(original);
  });

  it.each(loadWorkflowFixtures().map((fixture) => [fixture.name, fixture] as const))(
    'produces deterministic, non-overlapping SIMPLE boxes on captured %s',
    async (_, fixture) => {
      const args = { layoutOptions: { ...fixture.layoutOptions, ...options } };
      const result = await elk.layout(structuredClone(fixture.graph), args);
      const second = await elk.layout(structuredClone(fixture.graph), args);
      expect(result).toEqual(second);
      const geometry = extractGeometry(result);
      expect(findOverlaps(geometry, 0.01)).toEqual([]);
      const check = (node: ElkNode) => {
        for (const child of node.children ?? []) {
          expect(child.x!).toBeGreaterThanOrEqual(0);
          expect(child.y!).toBeGreaterThanOrEqual(0);
          expect(child.x! + child.width!).toBeLessThanOrEqual(node.width! + 0.01);
          expect(child.y! + child.height!).toBeLessThanOrEqual(node.height! + 0.01);
          check(child);
        }
        for (const edge of node.edges ?? []) {
          expect(edge.container).toBe(node.id);
          const section = edge.sections![0];
          for (const point of [section.startPoint, ...(section.bendPoints ?? []), section.endPoint]) {
            expect(Number.isFinite(point.x) && Number.isFinite(point.y)).toBe(true);
          }
        }
      };
      check(result);
    }
  );
});

const bkOptions = { ...options, 'elk.layered.nodePlacement.strategy': 'BRANDES_KOEPF' };
const center = (node: ElkNode): number => node.x! + node.width! / 2;
const weightedBranches = (): ElkNode => ({
  id: 'root',
  children: ['a', 'b', 'a1', 'a2', 'a3', 'b1'].map((id) => ({ id, width: 100, height: 40 })),
  edges: [
    ...['a1', 'a2', 'a3'].map((id) => ({ id: `a-${id}`, sources: ['a'], targets: [id] })),
    { id: 'b-b1', sources: ['b'], targets: ['b1'] },
  ],
});

describe('layered Brandes–Köpf BALANCED placement', () => {
  it.each(['direct', 'long', 'reversed'] as const)(
    'clears the whole source rank beside a taller sibling while preserving fixed SOUTH endpoints (%s)',
    async (mode) => {
      const graph: ElkNode = {
        id: 'root',
        children: [
          {
            id: 'short',
            width: 40,
            height: 20,
            layoutOptions: { 'elk.portConstraints': 'FIXED_POS' },
            ports: [{ id: 'p', x: 20, y: 20, width: 0, height: 0, layoutOptions: { 'elk.port.side': 'SOUTH' } }],
          },
          { id: 'tall', width: 120, height: 100 },
          { id: 'anchor', width: 40, height: 20 },
          { id: 'left', width: 40, height: 40 },
          { id: 'far', width: 40, height: 40 },
        ],
        edges:
          mode === 'reversed'
            ? [
                { id: 'short-left', sources: ['p'], targets: ['left'] },
                { id: 'left-far', sources: ['left'], targets: ['far'] },
                { id: 'anchor-left', sources: ['anchor'], targets: ['left'] },
                { id: 'back', sources: ['far'], targets: ['p'] },
              ]
            : [
                { id: 'short-far', sources: ['p'], targets: ['far'] },
                { id: 'anchor-left', sources: ['anchor'], targets: ['left'] },
                ...(mode === 'long' ? [{ id: 'left-far', sources: ['left'], targets: ['far'] }] : []),
              ],
      };
      await elk.layout(graph, { layoutOptions: bkOptions });
      const short = graph.children![0];
      const far = graph.children![4];
      const section = graph.edges![mode === 'reversed' ? 3 : 0].sections![0];
      const port = { x: short.x! + 20, y: short.y! + 20 };
      const lead = { x: port.x, y: short.y! + 100 };
      expect(layoutQuality(graph).edgeNodeHits).toBe(0);
      if (mode === 'reversed') {
        expect(section.endPoint).toEqual(port);
        expect(section.bendPoints).toContainEqual(lead);
        expect(section.startPoint).toEqual({ x: center(far), y: far.y! + far.height! });
      } else {
        expect(section.startPoint).toEqual(port);
        expect(section.bendPoints).toContainEqual(lead);
        expect(section.endPoint).toEqual({ x: center(far) - (mode === 'long' ? 10 : 0), y: far.y! });
      }
      expect(short.ports![0]).toMatchObject({ x: 20, y: 20 });
      if (mode !== 'direct') {
        expect(section.bendPoints!.length).toBeGreaterThanOrEqual(4);
      }
    }
  );

  it('groups a shuffled uneven four-rank forest beneath its parents with zero route crossings', async () => {
    const forest: ElkNode = { id: 'root', children: [], edges: [] };
    const add = (id: string, parent?: string) => {
      forest.children!.push({ id, width: 60 + (forest.children!.length % 5) * 30, height: 40 });
      if (parent) {
        forest.edges!.push({ id: `${parent}-${id}`, sources: [parent], targets: [id] });
      }
    };
    for (let root = 0; root < 3; root++) {
      const parent = `r${root}`;
      add(parent);
      for (let branch = 0; branch < 4; branch++) {
        const child = `${parent}-${branch}`;
        add(child, parent);
        for (let leaf = 0; leaf <= (root + branch) % 4; leaf++) {
          const grandchild = `${child}-${leaf}`;
          add(grandchild, child);
          if ((root + branch + leaf) % 3 !== 0) {
            for (let tip = 0; tip <= (branch + leaf) % 3; tip++) {
              add(`${grandchild}-${tip}`, grandchild);
            }
          }
        }
      }
    }
    let seed = 97;
    for (let i = forest.children!.length - 1; i > 0; i--) {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      const j = seed % (i + 1);
      [forest.children![i], forest.children![j]] = [forest.children![j], forest.children![i]];
    }
    const crossingCount = (graph: ElkNode) => {
      const bands = new Map<number, { start: number; end: number }[]>();
      for (const edge of graph.edges!) {
        const section = edge.sections![0];
        const band = bands.get(section.startPoint.y) ?? [];
        band.push({ start: section.startPoint.x, end: section.endPoint.x });
        bands.set(section.startPoint.y, band);
      }
      let crossings = 0;
      for (const band of bands.values()) {
        band.sort((a, b) => a.start - b.start);
        for (let i = 0; i < band.length; i++) {
          for (let j = i + 1; j < band.length; j++) {
            if (band[i].start < band[j].start && band[i].end > band[j].end) {
              crossings++;
            }
          }
        }
      }
      return crossings;
    };
    const simple = await elk.layout(structuredClone(forest), {
      layoutOptions: { ...options, 'elk.layered.crossingMinimization.forceNodeModelOrder': 'false' },
    });
    const balanced = await elk.layout(forest, {
      layoutOptions: { ...bkOptions, 'elk.layered.crossingMinimization.forceNodeModelOrder': 'false' },
    });
    expect(crossingCount(simple)).toBeGreaterThan(0);
    expect(crossingCount(balanced)).toBe(0);
    expect(new Set(balanced.children!.map((node) => node.y)).size).toBeGreaterThanOrEqual(4);
  });

  it('retains evenly spaced ordered port offsets for a high-degree star', async () => {
    const graph: ElkNode = {
      id: 'root',
      children: [
        { id: 'hub', width: 1024, height: 40 },
        ...Array.from({ length: 256 }, (_, i) => ({ id: `n${i}`, width: 20, height: 40 })),
      ],
      edges: Array.from({ length: 256 }, (_, i) => ({ id: `e${i}`, sources: ['hub'], targets: [`n${i}`] })),
    };
    await elk.layout(graph, { layoutOptions: bkOptions });
    for (let i = 0; i < graph.edges!.length; i++) {
      expect(graph.edges![i].sections![0].startPoint.x).toBe(graph.children![0].x! + 2 + i * 4);
    }
  });

  it('places weighted branch children under their predecessors instead of packing each rank independently', async () => {
    const graph = weightedBranches();
    await elk.layout(graph, { layoutOptions: bkOptions });
    const [a, b, a1, a2, a3, b1] = graph.children!;
    expect(center(a)).toBe(center(a2));
    expect(center(b)).toBe(center(b1));
    expect(center(a1) + center(a3)).toBe(2 * center(a));
    expect(center(b) - center(a)).toBeGreaterThan(200);
  });

  it('uses BK by default and produces the same geometry as explicit BRANDES_KOEPF', async () => {
    const { 'elk.layered.nodePlacement.strategy': _, ...defaultOptions } = bkOptions;
    const implicit = await elk.layout(weightedBranches(), { layoutOptions: defaultOptions });
    const explicit = await elk.layout(weightedBranches(), { layoutOptions: bkOptions });
    expect(implicit).toEqual(explicit);
  });

  it('aligns centers rather than left borders for unequal widths', async () => {
    const graph = chain();
    graph.children![0].width = 240;
    graph.children![1].width = 60;
    await elk.layout(graph, { layoutOptions: bkOptions });
    expect(center(graph.children![0])).toBe(center(graph.children![1]));
    expect(graph.children![1].x! - graph.children![0].x!).toBe(90);
    expect(graph.width).toBe(280);
  });

  it('keeps protected inner segments of a long edge straight across unequal-width ranks', async () => {
    const graph: ElkNode = {
      id: 'root',
      children: [100, 60, 280, 130, 100].map((width, i) => ({ id: `n${i}`, width, height: 40 })),
      edges: [
        ...[0, 1, 2, 3].map((i) => ({ id: `e${i}`, sources: [`n${i}`], targets: [`n${i + 1}`] })),
        { id: 'long', sources: ['n0'], targets: ['n4'] },
      ],
    };
    await elk.layout(graph, { layoutOptions: bkOptions });
    const inner = graph.edges![4].sections![0].bendPoints!.filter((_, index) => index % 3 === 2);
    expect(inner).toHaveLength(6);
    expect(inner.every((point) => point.x === inner[0].x)).toBe(true);
    for (let i = 0; i < inner.length / 2; i++) {
      const node = graph.children![i + 1];
      expect(inner[i * 2].x - (node.x! + node.width!)).toBeGreaterThanOrEqual(40);
    }
  });

  it.each([false, true])('routes a long edge vertically past a tall sibling before changing slope (reversed=%s)', async (reversed) => {
    const graph: ElkNode = {
      id: 'root',
      children: [
        { id: 'a', width: 80, height: 40 },
        { id: 'b', width: 600, height: 240 },
        { id: 'c', width: 80, height: 40 },
      ],
      edges: [
        { id: 'ab', sources: ['a'], targets: ['b'] },
        { id: 'bc', sources: ['b'], targets: ['c'] },
        { id: 'long', sources: [reversed ? 'c' : 'a'], targets: [reversed ? 'a' : 'c'] },
      ],
    };
    await elk.layout(graph, { layoutOptions: bkOptions });
    const sibling = graph.children![1];
    const section = graph.edges![2].sections![0];
    const lane = section.bendPoints!.filter((_, index) => index % 3 === 2).slice(0, 2);
    expect(lane).toHaveLength(2);
    expect(lane.map((point) => point.y)).toEqual(
      reversed ? [sibling.y! + sibling.height!, sibling.y!] : [sibling.y!, sibling.y! + sibling.height!]
    );
    expect(lane[0].x).toBe(lane[1].x);
    expect(lane[0].x).toBeGreaterThanOrEqual(sibling.x! + sibling.width! + 40);
    const points = [section.startPoint, ...section.bendPoints!, section.endPoint];
    for (let i = 1; i < points.length; i++) {
      const start = points[i - 1];
      const end = points[i];
      if (Math.min(start.y, end.y) < sibling.y! + sibling.height! && Math.max(start.y, end.y) > sibling.y!) {
        expect(start.x).toBe(end.x);
        expect(start.x).toBeGreaterThanOrEqual(sibling.x! + sibling.width! + 40);
      }
    }
    const source = graph.children![reversed ? 2 : 0];
    const target = graph.children![reversed ? 0 : 2];
    expect(section.startPoint.y).toBe(source.y! + source.height!);
    expect(section.endPoint.y).toBe(target.y!);
    expect(section.incomingShape).toBe(source.id);
    expect(section.outgoingShape).toBe(target.id);
  });

  it('marks ordinary segments crossing an inner dummy segment before median alignment', () => {
    const vertices = [
      { node: { id: 'a' }, width: 80 },
      { width: 0 },
      { node: { id: 'b' }, width: 180 },
      { width: 0 },
      { node: { id: 'c' }, width: 40 },
      { width: 0 },
    ];
    const result = balancedCenters(
      vertices,
      [
        [0, 1],
        [2, 3],
        [4, 5],
      ],
      [
        [1, 3, 5],
        [0, 3],
        [1, 2],
        [2, 4],
      ],
      layeredOptions([])
    );
    expect(result[1]).toBe(result[3]);
    expect(result[3]).toBe(result[5]);
    expect(result[3] - result[2]).toBeGreaterThanOrEqual(130);
  });

  it('balances mirrored layouts symmetrically while preserving every per-type gap', () => {
    const vertices = [
      { node: { id: 'a' }, width: 160 },
      { node: { id: 'b' }, width: 60 },
      { node: { id: 'c' }, width: 30 },
      { node: { id: 'd' }, width: 220 },
      { width: 0 },
      { width: 0 },
    ];
    const layers = [
      [0, 1],
      [2, 3, 4, 5],
    ];
    const chains = [
      [0, 2],
      [0, 3],
      [1, 4],
      [1, 5],
    ];
    const spacing = layeredOptions([
      {
        'elk.spacing.nodeNode': '31',
        'elk.spacing.edgeNode': '47',
        'elk.spacing.edgeEdge': '19',
      },
    ]);
    const result = balancedCenters(vertices, layers, chains, spacing);
    const mirror = balancedCenters(
      vertices,
      layers.map((layer) => [...layer].reverse()),
      chains,
      spacing
    );
    for (let i = 1; i < vertices.length; i++) {
      expect(result[i] + mirror[i]).toBeCloseTo(result[0] + mirror[0], 8);
    }
    for (const layer of layers) {
      for (let i = 1; i < layer.length; i++) {
        const a = layer[i - 1];
        const b = layer[i];
        const gap = vertices[a].node && vertices[b].node ? 31 : vertices[a].node || vertices[b].node ? 47 : 19;
        expect(result[b] - result[a] - (vertices[a].width + vertices[b].width) / 2).toBeGreaterThanOrEqual(gap);
      }
    }
  });

  it('handles crossing inner segments without contradictory alignment blocks', () => {
    const vertices = Array.from({ length: 6 }, () => ({ width: 0 }));
    const layers = [
      [0, 1],
      [2, 3],
      [4, 5],
    ];
    const spacing = layeredOptions([{ 'elk.spacing.edgeEdge': '23' }]);
    const result = balancedCenters(
      vertices,
      layers,
      [
        [0, 3, 4],
        [1, 2, 5],
      ],
      spacing
    );
    for (const [a, b] of layers) {
      expect(result[b] - result[a]).toBeGreaterThanOrEqual(23);
    }
  });

  it('maintains spacing on reproducible sparse and dense DAGs with unequal widths and long edges', async () => {
    let seed = 173;
    const random = () => {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      return seed / 0x100000000;
    };
    for (let sample = 0; sample < 80; sample++) {
      const count = 12 + Math.floor(random() * 20);
      const graph: ElkNode = {
        id: 'root',
        children: Array.from({ length: count }, (_, i) => ({
          id: `n${i}`,
          width: Math.floor(random() * 240),
          height: 40,
        })),
        edges: [],
      };
      for (let a = 0; a < count; a++) {
        for (let b = a + 1; b < count; b++) {
          if (random() < (sample % 2 ? 0.3 : 0.07)) {
            graph.edges!.push({ id: `${a}-${b}`, sources: [`n${a}`], targets: [`n${b}`] });
          }
        }
      }
      await elk.layout(graph, {
        layoutOptions: { ...bkOptions, 'elk.layered.crossingMinimization.forceNodeModelOrder': sample % 3 ? 'true' : 'false' },
      });
      const layers = new Map<number, ElkNode[]>();
      for (const node of graph.children!) {
        const layer = layers.get(node.y!) ?? [];
        layer.push(node);
        layers.set(node.y!, layer);
      }
      for (const layer of layers.values()) {
        layer.sort((a, b) => a.x! - b.x!);
        for (let i = 1; i < layer.length; i++) {
          expect(layer[i].x! - layer[i - 1].x! - layer[i - 1].width!).toBeGreaterThanOrEqual(20);
        }
      }
    }
  });

  it('retains exact local SIMPLE packing without inheriting it into nested descendants', async () => {
    const inner = weightedBranches();
    inner.id = 'inner';
    inner.layoutOptions = { 'elk.layered.nodePlacement.strategy': 'SIMPLE' };
    const descendant = weightedBranches();
    descendant.id = 'descendant';
    inner.children!.push(descendant);
    const graph: ElkNode = { id: 'root', children: [inner] };
    const simpleReference = structuredClone(inner);
    await elk.layout(simpleReference, { layoutOptions: bkOptions });
    await elk.layout(graph, { layoutOptions: bkOptions });
    expect(inner.children).toEqual(simpleReference.children);
    const [a, b, , a2, , b1] = inner.children!;
    expect(center(a)).not.toBe(center(a2));
    expect(center(b)).not.toBe(center(b1));
    const [da, db, , da2, , db1] = descendant.children!;
    expect(center(da)).toBe(center(da2));
    expect(center(db)).toBe(center(db1));
    const plainSimple = weightedBranches();
    await elk.layout(plainSimple, { layoutOptions: options });
    expect(plainSimple.children!.map((node) => node.x)).toEqual([140, 260, 20, 140, 260, 380]);
  });

  it('preserves fixed SOUTH ports in BK and publishes no nested geometry after a later failure', async () => {
    const graph = chain();
    graph.children![0].layoutOptions = { 'elk.portConstraints': 'FIXED_POS' };
    graph.children![0].ports = [{ id: 'p', x: 25, y: 40, width: 0, height: 0, layoutOptions: { 'elk.port.side': 'SOUTH' } }];
    graph.edges![0].sources = ['p'];
    await elk.layout(graph, { layoutOptions: bkOptions });
    expect(graph.edges![0].sections![0].startPoint).toEqual({ x: graph.children![0].x! + 25, y: 40 });
    const invalid: ElkNode = { id: 'root', children: [weightedBranches(), { id: 'bad', layoutOptions: { 'elk.direction': 'UP' } }] };
    const original = structuredClone(invalid);
    await expect(elk.layout(invalid, { layoutOptions: bkOptions })).rejects.toThrow(/direction/);
    expect(invalid).toEqual(original);
  });

  it.each(loadWorkflowFixtures().map((fixture) => [fixture.name, fixture] as const))(
    'produces deterministic non-overlapping BALANCED boxes on captured %s',
    async (_, fixture) => {
      const args = { layoutOptions: { ...fixture.layoutOptions, ...bkOptions } };
      const first = await elk.layout(structuredClone(fixture.graph), args);
      const second = await elk.layout(structuredClone(fixture.graph), args);
      expect(first).toEqual(second);
      expect(findOverlaps(extractGeometry(first), 0.01)).toEqual([]);
    }
  );
});
