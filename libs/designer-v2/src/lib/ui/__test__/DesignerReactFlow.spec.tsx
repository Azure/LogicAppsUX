import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';

// ── Mock state toggles ──────────────────────────────────────────────────────
let mockIsInitialized = true;
let mockIsReadOnly = false;
let mockIsEmpty = false;
let mockClampPan = false;
let mockIsA2AWorkflow = false;
let mockIsDarkMode = false;
let mockDisconnectedNodes: string[] = [];
let mockAllAgentIds: string[] = [];
let mockPanelSelectedNodeIds: string[] = [];
let mockNodesMetadata: Record<string, any> = {};
let mockNotes: Record<string, any> = {};

const mockDispatch = vi.fn();

// ── React-Redux ──────────────────────────────────────────────────────────────
vi.mock('react-redux', () => ({
  useDispatch: () => mockDispatch,
  useSelector: vi.fn(() => undefined),
}));

// ── @xyflow/react ────────────────────────────────────────────────────────────
const mockSetViewport = vi.fn();
let capturedReactFlowProps: Record<string, any> = {};

vi.mock('@xyflow/react', () => ({
  ReactFlow: ({ children, ...props }: any) => {
    capturedReactFlowProps = props;
    return <div data-testid="react-flow">{children}</div>;
  },
  BezierEdge: () => <div />,
  SelectionMode: { Full: 'full' },
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
}));

vi.mock('../../core/graphlayout', () => ({
  useLayout: () => [
    [
      { id: 'node1', position: { x: 100, y: 50 }, type: 'OPERATION_NODE', width: 200 },
      { id: 'node2', position: { x: 100, y: 200 }, type: 'OPERATION_NODE', width: 200 },
    ],
    [{ id: 'edge1', source: 'node1', target: 'node2' }],
    [400, 600],
  ],
}));

vi.mock('../../core/utils/graph', () => ({
  DEFAULT_NODE_SIZE: { width: 200, height: 40 },
  DEFAULT_NOTE_SIZE: { width: 250, height: 100 },
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
    mockDisconnectedNodes = [];
    mockAllAgentIds = [];
    mockPanelSelectedNodeIds = [];
    mockNodesMetadata = {};
    mockNotes = {};
    mockDispatch.mockClear();
    capturedReactFlowProps = {};
  });

  // ──────────────────────────────────────────────────────────
  // MARK: Rendering
  // ──────────────────────────────────────────────────────────

  describe('Rendering', () => {
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
});
