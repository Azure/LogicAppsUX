import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from 'vitest';
import type { ReactFlowInstance } from '@xyflow/react';
import { fitDesignerViewport } from '../designerViewport';
import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';

// Mock values for nodes and edges
let mockNodes: { id: string }[] = [];
let mockEdges: { id: string }[] = [];
const flow = vi.hoisted(() => ({
  fitView: vi.fn(),
  fitBounds: vi.fn(),
  getNodes: vi.fn(() => [{ id: 'culled', position: { x: 0, y: 0 }, data: {}, initialWidth: 200, initialHeight: 44 }]),
  getNodesBounds: vi.fn(() => ({ x: 0, y: 0, width: 200, height: 44 })),
  setViewport: vi.fn(),
  zoomIn: vi.fn(),
  zoomOut: vi.fn(),
}));

vi.mock('react-redux', () => ({
  useDispatch: () => vi.fn(),
}));
vi.mock('../../core', () => ({ openPanel: vi.fn() }));
vi.mock('../../core/state/designerView/designerViewSlice', () => ({ toggleMinimap: vi.fn() }));

vi.mock(import('react-intl'), async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    useIntl: () => ({
      formatMessage: ({ defaultMessage }: { defaultMessage: string }) => defaultMessage,
    }),
  };
});

vi.mock('../../core/state/designerView/designerViewSelectors', () => ({
  useShowMinimap: () => false,
}));

vi.mock(import('@xyflow/react'), async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    useReactFlow: () => flow,
    useStore: (selector: (state: { nodes: { id: string }[]; edges: { id: string }[] }) => number) =>
      selector({ nodes: mockNodes, edges: mockEdges }),
    Controls: ({ children }: { children: React.ReactNode }) => <div data-testid="controls">{children}</div>,
    ControlButton: ({
      children,
      tabIndex,
      id,
      ...props
    }: {
      children: React.ReactNode;
      tabIndex?: number;
      id?: string;
      'aria-label'?: string;
    }) => (
      <button data-testid={id} data-tabindex={tabIndex} {...props}>
        {children}
      </button>
    ),
  };
});

vi.mock('../common/controls/collapseExpandControl', () => ({
  default: ({ tabIndex }: { tabIndex?: number }) => (
    <button data-testid="collapse-expand-control" data-tabindex={tabIndex}>
      Collapse/Expand
    </button>
  ),
}));

vi.mock(import('@fluentui/react-icons'), async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    AddRegular: () => <span>+</span>,
    SubtractRegular: () => <span>-</span>,
    MapFilled: () => <span>MapFilled</span>,
    MapRegular: () => <span>MapRegular</span>,
    SearchRegular: () => <span>Search</span>,
    ZoomFitRegular: () => <span>Fit</span>,
  };
});

vi.mock(import('@microsoft/logic-apps-shared'), async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    LogEntryLevel: { Verbose: 'Verbose' },
    LoggerService: () => ({ log: vi.fn() }),
  };
});

// Import after mocks
import CustomControls from '../Controls';

