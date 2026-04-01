import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import type { NodeProps } from '@xyflow/react';

// react-intl's useIntl is already mocked by test-setup.ts via mockUseIntl()

const mockDispatch = vi.fn();

vi.mock('react-redux', () => ({
  useDispatch: () => mockDispatch,
  useSelector: vi.fn(),
}));

vi.mock('react-dnd', () => ({
  useDrag: () => [{ isDragging: false }, vi.fn(), vi.fn()],
  useDrop: () => [{ isOver: false }, vi.fn()],
}));

vi.mock('react-hotkeys-hook', () => ({
  useHotkeys: () => ({ current: null }),
}));

vi.mock('../../../core/actions/bjsworkflow/copypaste', () => ({
  copyScopeOperation: vi.fn((payload) => ({ type: 'copyScopeOperation', payload })),
}));

vi.mock('../../../core/actions/bjsworkflow/move', () => ({
  moveOperation: vi.fn((payload) => ({ type: 'moveOperation', payload })),
}));

vi.mock('../../../core/queries/runs', () => ({
  useNodeRepetition: () => ({ isFetching: false, data: undefined }),
  useAgentRepetition: () => ({ isFetching: false, data: undefined }),
  useAgentActionsRepetition: () => ({ isFetching: false, data: undefined }),
}));

const mockUseMonitoringView = vi.fn().mockReturnValue(false);
const mockUseReadOnly = vi.fn().mockReturnValue(false);

vi.mock('../../../core/state/designerOptions/designerOptionsSelectors', () => ({
  useMonitoringView: () => mockUseMonitoringView(),
  useReadOnly: () => mockUseReadOnly(),
}));

vi.mock('../../../core/state/designerView/designerViewSlice', () => ({
  setNodeContextMenuData: vi.fn((payload) => ({ type: 'designerView/setNodeContextMenuData', payload })),
  setShowDeleteModalNodeId: vi.fn((payload) => ({ type: 'designerView/setShowDeleteModalNodeId', payload })),
}));

const mockUseIsA2AWorkflow = vi.fn().mockReturnValue(false);

vi.mock('../../../core/state/designerView/designerViewSelectors', () => ({
  useIsA2AWorkflow: () => mockUseIsA2AWorkflow(),
}));

vi.mock('../../../core/state/operation/operationMetadataSlice', () => ({
  ErrorLevel: { DynamicOutputs: 'DynamicOutputs', Connection: 'Connection' },
}));

const mockUseBrandColor = vi.fn().mockReturnValue('#4B53BC');
const mockUseIconUri = vi.fn().mockReturnValue('test-icon-uri');
const mockUseOperationErrorInfo = vi.fn().mockReturnValue(undefined);
const mockUseParameterValidationErrors = vi.fn().mockReturnValue([]);
const mockUseTokenDependencies = vi.fn().mockReturnValue({ dependencies: {}, loopSources: {} });

vi.mock('../../../core/state/operation/operationSelector', () => ({
  useBrandColor: (...args: any[]) => mockUseBrandColor(...args),
  useIconUri: (...args: any[]) => mockUseIconUri(...args),
  useOperationErrorInfo: (...args: any[]) => mockUseOperationErrorInfo(...args),
  useParameterValidationErrors: (...args: any[]) => mockUseParameterValidationErrors(...args),
  useTokenDependencies: (...args: any[]) => mockUseTokenDependencies(...args),
}));

const mockUseIsNodeSelectedInOperationPanel = vi.fn().mockReturnValue(false);

vi.mock('../../../core/state/panel/panelSelectors', () => ({
  useIsNodeSelectedInOperationPanel: (...args: any[]) => mockUseIsNodeSelectedInOperationPanel(...args),
}));

vi.mock('../../../core/state/panel/panelSlice', () => ({
  changePanelNode: vi.fn((payload) => ({ type: 'panel/changePanelNode', payload })),
}));

