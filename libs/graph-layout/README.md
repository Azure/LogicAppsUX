# @microsoft/logic-apps-graph-layout

A small, fast replacement for the parts of [elkjs](https://github.com/kieler/elkjs) that the Logic Apps
designers use. It keeps the elkjs JSON graph format and `new ELK().layout(graph, { layoutOptions })` API so
call sites can switch with an import change, but implements only the supported option subset in plain,
tree-shakable TypeScript.

> **Experimental:** flat overlap removal, SIMPLE and balanced Brandes-Köpf layered placement are implemented.
> Exact elkjs parity is not a goal. designer-v2 uses this package (bundled into its build); designer v1 and
> data-mapper-v2 still use elkjs.

The designer-v2 build includes graph-layout's declarations in its published output. After packing designer-v2,
`pnpm --filter @microsoft/logic-apps-designer-v2 test:package-types <package.tgz> <new-directory>` checks the
package without resolving this private dependency. The new directory must be outside the repository.

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
Cycle-reversed edges with a fixed SOUTH source port detour around their source rank. Edges receive
container-relative sections, but general obstacle avoidance and spline visual parity are not established.
Nonzero `elk.position` hints, cross-hierarchy edges, self-loops, hyperedges, labels, and unsupported
option values reject.
Successful calls mutate and return the input, matching bundled elkjs; failed validation leaves it unchanged.

**Data-mapper blocker:** `autoLayout` sends all nodes without positions, but applies results only to function
nodes and conditionally adds `panelWidth` to x. Prior investigation observed final UI collisions with both
engines even when the complete returned graph was disjoint. Do not integrate overlap removal based on
raw-output non-overlap alone.

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

`bench/` compares this package against the former designer-v2 dependency, `elkjs@0.8.2`, using captured
designer inputs for Recurrence, AllScopeNodes, and StressTest200 in both legacy and shared-node UIs, plus
synthetic data-mapper overlap inputs. Focused synthetic tests cover additional graph shapes. Agent and handoff
workflows and graphs larger than StressTest200 are not represented in the retained captured fixtures.

| Command | What it does |
| --- | --- |
| `pnpm test:lib` | Unit tests, fixture geometry invariants, elkjs determinism and simple-chain parity |
| `ELKJS_EXACT_PARITY=1 pnpm test:lib` | Full coordinate/endpoint parity audit (currently fails; set the environment variable using your shell's syntax) |
| `pnpm bench` | `vitest bench` timings for the retained fixtures |
| `pnpm bench:report [fixture-name]` | Builds `dist`, then prints minified/gzip/brotli bundle sizes and median layout times per fixture (Node ≥ 22.18) |
| `node bench/report.ts [fixture-name] --quality` | After building, compares SIMPLE/model-order placement control (current routing), candidate and elkjs using polyline crossings, node hits and horizontal skew |

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
- Add `--simple`, optionally with a literal fixture-name substring, to compare both engines with SIMPLE placement
  and forced model order. Cloning is retained and timed separately.
- The async API still blocks the main thread. Exact coordinates and spline parity are not established;
  designer-v2 currently uses the new engine directly without a fallback.
- To check packed designer-v2 declarations manually, build and pack that package, then run
  `pnpm --filter @microsoft/logic-apps-designer-v2 test:package-types <package.tgz> <new-directory-outside-repo>`.
  The consumer links workspace dependencies and is not run in CI. Its stricter side-effect-import check currently
  reports pre-existing unresolved `.less` and `.css` declarations; default TypeScript side-effect checking passes.
