import { act, fireEvent, render, screen } from '@testing-library/react';
import type { PropsWithChildren } from 'react';
import { IntlProvider } from 'react-intl';
import type { ReactFlowProps, ReactFlowState } from '@xyflow/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SharedWorkflowExtractionPreview } from '../SharedWorkflowExtractionPreview';
import type { SharedExtractionPreviewNode } from '../workflowExtractionPreview';

const mocks = vi.hoisted(() => ({
  flow: vi.fn(),
  update: vi.fn(),
  fit: vi.fn(),
  zoomIn: vi.fn(),
  zoomOut: vi.fn(),
  measured: true,
  handles: true,
  firstWidth: 232,
}));
vi.mock('@xyflow/react', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@xyflow/react')>()),
  ReactFlowProvider: ({ children }: PropsWithChildren) => <div data-testid="isolated-provider">{children}</div>,
  ReactFlow: (props: ReactFlowProps) => {
    mocks.flow(props);
    return <div>{props.children}</div>;
  },
  Panel: ({ children }: PropsWithChildren) => <div>{children}</div>,
  Background: () => null,
  BackgroundVariant: { Dots: 'dots' },
  Position: { Top: 'top', Bottom: 'bottom' },
  Handle: () => null,
  getBezierPath: vi.fn(() => ['actual-path']),
  useReactFlow: () => ({ fitView: mocks.fit, zoomIn: mocks.zoomIn, zoomOut: mocks.zoomOut }),
  useUpdateNodeInternals: () => mocks.update,
  useStore: (selector: (state: ReactFlowState) => unknown) =>
    selector({
      nodeLookup: new Map([
        [
          'first',
          {
            id: 'first',
            measured: mocks.measured ? { width: mocks.firstWidth, height: 74 } : {},
            internals: { handleBounds: mocks.handles ? { source: [{}], target: [{}] } : {} },
          },
        ],
        [
          'second',
          {
            id: 'second',
            measured: mocks.measured ? { width: 268, height: 110 } : {},
            internals: { handleBounds: mocks.handles ? { source: [{}], target: [{}] } : {} },
          },
        ],
      ]),
    } as ReactFlowState),
}));

const nodes: SharedExtractionPreviewNode[] = [
  { id: 'first', label: 'First', isTrigger: true, operation: { type: 'Request' }, position: { x: 0, y: 0 } },
  { id: 'second', label: 'Second', isTrigger: false, operation: { type: 'Agent' }, position: { x: 0, y: 84 } },
];
const edges = [{ id: 'actual-edge', source: 'first', target: 'second' }];
let frames: Map<number, FrameRequestCallback>;
let frameId: number;
let observers: TestResizeObserver[];
class TestResizeObserver {
  constructor(readonly callback: ResizeObserverCallback) {
    observers.push(this);
  }
  observe = vi.fn();
  disconnect = vi.fn();
  unobserve = vi.fn();
}
const flushFrames = () =>
  act(() => {
    const callbacks = [...frames.values()];
    frames.clear();
    callbacks.forEach((callback) => callback(0));
  });
const props = () => mocks.flow.mock.lastCall![0] as ReactFlowProps;
const preview = (value = nodes) => (
  <IntlProvider locale="en">
    <SharedWorkflowExtractionPreview nodes={value} edges={edges} ariaLabel="Preview" />
  </IntlProvider>
);

beforeEach(() => {
  vi.clearAllMocks();
  frames = new Map();
  frameId = 0;
  observers = [];
  mocks.measured = true;
  mocks.handles = true;
  mocks.firstWidth = 232;
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
    frames.set(++frameId, callback);
    return frameId;
  });
  vi.stubGlobal('cancelAnimationFrame', (id: number) => frames.delete(id));
  vi.stubGlobal('ResizeObserver', TestResizeObserver);
});
afterEach(() => vi.unstubAllGlobals());

