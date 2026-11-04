import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { act, render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { tokens } from '@fluentui/react-components';
import { useDebouncedEffect } from '@react-hookz/web';
import { getViewportForBounds } from '@xyflow/react';
import { DESIGNER_MIN_ZOOM } from '../designerViewport';

// ── Mock state toggles ──────────────────────────────────────────────────────
let mockIsInitialized = true;
let mockIsReadOnly = false;
let mockIsEmpty = false;
let mockClampPan = false;
let mockIsA2AWorkflow = false;
let mockIsDarkMode = false;
let mockSharedNodeUi = false;
let mockNode1Shared = false;
let mockDisconnectedNodes: string[] = [];
let mockAllAgentIds: string[] = [];
let mockPanelSelectedNodeIds: string[] = [];
let mockNodesMetadata: Record<string, any> = {};
let mockNotes: Record<string, any> = {};

const mockDispatch = vi.fn();
const mockAfterNavigate = vi.fn();

// ── React-Redux ──────────────────────────────────────────────────────────────
vi.mock('react-redux', () => ({
  useDispatch: () => mockDispatch,
  useSelector: vi.fn(() => undefined),
}));

// ── @xyflow/react ────────────────────────────────────────────────────────────
const mockSetViewport = vi.fn();
let capturedReactFlowProps: Record<string, any> = {};

vi.mock('@xyflow/react', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@xyflow/react')>()),
  ReactFlow: ({ children, ...props }: any) => {
    capturedReactFlowProps = props;
    return (
      <div data-testid="react-flow">
        {children}
        {!props.onlyRenderVisibleElements && <div data-testid="offscreen-node" />}
      </div>
    );
  },
  BezierEdge: () => <div />,
  SelectionMode: { Full: 'full' },
  useUpdateNodeInternals: () => vi.fn(),
}));

// ── @react-hookz/web ─────────────────────────────────────────────────────────
vi.mock('@react-hookz/web', () => ({
  useDebouncedEffect: vi.fn(),
  useResizeObserver: vi.fn(),
}));

// ── Selector mocks ───────────────────────────────────────────────────────────
vi.mock('../../core/state/workflow/workflowSelectors', () => ({
  useAllAgentIds: () => mockAllAgentIds,
  useDisconnectedNodes: () => mockDisconnectedNodes,
  useIsGraphEmpty: () => mockIsEmpty,
  useNodesMetadata: () => mockNodesMetadata,
}));

vi.mock('../../core/state/operation/operationSelector', () => ({
  useNodesInitialized: () => mockIsInitialized,
}));

vi.mock('../../core/state/panel/panelSlice', () => ({
  clearPanel: vi.fn(() => ({ type: 'panel/clearPanel' })),
  expandDiscoveryPanel: vi.fn((payload: any) => ({ type: 'panel/expandDiscoveryPanel', payload })),
  setNodeSelection: vi.fn((ids: string[]) => ({ type: 'panel/setNodeSelection', payload: ids })),
}));

vi.mock('../../core/state/panel/panelSelectors', () => ({
  useOperationPanelSelectedNodeIds: () => mockPanelSelectedNodeIds,
}));

vi.mock('../../core/actions/bjsworkflow/runafter', () => ({
  addOperationRunAfter: vi.fn((payload: any) => ({ type: 'addOperationRunAfter', payload })),
  removeOperationRunAfter: vi.fn((payload: any) => ({ type: 'removeOperationRunAfter', payload })),
}));

vi.mock('../../core/state/designerView/designerViewSelectors', () => ({
  useClampPan: () => mockClampPan,
  useIsA2AWorkflow: () => mockIsA2AWorkflow,
}));

vi.mock('../../core/state/designerView/designerViewSlice', () => ({
  setNodeContextMenuData: vi.fn((payload: any) => ({ type: 'designerView/setNodeContextMenuData', payload })),
}));

vi.mock('../../core/state/designerOptions/designerOptionsSelectors', () => ({
  useReadOnly: () => mockIsReadOnly,
  useIsDarkMode: () => mockIsDarkMode,
  useSharedNodeUi: () => mockSharedNodeUi,
}));

