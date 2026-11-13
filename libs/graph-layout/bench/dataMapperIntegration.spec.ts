import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { setImmediate } from 'node:timers/promises';
import { build } from 'esbuild';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import ELK from '../src/index';
import type { ElkNode, ElkPoint } from '../src/types';
import { createCandidateEngine, createElkjsEngine, type LayoutEngine } from './engines';
import { extractGeometry, findOverlaps } from './geometry';

// Test-local structural inputs: graph-layout does not declare a ReactFlow dependency.
type XYPosition = ElkPoint;
interface Node {
  id: string;
  position: XYPosition;
  data: Record<string, unknown>;
  measured?: { width?: number; height?: number };
  width?: number;
  height?: number;
}
interface Edge {
  id: string;
  source: string;
  target: string;
}

/**
 * Run the real data-mapper code without changing its imports or adding a production seam.
 * esbuild bundles the actual hook, selectors/constants, Redux slice and ReactFlow helpers in
 * memory. Only the hook's elkjs constructor is replaced; the reference engine remains real
 * elkjs. This also keeps data-mapper source outside this package's TypeScript rootDir.
 *
 * These are contract/hazard tests, not a browser rendering test. Dimensions are representative
 * measured rectangles, not claimed browser captures. Canvas resizing/dragging is not simulated.
 */
interface Action {
  type: string;
  payload: boolean | Record<string, XYPosition>;
}

interface FunctionData {
  position?: XYPosition;
  [key: string]: unknown;
}