const mockUseAllOperations = vi.fn().mockReturnValue({});
const mockUseConnectorName = vi.fn().mockReturnValue({ result: 'Test Connector' });
const mockUseOperationInfo = vi.fn().mockReturnValue({ type: 'Scope', connectorId: 'test', operationId: 'test' });
const mockUseOperationQuery = vi.fn().mockReturnValue({ isFetching: false, isError: false, isLoading: false });

vi.mock('../../../core/state/selectors/actionMetadataSelector', () => ({
  useAllOperations: () => mockUseAllOperations(),
  useConnectorName: (...args: any[]) => mockUseConnectorName(...args),
  useOperationInfo: (...args: any[]) => mockUseOperationInfo(...args),
  useOperationQuery: (...args: any[]) => mockUseOperationQuery(...args),
}));

const mockUseSettingValidationErrors = vi.fn().mockReturnValue([]);

vi.mock('../../../core/state/setting/settingSelector', () => ({
  useSettingValidationErrors: (...args: any[]) => mockUseSettingValidationErrors(...args),
}));

const mockUseActionMetadata = vi.fn().mockReturnValue({ type: 'Scope', runAfter: {} });
const mockUseIsGraphCollapsed = vi.fn().mockReturnValue(false);
const mockUseIsLeafNode = vi.fn().mockReturnValue(false);
const mockUseNodeDisplayName = vi.fn().mockReturnValue('Test Scope');
const mockUseNodeMetadata = vi.fn().mockReturnValue({ graphId: 'root', actionCount: 2 });
const mockUseParentNodeId = vi.fn().mockReturnValue(undefined);
const mockUseRunData = vi.fn().mockReturnValue(undefined);
const mockUseRunIndex = vi.fn().mockReturnValue(0);
const mockUseRunInstance = vi.fn().mockReturnValue(undefined);
const mockUseParentRunIndex = vi.fn().mockReturnValue(undefined);
const mockUseNodesMetadata = vi.fn().mockReturnValue({});
const mockUseShouldNodeFocus = vi.fn().mockReturnValue(false);
const mockUseIsActionInSelectedTimelineRepetition = vi.fn().mockReturnValue(false);
const mockUseHandoffActionsForAgent = vi.fn().mockReturnValue([]);
const mockUseFlowErrorsForNode = vi.fn().mockReturnValue([]);

vi.mock('../../../core/state/workflow/workflowSelectors', () => ({
  useActionMetadata: (...args: any[]) => mockUseActionMetadata(...args),
  useIsGraphCollapsed: (...args: any[]) => mockUseIsGraphCollapsed(...args),
  useIsLeafNode: (...args: any[]) => mockUseIsLeafNode(...args),
  useNodeDisplayName: (...args: any[]) => mockUseNodeDisplayName(...args),
  useNodeMetadata: (...args: any[]) => mockUseNodeMetadata(...args),
  useParentNodeId: (...args: any[]) => mockUseParentNodeId(...args),
  useRunData: (...args: any[]) => mockUseRunData(...args),
  useRunIndex: (...args: any[]) => mockUseRunIndex(...args),
  useRunInstance: () => mockUseRunInstance(),
  useParentRunIndex: (...args: any[]) => mockUseParentRunIndex(...args),
  useNodesMetadata: () => mockUseNodesMetadata(),
  useShouldNodeFocus: (...args: any[]) => mockUseShouldNodeFocus(...args),
  useIsActionInSelectedTimelineRepetition: (...args: any[]) => mockUseIsActionInSelectedTimelineRepetition(...args),
  useHandoffActionsForAgent: (...args: any[]) => mockUseHandoffActionsForAgent(...args),
  useFlowErrorsForNode: (...args: any[]) => mockUseFlowErrorsForNode(...args),
}));

