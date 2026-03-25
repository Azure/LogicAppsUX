import React from 'react';
import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import type { NodeProps } from '@xyflow/react';
import { SUBGRAPH_TYPES } from '@microsoft/logic-apps-shared';

const mockDispatch = vi.fn();

vi.mock('react-redux', () => ({
  useDispatch: () => mockDispatch,
  useSelector: vi.fn(),
}));

// react-intl's useIntl is already mocked by test-setup.ts via mockUseIntl()

// Mock all selector hooks
vi.mock('../../../core', () => ({
  useOperationInfo: vi.fn().mockReturnValue({ type: 'Action', connectorId: 'test', operationId: 'test' }),
}));

vi.mock('../../../core/actions/bjsworkflow/add', () => ({
  initializeSubgraphFromManifest: vi.fn(),
}));

vi.mock('../../../core/queries/operation', () => ({
  getOperationManifest: vi.fn().mockResolvedValue({ properties: {} }),
}));

const mockUseMonitoringView = vi.fn().mockReturnValue(false);
const mockUseReadOnly = vi.fn().mockReturnValue(false);
const mockUseMcpClientToolEnabled = vi.fn().mockReturnValue(false);

vi.mock('../../../core/state/designerOptions/designerOptionsSelectors', () => ({
  useMonitoringView: () => mockUseMonitoringView(),
  useReadOnly: () => mockUseReadOnly(),
  useMcpClientToolEnabled: () => mockUseMcpClientToolEnabled(),
}));

vi.mock('../../../core/state/designerView/designerViewSlice', () => ({
  setNodeContextMenuData: vi.fn((payload) => ({ type: 'designerView/setNodeContextMenuData', payload })),
  setShowDeleteModalNodeId: vi.fn((payload) => ({ type: 'designerView/setShowDeleteModalNodeId', payload })),
  setEdgeContextMenuData: vi.fn((payload) => ({ type: 'designerView/setEdgeContextMenuData', payload })),
}));

vi.mock('../../../core/state/operation/operationSelector', () => ({
  useIconUri: vi.fn().mockReturnValue('test-icon-uri'),
  useParameterValidationErrors: vi.fn().mockReturnValue([]),
}));

vi.mock('../../../core/state/panel/panelSelectors', () => ({
  useIsNodePinnedToOperationPanel: vi.fn().mockReturnValue(false),
  useIsNodeSelectedInOperationPanel: vi.fn().mockReturnValue(false),
}));

vi.mock('../../../core/state/panel/panelSlice', () => ({
  changePanelNode: vi.fn((payload) => ({ type: 'panel/changePanelNode', payload })),
  expandDiscoveryPanel: vi.fn((payload) => ({ type: 'panel/expandDiscoveryPanel', payload })),
  addAgentToolMetadata: vi.fn((payload) => ({ type: 'panel/addAgentToolMetadata', payload })),
}));

const mockUseActionMetadata = vi.fn().mockReturnValue({ type: 'Scope', runAfter: {} });
const mockUseIsGraphCollapsed = vi.fn().mockReturnValue(false);
const mockUseIsLeafNode = vi.fn().mockReturnValue(false);
const mockUseNewAdditiveSubgraphId = vi.fn().mockReturnValue('newCase-1');
const mockUseNodeDisplayName = vi.fn().mockReturnValue('Test Subgraph');
const mockUseNodeMetadata = vi.fn().mockReturnValue({ graphId: 'graph1', subgraphType: SUBGRAPH_TYPES.SWITCH_CASE, actionCount: 2 });
const mockUseParentNodeId = vi.fn().mockReturnValue(undefined);
const mockUseRunData = vi.fn().mockReturnValue(undefined);
const mockUseRunIndex = vi.fn().mockReturnValue(0);
const mockUseRunInstance = vi.fn().mockReturnValue(undefined);
const mockUseWorkflowNode = vi.fn().mockReturnValue({ id: 'graph1', children: [] });

vi.mock('../../../core/state/workflow/workflowSelectors', () => ({
  useActionMetadata: (...args: any[]) => mockUseActionMetadata(...args),
  useIsGraphCollapsed: (...args: any[]) => mockUseIsGraphCollapsed(...args),
  useIsLeafNode: (...args: any[]) => mockUseIsLeafNode(...args),
  useNewAdditiveSubgraphId: (...args: any[]) => mockUseNewAdditiveSubgraphId(...args),
  useNodeDisplayName: (...args: any[]) => mockUseNodeDisplayName(...args),
  useNodeMetadata: (...args: any[]) => mockUseNodeMetadata(...args),
  useParentNodeId: (...args: any[]) => mockUseParentNodeId(...args),
  useRunData: (...args: any[]) => mockUseRunData(...args),
  useRunIndex: (...args: any[]) => mockUseRunIndex(...args),
  useRunInstance: (...args: any[]) => mockUseRunInstance(...args),
  useWorkflowNode: (...args: any[]) => mockUseWorkflowNode(...args),
}));