interface State {
  curDataMapOperation: {
    needsLayout?: boolean;
    functionNodes: Record<string, FunctionData>;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

interface Contract {
  autoLayout(dispatch: (action: Action) => Action, intersections: (node: Node) => Node[], nodes: Node[], edges: Edge[]): void;
  isFunctionNode(id: string): boolean;
  panelWidth: number;
  panelWidthWithoutHandles: number;
  NodeIds: { source: string; target: string };
  nodeScrollDirections: string[];
  reducer(state: State | undefined, action: Action): State;
  functionMock: FunctionData[];
  getFunctionNode(data: FunctionData, id: string, position?: XYPosition): Node;
  applyNodeChanges(changes: { id: string; type: 'position'; position: XYPosition }[], nodes: Node[]): Node[];
}

let bundledContract: string;
const require = createRequire(import.meta.url);

beforeAll(async () => {
  const dataMapper = resolve(dirname(fileURLToPath(import.meta.url)), '../../data-mapper-v2/src').replace(/\\/g, '/');
  const output = await build({
    stdin: {
      contents: `
        export { autoLayout } from '${dataMapper}/ui/hooks/useAutoLayout.ts';
        export { isFunctionNode, panelWidth, panelWidthWithoutHandles } from '${dataMapper}/utils/ReactFlow.Util.ts';
        export { NodeIds } from '${dataMapper}/constants/ReactFlowConstants.ts';
        export { nodeScrollDirections } from '${dataMapper}/utils/Schema.Utils.ts';
        export { default as reducer } from '${dataMapper}/core/state/DataMapSlice.ts';
        export { functionMock } from '${dataMapper}/models/Function.ts';
        export { getFunctionNode } from '${dataMapper}/utils/Function.Utils.ts';
        export { applyNodeChanges } from '@xyflow/react';
      `,
      resolveDir: dirname(fileURLToPath(import.meta.url)),
      loader: 'ts',
    },
    platform: 'node',
    format: 'cjs',
    bundle: true,
    write: false,
    packages: 'external',
    metafile: true,
    plugins: [
      {
        name: 'bundle-local-shared-package',
        setup(builder) {
          builder.onResolve({ filter: /^@microsoft\/logic-apps-shared$/ }, () => ({
            path: resolve(dataMapper, '../../logic-apps-shared/src/index.ts'),
          }));
        },
      },
    ],
    logLevel: 'silent',
  });
  bundledContract = output.outputFiles[0].text;
  // Cold Windows module loading can be slow. Yield between external dependencies so Vitest
  // RPC stays responsive; charge setup to the hook rather than the first behavioral test.
  for (const dependency of Object.values(output.metafile!.outputs).flatMap((entry) => entry.imports)) {
    if (dependency.external && dependency.path !== 'elkjs/lib/elk.bundled.js') {
      require(dependency.path);
      await setImmediate();
    }
  }
  loadContract(async (graph) => graph);
}, 120_000);

const loadContract = (layout: LayoutEngine['layout']): Contract => {
  const module = { exports: {} };
  const seamRequire = (id: string) => {
    if (id === 'elkjs/lib/elk.bundled.js') {
      return class {
        layout = layout;
      };
    }
    return require(id);
  };
  // Evaluate only locally bundled repository code. No generated files or production changes.
  new Function('require', 'module', 'exports', bundledContract)(seamRequire, module, module.exports);
  return module.exports as Contract;
};

const measuredNode = (id: string, x: number, y: number, width: number, height: number): Node => ({
  id,
  position: { x, y },
  data: {},
  measured: { width, height },
});

const geometryOfNodes = (nodes: Node[]) =>
  extractGeometry({
    id: 'final-ui',
    children: nodes.map((node) => ({
      id: node.id,
      ...node.position,
      width: node.measured?.width ?? 0,
      height: node.measured?.height ?? 0,
    })),
  });

const runAutoLayout = async (engine: LayoutEngine, nodes: Node[], edges: Edge[] = []) => {
  let input: ElkNode | undefined;
  let output: ElkNode | undefined;
  const layout = vi.fn(async (graph: ElkNode) => {
    input = structuredClone(graph);
    output = await engine.layout(graph);
    return output;
  });
  const contract = loadContract(layout);
  const original = structuredClone(nodes);
  const initial = structuredClone(contract.reducer(undefined, { type: '@@init', payload: false }));
  initial.curDataMapOperation.needsLayout = true;
  initial.curDataMapOperation.functionNodes = Object.fromEntries(
    nodes
      .filter((node) => contract.isFunctionNode(node.id))
      .map((node) => [node.id, { ...contract.functionMock[0], position: node.position }])
  );
  let state = initial;
  const dispatch = vi.fn((action: Action) => {
    state = contract.reducer(state, action);
    return action;
  });
  const overlaps = findOverlaps(geometryOfNodes(nodes));
  const intersections = vi.fn((node: Node) =>
    nodes.filter((other) => overlaps.some(([a, b]) => (a === node.id && b === other.id) || (b === node.id && a === other.id)))
  );
  expect(contract.autoLayout(dispatch, intersections, nodes, edges)).toBeUndefined();
  if (layout.mock.calls.length) {
    // The real API is fire-and-forget and clears needsLayout before awaiting layout.
    expect(dispatch.mock.calls[0][0]).toEqual({ type: 'dataMap/setNeedsLayout', payload: false });
    expect(state.curDataMapOperation.needsLayout).toBe(false);
    await vi.waitFor(() => expect(dispatch).toHaveBeenCalledTimes(2), { timeout: 5_000 });
  }
  const positionActions = dispatch.mock.calls
    .map(([action]) => action)
    .filter((action) => action.type === 'dataMap/updateFunctionNodesPosition');
  const positions = (positionActions[0]?.payload ?? {}) as Record<string, XYPosition>;
  // Follow the actual Redux result and getFunctionNode -> applyNodeChanges path used by
  // useReactflowStates. Non-function nodes receive no position change, retaining measurements.
  const finalNodes = contract.applyNodeChanges(
    Object.entries(state.curDataMapOperation.functionNodes).map(([id, data]) => ({
      id,
      type: 'position',
      position: contract.getFunctionNode(data, id, data.position).position,
    })),
    nodes
  );
  expect(nodes).toEqual(original);
  for (const node of nodes.filter((node) => !contract.isFunctionNode(node.id))) {
    expect(positions).not.toHaveProperty(node.id);
    expect(finalNodes.find((final) => final.id === node.id)).toEqual(node);
  }
  for (const [id, position] of Object.entries(positions)) {
    expect(state.curDataMapOperation.functionNodes[id].position).toEqual(position);
    expect(finalNodes.find((node) => node.id === id)?.position).toEqual(position);
  }
  return { contract, input, output, positions, finalNodes, layout, dispatch, intersections };
};

describe('actual data-mapper autoLayout integration contract', () => {
  it('uses real ID selectors, including panel IDs and all intermediate directions', () => {
    const contract = loadContract(async (graph) => graph);
    expect(contract.panelWidth).toBe(315);
    expect(contract.panelWidthWithoutHandles).toBe(300);
    for (const id of [contract.NodeIds.source, contract.NodeIds.target, 'source-field', 'target-field']) {
      expect(contract.isFunctionNode(id)).toBe(false);
    }
    for (const direction of contract.nodeScrollDirections) {
      expect(contract.isFunctionNode(`${direction}-scroll-handle`)).toBe(false);
    }
    expect(contract.isFunctionNode('concat-instance')).toBe(true);
    // Classification is by ID, not ReactFlow node.type.
    expect(contract.isFunctionNode('canvas-without-schema-prefix')).toBe(true);
    expect(contract.getFunctionNode(contract.functionMock[0], 'fn').measured).toEqual({ width: 1, height: 1 });
  });

  it('skips layout without function nodes, or without intersections of any function node', async () => {
    const contract = loadContract(async (graph) => graph);
    const engine = createCandidateEngine(ELK);
    const panels = [measuredNode(contract.NodeIds.source, 0, 0, 315, 600), measuredNode(contract.NodeIds.target, 1000, 0, 315, 600)];
    for (const nodes of [panels, [measuredNode('fn', 400, 100, 120, 26), ...panels]]) {
      const result = await runAutoLayout(engine, nodes);
      expect(result.layout).not.toHaveBeenCalled();
      expect(result.dispatch).not.toHaveBeenCalled();
      expect(result.finalNodes).toEqual(nodes);
    }
  });

  it('passes every node without coordinates/edges, uses measured dimensions only, and applies the exact conditional offset', async () => {
    const contract = loadContract(async (graph) => graph);
    const nodes = [
      measuredNode('below', 400, 100, 120, 26),
      measuredNode('at', 400, 100, 120, 26),
      measuredNode('above', 400, 100, 120, 26),
      measuredNode(contract.NodeIds.source, 0, 0, 315, 600),
      measuredNode(contract.NodeIds.target, 1000, 0, 315, 600),
      ...contract.nodeScrollDirections.map((direction) => measuredNode(`${direction}-scroll`, 0, 0, 10, 10)),
      { ...measuredNode('unmeasured', 400, 100, 120, 26), measured: undefined, width: 999, height: 999 },
    ];
    const assigned = { below: { x: 314, y: 10 }, at: { x: 315, y: 20 }, above: { x: 316, y: 30 }, unmeasured: { x: -10, y: 40 } };
    const engine: LayoutEngine = {
      name: 'boundary-probe (test-only output)',
      layout: async (graph) => ({
        ...graph,
        children: graph.children?.map((node) => ({ ...node, ...(assigned[node.id as keyof typeof assigned] ?? { x: 9000, y: 9000 }) })),
      }),
    };
    const result = await runAutoLayout(engine, nodes, [{ id: 'ignored', source: 'below', target: 'at' }]);
    expect(result.input).toEqual({
      id: 'elk-root',
      layoutOptions: { 'elk.algorithm': 'sporeOverlap', 'elk.direction': 'LEFT', 'elk.spacing.nodeNode': '80' },
      children: nodes.map((node) => ({ id: node.id, width: node.measured?.width ?? 0, height: node.measured?.height ?? 0 })),
    });
    expect(result.positions).toEqual({
      below: { x: 629, y: 10 },
      at: { x: 315, y: 20 },
      above: { x: 316, y: 30 },
      unmeasured: { x: 305, y: 40 },
    });
    expect(result.intersections).toHaveBeenCalledTimes(1);
  });

  it('reproduces the engine-independent threshold-folding hazard with an otherwise disjoint returned graph', async () => {
    const nodes = [measuredNode('left', 400, 100, 120, 26), measuredNode('right', 400, 100, 120, 26)];
    const result = await runAutoLayout(
      {
        name: 'disjoint-output-probe (test-only)',
        layout: async (graph) => ({
          ...graph,
          children: [
            { ...graph.children![0], x: 208, y: 100 },
            { ...graph.children![1], x: 408, y: 100 },
          ],
        }),
      },
      nodes
    );
    expect(findOverlaps(extractGeometry(result.output!))).toEqual([]);
    expect(result.positions).toEqual({ left: { x: 523, y: 100 }, right: { x: 408, y: 100 } });
    // 80px separation becomes 45px intersection: this is the real transform, not an
    // intentionally failing "final graph must be disjoint" assertion.
    expect(findOverlaps(geometryOfNodes(result.finalNodes))).toEqual([['left', 'right']]);
  });

  it.each([createCandidateEngine(ELK), createElkjsEngine()])(
    '$name: records complete graph versus final UI for measured panels and functions',
    async (engine) => {
      const contract = loadContract(async (graph) => graph);
      const nodes = [
        measuredNode(contract.NodeIds.source, 0, 0, 315, 600),
        measuredNode(contract.NodeIds.target, 900, 0, 315, 600),
        ...Array.from({ length: 8 }, (_, index) => measuredNode(`fn${index}`, 400, 100, 120 + (index % 3) * 40, 26)),
      ];
      const result = await runAutoLayout(engine, nodes);
      expect(result.output).toBeDefined();
      expect(findOverlaps(extractGeometry(result.output!))).toEqual([]);
      expect(Object.keys(result.positions)).toEqual(nodes.filter((node) => contract.isFunctionNode(node.id)).map((node) => node.id));
      expect(result.input?.children?.every((node) => node.x === undefined && node.y === undefined)).toBe(true);
      if (engine.name === '@microsoft/logic-apps-graph-layout') {
        expect(findOverlaps(geometryOfNodes(result.finalNodes))).toContainEqual([contract.NodeIds.target, 'fn0']);
      }
      console.info(
        JSON.stringify({
          scenario: 'measured-panels-and-eight-functions',
          engine: engine.name,
          returned: extractGeometry(result.output!).nodes,
          dispatched: result.positions,
          finalIntersections: findOverlaps(geometryOfNodes(result.finalNodes)),
        })
      );
    }
  );

  it('samples both real engines with measured function-only inputs (no panel obstacles)', async () => {
    for (const engine of [createCandidateEngine(ELK), createElkjsEngine()]) {
      for (const count of [2, 4, 8, 16, 32]) {
        const nodes = Array.from({ length: count }, (_, index) => measuredNode(`fn${index}`, 400, 100, 120 + (index % 3) * 40, 26));
        const result = await runAutoLayout(engine, nodes);
        expect(findOverlaps(extractGeometry(result.output!))).toEqual([]);
        if (engine.name === '@microsoft/logic-apps-graph-layout' && count === 8) {
          // Returned fn2=(206.325,114), fn5=(486.325,133.769), both 200x26.
          // Only fn2 is shifted: final overlap is approximately 165 x 6.231 px.
          expect(findOverlaps(geometryOfNodes(result.finalNodes))).toContainEqual(['fn2', 'fn5']);
        }
        console.info(
          JSON.stringify({
            scenario: `functions-only-${count}`,
            engine: engine.name,
            finalIntersections: findOverlaps(geometryOfNodes(result.finalNodes)),
            dispatched: result.positions,
          })
        );
      }
    }
  });
});
