/**
 * @vitest-environment jsdom
 */
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import type { NodeProps } from '@xyflow/react';
import { mockUseIntl } from '../../../__test__/intl-test-helper';

mockUseIntl();

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

vi.mock(import('../../../core/queries/runs'), () => ({
  useNodeRepetition: () => ({ isFetching: false, data: undefined }),
}));

vi.mock(import('../../../core/actions/bjsworkflow/copypaste'), () => ({
  copyOperation: vi.fn((payload) => ({ type: 'copyOperation', payload })),
}));

vi.mock(import('../../../core/actions/bjsworkflow/move'), () => ({
  moveOperation: vi.fn((payload) => ({ type: 'moveOperation', payload })),
}));

vi.mock(import('../../../core/actions/bjsworkflow/staticresults'), () => ({
  StaticResultOption: { ENABLED: 'ENABLED', DISABLED: 'DISABLED' },
}));

const mockUseMonitoringView = vi.fn().mockReturnValue(false);
const mockUseReadOnly = vi.fn().mockReturnValue(false);
const mockUseSuppressDefault = vi.fn().mockReturnValue(false);
const mockUseNodeSelectCallback = vi.fn().mockReturnValue(undefined);
const mockUseUnitTest = vi.fn().mockReturnValue(false);

vi.mock(import('../../../core/state/designerOptions/designerOptionsSelectors'), () => ({
  useMonitoringView: () => mockUseMonitoringView(),
  useReadOnly: () => mockUseReadOnly(),
  useSuppressDefaultNodeSelectFunctionality: () => mockUseSuppressDefault(),
  useNodeSelectAdditionalCallback: () => mockUseNodeSelectCallback(),
  useUnitTest: () => mockUseUnitTest(),
}));

vi.mock(import('../../../core/state/designerView/designerViewSlice'), async (importOriginal) => ({
  ...(await importOriginal()),
  setNodeContextMenuData: vi.fn((payload) => ({ type: 'designerView/setNodeContextMenuData', payload })),
  setShowDeleteModalNodeId: vi.fn((payload) => ({ type: 'designerView/setShowDeleteModalNodeId', payload })),
}));

const mockUseIsA2AWorkflow = vi.fn().mockReturnValue(false);

vi.mock(import('../../../core/state/designerView/designerViewSelectors'), () => ({
  useIsA2AWorkflow: () => mockUseIsA2AWorkflow(),
}));

vi.mock(import('../../../core/state/operation/operationMetadataSlice'), async (importOriginal) => ({
  ...(await importOriginal()),
  ErrorLevel: { DynamicOutputs: 'DynamicOutputs', Connection: 'Connection' },
}));

const mockUseOperationErrorInfo = vi.fn().mockReturnValue(undefined);
const mockUseParameterStaticResult = vi.fn().mockReturnValue(undefined);
const mockUseParameterValidationErrors = vi.fn().mockReturnValue([]);
const mockUseTokenDependencies = vi.fn().mockReturnValue({ dependencies: {}, loopSources: {} });
const mockUseOperationVisuals = vi.fn().mockReturnValue({ iconUri: 'test-icon' });
const mockUseIsNodeLoadingDynamicData = vi.fn().mockReturnValue(false);

vi.mock(import('../../../core/state/operation/operationSelector'), () => ({
  useOperationErrorInfo: (...args: any[]) => mockUseOperationErrorInfo(...args),
  useParameterStaticResult: (...args: any[]) => mockUseParameterStaticResult(...args),
  useParameterValidationErrors: (...args: any[]) => mockUseParameterValidationErrors(...args),
  useTokenDependencies: (...args: any[]) => mockUseTokenDependencies(...args),
  useOperationVisuals: (...args: any[]) => mockUseOperationVisuals(...args),
  useIsNodeLoadingDynamicData: (...args: any[]) => mockUseIsNodeLoadingDynamicData(...args),
}));

const mockUseIsNodeSelectedInOperationPanel = vi.fn().mockReturnValue(false);

vi.mock(import('../../../core/state/panel/panelSelectors'), () => ({
  useIsNodeSelectedInOperationPanel: (...args: any[]) => mockUseIsNodeSelectedInOperationPanel(...args),
}));

vi.mock(import('../../../core/state/panel/panelSlice'), async (importOriginal) => ({
  ...(await importOriginal()),
  changePanelNode: vi.fn((payload) => ({ type: 'panel/changePanelNode', payload })),
  setSelectedNodeId: vi.fn((payload) => ({ type: 'panel/setSelectedNodeId', payload })),
}));

const mockUseAllOperations = vi.fn().mockReturnValue({});
const mockUseConnectorName = vi.fn().mockReturnValue({ result: 'Test Connector' });
const mockUseOperationInfo = vi.fn().mockReturnValue({ type: 'Action', connectorId: 'test', operationId: 'test' });
const mockUseOperationQuery = vi.fn().mockReturnValue({ isFetching: false, isError: false, isLoading: false });

