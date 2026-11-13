# @microsoft/logic-apps-graph-layout

A small, fast replacement for the parts of [elkjs](https://github.com/kieler/elkjs) that the Logic Apps
designers use. It keeps the elkjs JSON graph format and `new ELK().layout(graph, { layoutOptions })` API so
call sites can switch with an import change, but implements only the supported option subset in plain,
tree-shakable TypeScript.

> **Experimental:** flat overlap removal, SIMPLE and balanced Brandes-Köpf layered placement are implemented.
> Exact elkjs parity is not a goal. designer-v2 uses this package (bundled into its build); designer v1 and
> data-mapper-v2 still use elkjs.

## Usage

```ts
import ELK, { type ElkNode } from '@microsoft/logic-apps-graph-layout';

const elk = new ELK();
const laidOut: ElkNode = await elk.layout(graph, {
  layoutOptions: {
    'elk.algorithm': 'org.eclipse.elk.layered',
    'elk.layered.nodePlacement.strategy': 'BRANDES_KOEPF',
  },
});
```

Supported algorithms: `layered` (designer, designer-v2) and `sporeOverlap` (data-mapper-v2). Unsupported
algorithms reject instead of silently falling back.

`sporeOverlap` uses deterministic MST-guided overlap removal, not a pixel-identical implementation of ELK's randomized SPOrE.
It supports unpositioned or positioned flat nodes, `LEFT` direction, and non-negative `spacing.nodeNode` (default 8).
It rejects nested graphs, edges, ports, invalid geometry, and unsupported directions. The input graph is updated in place.

Layered layout supports DOWN, DFS cycle breaking, interactive layering, model-order/barycenter ordering,
long-edge dummy nodes, SIMPLE and BALANCED Brandes-Köpf placement, local nested scopes, padding/minimum sizes, and fixed SOUTH ports.
Balanced placement aligns median neighbors in four directions, protects inner dummy segments from conflicting
alignments, compacts vertical blocks, and combines the four layouts without violating horizontal spacing.
Fixed port coordinates are preserved, but placement currently optimizes node centers rather than port anchors.
Edges receive container-relative sections, but spline visual parity is not established. Nonzero `elk.position`
hints, cross-hierarchy edges, self-loops, hyperedges, labels,
and unsupported option values reject.
Successful calls mutate and return the input, matching bundled elkjs; failed validation leaves it unchanged.

**Data-mapper blocker:** the actual `autoLayout` sends all nodes without positions, but applies results only
to function nodes and conditionally adds `panelWidth` to x. Tests exercising that real dispatch path show
final UI rectangle collisions for both engines even when the complete returned graph is disjoint.
Do not integrate overlap removal based on raw-output non-overlap alone.

## Isolated designer preview

From the repository root run `pnpm --filter standalone layout-preview`, then open:

- Candidate: `http://127.0.0.1:4310/v2?layoutEngine=typescript&workflow=Scoped`
- Baseline: `http://127.0.0.1:4310/v2?layoutEngine=elkjs&workflow=Scoped`

`workflow=StraightLine` and `workflow=Switch` select other existing mock workflows. This dedicated dev
configuration uses offline services and dark mode, redirects only designer layout imports, and respects the
designer's original options: BALANCED Brandes-Köpf normally, SIMPLE/model order only where requested by a scope.
The status badge reports the selected engine,
layout time, and errors. There is no automatic fallback; normal dev/build configurations are unchanged.
Both previews use the same production placement options; their algorithms and output are not pixel-identical.

## Parity and benchmark harness

`bench/` compares this package against `elkjs@0.8.2` (the version the designers ship) on the ELK input
graphs designer-v2 produces for every workflow in `__mocks__/workflows` (legacy and shared-node UI), plus
synthetic data mapper overlap inputs.

| Command | What it does |
| --- | --- |
| `pnpm test:lib` | Unit tests, fixture geometry invariants, elkjs determinism and established StraightLine parity |
| `ELKJS_EXACT_PARITY=1 pnpm test:lib` | Full coordinate/endpoint parity audit (currently fails; set the environment variable using your shell's syntax) |
| `pnpm bench` | `vitest bench` timings for representative and stress fixtures |
| `pnpm bench:report [regex]` | Builds `dist`, then prints minified/gzip/brotli bundle sizes and median layout times per fixture (Node ≥ 22.18) |
| `node bench/report.ts [regex] --quality` | After building, compares SIMPLE/model-order placement control (current routing), candidate and elkjs using polyline crossings, node hits and horizontal skew |

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
- Quality diagnostics treat edge sections as polylines, not rendered splines. Normal designer edges are
  independently drawn with React Flow smooth-step/Bezier paths; handoff edges use the returned sections.
  These metrics detect layout regressions but do not prove absence of rendered-edge overlap.
- Run `node bench/report.ts '^(Scoped|Switch.shared|StraightLine)$' --simple` from this package on Node >= 22.18
  to compare both engines with SIMPLE placement and forced model order. Cloning is retained and timed separately.
- Preliminary SIMPLE measurements on a shared Windows machine: Scoped 75.6/2.4 ms (elkjs/candidate),
  StraightLine 123.0/6.9 ms, Switch.shared 47.1/1.1 ms; clone medians 0.1-0.4 ms.
  StraightLine had zero geometry differences; Scoped and Switch.shared did not (maximum node deltas 40/126 px).
  Partial candidate bundle: 12.4 KB minified, 4.9 KB gzip, 4.3 KB brotli. These are not completed-engine or
  browser responsiveness measurements, and do not establish production Brandes-Köpf parity.
- Isolated headless Edge SIMPLE medians (seven samples, shared Windows machine): Scoped 1.5 ms,
  StraightLine 3.6 ms, StressTest200 7.7 ms, StressTest1000 28.5 ms, StressTest500Gross 14.0 ms.
  JSON-clone medians were 0.1-1.4 ms; structured-clone medians 0.1-2.6 ms. The 1,000-node call delayed a
  queued timer by 28.6 ms (idle timer median 5 ms), so the async API does not guarantee responsiveness.
  Actual gesture latency, frame rendering, worker round trips, and production BK timing remain unmeasured.
- A subsequent large-fixture Node SIMPLE run measured StressTest200 233.7/10.9 ms, StressTest1000
  4325.0/66.8 ms, and StressTest500Gross 9289.9/27.1 ms (elkjs/candidate, including cloning).
  These fixtures have substantial geometry divergence: maximum node deltas 2080/8980/10180 px respectively.
  Non-overlap is not layout parity; spacing/layering fidelity is an integration blocker alongside BK/routing.
  Final measured bundle after the unsupported-position guard: 12.5 KB raw, 4.9 KB gzip, 4.4 KB brotli.

### Balanced-placement refinement (2026-11-12)

The preview no longer globally forces SIMPLE/model order. Crossing minimization retains the best of eight
sweeps using Fenwick inversion scoring and a non-worsening downward reconciliation. Virtual edge lanes
traverse the full layer height before changing slope, avoiding sibling node interiors. Short source nodes
also receive a vertical lead to their rank bottom, including reversed routes and fixed SOUTH ports. Alignment/compaction
uses four bounded passes; ordering is log-linear in expanded graph size. Long-edge expansion still depends
on total edge span, not just the original node/edge count.

Measured original-preview versus refined candidate section-polyline crossings:

| Fixture | Original preview | Refined candidate | elkjs |
| --- | --- | --- | --- |
| StressTest200 | 813 | 0 | 0 |
| StressTest1000 | 16,382 | 0 | 1 |
| StressTest500Gross | 27,037 | 9,730 | 10,060 |

The original Gross result also had 1,662 edge/node-interior hits; the refined result has zero.
These are section-polyline diagnostics, not rendered-curve collision counts.
The `--quality` SIMPLE control uses the **new** routing, so it is not a snapshot of the original preview.

Without concurrent test execution, final Node medians (including cloning) were 14.3/52.5/38.0 ms for
StressTest200/1000/500Gross versus elkjs 184.5/2,427.6/2,459.0 ms on the shared Windows machine.
Candidate size is 16.1 KB minified / 6.2 KB gzip / 5.5 KB brotli.
Headless Edge measured 28.3 ms layout and queued-timer delay on StressTest1000, plus 2.5 ms cloning.
The async API still blocks the main thread; these results do not justify removing workers or cloning.

StraightLine remains exact. StressTest200/1000 have maximum node deltas of 770/3,030 px; Gross still
differs in ordering and route shape (maximum delta 38,565.5 px). AllScopeNodes retains a 40 px maximum delta.
The coordinate-parity audit remains an integration blocker; production migration is not enabled.
