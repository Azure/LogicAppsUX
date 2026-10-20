/**
 * @vitest-environment jsdom
 */
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ReadOnlyWorkflowGraphData } from '../ReadOnlyWorkflowGraph';
import { useReadOnlyGraphLayout } from '../useReadOnlyGraphLayout';
import { layoutWorkflowGraph } from '../../core/graphlayout/elklayout';

vi.mock('../../core/graphlayout/elklayout', () => ({ layoutWorkflowGraph: vi.fn() }));
const mockLayout = vi.mocked(layoutWorkflowGraph);
const makeGraph = (): ReadOnlyWorkflowGraphData => ({
  nodes: [
    {
      id: 'Action',
      type: 'OPERATION_NODE',
      data: { label: 'Long action title', iconUri: 'data:image/svg+xml,icon' },
      position: { x: 20, y: 0 },
      width: 200,
      height: 44,
    },
  ],
  edges: [],
  layoutSource: {
    id: 'root',
    type: 'GRAPH_NODE',
    edges: [],
    children: [{ id: 'Action', type: 'OPERATION_NODE', width: 200, height: 44 }],
  },
});
const deferred = () => {
  let resolve!: (value: Awaited<ReturnType<typeof layoutWorkflowGraph>>) => void;
  let reject!: (reason: Error) => void;
  const promise = new Promise<Awaited<ReturnType<typeof layoutWorkflowGraph>>>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
};
const resultFor = (y: number): Awaited<ReturnType<typeof layoutWorkflowGraph>> => [
  [{ id: 'Action', type: 'OPERATION_NODE', position: { x: 20, y }, data: { label: 'Action', nodeIndex: 1 } }],
  [],
  [240, 300],
];

afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});

describe('useReadOnlyGraphLayout', () => {
  it('lays out actual measured native leaf heights without modifying caller graphs or redoing identical measurements', async () => {
    const graph = makeGraph();
    const before = structuredClone(graph);
    const pending = deferred();
    mockLayout.mockReturnValue(pending.promise);
    const listener = vi.fn();
    const { result } = renderHook(() => useReadOnlyGraphLayout(graph, listener));
    act(() => result.current.onNodeSizesChange({ Action: { width: 200, height: 84 } }));
    expect(listener).toHaveBeenLastCalledWith({ loading: true });
    expect(mockLayout.mock.calls[0][0].children?.[0]).toMatchObject({ width: 200, height: 84 });
    expect(mockLayout.mock.calls[0][0]).not.toBe(graph.layoutSource);
    await act(async () => {
      pending.resolve(resultFor(100));
      await pending.promise;
    });
    expect(result.current.view.nodes[0]).toMatchObject({ height: 84, position: { x: 20, y: 100 }, data: graph.nodes[0].data });
    expect(listener).toHaveBeenLastCalledWith({ loading: false });
    act(() => result.current.onNodeSizesChange({ Action: { width: 200, height: 84 } }));
    expect(mockLayout).toHaveBeenCalledOnce();
    expect(graph).toEqual(before);
  });

  it('ignores a stale layout when a new definition replaces the view', async () => {
    const first = deferred();
    const latest = deferred();
    mockLayout.mockReturnValueOnce(first.promise).mockReturnValueOnce(latest.promise);
    const graph = makeGraph();
    const replacement = makeGraph();
    const listener = vi.fn();
    const { result, rerender } = renderHook(({ graph }) => useReadOnlyGraphLayout(graph, listener), { initialProps: { graph } });
    act(() => result.current.onNodeSizesChange({ Action: { width: 200, height: 64 } }));
    rerender({ graph: replacement });
    act(() => result.current.onNodeSizesChange({ Action: { width: 200, height: 104 } }));
    await act(async () => {
      latest.resolve(resultFor(200));
      await latest.promise;
    });
    await act(async () => {
      first.resolve(resultFor(100));
      await first.promise;
    });
    expect(result.current.view.nodes[0]).toMatchObject({ height: 104, position: { x: 20, y: 200 } });
    expect(listener.mock.calls).toEqual([[{ loading: true }], [{ loading: true }], [{ loading: false }]]);
  });

  it('ignores out-of-order sizes for the same graph and stale failures from replaced definitions', async () => {
    const first = deferred();
    const latest = deferred();
    mockLayout.mockReturnValueOnce(first.promise).mockReturnValueOnce(latest.promise);
    const graph = makeGraph();
    const listener = vi.fn();
    const { result } = renderHook(() => useReadOnlyGraphLayout(graph, listener));
    act(() => result.current.onNodeSizesChange({ Action: { width: 200, height: 64 } }));
    act(() => result.current.onNodeSizesChange({ Action: { width: 200, height: 104 } }));
    await act(async () => {
      latest.resolve(resultFor(200));
      await latest.promise;
    });
    await act(async () => {
      first.reject(new Error('Obsolete layout'));
      await first.promise.catch(() => {});
    });
    expect(result.current.view.nodes[0].height).toBe(104);
    expect(listener).toHaveBeenCalledTimes(3);
    expect(listener).toHaveBeenLastCalledWith({ loading: false });
  });

  it('reports active layout errors and never applies work or notifies after unmount', async () => {
    const pending = deferred();
    mockLayout.mockReturnValue(pending.promise);
    const listener = vi.fn();
    const graph = makeGraph();
    const view = renderHook(() => useReadOnlyGraphLayout(graph, listener));
    act(() => view.result.current.onNodeSizesChange({ Action: { width: 200, height: 84 } }));
    const error = new Error('ELK failed');
    await act(async () => {
      pending.reject(error);
      await pending.promise.catch(() => {});
    });
    expect(listener).toHaveBeenLastCalledWith({ loading: false, error });
    const late = deferred();
    mockLayout.mockReturnValue(late.promise);
    act(() => view.result.current.onNodeSizesChange({ Action: { width: 200, height: 104 } }));
    view.unmount();
    const calls = listener.mock.calls.length;
    await act(async () => {
      late.resolve(resultFor(300));
      await late.promise;
    });
    expect(listener).toHaveBeenCalledTimes(calls);
    expect(graph.nodes[0].height).toBe(44);
  });
});
