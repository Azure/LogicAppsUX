import { act, cleanup, render, renderHook, screen } from '@testing-library/react';
import type { ElkNode } from 'elkjs/lib/elk.bundled';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { WorkflowNode } from '../../parsers/models/workflowNode';
import { createWorkflowNode } from '../../utils/graph';
import { LayoutProvider, useLayout } from '../elklayout';

const controls = vi.hoisted(() => ({
  graph: undefined as WorkflowNode | undefined,
  shared: false,
  readOnly: false,
  layout: vi.fn(),
  log: vi.fn(),
  domain: { workflow: { operations: {}, nodesMetadata: {} } },
}));
vi.mock('../../state/workflow/workflowSelectors', () => ({
  useRootWorkflowGraphForLayout: () => controls.graph,
}));
vi.mock('react-redux', () => ({
  useSelector: (selector: (state: unknown) => unknown) => selector(controls.domain),
}));
vi.mock('../../state/designerOptions/designerOptionsSelectors', () => ({
  useReadOnly: () => controls.readOnly,
  useSharedNodeUi: () => controls.shared,
}));
vi.mock('elkjs/lib/elk.bundled', () => ({
  default: class {
    layout = controls.layout;
  },
}));
vi.mock('@microsoft/logic-apps-shared', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@microsoft/logic-apps-shared')>()),
  LoggerService: () => ({ log: controls.log }),
}));

const graph = (id = 'action'): WorkflowNode => ({
  id: 'root',
  type: 'GRAPH_NODE',
  children: [createWorkflowNode(id)],
});
const Probe = () => {
  const [nodes, edges, size] = useLayout();
  return <output data-testid="layout">{JSON.stringify({ nodes, edges, size })}</output>;
};
const tree = () => (
  <LayoutProvider>
    <Probe />
  </LayoutProvider>
);
const current = () => JSON.parse(screen.getByTestId('layout').textContent!);
const requests: { graph: ElkNode; resolve: (value: ElkNode) => void; reject: (error: Error) => void }[] = [];
const tick = () => act(() => vi.advanceTimersByTime(200));
const resolve = async (index: number) => {
  const request = requests[index];
  await act(async () => request.resolve(request.graph));
};

