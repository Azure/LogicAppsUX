import { act, fireEvent, render, screen } from '@testing-library/react';
import { ReactFlowProvider } from '@xyflow/react';
import type { HandleProps, NodeProps, PanelProps, ReactFlowProps, ReactFlowState } from '@xyflow/react';
import type { ComponentType, PropsWithChildren } from 'react';
import * as Intl from 'react-intl';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { WORKFLOW_PREVIEW_NODE_HEIGHT, WORKFLOW_PREVIEW_NODE_WIDTH, WorkflowPreview } from '..';
import type { WorkflowPreviewEdge, WorkflowPreviewNode } from '..';
import { workflowCardStyles } from '../../card/workflowCardStyles';

const mocks = vi.hoisted(() => ({
  flow: vi.fn(),
  handle: vi.fn(),
  updateNodeInternals: vi.fn(),
  nestedUpdateNodeInternals: vi.fn(),
  nodesMeasured: true,
  viewport: { fitView: vi.fn(), zoomIn: vi.fn(), zoomOut: vi.fn() },
  nestedViewport: { fitView: vi.fn(), zoomIn: vi.fn(), zoomOut: vi.fn() },
}));

vi.mock('@xyflow/react', async () => {
  const React = await import('react');
  const ProviderDepth = React.createContext(0);
  return {
    ReactFlowProvider: ({ children }: PropsWithChildren) => {
      const depth = React.useContext(ProviderDepth);
      return (
        <ProviderDepth.Provider value={depth + 1}>
          <div data-testid="flow-provider">{children}</div>
        </ProviderDepth.Provider>
      );
    },
    ReactFlow: (props: ReactFlowProps) => {
      mocks.flow(props);
      return (
        <div data-testid="flow" data-provider-depth={React.useContext(ProviderDepth)} className={props.className}>
          {props.nodes?.map((node) => {
            const Card = props.nodeTypes?.[node.type ?? ''] as ComponentType<Pick<NodeProps, 'data'>>;
            return <Card key={node.id} data={node.data} />;
          })}
          {props.children}
        </div>
      );
    },
    Handle: (props: HandleProps) => {
      mocks.handle(props);
      return <span data-testid="handle" className={props.className} />;
    },
    Panel: ({ children, position, className }: PanelProps) => (
      <div data-testid="navigation" data-position={position} className={`react-flow__panel ${className}`}>
        {children}
      </div>
    ),
    Background: () => <div data-testid="background" />,
    BackgroundVariant: { Dots: 'dots' },
    MarkerType: { ArrowClosed: 'arrowclosed' },
    Position: { Top: 'top', Bottom: 'bottom' },
    useStore: (selector: (state: ReactFlowState) => boolean) =>
      selector({
        nodeLookup: new Map([
          [
            'request',
            {
              id: 'request',
              measured: mocks.nodesMeasured ? { width: 200, height: 44 } : {},
              internals: {
                handleBounds: { source: [], target: [] },
                userNode: { id: 'request', width: 200 },
              },
            },
          ],
        ]),
      } as ReactFlowState),
    useReactFlow: () => (React.useContext(ProviderDepth) === 2 ? mocks.nestedViewport : mocks.viewport),
    useUpdateNodeInternals: () => (React.useContext(ProviderDepth) === 2 ? mocks.nestedUpdateNodeInternals : mocks.updateNodeInternals),
  };
});

const nodes: WorkflowPreviewNode[] = [
  { id: 'request', label: 'Request', position: { x: 0, y: 0 }, iconUri: 'request.svg', brandColor: '#123456' },
  { id: 'response', label: 'Response', position: { x: 0, y: 112 } },
];
const edges: WorkflowPreviewEdge[] = [{ id: 'request-response', source: 'request', target: 'response' }];

let frames: Map<number, FrameRequestCallback>;
let nextFrame: number;
let observers: PreviewResizeObserver[];

class PreviewResizeObserver {
  target?: Element;
  disconnect = vi.fn();
  unobserve = vi.fn();

  constructor(private callback: ResizeObserverCallback) {
    observers.push(this);
  }

  observe(target: Element) {
    this.target = target;
  }

  resize(width: number, height: number) {
    this.callback([{ target: this.target, contentRect: { width, height } } as ResizeObserverEntry], this as unknown as ResizeObserver);
  }
}

const flushFrames = () =>
  act(() => {
    const pending = [...frames.values()];
    frames.clear();
    for (const callback of pending) {
      callback(0);
    }
  });

const flowProps = () => mocks.flow.mock.lastCall?.[0] as ReactFlowProps;