describe('isolated measured preview lifecycle', () => {
  it('retains actual natural measurements while positioning variable families on one centerline', () => {
    render(preview());
    expect(props().nodes).toMatchObject([
      { id: 'first', position: { x: -116, y: 0 }, measured: { width: 232, height: 74 } },
      { id: 'second', position: { x: -134, y: 114 }, measured: { width: 268, height: 110 } },
    ]);
    expect(props().edges).toMatchObject([{ ...edges[0], type: 'sharedWorkflowPreview', selectable: false, reconnectable: false }]);
    expect(props()).toMatchObject({
      nodesDraggable: false,
      nodesConnectable: false,
      nodesFocusable: false,
      edgesReconnectable: false,
      edgesFocusable: false,
      elementsSelectable: false,
      deleteKeyCode: null,
      selectionKeyCode: null,
      multiSelectionKeyCode: null,
      disableKeyboardA11y: true,
      panOnDrag: true,
      zoomOnScroll: true,
      zoomOnDoubleClick: false,
    });
    expect(Object.keys(props()).filter((key) => key.startsWith('on'))).toEqual([]);
    expect(screen.getAllByTestId('isolated-provider')).toHaveLength(1);
    fireEvent.click(screen.getByRole('button', { name: 'Zoom in' }));
    fireEvent.click(screen.getByRole('button', { name: 'Zoom out' }));
    expect(mocks.zoomIn).toHaveBeenCalledOnce();
    expect(mocks.zoomOut).toHaveBeenCalledOnce();
    expect(nodes[1].position).toEqual({ x: 0, y: 84 });
  });

  it('waits for measurements, refits geometry changes, but retains viewport on metadata-only updates', () => {
    mocks.measured = false;
    const { rerender, unmount } = render(preview());
    flushFrames();
    expect(mocks.fit).not.toHaveBeenCalled();
    expect(mocks.update).not.toHaveBeenCalled();
    mocks.measured = true;
    mocks.handles = false;
    rerender(preview());
    flushFrames();
    expect(mocks.fit).not.toHaveBeenCalled();
    expect(mocks.update).not.toHaveBeenCalled();
    mocks.handles = true;
    rerender(preview());
    flushFrames();
    expect(mocks.fit).toHaveBeenCalledOnce();
    expect(mocks.update).toHaveBeenCalledExactlyOnceWith(['first', 'second']);
    rerender(preview(nodes.map((node) => ({ ...node, label: `${node.label} renamed` }))));
    flushFrames();
    expect(mocks.fit).toHaveBeenCalledOnce();
    act(() => observers[0].callback([{ contentRect: { width: 500, height: 320 } } as ResizeObserverEntry], observers[0]));
    flushFrames();
    expect(mocks.fit).toHaveBeenCalledTimes(2);
    mocks.firstWidth = 300;
    rerender(preview());
    flushFrames();
    expect(props().nodes![0]).toMatchObject({ position: { x: -150, y: 0 }, measured: { width: 300, height: 74 } });
    expect(mocks.fit).toHaveBeenCalledTimes(3);
    unmount();
    expect(observers.every((observer) => observer.disconnect.mock.calls.length === 1)).toBe(true);
    expect(frames.size).toBe(0);
  });

  it('uses separate DOM namespaces for co-mounted previews without changing graph identity', () => {
    render(
      <>
        {preview()}
        {preview()}
      </>
    );
    const calls = mocks.flow.mock.calls.map(([value]) => value as ReactFlowProps);
    const first = calls[0].nodes![0];
    const second = calls[1].nodes![0];
    expect(first.id).toBe(second.id);
    expect(first.data.domId).not.toBe(second.data.domId);
  });

  it('refreshes real handle bounds after cancelled/replaced finite ancestor animations, ignoring infinite ones', async () => {
    let cancelFirst: (reason: Error) => void = () => {};
    let finishSecond: () => void = () => {};
    const first = {
      playState: 'running',
      pending: false,
      effect: { getComputedTiming: () => ({ endTime: 200 }) },
      finished: new Promise<void>((_, reject) => {
        cancelFirst = reject;
      }),
    };
    const second = {
      playState: 'running',
      pending: false,
      effect: { getComputedTiming: () => ({ endTime: 200 }) },
      finished: new Promise<void>((resolve) => {
        finishSecond = resolve;
      }),
    };
    let current = first;
    const { unmount } = render(<div data-testid="ancestor">{preview()}</div>);
    screen.getByTestId('ancestor').getAnimations = () => [
      current as Animation,
      { playState: 'running', pending: false, effect: { getComputedTiming: () => ({ endTime: Number.POSITIVE_INFINITY }) } } as Animation,
    ];
    flushFrames();
    expect(mocks.update).not.toHaveBeenCalled();
    current = second;
    await act(async () => {
      first.playState = 'idle';
      cancelFirst(new Error('Animation cancelled'));
      await Promise.allSettled([first.finished]);
    });
    flushFrames();
    expect(mocks.update).not.toHaveBeenCalled();
    await act(async () => {
      second.playState = 'finished';
      finishSecond();
      await second.finished;
    });
    flushFrames();
    expect(mocks.update).toHaveBeenCalledExactlyOnceWith(['first', 'second']);
    unmount();
  });

  it('disposes animation continuations without refreshing an unmounted preview', async () => {
    let finish: () => void = () => {};
    const finished = new Promise<void>((resolve) => {
      finish = resolve;
    });
    const { unmount } = render(<div data-testid="ancestor">{preview()}</div>);
    screen.getByTestId('ancestor').getAnimations = () => [
      {
        playState: 'running',
        pending: false,
        finished,
        effect: { getComputedTiming: () => ({ endTime: 200 }) },
      } as Animation,
    ];
    flushFrames();
    unmount();
    await act(async () => {
      finish();
      await finished;
    });
    expect(frames.size).toBe(0);
    expect(mocks.update).not.toHaveBeenCalled();
  });
});