vi.mock('../../../core/state/workflow/workflowSlice', () => ({
  setFocusElement: vi.fn((payload) => ({ type: 'workflow/setFocusElement', payload })),
  setRepetitionRunData: vi.fn((payload) => ({ type: 'workflow/setRepetitionRunData', payload })),
  setSubgraphRunData: vi.fn((payload) => ({ type: 'workflow/setSubgraphRunData', payload })),
  toggleCollapsedGraphId: vi.fn((payload) => ({ type: 'workflow/toggleCollapsedGraphId', payload })),
  updateAgenticGraph: vi.fn((payload) => ({ type: 'workflow/updateAgenticGraph', payload })),
  updateAgenticMetadata: vi.fn((payload) => ({ type: 'workflow/updateAgenticMetadata', payload })),
}));

vi.mock('../../common/LoopsPager/helper', () => ({
  getRepetitionName: vi.fn().mockReturnValue('000000'),
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

vi.mock('@xyflow/react', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    Handle: (({ children, ...props }) => <div {...props}>Handle</div>) as any,
  };
});

vi.mock('../components/handles/DefaultHandle', () => ({
  DefaultHandle: ({ type }: { type: string }) => <div data-testid={`handle-${type}`} />,
}));

vi.mock('../components/handles/EdgeDrawSourceHandle', () => ({
  EdgeDrawSourceHandle: ({ highlighted }: { highlighted?: boolean }) => (
    <div data-testid="edge-draw-source-handle" data-highlighted={highlighted ?? false} />
  ),
}));

vi.mock('../components/handles/EdgeDrawTargetHandle', () => ({
  EdgeDrawTargetHandle: () => <div data-testid="edge-draw-target-handle" />,
}));

vi.mock('../components/card', () => ({
  ActionCard: ({ id, title, isSelected, onClick, onContextMenu, onDeleteClick, errorMessages, collapsed, handleCollapse }: any) => (
    <div data-testid={`action-card-${id}`} data-selected={isSelected} onClick={() => onClick?.()} onContextMenu={(e) => onContextMenu?.(e)}>
      <span>{title}</span>
      {errorMessages?.length > 0 && <span data-testid="error-messages">{errorMessages.join(', ')}</span>}
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
}));

vi.mock('../../common/DesignerContextualMenu/CopyTooltip', () => ({
  CopyTooltip: () => <div data-testid="copy-tooltip" />,
}));

import ScopeCardNode from '../ScopeCardNode';

describe('ScopeCardNode (v2)', () => {
  const defaultProps = { id: 'testScope-#scope' } as NodeProps;

  beforeEach(() => {
    vi.clearAllMocks();
    cleanup();
    mockUseReadOnly.mockReturnValue(false);
    mockUseMonitoringView.mockReturnValue(false);
    mockUseIsNodeSelectedInOperationPanel.mockReturnValue(false);
    mockUseActionMetadata.mockReturnValue({ type: 'Scope', runAfter: {} });
    mockUseNodeMetadata.mockReturnValue({ graphId: 'root', actionCount: 2 });
    mockUseNodeDisplayName.mockReturnValue('Test Scope');
    mockUseIsGraphCollapsed.mockReturnValue(false);
    mockUseIsLeafNode.mockReturnValue(false);
    mockUseBrandColor.mockReturnValue('#4B53BC');
    mockUseIconUri.mockReturnValue('test-icon-uri');
    mockUseOperationErrorInfo.mockReturnValue(undefined);
    mockUseParameterValidationErrors.mockReturnValue([]);
    mockUseTokenDependencies.mockReturnValue({ dependencies: {}, loopSources: {} });
    mockUseSettingValidationErrors.mockReturnValue([]);
    mockUseFlowErrorsForNode.mockReturnValue([]);
    mockUseOperationQuery.mockReturnValue({ isFetching: false, isError: false, isLoading: false });
    mockUseParentNodeId.mockReturnValue(undefined);
    mockUseRunData.mockReturnValue(undefined);
    mockUseRunIndex.mockReturnValue(0);
    mockUseRunInstance.mockReturnValue(undefined);
    mockUseParentRunIndex.mockReturnValue(undefined);
    mockUseNodesMetadata.mockReturnValue({});
    mockUseShouldNodeFocus.mockReturnValue(false);
    mockUseIsActionInSelectedTimelineRepetition.mockReturnValue(false);
    mockUseHandoffActionsForAgent.mockReturnValue([]);
    mockUseIsA2AWorkflow.mockReturnValue(false);
    mockUseAllOperations.mockReturnValue({});
    mockUseConnectorName.mockReturnValue({ result: 'Test Connector' });
    mockUseOperationInfo.mockReturnValue({ type: 'Scope', connectorId: 'test', operationId: 'test' });
  });

  it('should render without crashing', () => {
    const { container } = render(<ScopeCardNode {...defaultProps} />);
    expect(container).toBeTruthy();
  });

  it('should return null when node metadata is not found', () => {
    mockUseActionMetadata.mockReturnValue(undefined);

    const { container } = render(<ScopeCardNode {...defaultProps} />);
    expect(container.querySelector('.msla-scope-card')).toBeNull();
  });

  it('should render ActionCard with correct title', () => {
    render(<ScopeCardNode {...defaultProps} />);
    expect(screen.getByText('Test Scope')).toBeInTheDocument();
  });

  it('should render edge handles', () => {
    render(<ScopeCardNode {...defaultProps} />);
    expect(screen.getByTestId('edge-draw-target-handle')).toBeInTheDocument();
    // Non-footer scope gets DefaultHandle source, not EdgeDrawSourceHandle
    expect(screen.getByTestId('handle-source')).toBeInTheDocument();
  });

  it('should render EdgeDrawSourceHandle for footer nodes', () => {
    const footerProps = { id: 'testScope-#footer' } as NodeProps;
    render(<ScopeCardNode {...footerProps} />);
    expect(screen.getByTestId('edge-draw-source-handle')).toBeInTheDocument();
  });

  it('should pass highlighted=true to EdgeDrawSourceHandle on footer when selected', () => {
    mockUseIsNodeSelectedInOperationPanel.mockReturnValue(true);
    const footerProps = { id: 'testScope-#footer' } as NodeProps;

    render(<ScopeCardNode {...footerProps} />);
    const sourceHandle = screen.getByTestId('edge-draw-source-handle');
    expect(sourceHandle.getAttribute('data-highlighted')).toBe('true');
  });

  it('should pass highlighted=false to EdgeDrawSourceHandle on footer when not selected', () => {
    mockUseIsNodeSelectedInOperationPanel.mockReturnValue(false);
    const footerProps = { id: 'testScope-#footer' } as NodeProps;

    render(<ScopeCardNode {...footerProps} />);
    const sourceHandle = screen.getByTestId('edge-draw-source-handle');
    expect(sourceHandle.getAttribute('data-highlighted')).toBe('false');
  });

  it('should dispatch changePanelNode on click', () => {
    render(<ScopeCardNode {...defaultProps} />);
    const card = screen.getByTestId('action-card-testScope');
    fireEvent.click(card);

    expect(mockDispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'panel/changePanelNode',
        payload: 'testScope',
      })
    );
  });

  it('should dispatch context menu data on right-click', () => {
    render(<ScopeCardNode {...defaultProps} />);
    const card = screen.getByTestId('action-card-testScope');
    fireEvent.contextMenu(card, { clientX: 150, clientY: 250 });

    expect(mockDispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'designerView/setNodeContextMenuData',
        payload: {
          nodeId: 'testScope',
          location: { x: 150, y: 250 },
        },
      })
    );
  });

  it('should dispatch setShowDeleteModalNodeId on delete click', () => {
    render(<ScopeCardNode {...defaultProps} />);
    const deleteBtn = screen.getByTestId('delete-btn');
    fireEvent.click(deleteBtn);

    expect(mockDispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'designerView/setShowDeleteModalNodeId',
      })
    );
  });

  it('should dispatch toggleCollapsedGraphId on collapse click', () => {
    render(<ScopeCardNode {...defaultProps} />);
    const collapseBtn = screen.getByTestId('collapse-btn');
    fireEvent.click(collapseBtn);

    expect(mockDispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'workflow/toggleCollapsedGraphId',
      })
    );
  });

  it('should show collapsed text when graph is collapsed for non-footer', () => {
    mockUseIsGraphCollapsed.mockReturnValue(true);

    render(<ScopeCardNode {...defaultProps} />);
    const noActionsText = screen.getByText(/Actions/);
    expect(noActionsText).toBeInTheDocument();
  });

  it('should not show collapsed text for footer nodes even when collapsed', () => {
    mockUseIsGraphCollapsed.mockReturnValue(true);
    const footerProps = { id: 'testScope-#footer' } as NodeProps;

    render(<ScopeCardNode {...footerProps} />);
    expect(screen.queryByText(/2 Actions/)).not.toBeInTheDocument();
  });

  it('should show DropZone for leaf non-footer non-agent nodes when not collapsed', () => {
    mockUseIsLeafNode.mockReturnValue(true);
    mockUseIsGraphCollapsed.mockReturnValue(false);

    render(<ScopeCardNode {...defaultProps} />);
    expect(screen.getByTestId('dropzone-testScope')).toBeInTheDocument();
  });

  it('should not show DropZone in read-only mode for leaf nodes', () => {
    mockUseReadOnly.mockReturnValue(true);
    mockUseIsLeafNode.mockReturnValue(true);

    render(<ScopeCardNode {...defaultProps} />);
    // In read-only mode, show "No actions" text instead of DropZone
    expect(screen.queryByTestId('dropzone-testScope')).not.toBeInTheDocument();
  });

  it('should show error messages when parameter validation errors exist', () => {
    mockUseParameterValidationErrors.mockReturnValue([{ error: 'param error' }]);

    render(<ScopeCardNode {...defaultProps} />);
    expect(screen.getByTestId('error-messages')).toBeInTheDocument();
  });

  it('should show error messages when setting validation errors exist', () => {
    mockUseSettingValidationErrors.mockReturnValue([{ error: 'setting error' }]);

    render(<ScopeCardNode {...defaultProps} />);
    expect(screen.getByTestId('error-messages')).toBeInTheDocument();
  });

  it('should show error messages when operation query fails', () => {
    mockUseOperationQuery.mockReturnValue({ isFetching: false, isError: true, isLoading: false });

    render(<ScopeCardNode {...defaultProps} />);
    expect(screen.getByTestId('error-messages')).toBeInTheDocument();
  });

  it('should show error messages when flow errors exist', () => {
    mockUseFlowErrorsForNode.mockReturnValue([{ error: 'flow error' }]);

    render(<ScopeCardNode {...defaultProps} />);
    expect(screen.getByTestId('error-messages')).toBeInTheDocument();
  });

  it('should show "Add tool" text for empty agent node', () => {
    mockUseActionMetadata.mockReturnValue({ type: 'Agent', runAfter: {} });
    mockUseNodeMetadata.mockReturnValue({ graphId: 'root', actionCount: 0 });
    mockUseHandoffActionsForAgent.mockReturnValue([]);

    render(<ScopeCardNode {...defaultProps} />);
    expect(screen.getByText('Add tool')).toBeInTheDocument();
  });

  it('should pass isSelected to ActionCard', () => {
    mockUseIsNodeSelectedInOperationPanel.mockReturnValue(true);

    render(<ScopeCardNode {...defaultProps} />);
    const card = screen.getByTestId('action-card-testScope');
    expect(card.getAttribute('data-selected')).toBe('true');
  });
});