describe('native V1 usable viewport fitting', () => {
  afterEach(() => document.body.replaceChildren());
  const rect = (x: number, y: number, width: number, height: number) => ({
    x,
    y,
    width,
    height,
    left: x,
    right: x + width,
    top: y,
    bottom: y + height,
    toJSON: () => ({}),
  });

  it('fits culled adopted nodes above the footer and excludes hidden nodes', () => {
    const canvas = document.createElement('div');
    const footer = document.createElement('div');
    footer.dataset.designerViewportInset = 'bottom';
    document.body.append(canvas, footer);
    canvas.getBoundingClientRect = () => rect(0, 0, 1280, 720);
    footer.getBoundingClientRect = () => rect(300, 640, 680, 80);
    const visible = { id: 'culled', position: { x: 20, y: 0 }, initialWidth: 200, initialHeight: 556, data: {} };
    const getNodesBounds = vi.fn(() => rect(20, 0, 200, 556));
    const setViewport = vi.fn();
    const instance = {
      getNodes: () => [visible, { ...visible, id: 'hidden', hidden: true }],
      getNodesBounds,
      setViewport,
    } as unknown as ReactFlowInstance;
    fitDesignerViewport(instance, canvas);
    expect(getNodesBounds).toHaveBeenCalledWith([visible]);
    const viewport = setViewport.mock.calls[0][0];
    expect(viewport.y + 556 * viewport.zoom).toBeLessThan(640);
    expect(viewport.y).toBeGreaterThan(0);
  });

  it('does not move the viewport for an empty graph', () => {
    const setViewport = vi.fn();
    fitDesignerViewport({ getNodes: () => [], setViewport } as unknown as ReactFlowInstance, document.createElement('div'));
    expect(setViewport).not.toHaveBeenCalled();
  });

  it('ignores a footer outside this canvas and leaves an unusable canvas unchanged', () => {
    const canvas = document.createElement('div');
    const footer = document.createElement('div');
    footer.dataset.designerViewportInset = 'bottom';
    document.body.append(canvas, footer);
    const setViewport = vi.fn();
    const instance = {
      getNodes: () => [{ id: 'real', data: {}, position: { x: 0, y: 0 } }],
      getNodesBounds: () => rect(0, 0, 200, 556),
      setViewport,
    } as unknown as ReactFlowInstance;
    fitDesignerViewport(instance, canvas);
    expect(setViewport).not.toHaveBeenCalled();
    canvas.getBoundingClientRect = () => rect(0, 0, 1280, 720);
    footer.getBoundingClientRect = () => rect(1300, 0, 100, 720);
    fitDesignerViewport(instance, canvas);
    expect(setViewport).toHaveBeenCalledOnce();
    const viewport = setViewport.mock.calls[0][0];
    expect(viewport.y + 556 * viewport.zoom).toBeGreaterThan(640);
    setViewport.mockClear();
    footer.getBoundingClientRect = () => rect(0, 0, 1280, 720);
    fitDesignerViewport(instance, canvas);
    expect(setViewport).not.toHaveBeenCalled();
  });
});