vi.mock(import('../../../core/state/selectors/actionMetadataSelector'), () => ({
  useAllOperations: () => mockUseAllOperations(),
  useConnectorName: (...args: any[]) => mockUseConnectorName(...args),
  useOperationInfo: (...args: any[]) => mockUseOperationInfo(...args),
  useOperationQuery: (...args: any[]) => mockUseOperationQuery(...args),
}));

const mockUseSettingValidationErrors = vi.fn().mockReturnValue([]);

vi.mock(import('../../../core/state/setting/settingSelector'), () => ({
  useSettingValidationErrors: (...args: any[]) => mockUseSettingValidationErrors(...args),
}));

const mockUseIsMockSupported = vi.fn().mockReturnValue(false);
const mockUseMocksByOperation = vi.fn().mockReturnValue(undefined);

vi.mock(import('../../../core/state/unitTest/unitTestSelectors'), () => ({
  useIsMockSupported: (...args: any[]) => mockUseIsMockSupported(...args),
  useMocksByOperation: (...args: any[]) => mockUseMocksByOperation(...args),
}));

const mockUseNodeDisplayName = vi.fn().mockReturnValue('Test Action');
const mockUseNodeMetadata = vi.fn().mockReturnValue({ graphId: 'root', isTrigger: false });
const mockUseRunData = vi.fn().mockReturnValue(undefined);
const mockUseShouldNodeFocus = vi.fn().mockReturnValue(false);
const mockUseIsLeafNode = vi.fn().mockReturnValue(false);
const mockUseParentNodeId = vi.fn().mockReturnValue(undefined);
const mockUseNodesMetadata = vi.fn().mockReturnValue({});
const mockUseRunInstance = vi.fn().mockReturnValue(undefined);
const mockUseParentRunIndex = vi.fn().mockReturnValue(undefined);
const mockUseIsWithinAgenticLoop = vi.fn().mockReturnValue(false);
const mockUseSubgraphRunData = vi.fn().mockReturnValue(undefined);
const mockUseRunIndex = vi.fn().mockReturnValue(undefined);
const mockUseFlowErrorsForNode = vi.fn().mockReturnValue([]);
const mockUseToolRunIndex = vi.fn().mockReturnValue(undefined);
const mockUseActionMetadata = vi.fn().mockReturnValue(undefined);

vi.mock(import('../../../core/state/workflow/workflowSelectors'), () => ({
  useNodeDisplayName: (...args: any[]) => mockUseNodeDisplayName(...args),
  useNodeMetadata: (...args: any[]) => mockUseNodeMetadata(...args),
  useRunData: (...args: any[]) => mockUseRunData(...args),
  useShouldNodeFocus: (...args: any[]) => mockUseShouldNodeFocus(...args),
  useIsLeafNode: (...args: any[]) => mockUseIsLeafNode(...args),
  useParentNodeId: (...args: any[]) => mockUseParentNodeId(...args),
  useNodesMetadata: () => mockUseNodesMetadata(),
  useRunInstance: () => mockUseRunInstance(),
  useParentRunIndex: (...args: any[]) => mockUseParentRunIndex(...args),
  useIsWithinAgenticLoop: (...args: any[]) => mockUseIsWithinAgenticLoop(...args),
  useSubgraphRunData: (...args: any[]) => mockUseSubgraphRunData(...args),
  useRunIndex: (...args: any[]) => mockUseRunIndex(...args),
  useFlowErrorsForNode: (...args: any[]) => mockUseFlowErrorsForNode(...args),
  useToolRunIndex: (...args: any[]) => mockUseToolRunIndex(...args),
  useActionMetadata: (...args: any[]) => mockUseActionMetadata(...args),
}));

