# @microsoft/logic-apps-graph-layout

A small, fast replacement for the parts of [elkjs](https://github.com/kieler/elkjs) that the Logic Apps
designers use. It keeps the elkjs JSON graph format and `new ELK().layout(graph, { layoutOptions })` API so
call sites can switch with an import change, but implements only the supported option subset in plain,
tree-shakable TypeScript.

> **Status:** scaffolding. `layout()` resolves the algorithm and then rejects with `GraphLayoutError`
> ("not implemented"). The layout algorithms are not implemented yet.

## Usage

```ts
import ELK, { type ElkNode } from '@microsoft/logic-apps-graph-layout';

const elk = new ELK();
const laidOut: ElkNode = await elk.layout(graph, { layoutOptions: { 'elk.algorithm': 'org.eclipse.elk.layered' } });
```

Supported algorithms: `layered` (designer, designer-v2) and `sporeOverlap` (data-mapper-v2). Unsupported
algorithms reject instead of silently falling back.

## Parity and benchmark harness

`bench/` compares this package against `elkjs@0.8.2` (the version the designers ship) on the ELK input
graphs designer-v2 produces for every workflow in `__mocks__/workflows` (legacy and shared-node UI), plus
synthetic data mapper overlap inputs.

| Command | What it does |
| --- | --- |
| `pnpm test:lib` | Unit tests, plus elkjs determinism and candidate-vs-elkjs parity on fixtures with ≤ 250 nodes (parity cases skip until implemented) |
| `pnpm bench` | `vitest bench` timings for representative and stress fixtures |
| `pnpm bench:report [regex]` | Builds `dist`, then prints minified/gzip/brotli bundle sizes and median layout times per fixture (Node ≥ 22.18) |

Regenerate fixtures after changing designer-v2 graph conversion (`elklayout.tsx`):

```sh
cd libs/designer-v2
CAPTURE_LAYOUT_FIXTURES=1 pnpm vitest run captureLayoutFixtures
cd ../.. && pnpm biome format --write libs/graph-layout/bench/fixtures
```

Notes:

- elkjs `sporeOverlap` is nondeterministic for unpositioned nodes (even with `elk.randomSeed`), so overlap
  fixtures (`parity: 'noOverlap'`) are judged by "all nodes present, no overlaps" rather than positions.
- `elk.bundled` dispatches through an in-process fake worker using `setTimeout`, so each elkjs call pays about
  two timer ticks (~30 ms on Windows Node). The report prints the local tick latency; subtract it when comparing
  small graphs.