vi.mock('../../core/graphlayout', () => ({
  useLayout: () => [
    [
      { id: 'node1', position: { x: 100, y: 50 }, type: 'OPERATION_NODE', width: 200, data: { presentation: { shared: mockNode1Shared } } },
      { id: 'node2', position: { x: 100, y: 200 }, type: 'OPERATION_NODE', width: 200, data: { presentation: { shared: false } } },
    ],
    [{ id: 'edge1', source: 'node1', target: 'node2' }],
    [400, 600],
  ],
}));

vi.mock('../../core/utils/designerLayoutHelpers', () => ({
  DesignerFlowViewPadding: 100,
}));

vi.mock('../../core/state/notes/notesSelectors', () => ({
  useNotes: () => mockNotes,
}));

vi.mock('../../core/state/notes/notesSlice', () => ({
  updateNote: vi.fn((payload: any) => ({ type: 'notes/updateNote', payload })),
}));

vi.mock('../../core/state/workflow/workflowSlice', () => ({
  setFlowErrors: vi.fn((payload: any) => ({ type: 'workflow/setFlowErrors', payload })),
  updateNodeSizes: vi.fn((payload: any) => ({ type: 'workflow/updateNodeSizes', payload })),
}));

vi.mock('../../core', () => ({
  addOperation: vi.fn((payload: any) => ({ type: 'addOperation', payload })),
}));

vi.mock('../../core/actions/bjsworkflow/handoff', () => ({
  addAgentHandoff: vi.fn((payload: any) => ({ type: 'addAgentHandoff', payload })),
}));

// ── Mock sub-components ──────────────────────────────────────────────────────
vi.mock('../CustomNodes/GraphContainerNode', () => ({ default: () => <div /> }));
vi.mock('../CustomNodes/HiddenNode', () => ({ default: () => <div /> }));
vi.mock('../CustomNodes/OperationCardNode', () => ({ default: () => <div /> }));
vi.mock('../CustomNodes/PlaceholderNode', () => ({ default: () => <div /> }));
vi.mock('../CustomNodes/CollapsedCardNode', () => ({ default: () => <div /> }));
vi.mock('../CustomNodes/ScopeCardNode', () => ({ default: () => <div /> }));
vi.mock('../CustomNodes/SubgraphCardNode', () => ({ default: () => <div /> }));
vi.mock('../CustomNodes/NoteNode', () => ({ default: () => <div /> }));
vi.mock('../connections/edge', () => ({ default: () => <div /> }));
vi.mock('../connections/handoffEdge', () => ({ default: () => <div /> }));
vi.mock('../connections/hiddenEdge', () => ({ default: () => <div /> }));
vi.mock('../connections/draftEdge', () => ({ DraftEdge: () => <div /> }));
vi.mock('../NodeNavigation', () => ({
  NodeNavigation: ({ onNavigate }: { onNavigate: () => void }) => (
    <button
      type="button"
      data-testid="node-navigation"
      onClick={() => {
        onNavigate();
        mockAfterNavigate(screen.queryByTestId('offscreen-node') !== null);
      }}
    >
      Navigate
    </button>
  ),
}));

// ── Import under test (after mocks) ─────────────────────────────────────────
import DesignerReactFlow from '../DesignerReactFlow';

const createCanvasRef = () => ({
  current: {
    getBoundingClientRect: () => ({ width: 1000, height: 800 }),
    classList: { contains: () => false },
  },
});