vi.mock(import('../../../core/state/workflow/workflowSlice'), async (importOriginal) => ({
  ...(await importOriginal()),
  setRepetitionRunData: vi.fn((payload) => ({ type: 'workflow/setRepetitionRunData', payload })),
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

vi.mock(import('@xyflow/react'), async (importOriginal) => {
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
  ActionCard: ({ id, title, isSelected, onClick, onContextMenu, onDeleteClick, errorMessages }: any) => (
    <div data-testid={`action-card-${id}`} data-selected={isSelected} onClick={() => onClick?.()} onContextMenu={(e) => onContextMenu?.(e)}>
      <span>{title}</span>
      {errorMessages?.length > 0 && <span data-testid="error-messages">{errorMessages.join(', ')}</span>}
      {onDeleteClick && (
        <button data-testid="delete-btn" onClick={onDeleteClick}>
          Delete
        </button>
      )}
    </div>
  ),
}));

vi.mock('../../common/DesignerContextualMenu/CopyTooltip', () => ({
  CopyTooltip: () => <div data-testid="copy-tooltip" />,
}));

import DefaultNode from '../OperationCardNode';

describe('OperationCardNode (v2)', () => {
  const defaultProps = { id: 'testNode' } as NodeProps;

  beforeEach(() => {
    vi.clearAllMocks();
    cleanup();
    mockUseReadOnly.mockReturnValue(false);
    mockUseMonitoringView.mockReturnValue(false);
    mockUseIsNodeSelectedInOperationPanel.mockReturnValue(false);
    mockUseNodeMetadata.mockReturnValue({ graphId: 'root', isTrigger: false });
    mockUseNodeDisplayName.mockReturnValue('Test Action');
    mockUseIsLeafNode.mockReturnValue(false);
    mockUseOperationErrorInfo.mockReturnValue(undefined);
    mockUseParameterValidationErrors.mockReturnValue([]);
    mockUseSettingValidationErrors.mockReturnValue([]);
    mockUseFlowErrorsForNode.mockReturnValue([]);
    mockUseOperationQuery.mockReturnValue({ isFetching: false, isError: false, isLoading: false });
    mockUseOperationVisuals.mockReturnValue({ iconUri: 'test-icon' });
  });

  it('should render without crashing', () => {
    const { container } = render(<DefaultNode {...defaultProps} />);
    expect(container).toBeTruthy();
  });

  it('should render ActionCard with correct title', () => {
    render(<DefaultNode {...defaultProps} />);
    expect(screen.getByText('Test Action')).toBeInTheDocument();
  });

  it('should render edge handles', () => {
    render(<DefaultNode {...defaultProps} />);
    expect(screen.getByTestId('edge-draw-target-handle')).toBeInTheDocument();
    expect(screen.getByTestId('edge-draw-source-handle')).toBeInTheDocument();
  });

  it('should pass highlighted=true to EdgeDrawSourceHandle when node is selected', () => {
    mockUseIsNodeSelectedInOperationPanel.mockReturnValue(true);

    render(<DefaultNode {...defaultProps} />);
    const sourceHandle = screen.getByTestId('edge-draw-source-handle');
    expect(sourceHandle.getAttribute('data-highlighted')).toBe('true');
  });

  it('should pass highlighted=false to EdgeDrawSourceHandle when node is not selected', () => {
    mockUseIsNodeSelectedInOperationPanel.mockReturnValue(false);

    render(<DefaultNode {...defaultProps} />);
    const sourceHandle = screen.getByTestId('edge-draw-source-handle');
    expect(sourceHandle.getAttribute('data-highlighted')).toBe('false');
  });

  it('should dispatch changePanelNode on click', () => {
    render(<DefaultNode {...defaultProps} />);
    const card = screen.getByTestId('action-card-testNode');
    fireEvent.click(card);

    expect(mockDispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'panel/changePanelNode',
        payload: 'testNode',
      })
    );
  });

  it('should dispatch context menu on right-click', () => {
    render(<DefaultNode {...defaultProps} />);
    const card = screen.getByTestId('action-card-testNode');
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
    render(<DefaultNode {...defaultProps} />);
    const deleteBtn = screen.getByTestId('delete-btn');
    fireEvent.click(deleteBtn);

    expect(mockDispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'designerView/setShowDeleteModalNodeId',
      })
    );
  });

  it('should show DropZone for leaf nodes', () => {
    mockUseIsLeafNode.mockReturnValue(true);

    render(<DefaultNode {...defaultProps} />);
    expect(screen.getByTestId('dropzone-root')).toBeInTheDocument();
  });

  it('should not show DropZone when not a leaf node', () => {
    mockUseIsLeafNode.mockReturnValue(false);

    render(<DefaultNode {...defaultProps} />);
    expect(screen.queryByTestId('dropzone-root')).not.toBeInTheDocument();
  });

  it('should not show DropZone in read-only mode', () => {
    mockUseReadOnly.mockReturnValue(true);
    mockUseIsLeafNode.mockReturnValue(true);

    render(<DefaultNode {...defaultProps} />);
    expect(screen.queryByTestId('dropzone-root')).not.toBeInTheDocument();
  });

  it('should show error messages when parameter validation errors exist', () => {
    mockUseParameterValidationErrors.mockReturnValue([{ error: 'param error' }]);

    render(<DefaultNode {...defaultProps} />);
    expect(screen.getByTestId('error-messages')).toBeInTheDocument();
  });

  it('should show error messages when setting validation errors exist', () => {
    mockUseSettingValidationErrors.mockReturnValue([{ error: 'setting error' }]);

    render(<DefaultNode {...defaultProps} />);
    expect(screen.getByTestId('error-messages')).toBeInTheDocument();
  });

  it('should show error messages when operation query fails', () => {
    mockUseOperationQuery.mockReturnValue({ isFetching: false, isError: true, isLoading: false });

    render(<DefaultNode {...defaultProps} />);
    expect(screen.getByTestId('error-messages')).toBeInTheDocument();
  });

  it('should show error messages when flow errors exist', () => {
    mockUseFlowErrorsForNode.mockReturnValue([{ error: 'flow error' }]);

    render(<DefaultNode {...defaultProps} />);
    expect(screen.getByTestId('error-messages')).toBeInTheDocument();
  });

  it('should pass isSelected to ActionCard', () => {
    mockUseIsNodeSelectedInOperationPanel.mockReturnValue(true);

    render(<DefaultNode {...defaultProps} />);
    const card = screen.getByTestId('action-card-testNode');
    expect(card.getAttribute('data-selected')).toBe('true');
  });
});
