import { describe, it, expect, vi, beforeEach, beforeAll, afterAll } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { configureStore } from '@reduxjs/toolkit';
import { Provider } from 'react-redux';
import { buildSvgSpline } from '@microsoft/logic-apps-shared';
import type { EdgeProps } from '@xyflow/react';
import { Position } from '@xyflow/react';
import type { LogicAppsEdgeProps } from '../edge';

const mockUseReadOnly = vi.fn().mockReturnValue(false);

vi.mock('../../../core/state/designerOptions/designerOptionsSelectors', () => ({
  useReadOnly: () => mockUseReadOnly(),
}));

const mockUseIsNodeSelectedInOperationPanel = vi.fn().mockReturnValue(false);
const mockUseIsNodeInMultiSelection = vi.fn().mockReturnValue(false);

vi.mock('../../../core/state/panel/panelSelectors', () => ({
  useIsNodeSelectedInOperationPanel: (...args: any[]) => mockUseIsNodeSelectedInOperationPanel(...args),
  useIsNodeInMultiSelection: (...args: unknown[]) => mockUseIsNodeInMultiSelection(...args),
}));

const mockUseActionMetadata = vi.fn().mockReturnValue({ runAfter: {} });
const mockUseNodeEdgeTargets = vi.fn().mockReturnValue([]);
const mockUseNodeMetadata = vi.fn().mockReturnValue({ graphId: 'root' });
const mockUseEdgesData = vi.fn();
const mockUseNodeGlobalPosition = vi.fn();

vi.mock('../../../core/state/workflow/workflowSelectors', () => ({
  useActionMetadata: (...args: any[]) => mockUseActionMetadata(...args),
  useNodeEdgeTargets: (...args: any[]) => mockUseNodeEdgeTargets(...args),
  useNodeMetadata: (...args: any[]) => mockUseNodeMetadata(...args),
}));

vi.mock('@microsoft/logic-apps-shared', async (importOriginal) => ({
  ...((await importOriginal()) as object),
  useEdgeIndex: () => 0,
  useGuid: () => 'test-guid',
  useEdgesData: (...args: unknown[]) => mockUseEdgesData(...args),
  useNodeGlobalPosition: (...args: unknown[]) => mockUseNodeGlobalPosition(...args),
}));

vi.mock('@xyflow/react', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    useReactFlow: () => ({
      getNode: vi.fn().mockReturnValue({ position: { x: 0, y: 0 } }),
    }),
    EdgeLabelRenderer: ({ children }: any) => (
      <foreignObject>
        <div data-testid="edge-label-renderer">{children}</div>
      </foreignObject>
    ),
  };
});

vi.mock('../dropzone', () => ({
  DropZone: ({ graphId }: any) => <div data-testid={`dropzone-${graphId}`}>DropZone</div>,
}));

vi.mock('../runAfterIndicator', () => ({
  RunAfterIndicator: () => <div data-testid="run-after-indicator" />,
  CollapsedRunAfterIndicator: () => <div data-testid="collapsed-run-after-indicator" />,
}));

import ButtonEdge from '../edge';
import HandoffEdge from '../handoffEdge';
import designerViewReducer from '../../../core/state/designerView/designerViewSlice';
import { filterRunAfters, WorkflowEdgeView } from '../workflowEdgeView';