const createAnimation = (endTime = 200) => {
  let resolve: (value: undefined) => void = () => {};
  let reject: (reason: Error) => void = () => {};
  const animation = {
    playState: 'running',
    pending: false,
    effect: { getComputedTiming: () => ({ endTime }) },
    finished: new Promise((resolvePromise, rejectPromise) => {
      resolve = resolvePromise;
      reject = rejectPromise;
    }),
  };
  return {
    animation,
    finish: () => {
      animation.playState = 'finished';
      resolve(undefined);
    },
    cancel: () => {
      animation.playState = 'idle';
      reject(new Error('Animation cancelled'));
    },
  };
};

describe('WorkflowPreview', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    frames = new Map();
    nextFrame = 0;
    observers = [];
    mocks.nodesMeasured = true;
    vi.stubGlobal('ResizeObserver', PreviewResizeObserver);
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
      frames.set(++nextFrame, callback);
      return nextFrame;
    });
    vi.stubGlobal('cancelAnimationFrame', (id: number) => frames.delete(id));
  });

  afterEach(() => vi.unstubAllGlobals());

  it('only enables viewport navigation, never editing or selection', () => {
    const onAction = vi.fn();
    render(
      <WorkflowPreview
        nodes={nodes}
        edges={edges}
        {...{ onNodeClick: onAction, onEdgeClick: onAction, onNodesChange: onAction, onSelectionChange: onAction }}
      />
    );

    expect(flowProps()).toMatchObject({
      nodesDraggable: false,
      nodesConnectable: false,
      nodesFocusable: false,
      edgesReconnectable: false,
      edgesFocusable: false,
      elementsSelectable: false,
      selectionOnDrag: false,
      deleteKeyCode: null,
      selectionKeyCode: null,
      multiSelectionKeyCode: null,
      panActivationKeyCode: null,
      disableKeyboardA11y: true,
      panOnDrag: true,
      zoomOnScroll: true,
      zoomOnPinch: true,
      zoomOnDoubleClick: false,
      fitView: true,
    });
    expect(Object.keys(flowProps()).filter((key) => key.startsWith('on'))).toEqual([]);
    fireEvent.click(screen.getByText('Request'));
    fireEvent.doubleClick(screen.getByText('Response'));
    fireEvent.contextMenu(screen.getByTestId('flow'));
    expect(onAction).not.toHaveBeenCalled();
  });

  it('copies only plain graph fields and rejects injected node/edge behavior', () => {
    const onClick = vi.fn();
    const unsafeNodes = nodes.map((node) => ({
      ...node,
      draggable: true,
      connectable: true,
      selectable: true,
      focusable: true,
      deletable: true,
      selected: true,
      hidden: true,
      type: 'editable',
      data: { onClick },
      style: { pointerEvents: 'all' },
      position: { ...node.position, onClick },
    }));
    const unsafeEdges = edges.map((edge) => ({
      ...edge,
      type: 'editable',
      reconnectable: true,
      selectable: true,
      focusable: true,
      selected: true,
      interactionWidth: 100,
      data: { onClick },
      style: { pointerEvents: 'all' },
    }));
    render(<WorkflowPreview nodes={unsafeNodes} edges={unsafeEdges} />);

    expect(flowProps().nodes?.[0]).toEqual({
      id: 'request',
      type: 'workflowPreview',
      position: { x: 0, y: 0 },
      data: { label: 'Request', iconUri: 'request.svg', brandColor: '#123456' },
      width: WORKFLOW_PREVIEW_NODE_WIDTH,
      draggable: false,
      connectable: false,
      selectable: false,
      focusable: false,
      deletable: false,
    });
    expect(flowProps().edges?.[0]).toEqual({
      ...edges[0],
      ...flowProps().defaultEdgeOptions,
    });
    expect(flowProps().defaultEdgeOptions).toMatchObject({
      type: 'smoothstep',
      markerEnd: { type: 'arrowclosed' },
      reconnectable: false,
      selectable: false,
      focusable: false,
      interactionWidth: 0,
      style: { pointerEvents: 'none' },
    });
    expect(WORKFLOW_PREVIEW_NODE_WIDTH).toBe(200);
    expect(WORKFLOW_PREVIEW_NODE_HEIGHT).toBe(44);
  });

  it('isolates the preview provider and navigation from an enclosing React Flow', () => {
    render(
      <ReactFlowProvider>
        <WorkflowPreview nodes={nodes} edges={edges} />
      </ReactFlowProvider>
    );
    expect(screen.getAllByTestId('flow-provider')).toHaveLength(2);
    expect(screen.getByTestId('flow')).toHaveAttribute('data-provider-depth', '2');
    flushFrames();
    fireEvent.click(screen.getByRole('button', { name: 'Zoom in' }));
    fireEvent.click(screen.getByRole('button', { name: 'Zoom out' }));
    fireEvent.click(screen.getByRole('button', { name: 'Zoom view to fit' }));
    expect(mocks.nestedViewport.zoomIn).toHaveBeenCalledOnce();
    expect(mocks.nestedViewport.zoomOut).toHaveBeenCalledOnce();
    expect(mocks.nestedViewport.fitView).toHaveBeenCalledTimes(2);
    expect(mocks.nestedUpdateNodeInternals).toHaveBeenCalledExactlyOnceWith(['request', 'response']);
    expect(mocks.updateNodeInternals).not.toHaveBeenCalled();
    for (const operation of Object.values(mocks.viewport)) {
      expect(operation).not.toHaveBeenCalled();
    }
  });

  it('renders compact connector cards with full titles and inert, hidden handles', () => {
    const longLabel = 'A very long workflow action name that needs two lines and must never overflow its compact card';
    render(<WorkflowPreview nodes={[{ ...nodes[0], label: longLabel }, nodes[1]]} edges={edges} className="supplied-preview" />);

    expect(screen.getByRole('region', { name: 'Workflow preview' })).toHaveClass('supplied-preview');
    const card = screen.getByTitle(longLabel);
    expect(card).toHaveTextContent(longLabel);
    expect(card).toHaveStyle({ width: workflowCardStyles.root.width });
    expect(['', 'auto']).toContain(getComputedStyle(card).height);
    expect(flowProps().nodes?.[0].height).toBeUndefined();
    const sharedRootProperties = {
      padding: workflowCardStyles.root.padding,
      border: workflowCardStyles.root.border,
      'border-radius': workflowCardStyles.root.borderRadius,
      gap: workflowCardStyles.root.gap,
      'box-shadow': workflowCardStyles.root.boxShadow,
    };
    for (const [property, value] of Object.entries(sharedRootProperties)) {
      expect(getComputedStyle(card).getPropertyValue(property).replace(/\s/g, '')).toBe(value.replace(/\s/g, ''));
    }
    const labelStyle = getComputedStyle(screen.getByText(longLabel));
    expect(labelStyle.overflow).toBe('hidden');
    expect(labelStyle.fontSize).toBe(workflowCardStyles.title.fontSize);
    expect(labelStyle.fontWeight).toBe(workflowCardStyles.title.fontWeight);
    expect(labelStyle.lineHeight).toBe(workflowCardStyles.title.lineHeight);
    const image = card.querySelector('img');
    expect(image).toHaveAttribute('src', 'request.svg');
    expect(image).toHaveAttribute('alt', '');
    expect(image).toHaveAttribute('draggable', 'false');
    expect(image?.parentElement).toHaveStyle({ backgroundColor: '#123456' });
    const iconStyle = getComputedStyle(image!.parentElement!);
    expect(iconStyle.width).toBe(workflowCardStyles.icon.width);
    expect(iconStyle.height).toBe(workflowCardStyles.icon.height);
    expect(iconStyle.borderRadius).toBe(workflowCardStyles.icon.borderRadius);
    expect(screen.getByText('Response')).toBeInTheDocument();
    for (const [handle] of mocks.handle.mock.calls) {
      expect(handle.isConnectable).toBe(false);
    }
    for (const handle of screen.getAllByTestId('handle')) {
      expect(handle).toHaveStyle({ visibility: 'hidden', pointerEvents: 'none' });
    }
    expect(screen.getAllByRole('button')).toHaveLength(3);
    expect(screen.getByTestId('navigation')).toHaveAttribute('data-position', 'bottom-left');
    expect(screen.queryByRole('button', { name: /lock|interactive|select/i })).not.toBeInTheDocument();
    expect(screen.getByTestId('background')).toBeInTheDocument();
  });

  it('keeps navigation above the canvas despite the host designer global panel styles', () => {
    const hostStyles = document.createElement('style');
    hostStyles.textContent = '.react-flow__panel { z-index: 0 !important; margin: 0px !important; }';
    document.head.appendChild(hostStyles);
    try {
      render(<WorkflowPreview nodes={nodes} edges={edges} />);
      const navigation = screen.getByTestId('navigation');
      expect(navigation).toHaveStyle({ zIndex: '5', pointerEvents: 'auto' });
      fireEvent.click(screen.getByRole('button', { name: 'Zoom in' }));
      expect(mocks.viewport.zoomIn).toHaveBeenCalledOnce();
    } finally {
      hostStyles.remove();
    }
  });

  it('uses a flow icon for absent or failed connector images and retries when the URI changes', () => {
    const { rerender } = render(<WorkflowPreview nodes={nodes} edges={edges} />);
    flushFrames();
    const requestCard = screen.getByTitle('Request');
    expect(screen.getByTitle('Response').querySelector('[data-icon-name="Flow20Regular"]')).toBeInTheDocument();
    const image = requestCard.querySelector('img');
    expect(image).toBeInTheDocument();
    fireEvent.error(image!);
    expect(requestCard.querySelector('img')).not.toBeInTheDocument();
    const fallback = requestCard.querySelector('[data-icon-name="Flow20Regular"]');
    expect(fallback).toBeInTheDocument();
    expect(fallback?.parentElement).toHaveStyle({ backgroundColor: '#123456' });
    expect(flowProps().nodes?.[0].data.iconUri).toBe('request.svg');
    flushFrames();
    expect(mocks.viewport.fitView).toHaveBeenCalledOnce();

    rerender(<WorkflowPreview nodes={[{ ...nodes[0], iconUri: 'replacement.svg' }, nodes[1]]} edges={edges} />);
    expect(requestCard.querySelector('img')).toHaveAttribute('src', 'replacement.svg');
    expect(requestCard.querySelector('[data-icon-name="Flow20Regular"]')).not.toBeInTheDocument();
    flushFrames();
    expect(mocks.viewport.fitView).toHaveBeenCalledOnce();
  });

  it('uses internally measured natural heights even though caller-owned nodes have no height', () => {
    render(<WorkflowPreview nodes={nodes} edges={edges} />);
    flushFrames();
    expect(flowProps().nodes?.every((node) => node.height === undefined && node.measured === undefined)).toBe(true);
    expect(mocks.updateNodeInternals).toHaveBeenCalledExactlyOnceWith(['request', 'response']);
    expect(mocks.viewport.fitView).toHaveBeenCalledOnce();
  });

  it('fits once after nodes are measured and does not reset navigation for equivalent graphs or labels', () => {
    mocks.nodesMeasured = false;
    const { rerender } = render(<WorkflowPreview nodes={nodes} edges={edges} />);
    flushFrames();
    expect(mocks.viewport.fitView).not.toHaveBeenCalled();
    expect(mocks.updateNodeInternals).not.toHaveBeenCalled();

    mocks.nodesMeasured = true;
    rerender(<WorkflowPreview nodes={nodes} edges={edges} />);
    flushFrames();
    expect(mocks.viewport.fitView).toHaveBeenCalledOnce();
    expect(mocks.updateNodeInternals).toHaveBeenCalledOnce();

    rerender(
      <WorkflowPreview
        nodes={nodes.map((node) => ({ ...node, label: `${node.label} renamed`, position: { ...node.position } }))}
        edges={[...edges]}
        ariaLabel="Updated preview"
      />
    );
    flushFrames();
    expect(mocks.viewport.fitView).toHaveBeenCalledOnce();
    expect(mocks.updateNodeInternals).toHaveBeenCalledOnce();

    rerender(<WorkflowPreview nodes={nodes.map((node) => ({ ...node, position: { x: 120, y: node.position.y } }))} edges={edges} />);
    flushFrames();
    expect(mocks.viewport.fitView).toHaveBeenCalledTimes(2);
  });

  it('remeasures handles only after all enclosing animations finish, without resetting the viewport', async () => {
    const outer = createAnimation();
    const inner = createAnimation();
    render(
      <div data-testid="animated-container">
        <WorkflowPreview nodes={nodes} edges={edges} />
      </div>
    );
    Object.defineProperty(screen.getByTestId('animated-container'), 'getAnimations', { value: () => [outer.animation] });
    Object.defineProperty(screen.getByRole('region'), 'getAnimations', { value: () => [inner.animation] });
    flushFrames();
    expect(mocks.updateNodeInternals).not.toHaveBeenCalled();
    expect(mocks.viewport.fitView).toHaveBeenCalledOnce();

    await act(async () => outer.finish());
    flushFrames();
    expect(mocks.updateNodeInternals).not.toHaveBeenCalled();

    await act(async () => inner.finish());
    flushFrames();
    expect(mocks.updateNodeInternals).toHaveBeenCalledExactlyOnceWith(['request', 'response']);
    expect(mocks.viewport.fitView).toHaveBeenCalledOnce();
  });

  it('handles animation cancellation and waits for a replacement animation before remeasuring', async () => {
    const entrance = createAnimation();
    const replacement = createAnimation();
    let current = entrance.animation;
    render(
      <div data-testid="animated-container">
        <WorkflowPreview nodes={nodes} edges={edges} />
      </div>
    );
    Object.defineProperty(screen.getByTestId('animated-container'), 'getAnimations', { value: () => [current] });
    flushFrames();

    await act(async () => {
      current = replacement.animation;
      entrance.cancel();
    });
    flushFrames();
    expect(mocks.updateNodeInternals).not.toHaveBeenCalled();

    await act(async () => replacement.cancel());
    flushFrames();
    expect(mocks.updateNodeInternals).toHaveBeenCalledExactlyOnceWith(['request', 'response']);
    expect(mocks.viewport.fitView).toHaveBeenCalledOnce();
  });

  it('does not measure after unmounting while an ancestor animation is pending', async () => {
    const entrance = createAnimation();
    const { unmount } = render(
      <div data-testid="animated-container">
        <WorkflowPreview nodes={nodes} edges={edges} />
      </div>
    );
    Object.defineProperty(screen.getByTestId('animated-container'), 'getAnimations', { value: () => [entrance.animation] });
    flushFrames();
    unmount();
    await act(async () => entrance.finish());
    flushFrames();
    expect(mocks.updateNodeInternals).not.toHaveBeenCalled();
  });

  it('does not wait indefinitely for continuously animated enclosing surfaces', () => {
    const decoration = createAnimation(Number.POSITIVE_INFINITY);
    render(
      <div data-testid="animated-container">
        <WorkflowPreview nodes={nodes} edges={edges} />
      </div>
    );
    Object.defineProperty(screen.getByTestId('animated-container'), 'getAnimations', { value: () => [decoration.animation] });
    flushFrames();
    expect(mocks.updateNodeInternals).toHaveBeenCalledExactlyOnceWith(['request', 'response']);
  });

  it('refits after container resizing and cleans up its observer', () => {
    const { unmount } = render(<WorkflowPreview nodes={nodes} edges={edges} />);
    flushFrames();
    const observer = observers.find(({ target }) => target === screen.getByRole('region'));
    expect(observer).toBeDefined();
    act(() => observer?.resize(640, 480));
    flushFrames();
    expect(mocks.viewport.fitView).toHaveBeenCalledTimes(2);
    act(() => observer?.resize(640, 480));
    act(() => observer?.resize(0, 0));
    flushFrames();
    expect(mocks.viewport.fitView).toHaveBeenCalledTimes(2);

    act(() => observer?.resize(800, 600));
    unmount();
    flushFrames();
    expect(mocks.viewport.fitView).toHaveBeenCalledTimes(2);
    expect(observer?.disconnect).toHaveBeenCalledOnce();
  });

  it('localizes the default preview and navigation names, while allowing a custom accessible name', () => {
    vi.spyOn(Intl, 'useIntl').mockReturnValue(
      Intl.createIntl({
        locale: 'fr',
        messages: {
          'workflowPreview.label': 'Aperçu du flux',
          'LeR+TX': 'Agrandir',
          JyYLq1: 'Réduire',
          nAEN7n: 'Ajuster la vue',
        },
      })
    );
    const { rerender } = render(<WorkflowPreview nodes={nodes} edges={edges} />);
    expect(screen.getByRole('region', { name: 'Aperçu du flux' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Agrandir' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Réduire' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ajuster la vue' })).toBeInTheDocument();
    rerender(<WorkflowPreview nodes={nodes} edges={edges} ariaLabel="Extracted child workflow" />);
    expect(screen.getByRole('region', { name: 'Extracted child workflow' })).toBeInTheDocument();
  });

  it('renders a legible localized empty state without a canvas or navigation buttons', () => {
    vi.spyOn(Intl, 'useIntl').mockReturnValue(
      Intl.createIntl({ locale: 'fr', messages: { 'workflowPreview.empty': 'Aucune action à afficher.' } })
    );
    render(<WorkflowPreview nodes={[]} edges={[]} ariaLabel="Empty preview" />);
    expect(screen.getByRole('region', { name: 'Empty preview' })).toHaveTextContent('Aucune action à afficher.');
    expect(screen.getByTestId('flow-provider')).toBeInTheDocument();
    expect(screen.queryByTestId('flow')).not.toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    flushFrames();
    expect(mocks.viewport.fitView).not.toHaveBeenCalled();
  });
});