vi.mock('../../../core/state/workflow/workflowSlice', () => ({
  addSwitchCase: vi.fn((payload) => ({ type: 'workflow/addSwitchCase', payload })),
  setFocusNode: vi.fn((payload) => ({ type: 'workflow/setFocusNode', payload })),
  toggleCollapsedGraphId: vi.fn((payload) => ({ type: 'workflow/toggleCollapsedGraphId', payload })),
}));

vi.mock('../../../core/actions/bjsworkflow/monitoring', () => ({
  fetchBuiltInToolRunData: vi.fn((payload) => ({ type: 'fetchBuiltInToolRunData', payload })),
}));

vi.mock('../../common/LoopsPager/helper', () => ({
  getScopeRepetitionName: vi.fn().mockReturnValue('000000'),
}));

vi.mock('../../common/LoopsPager/LoopsPager', () => ({
  LoopsPager: ({ scopeId }: any) => <div data-testid={`loops-pager-${scopeId}`}>LoopsPager</div>,
}));

vi.mock('../../connections/dropzone', () => ({
  DropZone: ({ graphId }: any) => <div data-testid={`dropzone-${graphId}`}>DropZone</div>,
}));

vi.mock('@microsoft/logic-apps-shared', async (importOriginal) => ({
  ...((await importOriginal()) as object),
  useNodeIndex: () => 1,
}));

vi.mock(import('@xyflow/react'), async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    Handle: (({ children, ...props }) => <div {...props}>Handle</div>) as any,
  };
});

vi.mock('../handles/DefaultHandle', () => ({
  DefaultHandle: ({ type }: { type: string }) => <div data-testid={`handle-${type}`} />,
}));

// Mock SubgraphCard from designer-ui
vi.mock(import('@microsoft/designer-ui'), async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    SubgraphCard: ({ id, title, subgraphType, onClick, onContextMenu, onDeleteClick, errorMessage, collapsed, handleCollapse }: any) => (
      <div
        data-testid={`subgraph-card-${id}`}
        data-subgraph-type={subgraphType}
        onClick={() => onClick?.(id, {} as DOMRect)}
        onContextMenu={(e) => onContextMenu?.(e)}
      >
        <span>{title}</span>
        {errorMessage && <span data-testid="error-message">{errorMessage}</span>}
        {collapsed && <span data-testid="collapsed-indicator">collapsed</span>}
        {onDeleteClick && (
          <button data-testid="delete-btn" onClick={onDeleteClick}>
            Delete
          </button>
        )}
        {handleCollapse && (
          <button data-testid="collapse-btn" onClick={() => handleCollapse()}>
            Collapse
          </button>
        )}
      </div>
    ),
  };
});

import SubgraphCardNode from '../SubgraphCardNode';