describe('ButtonEdge', () => {
  const defaultProps: EdgeProps<LogicAppsEdgeProps> = {
    id: 'edge-1',
    source: 'sourceNode',
    target: 'targetNode',
    sourceX: 100,
    sourceY: 50,
    targetX: 100,
    targetY: 200,
    sourcePosition: Position.Bottom,
    targetPosition: Position.Top,
    data: { id: 'edge-1', source: 'sourceNode', target: 'targetNode' },
    selected: false,
    type: 'buttonedge',
    sourceHandleId: null,
    targetHandleId: null,
    interactionWidth: 20,
    markerStart: undefined,
    markerEnd: undefined,
    pathOptions: undefined,
    style: undefined,
    label: undefined,
    labelStyle: undefined,
    labelShowBg: undefined,
    labelBgStyle: undefined,
    labelBgPadding: undefined,
    labelBgBorderRadius: undefined,
    animated: false,
    selectable: true,
    deletable: true,
    focusable: true,
    hidden: false,
    reconnectable: undefined,
    zIndex: 0,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseReadOnly.mockReturnValue(false);
    mockUseIsNodeSelectedInOperationPanel.mockReturnValue(false);
    mockUseIsNodeInMultiSelection.mockReturnValue(false);
    mockUseActionMetadata.mockReturnValue({ runAfter: {} });
    mockUseNodeEdgeTargets.mockReturnValue(['targetNode']);
    mockUseNodeMetadata.mockReturnValue({ graphId: 'root' });
  });

  it('should render without crashing', () => {
    const { container } = render(
      <svg>
        <ButtonEdge {...defaultProps} />
      </svg>
    );
    expect(container).toBeTruthy();
  });

  it.each(['constructor', 'toString'])('does not render inherited run-after statuses for a succeeded-only %s source', (source) => {
    const { container } = render(
      <svg>
        <WorkflowEdgeView
          {...defaultProps}
          source={source}
          filteredRunAfters={filterRunAfters({ [source]: ['Succeeded'] })}
          runAfterIndex={0}
        />
      </svg>
    );
    expect(container.querySelector('.react-flow__edge-path')).toBeTruthy();
    expect(screen.queryByTestId('run-after-indicator')).toBeNull();
    expect(screen.queryByTestId('collapsed-run-after-indicator')).toBeNull();
  });

  it('should render edge path', () => {
    const { container } = render(
      <svg>
        <ButtonEdge {...defaultProps} />
      </svg>
    );
    const path = container.querySelector(`#${defaultProps.id}`);
    expect(path).toBeTruthy();
    expect(path?.getAttribute('class')).toBe('react-flow__edge-path');
  });

  it('should render arrow marker', () => {
    const { container } = render(
      <svg>
        <ButtonEdge {...defaultProps} />
      </svg>
    );
    const marker = container.querySelector('marker#test-guid');
    expect(marker).toBeTruthy();
  });

  it('should apply highlighted class to path when source node is selected', () => {
    mockUseIsNodeSelectedInOperationPanel.mockImplementation((nodeId: string) => nodeId === 'sourceNode');

    const { container } = render(
      <svg>
        <ButtonEdge {...defaultProps} />
      </svg>
    );
    const path = container.querySelector(`#${defaultProps.id}`);
    expect(path?.getAttribute('class')).toContain('highlighted');
  });

  it('should apply highlighted class to path when target node is selected', () => {
    mockUseIsNodeSelectedInOperationPanel.mockImplementation((nodeId: string) => nodeId === 'targetNode');

    const { container } = render(
      <svg>
        <ButtonEdge {...defaultProps} />
      </svg>
    );
    const path = container.querySelector(`#${defaultProps.id}`);
    expect(path?.getAttribute('class')).toContain('highlighted');
  });

  it('should apply highlighted class to marker when source node is selected', () => {
    mockUseIsNodeSelectedInOperationPanel.mockImplementation((nodeId: string) => nodeId === 'sourceNode');

    const { container } = render(
      <svg>
        <ButtonEdge {...defaultProps} />
      </svg>
    );
    const marker = container.querySelector('marker#test-guid');
    expect(marker?.getAttribute('class')).toContain('highlighted');
  });

  it('should not apply highlighted class when no node is selected', () => {
    mockUseIsNodeSelectedInOperationPanel.mockReturnValue(false);

    const { container } = render(
      <svg>
        <ButtonEdge {...defaultProps} />
      </svg>
    );
    const path = container.querySelector(`#${defaultProps.id}`);
    expect(path?.getAttribute('class')).not.toContain('highlighted');

    const marker = container.querySelector('marker#test-guid');
    expect(marker?.getAttribute('class')).not.toContain('highlighted');
  });

  it('should strip id tags from source and target for selection check', () => {
    const propsWithIdTags = {
      ...defaultProps,
      source: 'sourceNode-#scope',
      target: 'targetNode-#scope',
    };

    render(
      <svg>
        <ButtonEdge {...propsWithIdTags} />
      </svg>
    );

    // useIsNodeSelectedInOperationPanel should be called with cleaned IDs
    expect(mockUseIsNodeSelectedInOperationPanel).toHaveBeenCalled();
  });

  it('should show drop zones when not in read-only mode with single edge', () => {
    mockUseReadOnly.mockReturnValue(false);
    mockUseNodeEdgeTargets.mockReturnValue(['targetNode']);
    mockUseActionMetadata.mockReturnValue({ runAfter: { sourceNode: ['Succeeded'] } });

    const { container } = render(
      <svg>
        <ButtonEdge {...defaultProps} />
      </svg>
    );
    // Middle button should be visible for a single edge
    const edgeLabelRenderers = container.querySelectorAll('[data-testid="edge-label-renderer"]');
    expect(edgeLabelRenderers.length).toBeGreaterThan(0);
  });

  it('should hide drop zones in read-only mode', () => {
    mockUseReadOnly.mockReturnValue(true);

    const { container } = render(
      <svg>
        <ButtonEdge {...defaultProps} />
      </svg>
    );
    const dropzones = container.querySelectorAll('[data-testid^="dropzone-"]');
    expect(dropzones.length).toBe(0);
  });

  it('should show run after indicator when non-succeeded run afters exist and count is less than 6', () => {
    mockUseActionMetadata.mockReturnValue({
      runAfter: { sourceNode: ['Failed'] },
    });

    const { container } = render(
      <svg>
        <ButtonEdge {...defaultProps} />
      </svg>
    );
    const path = container.querySelector(`#${defaultProps.id}`);
    // Dashed stroke indicates run-after
    expect(path?.getAttribute('stroke-dasharray')).toBe('4 6');
  });

  it('should render solid line when all run afters are succeeded', () => {
    mockUseActionMetadata.mockReturnValue({
      runAfter: { sourceNode: ['Succeeded'] },
    });

    const { container } = render(
      <svg>
        <ButtonEdge {...defaultProps} />
      </svg>
    );
    const path = container.querySelector(`#${defaultProps.id}`);
    expect(path?.getAttribute('stroke-dasharray')).toBe('0');
  });

  describe('HandoffEdge live controller', () => {
    const originalLength = Object.getOwnPropertyDescriptor(SVGElement.prototype, 'getTotalLength');
    const originalPoint = Object.getOwnPropertyDescriptor(SVGElement.prototype, 'getPointAtLength');
    const points = [
      { x: 10, y: 20 },
      { x: 40, y: 60 },
      { x: 70, y: 100 },
    ];

    beforeAll(() => {
      Object.defineProperties(SVGElement.prototype, {
        getTotalLength: { configurable: true, value: () => 100 },
        getPointAtLength: { configurable: true, value: (length: number) => ({ x: length, y: length / 2 }) },
      });
    });

    afterAll(() => {
      for (const [name, descriptor] of [
        ['getTotalLength', originalLength],
        ['getPointAtLength', originalPoint],
      ] as const) {
        if (descriptor) {
          Object.defineProperty(SVGElement.prototype, name, descriptor);
        } else {
          Reflect.deleteProperty(SVGElement.prototype, name);
        }
      }
    });

    beforeEach(() => {
      mockUseEdgesData.mockReturnValue({
        data: {
          elkEdge: {
            container: 'container',
            sections: [{ startPoint: points[0], bendPoints: [points[1]], endPoint: points[2] }],
          },
        },
      });
      mockUseNodeGlobalPosition.mockReturnValue({ x: 100, y: 200 });
    });

    const mount = (props = defaultProps) => {
      const store = configureStore({ reducer: { designerView: designerViewReducer } });
      const view = render(
        <Provider store={store}>
          <svg>
            <HandoffEdge {...props} />
          </svg>
        </Provider>
      );
      return { ...view, store };
    };

    it('renders the real offset spline/cap and positions the live edit indicator at its measured midpoint', () => {
      const { container, store } = mount({ ...defaultProps, style: { strokeWidth: 3 } });
      const path = container.querySelector('#edge-1');
      expect(mockUseEdgesData).toHaveBeenCalledWith('edge-1');
      expect(mockUseNodeGlobalPosition).toHaveBeenCalledWith('container');
      expect(path?.getAttribute('d')).toBe(buildSvgSpline(points.map(({ x, y }) => ({ x: x + 100, y: y + 200 }))));
      expect(path?.getAttribute('stroke-dasharray')).toBe('4 6');
      expect(path?.getAttribute('marker-end')).toBe('url(#test-guid)');
      expect(path).toHaveStyle({ strokeWidth: 3 });
      expect(screen.getByRole('button').parentElement).toHaveStyle({ left: '38px', top: '13px' });
      expect(store.getState().designerView.edgeContextMenuData).toBeUndefined();
    });

    it.each(['sourceNode', 'targetNode'])('highlights panel and multi-selected %s through the shared native view', (selectedId) => {
      mockUseIsNodeSelectedInOperationPanel.mockImplementation((id: string) => id === selectedId);
      const view = mount();
      expect(view.container.querySelector('#edge-1')).toHaveClass('highlighted');
      expect(view.container.querySelector('marker')).toHaveClass('highlighted');
      mockUseIsNodeSelectedInOperationPanel.mockReturnValue(false);
      mockUseIsNodeInMultiSelection.mockImplementation((id: string) => id === selectedId);
      view.rerender(
        <Provider store={view.store}>
          <svg>
            <HandoffEdge {...defaultProps} source={`${defaultProps.source}-#scope`} target={`${defaultProps.target}-#scope`} />
          </svg>
        </Provider>
      );
      expect(view.container.querySelector('#edge-1')).toHaveClass('highlighted');
      expect(mockUseIsNodeInMultiSelection).toHaveBeenCalledWith(selectedId);
    });

    it.each(['click', 'contextMenu'] as const)('opens the live handoff menu on %s without losing tagged relationship IDs', (event) => {
      const props = { ...defaultProps, source: 'Container-#scope', target: 'Target-#scope' };
      const { store } = mount(props);
      vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue(new DOMRect(10, 20, 24, 24));
      fireEvent[event](screen.getByRole('button'));
      expect(store.getState().designerView.edgeContextMenuData).toEqual({
        graphId: 'Container',
        parentId: props.source,
        childId: props.target,
        isLeaf: undefined,
        location: { x: 34, y: 32 },
        isHandoff: true,
      });
    });

    it('retains the native path but removes edit affordances in read-only mode', () => {
      mockUseReadOnly.mockReturnValue(true);
      const { container, store } = mount();
      expect(container.querySelector('#edge-1')).toHaveClass('handoff');
      expect(screen.queryByRole('button')).toBeNull();
      expect(store.getState().designerView.edgeContextMenuData).toBeUndefined();
    });

    it.each([{ graphId: 'root' }, undefined])('uses the containing graph or empty fallback for an untagged edge: %s', (metadata) => {
      mockUseNodeMetadata.mockReturnValue(metadata);
      const { store, container } = mount();
      expect(container.querySelector('#edge-1')).not.toHaveClass('highlighted');
      fireEvent.click(screen.getByRole('button'));
      expect(store.getState().designerView.edgeContextMenuData?.graphId).toBe(metadata?.graphId ?? '');
    });
  });
});
