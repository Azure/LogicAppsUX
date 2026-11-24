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

const mockUseNodeRepetition = vi.fn();
const mockUseAgentRepetition = vi.fn();
const mockUseAgentActionsRepetition = vi.fn();
const mockUseConditionOutputs = vi.fn();

vi.mock('../../../core/queries/runs', () => ({
  useNodeRepetition: () => mockUseNodeRepetition(),
  useConditionOutputs: () => mockUseConditionOutputs(),
  useAgentRepetition: () => mockUseAgentRepetition(),
  useAgentActionsRepetition: () => mockUseAgentActionsRepetition(),
}));

const mockUseMonitoringView = vi.fn().mockReturnValue(false);
const mockUseReadOnly = vi.fn().mockReturnValue(false);
const mockUseSharedNodeUi = vi.fn().mockReturnValue(false);

vi.mock('../../../core/state/designerOptions/designerOptionsSelectors', () => ({
  useMonitoringView: () => mockUseMonitoringView(),
  useReadOnly: () => mockUseReadOnly(),
  useSharedNodeUi: () => mockUseSharedNodeUi(),
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
  useOperationParameterByName: () => undefined,
}));

const mockUseIsNodeSelectedInOperationPanel = vi.fn().mockReturnValue(false);

vi.mock('../../../core/state/panel/panelSelectors', () => ({
  useIsNodeSelectedInOperationPanel: (...args: any[]) => mockUseIsNodeSelectedInOperationPanel(...args),
  useIsNodeInMultiSelection: vi.fn().mockReturnValue(false),
  useIsNodePinnedToOperationPanel: vi.fn().mockReturnValue(false),
}));