beforeEach(() => {
  vi.useFakeTimers();
  vi.clearAllMocks();
  controls.graph = graph();
  controls.shared = false;
  controls.readOnly = false;
  requests.length = 0;
  controls.layout.mockImplementation(
    (input: ElkNode) =>
      new Promise<ElkNode>((resolve, reject) => {
        requests.push({ graph: input, resolve, reject });
      })
  );
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('layout request lifecycle', () => {
  it('keeps accepted geometry visible while a flag-toggle layout is pending', async () => {
    const view = render(tree());
    tick();
    await resolve(0);
    const accepted = current();
    controls.shared = true;
    view.rerender(tree());
    expect(current()).toEqual(accepted);
    tick();
    expect(current()).toEqual(accepted);
    await resolve(1);
    expect(current().nodes[0]).toMatchObject({ width: 232, height: 74 });
  });

  it('rejects pre-toggle results before the throttled replacement can start', async () => {
    const view = render(tree());
    tick();
    expect(requests[0].graph.children?.[0]).toMatchObject({ width: 200, height: 40 });
    controls.shared = true;
    view.rerender(tree());
    await resolve(0);
    expect(current().nodes).toEqual([]);
    tick();
    expect(requests[1].graph.children?.[0]).toMatchObject({ width: 232, height: 74 });
    await resolve(1);
    expect(current().nodes[0]).toMatchObject({ width: 232, height: 74 });
  });

  it('rejects results for a replaced graph during the throttle window', async () => {
    const view = render(tree());
    tick();
    controls.graph = graph('replacement');
    view.rerender(tree());
    await resolve(0);
    expect(current().nodes).toEqual([]);
    tick();
    await resolve(1);
    expect(current().nodes.map((node: { id: string }) => node.id)).toEqual(['replacement']);
  });

  it('invalidates in-flight work and clears accepted nodes immediately when the graph is removed', async () => {
    const view = render(tree());
    tick();
    await resolve(0);
    expect(current().nodes[0].id).toBe('action');
    controls.graph = graph('pending');
    view.rerender(tree());
    tick();
    controls.graph = undefined;
    view.rerender(tree());
    expect(current()).toEqual({ nodes: [], edges: [], size: [0, 0] });
    await resolve(1);
    tick();
    expect(current()).toEqual({ nodes: [], edges: [], size: [0, 0] });
    expect(requests).toHaveLength(2);
    controls.graph = graph('restored');
    view.rerender(tree());
    tick();
    await resolve(2);
    expect(current().nodes[0].id).toBe('restored');
  });

  it('keeps the newest layout when promises complete out of order', async () => {
    const view = render(tree());
    tick();
    controls.graph = graph('newest');
    view.rerender(tree());
    tick();
    await resolve(1);
    await resolve(0);
    expect(current().nodes[0].id).toBe('newest');
  });

  it('invalidates a pending request when read-only spacing changes', async () => {
    const view = render(tree());
    tick();
    controls.readOnly = true;
    view.rerender(tree());
    await resolve(0);
    expect(current().nodes).toEqual([]);
    tick();
    expect(controls.layout.mock.calls[1][1].layoutOptions['elk.layered.spacing.nodeNodeBetweenLayers']).toBe('40');
    await resolve(1);
    expect(current().nodes[0].id).toBe('action');
  });

  it('reuses completed geometry for a graph replacement with identical layout data but not changed options', async () => {
    const view = render(tree());
    tick();
    await resolve(0);
    controls.graph = graph();
    view.rerender(tree());
    tick();
    expect(requests).toHaveLength(1);
    controls.shared = true;
    view.rerender(tree());
    tick();
    expect(requests).toHaveLength(2);
    await resolve(1);
    expect(current().nodes[0]).toMatchObject({ width: 232, height: 74 });
  });

  it('reuses observed native sizes only after a same-renderer acceptance, never on first mount or renderer return', async () => {
    controls.graph = { ...graph(), children: [{ ...createWorkflowNode('action'), dimensionsObserved: true }] };
    const view = render(tree());
    tick();
    await resolve(0);
    expect(current().nodes[0]).not.toHaveProperty('measured');
    controls.readOnly = true;
    view.rerender(tree());
    tick();
    await resolve(1);
    expect(current().nodes[0]).toMatchObject({ measured: { width: 200, height: 40 } });
    expect(current().nodes[0]).not.toHaveProperty('width');
    controls.shared = true;
    view.rerender(tree());
    tick();
    await resolve(2);
    expect(current().nodes[0]).toMatchObject({ width: 232, height: 74 });
    expect(current().nodes[0]).not.toHaveProperty('measured');
    controls.shared = false;
    view.rerender(tree());
    tick();
    await resolve(3);
    expect(current().nodes[0]).not.toHaveProperty('measured');
    controls.graph = undefined;
    view.rerender(tree());
    controls.graph = { ...graph(), children: [{ ...createWorkflowNode('action'), dimensionsObserved: true }] };
    view.rerender(tree());
    tick();
    await resolve(4);
    expect(current().nodes[0]).not.toHaveProperty('measured');
  });

  it('logs a current layout error with its graph but ignores stale failures after unmount', async () => {
    const view = render(tree());
    tick();
    const error = new Error('Current layout failed');
    await act(async () => requests[0].reject(error));
    expect(controls.log).toHaveBeenCalledWith(
      expect.objectContaining({
        area: 'useLayout',
        error,
        message: expect.stringContaining('"action"'),
      })
    );
    controls.log.mockClear();
    controls.graph = graph('unmounted');
    view.rerender(tree());
    tick();
    view.unmount();
    await act(async () => requests[1].reject(new Error('Obsolete layout failed')));
    expect(controls.log).not.toHaveBeenCalled();
  });

  it('fails explicitly when the layout hook is used without its provider', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    expect(() => renderHook(useLayout)).toThrow('useLayout must be used within a LayoutProvider');
    consoleError.mockRestore();
  });
});