describe('DesignerReactFlow (designer-v2)', () => {
  beforeEach(() => {
    mockIsInitialized = true;
    mockIsReadOnly = false;
    mockIsEmpty = false;
    mockClampPan = false;
    mockIsA2AWorkflow = false;
    mockIsDarkMode = false;
    mockSharedNodeUi = false;
    mockNode1Shared = false;
    mockDisconnectedNodes = [];
    mockAllAgentIds = [];
    mockPanelSelectedNodeIds = [];
    mockNodesMetadata = {};
    mockNotes = {};
    mockDispatch.mockClear();
    mockAfterNavigate.mockClear();
    capturedReactFlowProps = {};
  });

  it.each([false, true])('does not persist accepted shared sizes during a live shared=%s transition', (sharedOption) => {
    mockSharedNodeUi = sharedOption;
    mockNode1Shared = true;
    render(<DesignerReactFlow canvasRef={createCanvasRef()} />);
    mockDispatch.mockClear();
    act(() => {
      capturedReactFlowProps.onNodesChange([
        { id: 'node1', type: 'dimensions', dimensions: { width: 232, height: 74 } },
        { id: 'node2', type: 'dimensions', dimensions: { width: 200, height: 64 } },
      ]);
    });
    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'workflow/updateNodeSizes',
      payload: [{ id: 'node2', type: 'dimensions', dimensions: { width: 200, height: 64 } }],
    });
    expect(mockDispatch.mock.calls.filter(([action]) => action.type === 'workflow/updateNodeSizes')).toHaveLength(1);
  });

  // ──────────────────────────────────────────────────────────
  // MARK: Rendering
  // ──────────────────────────────────────────────────────────

  describe('Rendering', () => {
    it.each([false, true])('preserves the shared flow background without changing dark=%s or the legacy branch', (dark) => {
      mockIsDarkMode = dark;
      mockSharedNodeUi = true;
      const view = render(<DesignerReactFlow canvasRef={createCanvasRef()} />);
      expect(capturedReactFlowProps.style).toEqual({
        backgroundColor: tokens.colorNeutralBackground1,
      });
      expect(capturedReactFlowProps.colorMode).toBe(dark ? 'dark' : 'light');
      mockSharedNodeUi = false;
      view.rerender(<DesignerReactFlow canvasRef={createCanvasRef()} />);
      expect(capturedReactFlowProps.style).toBeUndefined();
      expect(capturedReactFlowProps.colorMode).toBe(dark ? 'dark' : 'light');
    });

    it('mounts offscreen DOM before the navigation callback returns, including the first command', () => {
      render(<DesignerReactFlow canvasRef={createCanvasRef()} />);
      expect(screen.getByTestId('react-flow')).toContainElement(screen.getByTestId('node-navigation'));
      expect(capturedReactFlowProps.onlyRenderVisibleElements).toBe(true);
      expect(screen.queryByTestId('offscreen-node')).not.toBeInTheDocument();
      fireEvent.click(screen.getByTestId('node-navigation'));
      expect(mockAfterNavigate).toHaveBeenNthCalledWith(1, true);
      expect(capturedReactFlowProps.onlyRenderVisibleElements).toBe(false);
      const offscreenNode = screen.getByTestId('offscreen-node');
      fireEvent.click(screen.getByTestId('node-navigation'));
      expect(mockAfterNavigate).toHaveBeenNthCalledWith(2, true);
      expect(mockAfterNavigate).toHaveBeenCalledTimes(2);
      expect(screen.getByTestId('offscreen-node')).toBe(offscreenNode);
    });

    it('should render ReactFlow with nodes', () => {
      render(<DesignerReactFlow canvasRef={createCanvasRef()} />);
      expect(screen.getByTestId('react-flow')).toBeInTheDocument();
    });

    it('should render children inside ReactFlow', () => {
      render(
        <DesignerReactFlow canvasRef={createCanvasRef()}>
          <div data-testid="child-component">Hello</div>
        </DesignerReactFlow>
      );
      expect(screen.getByTestId('child-component')).toBeInTheDocument();
    });

    it('should pass dark color mode when dark mode is enabled', () => {
      mockIsDarkMode = true;
      render(<DesignerReactFlow canvasRef={createCanvasRef()} />);
      expect(capturedReactFlowProps.colorMode).toBe('dark');
    });

    it('should pass light color mode when dark mode is disabled', () => {
      mockIsDarkMode = false;
      render(<DesignerReactFlow canvasRef={createCanvasRef()} />);
      expect(capturedReactFlowProps.colorMode).toBe('light');
    });
  });

  // ──────────────────────────────────────────────────────────
  // MARK: Empty State
  // ──────────────────────────────────────────────────────────

  describe('Empty State', () => {
    it('should show placeholder node when graph is empty and not read-only', () => {
      mockIsEmpty = true;
      mockIsReadOnly = false;
      render(<DesignerReactFlow canvasRef={createCanvasRef()} />);
      const nodes = capturedReactFlowProps.nodes;
      expect(nodes).toHaveLength(1);
      expect(nodes[0].id).toBe('newWorkflowTrigger');
      expect(nodes[0].type).toBe('PLACEHOLDER_NODE');
    });

    it('should show no nodes when graph is empty and read-only', () => {
      mockIsEmpty = true;
      mockIsReadOnly = true;
      render(<DesignerReactFlow canvasRef={createCanvasRef()} />);
      expect(capturedReactFlowProps.nodes).toHaveLength(0);
    });
  });

  // ──────────────────────────────────────────────────────────
  // MARK: ReactFlow Configuration
  // ──────────────────────────────────────────────────────────

  describe('ReactFlow Configuration', () => {
    it('should configure nodes as non-draggable', () => {
      render(<DesignerReactFlow canvasRef={createCanvasRef()} />);
      expect(capturedReactFlowProps.nodesDraggable).toBe(false);
    });

    it('should enable elements selectable', () => {
      render(<DesignerReactFlow canvasRef={createCanvasRef()} />);
      expect(capturedReactFlowProps.elementsSelectable).toBe(true);
    });

    it('should enable pan on scroll', () => {
      render(<DesignerReactFlow canvasRef={createCanvasRef()} />);
      expect(capturedReactFlowProps.panOnScroll).toBe(true);
    });

    it('should set minimum zoom to 0.05', () => {
      render(<DesignerReactFlow canvasRef={createCanvasRef()} />);
      expect(capturedReactFlowProps.minZoom).toBe(0.05);
    });

    it('should enable snap to grid with 20px grid', () => {
      render(<DesignerReactFlow canvasRef={createCanvasRef()} />);
      expect(capturedReactFlowProps.snapToGrid).toBe(true);
      expect(capturedReactFlowProps.snapGrid).toEqual([20, 20]);
    });

    it('should disable keyboard a11y', () => {
      render(<DesignerReactFlow canvasRef={createCanvasRef()} />);
      expect(capturedReactFlowProps.disableKeyboardA11y).toBe(true);
    });

    it('should hide attribution via pro options', () => {
      render(<DesignerReactFlow canvasRef={createCanvasRef()} />);
      expect(capturedReactFlowProps.proOptions).toEqual({
        account: 'paid-sponsor',
        hideAttribution: true,
      });
    });

    it('should set nodesConnectable to true', () => {
      render(<DesignerReactFlow canvasRef={createCanvasRef()} />);
      expect(capturedReactFlowProps.nodesConnectable).toBe(true);
    });

    it('should not pass translateExtent when clampPan is false', () => {
      mockClampPan = false;
      render(<DesignerReactFlow canvasRef={createCanvasRef()} />);
      expect(capturedReactFlowProps.translateExtent).toBeUndefined();
    });

    it('should pass translateExtent when clampPan is true', () => {
      mockClampPan = true;
      render(<DesignerReactFlow canvasRef={createCanvasRef()} />);
      expect(capturedReactFlowProps.translateExtent).toBeDefined();
      expect(capturedReactFlowProps.translateExtent).toHaveLength(2);
    });
  });

  // ──────────────────────────────────────────────────────────
  // MARK: Pane Click
  // ──────────────────────────────────────────────────────────

  describe('Pane Click', () => {
    it('should dispatch clearPanel when pane is clicked', () => {
      render(<DesignerReactFlow canvasRef={createCanvasRef()} />);
      capturedReactFlowProps.onPaneClick();
      expect(mockDispatch).toHaveBeenCalled();
    });
  });

  // ──────────────────────────────────────────────────────────
  // MARK: Connection Validation
  // ──────────────────────────────────────────────────────────

  describe('Connection Validation', () => {
    it('should reject connections without source', () => {
      render(<DesignerReactFlow canvasRef={createCanvasRef()} />);
      const result = capturedReactFlowProps.isValidConnection({ source: null, target: 'node2' });
      expect(result).toBe(false);
    });

    it('should reject connections without target', () => {
      render(<DesignerReactFlow canvasRef={createCanvasRef()} />);
      const result = capturedReactFlowProps.isValidConnection({ source: 'node1', target: null });
      expect(result).toBe(false);
    });

    it('should reject self-connections', () => {
      render(<DesignerReactFlow canvasRef={createCanvasRef()} />);
      const result = capturedReactFlowProps.isValidConnection({ source: 'node1', target: 'node1' });
      expect(result).toBe(false);
    });

    it('should reject duplicate edges', () => {
      render(<DesignerReactFlow canvasRef={createCanvasRef()} />);
      // edge1 already connects node1 → node2 in the layout mock
      const result = capturedReactFlowProps.isValidConnection({ source: 'node1', target: 'node2' });
      expect(result).toBe(false);
    });

    it('should accept valid connections', () => {
      render(<DesignerReactFlow canvasRef={createCanvasRef()} />);
      const result = capturedReactFlowProps.isValidConnection({ source: 'node2', target: 'node1' });
      expect(result).toBe(true);
    });
  });

  // ──────────────────────────────────────────────────────────
  // MARK: Context Menu
  // ──────────────────────────────────────────────────────────

  describe('Context Menu', () => {
    it('should dispatch setNodeContextMenuData on pane context menu', () => {
      render(<DesignerReactFlow canvasRef={createCanvasRef()} />);
      const fakeEvent = { preventDefault: vi.fn(), clientX: 100, clientY: 200 };
      capturedReactFlowProps.onPaneContextMenu(fakeEvent);
      expect(fakeEvent.preventDefault).toHaveBeenCalled();
      expect(mockDispatch).toHaveBeenCalled();
    });
  });

  // ──────────────────────────────────────────────────────────
  // MARK: Disconnected Nodes
  // ──────────────────────────────────────────────────────────

  describe('Disconnected Nodes', () => {
    it('should dispatch flow errors for disconnected nodes', () => {
      mockDisconnectedNodes = ['orphanNode'];
      render(<DesignerReactFlow canvasRef={createCanvasRef()} />);
      expect(mockDispatch).toHaveBeenCalled();
    });

    it('should dispatch empty flow errors when no disconnected nodes', () => {
      mockDisconnectedNodes = [];
      render(<DesignerReactFlow canvasRef={createCanvasRef()} />);
      expect(mockDispatch).toHaveBeenCalled();
    });
  });

  // ──────────────────────────────────────────────────────────
  // MARK: Node Selection Stamping
  // ──────────────────────────────────────────────────────────

  describe('Node Selection', () => {
    it('should stamp selected=true on nodes in panelSelectedNodeIds', () => {
      mockPanelSelectedNodeIds = ['node1'];
      render(<DesignerReactFlow canvasRef={createCanvasRef()} />);
      const selectedNode = capturedReactFlowProps.nodes.find((n: any) => n.id === 'node1');
      expect(selectedNode.selected).toBe(true);
    });

    it('should not stamp selected=true on nodes not in panelSelectedNodeIds', () => {
      mockPanelSelectedNodeIds = ['node1'];
      render(<DesignerReactFlow canvasRef={createCanvasRef()} />);
      const unselectedNode = capturedReactFlowProps.nodes.find((n: any) => n.id === 'node2');
      expect(unselectedNode.selected).not.toBe(true);
    });
  });

  // ──────────────────────────────────────────────────────────
  // MARK: Notes
  // ──────────────────────────────────────────────────────────

  describe('Notes', () => {
    it('should include note nodes in the allNodes array', () => {
      mockNotes = {
        'note-1': {
          metadata: { position: { x: 50, y: 50 }, width: 200, height: 100 },
          content: 'Test note',
        },
      };
      render(<DesignerReactFlow canvasRef={createCanvasRef()} />);
      const noteNode = capturedReactFlowProps.nodes.find((n: any) => n.id === 'note-1');
      expect(noteNode).toBeDefined();
      expect(noteNode.type).toBe('NOTE_NODE');
    });

    it('should make notes non-draggable in read-only mode', () => {
      mockIsReadOnly = true;
      mockNotes = {
        'note-1': { metadata: { position: { x: 0, y: 0 } }, content: 'Test' },
      };
      render(<DesignerReactFlow canvasRef={createCanvasRef()} />);
      const noteNode = capturedReactFlowProps.nodes.find((n: any) => n.id === 'note-1');
      expect(noteNode.draggable).toBe(false);
    });

    it('should make notes draggable when not read-only', () => {
      mockIsReadOnly = false;
      mockNotes = {
        'note-1': { metadata: { position: { x: 0, y: 0 } }, content: 'Test' },
      };
      render(<DesignerReactFlow canvasRef={createCanvasRef()} />);
      const noteNode = capturedReactFlowProps.nodes.find((n: any) => n.id === 'note-1');
      expect(noteNode.draggable).toBe(true);
    });
  });

  // ──────────────────────────────────────────────────────────
  // MARK: Selection Key
  // ──────────────────────────────────────────────────────────

  describe('Selection Key', () => {
    it('should default panOnDrag to true', () => {
      render(<DesignerReactFlow canvasRef={createCanvasRef()} />);
      expect(capturedReactFlowProps.panOnDrag).toBe(true);
      expect(capturedReactFlowProps.selectionOnDrag).toBe(false);
    });
  });

  // ──────────────────────────────────────────────────────────
  // MARK: Visible Elements
  // ──────────────────────────────────────────────────────────

  describe('Visible Elements', () => {
    it('should enable onlyRenderVisibleElements by default', () => {
      render(<DesignerReactFlow canvasRef={createCanvasRef()} />);
      expect(capturedReactFlowProps.onlyRenderVisibleElements).toBe(true);
    });
  });

  describe('host interaction callbacks', () => {
    it.each(['Shift', 'Control'])('uses %s for marquee selection and clears a held modifier when focus is lost', (key) => {
      render(<DesignerReactFlow canvasRef={createCanvasRef()} />);
      fireEvent.keyDown(window, { key });
      expect(capturedReactFlowProps.selectionOnDrag).toBe(true);
      expect(capturedReactFlowProps.panOnDrag).toBe(false);
      fireEvent.keyUp(window, { key });
      expect(capturedReactFlowProps.selectionOnDrag).toBe(false);
      fireEvent.keyDown(window, { key });
      fireEvent.blur(window);
      expect(capturedReactFlowProps.panOnDrag).toBe(true);
    });

    it('mounts offscreen nodes after repeated actual Tab navigation', () => {
      render(<DesignerReactFlow canvasRef={createCanvasRef()} />);
      fireEvent.keyDown(document, { key: 'Tab' });
      fireEvent.keyDown(document, { key: 'Tab' });
      fireEvent.keyDown(document, { key: 'Tab' });
      fireEvent.keyDown(document, { key: 'Tab' });
      expect(capturedReactFlowProps.onlyRenderVisibleElements).toBe(true);
      fireEvent.keyDown(document, { key: 'Tab' });
      expect(capturedReactFlowProps.onlyRenderVisibleElements).toBe(false);
    });

    it.each([false, true])('fits accepted initial shared=%s geometry exactly once through the public flow API', (shared) => {
      const callbacks: FrameRequestCallback[] = [];
      vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
        callbacks.push(callback);
        return callbacks.length;
      });
      mockNode1Shared = shared;
      const flow = { setViewport: vi.fn(), getNodes: () => [], getNodesBounds: () => ({ x: 0, y: 0, width: 400, height: 600 }) };
      const canvas = document.createElement('div');
      canvas.getBoundingClientRect = () => new DOMRect(0, 0, 1000, 800);
      render(<DesignerReactFlow canvasRef={{ current: canvas }} />);
      act(() => capturedReactFlowProps.onInit(flow));
      act(() => callbacks[0](0));
      expect(flow.setViewport).toHaveBeenCalledOnce();
      if (shared) {
        const expected = getViewportForBounds({ x: 0, y: 0, width: 400, height: 600 }, 1000, 800, DESIGNER_MIN_ZOOM, 2, 0.1);
        expect(Object.values(expected).every(Number.isFinite)).toBe(true);
        expect(expected).not.toEqual({ x: 300, y: 70, zoom: 1 });
        expect(flow.setViewport).toHaveBeenCalledWith(expected);
      } else {
        expect(flow.setViewport).toHaveBeenCalledWith({ x: 300, y: 70, zoom: 1 });
      }
    });

    it('commits normalized action/scope selections after the marquee, excluding containers and notes', () => {
      render(<DesignerReactFlow canvasRef={createCanvasRef()} />);
      mockDispatch.mockClear();
      act(() => capturedReactFlowProps.onSelectionStart());
      act(() =>
        capturedReactFlowProps.onSelectionChange({
          nodes: [
            { id: 'node1', type: 'OPERATION_NODE' },
            { id: 'Scope-#scope', type: 'SCOPE_CARD_NODE' },
            { id: 'Scope', type: 'GRAPH_NODE' },
            { id: 'note', type: 'NOTE_NODE' },
          ],
        })
      );
      expect(mockDispatch).not.toHaveBeenCalled();
      act(() => capturedReactFlowProps.onSelectionEnd());
      expect(mockDispatch).toHaveBeenCalledWith({ type: 'panel/setNodeSelection', payload: ['node1', 'Scope'] });
      mockDispatch.mockClear();
      act(() => capturedReactFlowProps.onSelectionChange({ nodes: [{ id: 'note', type: 'NOTE_NODE' }] }));
      expect(mockDispatch).not.toHaveBeenCalled();
    });

    it.each([
      { prior: ['node1'], selected: ['node1'], expected: [] },
      { prior: ['node1'], selected: ['node2'], expected: ['node1', 'node2'] },
      { prior: ['node1'], selected: [], expected: [] },
    ])('toggles additive marquee prior=$prior selected=$selected', ({ prior, selected, expected }) => {
      mockPanelSelectedNodeIds = prior;
      render(<DesignerReactFlow canvasRef={createCanvasRef()} />);
      mockDispatch.mockClear();
      act(() => capturedReactFlowProps.onSelectionStart());
      act(() => capturedReactFlowProps.onSelectionChange({ nodes: selected.map((id) => ({ id, type: 'OPERATION_NODE' })) }));
      act(() => capturedReactFlowProps.onSelectionEnd());
      expect(mockDispatch).toHaveBeenCalledWith(
        expected.length ? { type: 'panel/setNodeSelection', payload: expected } : { type: 'panel/clearPanel' }
      );
    });

    it('accepts a deferred final selection after quick release but does not dispatch the same set twice', () => {
      render(<DesignerReactFlow canvasRef={createCanvasRef()} />);
      act(() => capturedReactFlowProps.onSelectionStart());
      act(() => capturedReactFlowProps.onSelectionEnd());
      mockDispatch.mockClear();
      const selection = { nodes: [{ id: 'node2', type: 'OPERATION_NODE' }] };
      act(() => capturedReactFlowProps.onSelectionChange(selection));
      act(() => capturedReactFlowProps.onSelectionChange(selection));
      expect(mockDispatch).toHaveBeenCalledTimes(1);
      expect(mockDispatch).toHaveBeenCalledWith({ type: 'panel/setNodeSelection', payload: ['node2'] });
    });

    it.each([false, true])('routes a valid connection through existing a2a=%s commands', (a2a) => {
      mockIsA2AWorkflow = a2a;
      mockAllAgentIds = ['node1', 'node2'];
      render(<DesignerReactFlow canvasRef={createCanvasRef()} />);
      mockDispatch.mockClear();
      act(() => capturedReactFlowProps.onConnectStart());
      act(() =>
        capturedReactFlowProps.onConnectEnd(
          { target: document.body },
          {
            isValid: true,
            fromNode: { id: 'node1-#scope' },
            toNode: { id: 'node2-#scope' },
          }
        )
      );
      expect(mockDispatch).toHaveBeenCalledWith(
        a2a
          ? { type: 'addAgentHandoff', payload: { sourceId: 'node1', targetId: 'node2' } }
          : { type: 'addOperationRunAfter', payload: { parentOperationId: 'node1', childOperationId: 'node2' } }
      );
    });

    it.each([false, true])('offers the correct a2a=%s insertion when a connection is dropped onto the pane', (a2a) => {
      mockIsA2AWorkflow = a2a;
      mockAllAgentIds = ['node1'];
      mockNodesMetadata = { node1: { graphId: 'root' } };
      render(<DesignerReactFlow canvasRef={createCanvasRef()} />);
      mockDispatch.mockClear();
      const pane = document.createElement('div');
      pane.className = 'react-flow__pane';
      act(() => capturedReactFlowProps.onConnectEnd({ target: pane }, { isValid: false, fromNode: { id: 'node1' } }));
      if (a2a) {
        const inserted = mockDispatch.mock.calls.find(([action]) => action.type === 'addOperation')![0].payload.nodeId;
        expect(inserted).toMatch(/^Agent_/);
        expect(mockDispatch).toHaveBeenCalledWith({
          type: 'removeOperationRunAfter',
          payload: { parentOperationId: 'node1', childOperationId: inserted },
        });
        expect(mockDispatch).toHaveBeenCalledWith({ type: 'addAgentHandoff', payload: { sourceId: 'node1', targetId: inserted } });
      } else {
        expect(mockDispatch).toHaveBeenCalledWith({
          type: 'panel/expandDiscoveryPanel',
          payload: expect.objectContaining({
            relationshipIds: { graphId: 'root', parentId: 'node1', childId: undefined },
            isParallelBranch: true,
          }),
        });
      }
      mockDispatch.mockClear();
      act(() => capturedReactFlowProps.onPaneClick());
      expect(mockDispatch).not.toHaveBeenCalled();
      act(() => capturedReactFlowProps.onPaneClick());
      expect(mockDispatch).toHaveBeenCalledWith({ type: 'panel/clearPanel' });
    });

    it('persists note movement and dimensions without accepting invalid values or moving operation nodes', () => {
      mockNotes = { note: { content: 'authored note', metadata: { position: { x: 1, y: 2 } } } };
      render(<DesignerReactFlow canvasRef={createCanvasRef()} />);
      mockDispatch.mockClear();
      act(() =>
        capturedReactFlowProps.onNodesChange([
          { id: 'note', type: 'position', position: { x: 30, y: 40 } },
          { id: 'node1', type: 'position', position: { x: 90, y: 80 } },
          { id: 'bad', type: 'position', position: { x: Number.NaN, y: 0 } },
          { id: 'note', type: 'dimensions', dimensions: { width: 240, height: 120 } },
        ])
      );
      expect(capturedReactFlowProps.nodes.find(({ id }: { id: string }) => id === 'note').position).toEqual({ x: 30, y: 40 });
      expect(capturedReactFlowProps.nodes.find(({ id }: { id: string }) => id === 'node1').position).toEqual({ x: 100, y: 50 });
      expect(mockDispatch).toHaveBeenCalledWith({
        type: 'notes/updateNote',
        payload: { id: 'note', note: { metadata: { width: 240, height: 120 } } },
      });
      act(() => vi.mocked(useDebouncedEffect).mock.calls.at(-1)![0]());
      expect(mockDispatch).toHaveBeenCalledWith({
        type: 'notes/updateNote',
        payload: { id: 'note', note: { metadata: { position: { x: 30, y: 40 } } } },
      });
    });
  });
});