vi.mock('../../../core/state/panel/panelSlice', () => ({
  changePanelNode: vi.fn((payload) => ({ type: 'panel/changePanelNode', payload })),
  toggleNodeSelection: vi.fn((payload) => ({ type: 'panel/toggleNodeSelection', payload })),
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
const mockUseNodeDescription = vi.fn().mockReturnValue(undefined);
const mockUseNodeDisplayName = vi.fn().mockReturnValue('Test Scope');
const mockUseNodeMetadata = vi.fn().mockReturnValue({ graphId: 'root', actionCount: 2 });
const mockUseParentNodeId = vi.fn().mockReturnValue(undefined);
const mockUseRunData = vi.fn().mockReturnValue(undefined);
const mockUseRunIndex = vi.fn().mockReturnValue(0);
const mockUseRunInstance = vi.fn().mockReturnValue(undefined);
const mockUseParentRunIndex = vi.fn().mockReturnValue(undefined);
const mockUseShouldNodeFocus = vi.fn().mockReturnValue(false);
const mockUseIsActionInSelectedTimelineRepetition = vi.fn().mockReturnValue(false);
const mockUseHandoffActionsForAgent = vi.fn().mockReturnValue([]);
const mockUseFlowErrorsForNode = vi.fn().mockReturnValue([]);

vi.mock('../../../core/state/workflow/workflowSelectors', () => ({
  useActionMetadata: (...args: any[]) => mockUseActionMetadata(...args),
  useIsGraphCollapsed: (...args: any[]) => mockUseIsGraphCollapsed(...args),
  useIsLeafNode: (...args: any[]) => mockUseIsLeafNode(...args),
  useNodeDescription: (...args: any[]) => mockUseNodeDescription(...args),
  useNodeDisplayName: (...args: any[]) => mockUseNodeDisplayName(...args),
  useNodeMetadata: (...args: any[]) => mockUseNodeMetadata(...args),
  useParentNodeId: (...args: any[]) => mockUseParentNodeId(...args),
  useRunData: (...args: any[]) => mockUseRunData(...args),
  useRunIndex: (...args: any[]) => mockUseRunIndex(...args),
  useRunInstance: () => mockUseRunInstance(),
  useParentRunIndex: (...args: any[]) => mockUseParentRunIndex(...args),
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
  getAgentRepetitionIdentity: vi.fn((...args: any[]) => {
    const first = args[0];
    const params =
      typeof first === 'object' && first !== null
        ? first
        : {
            runId: args[0],
            ownerNodeId: args[1],
            repetitionName: args[2],
            repetitionIndex: args[3],
            parentStatus: args[4],
          };
    const { runId, ownerNodeId, repetitionName, repetitionIndex, parentStatus } = params;
    return runId && ownerNodeId && repetitionName !== undefined && repetitionIndex !== undefined
      ? [runId, ownerNodeId, repetitionName, String(repetitionIndex), parentStatus ?? ''].join('|')
      : undefined;
  }),
  getRepetitionName: vi.fn().mockReturnValue('000000'),
  getScopeRepetitionName: vi.fn((index) => String(index).padStart(6, '0')),
  useRepetitionName: vi.fn().mockReturnValue(''),
}));

vi.mock('../../common/LoopsPager/SharedLoopsPager', () => ({
  SharedLoopsPager: ({ scopeId }: any) => <div data-testid={`shared-loops-pager-${scopeId}`}>SharedLoopsPager</div>,
}));

vi.mock('../../common/LoopsPager/LoopsPager', () => ({
  LoopsPager: ({ scopeId }: any) => <div data-testid={`loops-pager-${scopeId}`}>LoopsPager</div>,
}));

vi.mock('../../connections/dropzone', () => ({
  DropZone: ({ graphId, axis, sharedPresentation }: any) => (
    <div data-testid={`dropzone-${graphId}`} data-axis={axis} data-shared={sharedPresentation}>
      DropZone
    </div>
  ),
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
  ActionCard: ({
    id,
    title,
    isSelected,
    onClick,
    onContextMenu,
    onDeleteClick,
    onCopyClick,
    errorMessages,
    collapsed,
    handleCollapse,
  }: any) => (
    <div
      data-testid={`action-card-${id}`}
      data-selected={isSelected}
      data-has-copy-callback={typeof onCopyClick === 'function'}
      onClick={(e) => onClick?.(e)}
      onContextMenu={(e) => onContextMenu?.(e)}
    >
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
      {handleCollapse && (
        <button data-testid="collapse-nested-btn" onClick={() => handleCollapse(true)}>
          Collapse nested
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
    mockUseNodeRepetition.mockReturnValue({ isFetching: false, data: undefined });
    mockUseAgentRepetition.mockReturnValue({ isFetching: false, data: undefined });
    mockUseAgentActionsRepetition.mockReturnValue({ isFetching: false, data: undefined });
    mockUseConditionOutputs.mockReturnValue(undefined);
    mockUseSharedNodeUi.mockReturnValue(false);
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

  it.each([
    ['Scope', 'action'],
    ['If', 'if'],
    ['Switch', 'switch'],
    ['Foreach', 'foreach'],
    ['Until', 'foreach'],
    ['Agent', 'agent'],
  ])('adopts the real %s host without changing its editor identity', (type, surface) => {
    mockUseSharedNodeUi.mockReturnValue(true);
    mockUseActionMetadata.mockReturnValue({
      type,
      runAfter: {},
      inputs: { parameters: { deploymentId: 'actual-model' } },
    });
    const { container } = render(<ScopeCardNode {...defaultProps} />);
    const card = container.querySelector(`[data-node-card="${surface}"]`)!;
    expect(card).toHaveAttribute('id', 'msla-node-testScope');
    expect(card.querySelector('img')).toBeNull();
    fireEvent.click(card);
    expect(mockDispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'panel/changePanelNode',
        payload: 'testScope',
      })
    );
    if (type === 'Agent') expect(screen.getByText('actual-model')).toBeInTheDocument();
  });

  it('maps a shared If takenOutput only from authoritative expressionResult for the selected repetition', () => {
    mockUseSharedNodeUi.mockReturnValue(true);
    mockUseMonitoringView.mockReturnValue(true);
    mockUseActionMetadata.mockReturnValue({ type: 'If', runAfter: {} });
    mockUseRunData.mockReturnValue({ status: 'Succeeded', outputs: { expressionResult: true } });
    const { container } = render(
      <ScopeCardNode
        {...defaultProps}
        data={{
          presentation: { shared: true, family: 'if' },
          branchPorts: [
            { id: 'testScope-actions', subgraphType: 'CONDITIONAL_TRUE' },
            { id: 'testScope-elseActions', subgraphType: 'CONDITIONAL_FALSE' },
          ],
        }}
      />
    );
    expect(container.querySelector('[data-branch="true"][data-taken="true"]')).not.toBeNull();
    expect(container.querySelector('[data-branch="false"][data-taken="true"]')).toBeNull();
    expect(screen.getByText('True, branch taken')).toBeInTheDocument();
  });

  it('suppresses shared If takenOutput when no authoritative expressionResult is present', () => {
    mockUseSharedNodeUi.mockReturnValue(true);
    mockUseMonitoringView.mockReturnValue(true);
    mockUseActionMetadata.mockReturnValue({ type: 'If', runAfter: {} });
    mockUseRunData.mockReturnValue({ status: 'Succeeded', outputs: {} });
    const { container } = render(
      <ScopeCardNode
        {...defaultProps}
        data={{
          presentation: { shared: true, family: 'if' },
          branchPorts: [
            { id: 'testScope-actions', subgraphType: 'CONDITIONAL_TRUE' },
            { id: 'testScope-elseActions', subgraphType: 'CONDITIONAL_FALSE' },
          ],
        }}
      />
    );
    expect(container.querySelector('[data-branch][data-taken="true"]')).toBeNull();
    expect(screen.queryByText(/branch taken/)).toBeNull();
  });

  it('does not show a previous If outcome while the selected repetition is loading', () => {
    mockUseSharedNodeUi.mockReturnValue(true);
    mockUseMonitoringView.mockReturnValue(true);
    mockUseActionMetadata.mockReturnValue({ type: 'If', runAfter: {} });
    mockUseRunInstance.mockReturnValue({ id: 'run' });
    mockUseParentRunIndex.mockReturnValue(1);
    mockUseIsActionInSelectedTimelineRepetition.mockReturnValue(true);
    mockUseRunData.mockReturnValue({ status: 'Succeeded', outputs: { expressionResult: true } });
    mockUseNodeRepetition.mockReturnValue({ isFetching: true });
    const props = {
      ...defaultProps,
      data: {
        presentation: { shared: true, family: 'if' },
        branchPorts: [
          { id: 'testScope-actions', subgraphType: 'CONDITIONAL_TRUE' },
          { id: 'testScope-elseActions', subgraphType: 'CONDITIONAL_FALSE' },
        ],
      },
    };
    const { rerender } = render(<ScopeCardNode {...props} />);
    expect(screen.queryByText(/branch taken/)).not.toBeInTheDocument();

    mockUseNodeRepetition.mockReturnValue({
      isFetching: false,
      data: { properties: { status: 'Succeeded', outputs: { expressionResult: false } } },
    });
    rerender(<ScopeCardNode {...props} data={{ ...props.data }} />);
    expect(screen.getByText('False, branch taken')).toBeInTheDocument();
    expect(screen.queryByText('True, branch taken')).not.toBeInTheDocument();
  });

  it('maps shared Switch takenOutput from expressionResult when it matches a declared case value', () => {
    mockUseSharedNodeUi.mockReturnValue(true);
    mockUseMonitoringView.mockReturnValue(true);
    mockUseActionMetadata.mockReturnValue({
      type: 'Switch',
      runAfter: {},
      cases: {
        firstCase: { case: 'first' },
        secondCase: { case: 'second' },
      },
    });
    mockUseRunData.mockReturnValue({ status: 'Succeeded', outputs: { expressionResult: 'second' } });
    const { container } = render(
      <ScopeCardNode
        {...defaultProps}
        data={{
          presentation: { shared: true, family: 'switch' },
          branchPorts: [
            { id: 'firstCase', subgraphType: 'SWITCH_CASE' },
            { id: 'secondCase', subgraphType: 'SWITCH_CASE' },
            { id: 'testScope-defaultCase', subgraphType: 'SWITCH_DEFAULT' },
          ],
        }}
      />
    );
    const handles = container.querySelectorAll('[data-testid="node-output-handles"] [data-handle]');
    expect(handles).toHaveLength(3);
    expect(handles[0]).toHaveAttribute('data-inactive', 'true');
    expect(handles[1]).not.toHaveAttribute('data-inactive');
    expect(handles[2]).toHaveAttribute('data-inactive', 'true');
  });

  it('does not infer a shared Switch takenOutput when expressionResult does not map to a declared case', () => {
    mockUseSharedNodeUi.mockReturnValue(true);
    mockUseMonitoringView.mockReturnValue(true);
    mockUseActionMetadata.mockReturnValue({
      type: 'Switch',
      runAfter: {},
      cases: {
        firstCase: { case: 'first' },
      },
    });
    mockUseRunData.mockReturnValue({ status: 'Succeeded', outputs: { expressionResult: 'firstCase' } });
    const { container } = render(
      <ScopeCardNode
        {...defaultProps}
        data={{
          presentation: { shared: true, family: 'switch' },
          branchPorts: [
            { id: 'firstCase', subgraphType: 'SWITCH_CASE' },
            { id: 'testScope-defaultCase', subgraphType: 'SWITCH_DEFAULT' },
          ],
        }}
      />
    );
    const handles = container.querySelectorAll('[data-testid="node-output-handles"] [data-handle]');
    expect(handles).toHaveLength(2);
    expect(handles[0]).not.toHaveAttribute('data-inactive');
    expect(handles[1]).not.toHaveAttribute('data-inactive');
  });

  it.each([
    [false, 'loops-pager-testScope', 'shared-loops-pager-testScope'],
    [true, 'shared-loops-pager-testScope', 'loops-pager-testScope'],
  ])('selects the foreach pager by the shared flag (%s)', (shared, present, absent) => {
    mockUseSharedNodeUi.mockReturnValue(shared);
    mockUseMonitoringView.mockReturnValue(true);
    mockUseActionMetadata.mockReturnValue({ type: 'Foreach', runAfter: {} });
    mockUseNodeMetadata.mockReturnValue({ graphId: 'root', actionCount: 2, runData: { status: 'Succeeded', repetitionCount: 3 } });
    render(<ScopeCardNode {...defaultProps} data={{ presentation: { shared, family: 'loop', hasLoopPager: shared } }} />);
    expect(screen.getByTestId(present)).toBeInTheDocument();
    expect(screen.queryByTestId(absent)).toBeNull();
  });

  it('only admits the selected Agent response, even when both inputs links are missing', () => {
    mockUseMonitoringView.mockReturnValue(true);
    mockUseSharedNodeUi.mockReturnValue(true);
    mockUseActionMetadata.mockReturnValue({ type: 'Agent', runAfter: {} });
    mockUseRunInstance.mockReturnValue({ id: 'run-1' });
    mockUseRunIndex.mockReturnValue(2);
    mockUseIsActionInSelectedTimelineRepetition.mockReturnValue(true);
    mockUseParentNodeId.mockReturnValue('parentScope');
    mockUseRunData.mockImplementation((id: string) => {
      if (id === 'parentScope') {
        return { status: 'Succeeded' };
      }
      if (id === 'testScope') {
        return { status: 'Succeeded', inputsLink: null, outputsLink: null, repetitionCount: 3 };
      }
      return undefined;
    });
    mockUseNodeMetadata.mockReturnValue({
      graphId: 'root',
      actionCount: 2,
      runData: { status: 'Succeeded', inputsLink: null, outputsLink: null, repetitionCount: 3 },
      agentRepetitionIdentity: 'run-1|testScope|000001|1|Succeeded',
    });
    const properties = { status: 'Failed', tools: {}, inputsLink: null, outputsLink: null };
    const card = () => <ScopeCardNode {...defaultProps} data={{ presentation: { shared: true, family: 'agent' } }} />;
    const metadataDispatch = () => mockDispatch.mock.calls.find(([action]) => action?.type === 'workflow/updateAgenticMetadata');
    mockUseAgentRepetition.mockReturnValue({ isFetching: false, data: { name: '000001', properties } });
    const { rerender } = render(card());
    expect(metadataDispatch()).toBeUndefined();

    mockUseAgentRepetition.mockReturnValue({ isFetching: true, data: { name: '000002', properties } });
    rerender(card());
    expect(metadataDispatch()).toBeUndefined();

    mockUseAgentRepetition.mockReturnValue({ isFetching: false, data: { name: '000002', properties } });
    rerender(card());
    expect(metadataDispatch()?.[0]?.payload).toEqual(
      expect.objectContaining({
        nodeId: 'testScope',
        agentRepetitionIdentity: 'run-1|testScope|000002|2|Succeeded',
      })
    );
  });

  it.each([
    [undefined, 'Test Scope, Running'],
    [0, 'Test Scope'],
  ])('keeps an Agent summary separate from stale repetition status (parent index %s)', (parentIndex, expectedName) => {
    mockUseSharedNodeUi.mockReturnValue(true);
    mockUseMonitoringView.mockReturnValue(true);
    mockUseActionMetadata.mockReturnValue({ type: 'Agent', runAfter: {} });
    mockUseRunInstance.mockReturnValue({ id: 'run-1', properties: { actions: { testScope: { status: 'Running' } } } });
    mockUseParentRunIndex.mockReturnValue(parentIndex);
    mockUseRunIndex.mockReturnValue(2);
    mockUseIsActionInSelectedTimelineRepetition.mockReturnValue(true);
    const previousPage = { status: 'Failed', repetitionCount: 3 };
    mockUseRunData.mockReturnValue(previousPage);
    mockUseNodeMetadata.mockReturnValue({
      graphId: 'root',
      actionCount: 2,
      runData: previousPage,
      agentRepetitionIdentity: 'run-1|testScope|000001|1|',
    });

    const { container } = render(<ScopeCardNode {...defaultProps} data={{ presentation: { shared: true, family: 'agent' } }} />);

    expect(container.querySelector('#msla-node-testScope')).toHaveAccessibleName(expectedName);
  });

  it('keeps the Agent iteration selector usable while new tool metadata loads', () => {
    mockUseSharedNodeUi.mockReturnValue(true);
    mockUseMonitoringView.mockReturnValue(true);
    mockUseActionMetadata.mockReturnValue({ type: 'Agent', runAfter: {} });
    mockUseRunInstance.mockReturnValue({ id: 'run-1' });
    mockUseRunIndex.mockReturnValue(2);
    mockUseIsActionInSelectedTimelineRepetition.mockReturnValue(true);
    mockUseParentNodeId.mockReturnValue('parentScope');
    mockUseRunData.mockImplementation((id: string) => {
      if (id === 'parentScope') {
        return { status: 'Succeeded' };
      }
      if (id === 'testScope') {
        return { status: 'Succeeded', repetitionCount: 3 };
      }
      return undefined;
    });
    const metadataBase = {
      graphId: 'root',
      actionCount: 2,
      runData: { status: 'Succeeded', repetitionCount: 3 },
    };
    mockUseNodeMetadata.mockImplementation((id: string) =>
      id === 'testScope'
        ? { ...metadataBase, agentRepetitionIdentity: 'run-1|testScope|000001|1|Succeeded' }
        : { graphId: 'root', actionCount: 0 }
    );

    const { rerender } = render(<ScopeCardNode {...defaultProps} data={{ presentation: { shared: true, family: 'agent' } }} />);
    expect(screen.getByTestId('shared-loops-pager-testScope')).toBeInTheDocument();

    mockUseNodeMetadata.mockImplementation((id: string) =>
      id === 'testScope'
        ? { ...metadataBase, agentRepetitionIdentity: 'run-1|testScope|000002|2|Succeeded' }
        : { graphId: 'root', actionCount: 0 }
    );
    rerender(<ScopeCardNode {...defaultProps} data={{ presentation: { shared: true, family: 'agent' } }} />);
    expect(screen.getByTestId('shared-loops-pager-testScope')).toBeInTheDocument();
  });

  it('keeps legacy no-runId agent pager behavior unchanged', () => {
    mockUseSharedNodeUi.mockReturnValue(true);
    mockUseMonitoringView.mockReturnValue(true);
    mockUseActionMetadata.mockReturnValue({ type: 'Agent', runAfter: {} });
    mockUseRunInstance.mockReturnValue(undefined);
    mockUseRunIndex.mockReturnValue(2);
    mockUseIsActionInSelectedTimelineRepetition.mockReturnValue(true);
    mockUseNodeMetadata.mockReturnValue({
      graphId: 'root',
      actionCount: 2,
      runData: { status: 'Succeeded', repetitionCount: 3 },
    });
    mockUseRunData.mockReturnValue({ status: 'Succeeded', repetitionCount: 3 });

    render(<ScopeCardNode {...defaultProps} data={{ presentation: { shared: true, family: 'agent' } }} />);
    expect(screen.getByTestId('shared-loops-pager-testScope')).toBeInTheDocument();
  });

  it('keeps the accepted legacy scope renderer during a pending shared toggle', () => {
    mockUseSharedNodeUi.mockReturnValue(true);
    render(<ScopeCardNode {...defaultProps} data={{ presentation: { shared: false } }} />);
    expect(screen.getByTestId('action-card-testScope')).toBeInTheDocument();
  });

  it.each([false, true])('does not add a duplicate legacy copy callback when the live shared option is %s', (sharedOption) => {
    mockUseSharedNodeUi.mockReturnValue(sharedOption);
    render(<ScopeCardNode {...defaultProps} data={{ presentation: { shared: false } }} />);
    expect(screen.getByTestId('action-card-testScope')).toHaveAttribute('data-has-copy-callback', 'false');
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

  it('should dispatch toggleNodeSelection on ctrl-click', () => {
    render(<ScopeCardNode {...defaultProps} />);
    const card = screen.getByTestId('action-card-testScope');
    fireEvent.click(card, { ctrlKey: true });

    expect(mockDispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'panel/toggleNodeSelection',
        payload: 'testScope',
      })
    );
  });

  it('should dispatch toggleNodeSelection on meta-click', () => {
    render(<ScopeCardNode {...defaultProps} />);
    const card = screen.getByTestId('action-card-testScope');
    fireEvent.click(card, { metaKey: true });

    expect(mockDispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'panel/toggleNodeSelection',
        payload: 'testScope',
      })
    );
  });

  it('should dispatch toggleNodeSelection on shift-click of the card body', () => {
    render(<ScopeCardNode {...defaultProps} />);
    const card = screen.getByTestId('action-card-testScope');
    fireEvent.click(card, { shiftKey: true });

    expect(mockDispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'panel/toggleNodeSelection',
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

  it('should include nested scopes when collapse is triggered with shift (includeNested)', () => {
    render(<ScopeCardNode {...defaultProps} />);
    const collapseNestedBtn = screen.getByTestId('collapse-nested-btn');
    fireEvent.click(collapseNestedBtn);

    expect(mockDispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'workflow/toggleCollapsedGraphId',
        payload: expect.objectContaining({ id: 'testScope', includeNested: true }),
      })
    );
  });

  it('should show collapsed text when graph is collapsed for non-footer', () => {
    mockUseIsGraphCollapsed.mockReturnValue(true);

    render(<ScopeCardNode {...defaultProps} />);
    const noActionsText = screen.getByText(/Actions/);
    expect(noActionsText).toBeInTheDocument();
  });

  it.each([
    ['Scope', 'actions'],
    ['Foreach', 'actions'],
    ['Switch', 'cases'],
    ['Agent', 'tools'],
  ])('moves the collapsed %s count into the shared card as %s', (type, unit) => {
    mockUseSharedNodeUi.mockReturnValue(true);
    mockUseIsGraphCollapsed.mockReturnValue(true);
    mockUseActionMetadata.mockReturnValue({ type, runAfter: {} });
    mockUseNodeMetadata.mockReturnValue({ graphId: 'root', actionCount: 3 });
    const { container } = render(<ScopeCardNode {...defaultProps} />);
    const count = container.querySelector('[data-node-count]');
    expect(count).toHaveAttribute('data-node-count', unit);
    expect(count).toHaveTextContent('3');
    expect(container.querySelector('.no-actions-text')).toBeNull();
  });

  it('counts the actions in both branches of a collapsed shared If instead of its fixed branch count', () => {
    mockUseSharedNodeUi.mockReturnValue(true);
    mockUseIsGraphCollapsed.mockReturnValue(true);
    mockUseActionMetadata.mockReturnValue({ type: 'If', runAfter: {} });
    const branchCounts: Record<string, number> = { testScope: 2, 'testScope-actions': 3, 'testScope-elseActions': 1 };
    mockUseNodeMetadata.mockImplementation((id: string) => ({ graphId: 'root', actionCount: branchCounts[id] }));
    const { container } = render(<ScopeCardNode {...defaultProps} />);
    const count = container.querySelector('[data-node-count]');
    expect(count).toHaveAttribute('data-node-count', 'actions');
    expect(count).toHaveTextContent('4');
  });

  it('keeps the host collapsed count on the legacy path', () => {
    mockUseIsGraphCollapsed.mockReturnValue(true);
    const { container } = render(<ScopeCardNode {...defaultProps} />);
    expect(container.querySelector('.no-actions-text')).toBeInTheDocument();
    expect(container.querySelector('[data-node-count]')).toBeNull();
  });

  it('does not repeat the tool count on a collapsed Agent whose tools panel already states it', () => {
    mockUseSharedNodeUi.mockReturnValue(true);
    mockUseIsGraphCollapsed.mockReturnValue(true);
    mockUseActionMetadata.mockReturnValue({ type: 'Agent', runAfter: {} });
    const { container } = render(
      <ScopeCardNode
        {...defaultProps}
        data={{ toolsPanel: { width: 300, height: 120, bottomPadding: 0, collapsed: true, items: [{ id: 'tool1' }] } }}
      />
    );
    expect(container.querySelector('[data-node-count]')).toBeNull();
    expect(container.querySelector('.no-actions-text')).toBeNull();
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

  it('places the accepted RIGHT terminal after an empty Scope header while the live shared option is off', () => {
    mockUseIsLeafNode.mockReturnValue(true);
    mockUseNodeMetadata.mockReturnValue({ graphId: 'root', actionCount: 0 });
    render(<ScopeCardNode {...defaultProps} data={{ presentation: { shared: true }, handleAxis: 'horizontal' }} />);
    const terminal = screen.getByTestId('dropzone-testScope');
    expect(terminal).toHaveAttribute('data-axis', 'horizontal');
    expect(terminal).toHaveAttribute('data-shared', 'true');
    expect(terminal.parentElement).toHaveStyle({
      position: 'absolute',
      left: '100%',
      top: '50%',
      marginLeft: '8px',
      width: '32px',
      height: '32px',
      transform: 'translateY(-50%)',
    });
  });

  it.each([true, false])('keeps accepted DOWN Scope terminal placement while the live option differs (shared=%s)', (shared) => {
    mockUseIsLeafNode.mockReturnValue(true);
    mockUseNodeMetadata.mockReturnValue({ graphId: 'root', actionCount: 0 });
    mockUseSharedNodeUi.mockReturnValue(!shared);
    render(<ScopeCardNode {...defaultProps} data={{ presentation: { shared }, handleAxis: 'vertical' }} />);
    const terminal = screen.getByTestId('dropzone-testScope');
    expect(terminal).toHaveAttribute('data-axis', 'vertical');
    expect(terminal).toHaveAttribute('data-shared', String(shared));
    expect(terminal.parentElement?.style.transform).toBe('');
    expect(terminal.parentElement?.style.left).toBe('');
  });

  it('keeps an accepted RIGHT empty Scope read-only without an insertion control', () => {
    mockUseIsLeafNode.mockReturnValue(true);
    mockUseNodeMetadata.mockReturnValue({ graphId: 'root', actionCount: 0 });
    mockUseReadOnly.mockReturnValue(true);
    render(<ScopeCardNode {...defaultProps} data={{ presentation: { shared: true }, handleAxis: 'horizontal' }} />);
    expect(screen.queryByTestId('dropzone-testScope')).not.toBeInTheDocument();
    expect(screen.getByText('No actions')).toBeInTheDocument();
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