describe('SubgraphCardNode', () => {
  const defaultProps = { id: 'testNode-#subgraph' } as NodeProps;

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseNodeMetadata.mockReturnValue({ graphId: 'graph1', subgraphType: SUBGRAPH_TYPES.SWITCH_CASE, actionCount: 2 });
    mockUseActionMetadata.mockReturnValue({ type: 'Scope', runAfter: {} });
    mockUseIsLeafNode.mockReturnValue(false);
    mockUseIsGraphCollapsed.mockReturnValue(false);
    mockUseMonitoringView.mockReturnValue(false);
    mockUseReadOnly.mockReturnValue(false);
    mockUseMcpClientToolEnabled.mockReturnValue(false);
    mockUseRunData.mockReturnValue(undefined);
    mockUseNodeDisplayName.mockReturnValue('Test Subgraph');
    mockUseNewAdditiveSubgraphId.mockReturnValue('newCase-1');
    mockUseParentNodeId.mockReturnValue(undefined);
    mockUseRunIndex.mockReturnValue(0);
    mockUseRunInstance.mockReturnValue(undefined);
    mockUseWorkflowNode.mockReturnValue({ id: 'graph1', children: [] });
  });

  it('should render without crashing', () => {
    const { container } = render(<SubgraphCardNode {...defaultProps} />);
    expect(container).toBeTruthy();
  });

  it('should render SubgraphCard with correct title', () => {
    render(<SubgraphCardNode {...defaultProps} />);
    expect(screen.getByText('Test Subgraph')).toBeInTheDocument();
  });

  it('should render handles', () => {
    render(<SubgraphCardNode {...defaultProps} />);
    expect(screen.getByTestId('handle-target')).toBeInTheDocument();
    expect(screen.getByTestId('handle-source')).toBeInTheDocument();
  });

  it('should dispatch context menu data on right-click', () => {
    render(<SubgraphCardNode {...defaultProps} />);
    const card = screen.getByTestId('subgraph-card-testNode');
    fireEvent.contextMenu(card, { clientX: 100, clientY: 200 });

    expect(mockDispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'designerView/setNodeContextMenuData',
        payload: {
          nodeId: 'testNode',
          location: { x: 100, y: 200 },
        },
      })
    );
  });

  it('should dispatch setShowDeleteModalNodeId on delete click', () => {
    render(<SubgraphCardNode {...defaultProps} />);
    const deleteBtn = screen.getByTestId('delete-btn');
    fireEvent.click(deleteBtn);

    expect(mockDispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'designerView/setShowDeleteModalNodeId',
      })
    );
  });

  it('should dispatch toggleCollapsedGraphId on collapse click', () => {
    render(<SubgraphCardNode {...defaultProps} />);
    const collapseBtn = screen.getByTestId('collapse-btn');
    fireEvent.click(collapseBtn);

    expect(mockDispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'workflow/toggleCollapsedGraphId',
      })
    );
  });

  it('should show collapsed text when graph is collapsed', () => {
    mockUseIsGraphCollapsed.mockReturnValue(true);
    render(<SubgraphCardNode {...defaultProps} />);
    expect(screen.getByTestId('collapsed-indicator')).toBeInTheDocument();
  });

  it('should show DropZone for leaf nodes when not collapsed and not add-case', () => {
    mockUseIsLeafNode.mockReturnValue(true);
    mockUseIsGraphCollapsed.mockReturnValue(false);
    // Use a non-add-case subgraph type
    mockUseNodeMetadata.mockReturnValue({ graphId: 'graph1', subgraphType: SUBGRAPH_TYPES.SWITCH_CASE, actionCount: 0 });

    render(<SubgraphCardNode {...defaultProps} />);
    expect(screen.getByTestId('dropzone-testNode')).toBeInTheDocument();
  });

  it('should not show DropZone when not a leaf node', () => {
    mockUseIsLeafNode.mockReturnValue(false);
    render(<SubgraphCardNode {...defaultProps} />);
    expect(screen.queryByTestId('dropzone-testNode')).not.toBeInTheDocument();
  });

  it('should show error message when parameter validation errors exist', async () => {
    const operationSelector = await import('../../../core/state/operation/operationSelector');
    (operationSelector.useParameterValidationErrors as Mock).mockReturnValue([{ error: 'test' }]);

    render(<SubgraphCardNode {...defaultProps} />);
    expect(screen.getByTestId('error-message')).toBeInTheDocument();
  });

  it('should show LoopsPager in monitoring view when parent is agent with repetitions', () => {
    mockUseMonitoringView.mockReturnValue(true);
    mockUseParentNodeId.mockReturnValue('parentAgent');
    mockUseActionMetadata.mockImplementation((id: string) => {
      if (id === 'parentAgent') {
        return { type: 'Agent', runAfter: {} };
      }
      return { type: 'Scope', runAfter: {} };
    });
    mockUseNodeMetadata.mockReturnValue({
      graphId: 'graph1',
      subgraphType: SUBGRAPH_TYPES.AGENT_CONDITION,
      actionCount: 1,
      runData: { repetitionCount: 3 },
    });

    render(<SubgraphCardNode {...defaultProps} />);
    expect(screen.getByTestId('loops-pager-testNode')).toBeInTheDocument();
  });

  it('should not render SubgraphCard when no subgraphType in metadata', () => {
    mockUseNodeMetadata.mockReturnValue({ graphId: 'graph1', actionCount: 0 });

    render(<SubgraphCardNode {...defaultProps} />);
    expect(screen.queryByTestId('subgraph-card-testNode')).not.toBeInTheDocument();
  });

  it('should show "No actions" text for read-only leaf nodes', () => {
    mockUseIsLeafNode.mockReturnValue(true);
    mockUseReadOnly.mockReturnValue(true);

    render(<SubgraphCardNode {...defaultProps} />);
    expect(screen.getByText('No actions')).toBeInTheDocument();
  });
});