describe('CustomControls', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockNodes = [];
    mockEdges = [];
  });

  it('fits public adopted bounds without waiting for every virtualized node to mount', () => {
    render(<CustomControls />);
    fireEvent.click(screen.getByTestId('control-zoom-fit-button'));
    expect(flow.fitView).not.toHaveBeenCalled();
    expect(flow.getNodesBounds).toHaveBeenCalledWith(flow.getNodes());
    expect(flow.fitBounds).toHaveBeenCalledWith({ x: 0, y: 0, width: 200, height: 44 });
  });

  it('uses the canvas viewport when fitting from the toolbar', () => {
    const canvas = document.createElement('div');
    canvas.getBoundingClientRect = () => ({
      x: 0,
      y: 0,
      width: 1280,
      height: 720,
      left: 0,
      top: 0,
      right: 1280,
      bottom: 720,
      toJSON: () => ({}),
    });

    render(<CustomControls canvasRef={{ current: canvas }} />);
    fireEvent.click(screen.getByTestId('control-zoom-fit-button'));

    expect(flow.setViewport).toHaveBeenCalledOnce();
    expect(flow.fitBounds).not.toHaveBeenCalled();
  });

  it('does not fit an empty workflow', () => {
    flow.getNodes.mockReturnValueOnce([]);
    render(<CustomControls />);
    fireEvent.click(screen.getByTestId('control-zoom-fit-button'));
    expect(flow.getNodesBounds).not.toHaveBeenCalled();
    expect(flow.fitBounds).not.toHaveBeenCalled();
  });

  describe('tabIndex calculation', () => {
    it('should calculate tabIndex as 1 when there are no nodes or edges', () => {
      mockNodes = [];
      mockEdges = [];

      render(<CustomControls />);

      // tabIndex = (0 * 2) + 0 + 1 = 1
      const collapseExpand = screen.getByTestId('collapse-expand-control');
      expect(collapseExpand.getAttribute('data-tabindex')).toBe('1');
    });

    it('should calculate tabIndex correctly with nodes only', () => {
      mockNodes = [{ id: 'node1' }, { id: 'node2' }, { id: 'node3' }];
      mockEdges = [];

      render(<CustomControls />);

      // tabIndex = (3 * 2) + 0 + 1 = 7
      const collapseExpand = screen.getByTestId('collapse-expand-control');
      expect(collapseExpand.getAttribute('data-tabindex')).toBe('7');
    });

    it('should calculate tabIndex correctly with edges only', () => {
      mockNodes = [];
      mockEdges = [{ id: 'edge1' }, { id: 'edge2' }];

      render(<CustomControls />);

      // tabIndex = (0 * 2) + 2 + 1 = 3
      const collapseExpand = screen.getByTestId('collapse-expand-control');
      expect(collapseExpand.getAttribute('data-tabindex')).toBe('3');
    });

    it('should calculate tabIndex correctly with both nodes and edges', () => {
      mockNodes = [{ id: 'node1' }, { id: 'node2' }];
      mockEdges = [{ id: 'edge1' }, { id: 'edge2' }, { id: 'edge3' }];

      render(<CustomControls />);

      // tabIndex = (2 * 2) + 3 + 1 = 8
      const collapseExpand = screen.getByTestId('collapse-expand-control');
      expect(collapseExpand.getAttribute('data-tabindex')).toBe('8');
    });

    it('should apply the same tabIndex to all control buttons', () => {
      mockNodes = [{ id: 'node1' }];
      mockEdges = [{ id: 'edge1' }];

      render(<CustomControls />);

      // tabIndex = (1 * 2) + 1 + 1 = 4
      const expectedTabIndex = '4';

      expect(screen.getByTestId('collapse-expand-control').getAttribute('data-tabindex')).toBe(expectedTabIndex);
      expect(screen.getByTestId('control-zoom-in-button').getAttribute('data-tabindex')).toBe(expectedTabIndex);
      expect(screen.getByTestId('control-zoom-out-button').getAttribute('data-tabindex')).toBe(expectedTabIndex);
      expect(screen.getByTestId('control-zoom-fit-button').getAttribute('data-tabindex')).toBe(expectedTabIndex);
      expect(screen.getByTestId('control-search-button').getAttribute('data-tabindex')).toBe(expectedTabIndex);
      expect(screen.getByTestId('control-minimap-button').getAttribute('data-tabindex')).toBe(expectedTabIndex);
    });

    it('should handle large workflow with many nodes and edges', () => {
      // Simulate a large workflow
      mockNodes = Array.from({ length: 50 }, (_, i) => ({ id: `node${i}` }));
      mockEdges = Array.from({ length: 75 }, (_, i) => ({ id: `edge${i}` }));

      render(<CustomControls />);

      // tabIndex = (50 * 2) + 75 + 1 = 176
      const collapseExpand = screen.getByTestId('collapse-expand-control');
      expect(collapseExpand.getAttribute('data-tabindex')).toBe('176');
    });
  });

  describe('control buttons rendering', () => {
    it('should render all control buttons', () => {
      render(<CustomControls />);

      expect(screen.getByTestId('collapse-expand-control')).toBeInTheDocument();
      expect(screen.getByTestId('control-zoom-in-button')).toBeInTheDocument();
      expect(screen.getByTestId('control-zoom-out-button')).toBeInTheDocument();
      expect(screen.getByTestId('control-zoom-fit-button')).toBeInTheDocument();
      expect(screen.getByTestId('control-search-button')).toBeInTheDocument();
      expect(screen.getByTestId('control-minimap-button')).toBeInTheDocument();
    });
  });
});
