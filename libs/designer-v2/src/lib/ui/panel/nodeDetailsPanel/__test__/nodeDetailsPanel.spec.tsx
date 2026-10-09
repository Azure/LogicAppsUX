import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { CommonPanelProps, PanelContainerProps } from '@microsoft/designer-ui';
import { PanelContainer, PanelLocation, PanelScope } from '@microsoft/designer-ui';
import { SUBGRAPH_TYPES } from '@microsoft/logic-apps-shared';
import { NodeDetailsPanel } from '../nodeDetailsPanel';
import { usePanelNodeData } from '../usePanelNodeData';
import { useRawInputsOutputs } from '../useRawInputsOutputs';
import { isOperationNameValid } from '../../../../core/utils/graph';

const mocks = vi.hoisted(() => ({
  dispatch: vi.fn(),
  selected: 'Action',
  alternate: undefined as { nodeId: string; persistence: 'selected' | 'pinned' } | undefined,
  readOnly: false,
  collapsed: false,
  suppressFocus: false,
  isA2A: false,
  isTrigger: false,
  nodeType: 'Http',
  runMode: 'Run',
  runData: undefined as { canResubmit?: boolean } | undefined,
  runInstance: undefined as { name?: string } | undefined,
  undoRedo: false,
  resubmit: vi.fn(),
  monitor: vi.fn(),
  hostAvailable: true,
  monitorAvailable: true,
  validate: vi.fn<(...args: unknown[]) => string[]>(() => ['validation error']),
  encode: vi.fn<(...args: unknown[]) => boolean>(() => true),
  state: {
    workflow: {
      operations: { Action: { type: 'Http' } },
      nodesMetadata: {},
      idReplacements: {},
    },
    operations: {
      operationInfo: { Action: { type: 'Http' } },
      inputParameters: {} as Record<string, { parameterGroups: Record<string, { parameters: { id: string; value: string }[] }> }>,
    },
  },
}));

vi.mock('react-redux', () => ({
  useDispatch: () => mocks.dispatch,
  useSelector: (selector: (state: typeof mocks.state) => unknown) => selector(mocks.state),
}));
vi.mock('../../../../core', () => ({
  clearPanel: () => ({ type: 'clearPanel' }),
  collapsePanel: () => ({ type: 'collapsePanel' }),
  updateParameterValidation: (payload: unknown) => ({ type: 'updateParameterValidation', payload }),
  validateParameter: (...args: unknown[]) => mocks.validate(...args),
}));
vi.mock('../../../../core/utils/parameters/helper', () => ({
  shouldEncodeParameterValueForOperationBasedOnMetadata: (...args: unknown[]) => mocks.encode(...args),
}));
vi.mock('../../../../core/state/designerOptions/designerOptionsSelectors', () => ({
  useReadOnly: () => mocks.readOnly,
  useSuppressDefaultNodeSelectFunctionality: () => mocks.suppressFocus,
}));
vi.mock('../../../../core/state/designerView/designerViewSelectors', () => ({
  useIsA2AWorkflow: () => mocks.isA2A,
}));
vi.mock('../../../../core/state/designerView/designerViewSlice', () => ({
  setShowDeleteModalNodeId: (payload: string) => ({ type: 'setShowDeleteModalNodeId', payload }),
}));
vi.mock('../../../../core/state/panel/panelSelectors', () => ({
  useIsPanelCollapsed: () => mocks.collapsed,
  useOperationAlternateSelectedNode: () => mocks.alternate,
  useOperationPanelSelectedNodeId: () => mocks.selected,
}));
vi.mock('../../../../core/state/panel/panelSlice', () => ({
  setAlternateSelectedNode: (payload: unknown) => ({ type: 'setAlternateSelectedNode', payload }),
  updatePanelLocation: (payload: string) => ({ type: 'updatePanelLocation', payload }),
}));
vi.mock('../../../../core/state/undoRedo/undoRedoSelectors', () => ({
  useUndoRedoClickToggle: () => mocks.undoRedo,
}));
vi.mock('../../../../core/state/workflow/workflowSelectors', () => ({
  useActionMetadata: () => ({ type: mocks.nodeType }),
  useRunData: () => mocks.runData,
  useRunInstance: () => mocks.runInstance,
  useRunMode: () => mocks.runMode,
}));
vi.mock('../../../../core/state/workflow/workflowSlice', () => ({
  replaceId: (payload: unknown) => ({ type: 'replaceId', payload }),
  setNodeDescription: (payload: unknown) => ({ type: 'setNodeDescription', payload }),
}));
vi.mock('../../../../core/utils/graph', () => ({
  isTriggerNode: () => mocks.isTrigger,
  isOperationNameValid: vi.fn(),
}));
vi.mock('../usePanelNodeData', () => ({ usePanelNodeData: vi.fn() }));
vi.mock('../useRawInputsOutputs', () => ({ useRawInputsOutputs: vi.fn() }));
vi.mock('@microsoft/logic-apps-shared', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@microsoft/logic-apps-shared')>()),
  WorkflowService: () => ({ resubmitWorkflow: mocks.resubmit }),
  HostService: () => (mocks.hostAvailable ? { openMonitorView: mocks.monitorAvailable ? mocks.monitor : undefined } : undefined),
}));
vi.mock('@microsoft/designer-ui', () => ({
  PanelScope: { CardLevel: 'CARD_LEVEL' },
  PanelLocation: { Left: 'LEFT', Right: 'RIGHT' },
  PanelContainer: vi.fn((props: PanelContainerProps) => (
    <div>
      <div data-testid="selected-menu">{props.nodeHeaderItems}</div>
      <div data-testid="alternate-menu">{props.alternateSelectedNodeHeaderItems}</div>
    </div>
  )),
}));
vi.mock('../../../menuItems/commentMenuItem', () => ({
  CommentMenuItem: ({ onClick, hasComment }: { onClick: () => void; hasComment: boolean }) => (
    <button onClick={onClick}>{hasComment ? 'Remove comment' : 'Add comment'}</button>
  ),
}));
vi.mock('../../../menuItems/pinMenuItem', () => ({
  PinMenuItem: ({ onClick }: { onClick: () => void }) => <button onClick={onClick}>Pin</button>,
}));
vi.mock('../../../menuItems/deleteMenuItem', () => ({
  DeleteMenuItem: ({ onClick }: { onClick: () => void }) => <button onClick={onClick}>Delete</button>,
}));

const props: CommonPanelProps = {
  isCollapsed: false,
  toggleCollapse: vi.fn(),
  panelLocation: PanelLocation.Right,
  isResizeable: true,
};

const nodeData = (nodeId: string): NonNullable<ReturnType<typeof usePanelNodeData>> => ({
  nodeId,
  displayName: nodeId,
  iconUri: '',
  isError: false,
  isLoading: false,
  tabs: [],
  onSelectTab: vi.fn(),
  comment: undefined,
  errorMessage: undefined,
  runData: undefined,
  selectedTab: undefined,
  subgraphType: undefined,
});

const panelProps = (): PanelContainerProps => {
  const latest = vi.mocked(PanelContainer).mock.calls.at(-1)?.[0];
  if (!latest) {
    throw new Error('PanelContainer was not rendered');
  }
  return latest;
};

const mountPanel = (overrides: Partial<CommonPanelProps> = {}) =>
  render(
    <IntlProvider locale="en">
      <NodeDetailsPanel {...props} {...overrides} />
    </IntlProvider>
  );

describe('NodeDetailsPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.selected = 'Action';
    mocks.alternate = undefined;
    mocks.readOnly = false;
    mocks.collapsed = false;
    mocks.suppressFocus = false;
    mocks.isA2A = false;
    mocks.isTrigger = false;
    mocks.nodeType = 'Http';
    mocks.runMode = 'Run';
    mocks.runData = undefined;
    mocks.runInstance = undefined;
    mocks.undoRedo = false;
    mocks.hostAvailable = true;
    mocks.monitorAvailable = true;
    mocks.state.workflow.operations.Action.type = 'Http';
    mocks.state.operations.operationInfo.Action.type = 'Http';
    mocks.state.operations.inputParameters = {};
    vi.mocked(useRawInputsOutputs, { partial: true }).mockReturnValue({ data: undefined });
    vi.mocked(usePanelNodeData).mockImplementation((nodeId) => (nodeId ? nodeData(nodeId) : undefined));
    vi.mocked(isOperationNameValid).mockReturnValue({ isValid: true, message: '' });
  });

  afterEach(cleanup);

  it('opts v2 into navigation and passes selected/pinned data and panel options', () => {
    mocks.alternate = { nodeId: 'Pinned', persistence: 'pinned' };
    mocks.collapsed = true;
    mocks.readOnly = true;
    mocks.suppressFocus = true;
    mountPanel();
    expect(panelProps()).toMatchObject({
      enableNodeNavigation: true,
      panelScope: PanelScope.CardLevel,
      isCollapsed: true,
      isResizeable: true,
      readOnlyMode: true,
      suppressDefaultNodeSelectFunctionality: true,
      node: { nodeId: 'Action' },
      alternateSelectedNode: { nodeId: 'Pinned' },
      alternateSelectedNodePersistence: 'pinned',
    });
    expect(mocks.dispatch).toHaveBeenCalledWith({ type: 'updatePanelLocation', payload: PanelLocation.Right });
    expect(useRawInputsOutputs).toHaveBeenCalledWith('Action');
  });

  it('updates location and resize state without losing the navigation opt-in', () => {
    const { rerender } = mountPanel();
    act(() => panelProps().setOverrideWidth?.('700px'));
    expect(panelProps().overrideWidth).toBe('700px');
    rerender(
      <IntlProvider locale="en">
        <NodeDetailsPanel {...props} panelLocation={PanelLocation.Left} />
      </IntlProvider>
    );
    expect(mocks.dispatch).toHaveBeenLastCalledWith({ type: 'updatePanelLocation', payload: PanelLocation.Left });
    expect(panelProps().enableNodeNavigation).toBe(true);
  });

  it('dispatches selected and alternate menu actions for the correct node', () => {
    mocks.alternate = { nodeId: 'Pinned', persistence: 'pinned' };
    vi.mocked(usePanelNodeData).mockImplementation((nodeId) =>
      nodeId ? { ...nodeData(nodeId), comment: nodeId === 'Pinned' ? 'Existing comment' : undefined } : undefined
    );
    mountPanel();
    fireEvent.click(within(screen.getByTestId('selected-menu')).getByText('Add comment'));
    expect(mocks.dispatch).toHaveBeenLastCalledWith({ type: 'setNodeDescription', payload: { nodeId: 'Action', description: '' } });
    fireEvent.click(within(screen.getByTestId('alternate-menu')).getByText('Remove comment'));
    expect(mocks.dispatch).toHaveBeenLastCalledWith({ type: 'setNodeDescription', payload: { nodeId: 'Pinned', description: undefined } });
    fireEvent.click(within(screen.getByTestId('selected-menu')).getByText('Pin'));
    expect(mocks.dispatch).toHaveBeenLastCalledWith({ type: 'setAlternateSelectedNode', payload: { nodeId: 'Action' } });
    expect(within(screen.getByTestId('alternate-menu')).queryByText('Pin')).toBeNull();
    fireEvent.click(within(screen.getByTestId('alternate-menu')).getByText('Delete'));
    expect(mocks.dispatch).toHaveBeenLastCalledWith({ type: 'setShowDeleteModalNodeId', payload: 'Pinned' });
  });

  it('does not offer comments for switch-case containers', () => {
    vi.mocked(usePanelNodeData).mockReturnValue({
      ...nodeData('Action'),
      displayName: 'Case',
      subgraphType: SUBGRAPH_TYPES.SWITCH_CASE,
    });
    mountPanel();
    expect(screen.queryByText('Add comment')).toBeNull();
  });

  it.each([
    { readOnly: false, isA2A: false, agent: false, trigger: true, show: true, hide: false },
    { readOnly: true, isA2A: false, agent: false, trigger: true, show: false, hide: false },
    { readOnly: false, isA2A: true, agent: false, trigger: true, show: false, hide: true },
    { readOnly: false, isA2A: true, agent: true, trigger: false, show: false, hide: false },
  ])('preserves request/agent trigger presentation: %j', ({ readOnly, isA2A, agent, trigger, show, hide }) => {
    mocks.isTrigger = true;
    mocks.readOnly = readOnly;
    mocks.isA2A = isA2A;
    mocks.state.operations.operationInfo.Action.type = 'Request';
    mocks.state.workflow.operations.Action.type = agent ? 'Agent' : 'Request';
    mountPanel();
    expect(panelProps()).toMatchObject({ isTrigger: trigger, showTriggerInfo: show, hideComment: hide });
    expect(within(screen.getByTestId('selected-menu')).queryByText('Add comment') !== null).toBe(!trigger);
  });

  it.each([true, false])('returns name validation and preserves the old name when valid=%s', (valid) => {
    vi.mocked(isOperationNameValid).mockReturnValue({ isValid: valid, message: valid ? '' : 'Invalid name' });
    mountPanel();
    expect(panelProps().onTitleChange('Action', 'NewName')).toEqual({
      valid,
      oldValue: valid ? 'NewName' : 'Action',
      message: valid ? '' : 'Invalid name',
    });
    expect(isOperationNameValid).toHaveBeenCalledWith('Action', 'NewName', false, {}, {}, expect.anything());
    panelProps().handleTitleUpdate('Action', 'NewName');
    expect(mocks.dispatch).toHaveBeenLastCalledWith({ type: 'replaceId', payload: { originalId: 'Action', newId: 'NewName' } });
  });

  it('updates descriptions, dismisses, and unpins via the supplied callbacks', () => {
    mountPanel();
    panelProps().onCommentChange('Action', 'New description');
    expect(mocks.dispatch).toHaveBeenLastCalledWith({
      type: 'setNodeDescription',
      payload: { nodeId: 'Action', description: 'New description' },
    });
    panelProps().toggleCollapse();
    expect(mocks.dispatch).toHaveBeenLastCalledWith({ type: 'clearPanel' });
    panelProps().onUnpinAction?.();
    expect(mocks.dispatch).toHaveBeenLastCalledWith({
      type: 'setAlternateSelectedNode',
      payload: { nodeId: '', updatePanelOpenState: true },
    });
  });

  it('validates every parameter before closing and passes the metadata encoding decision', () => {
    mocks.state.operations.inputParameters.Action = {
      parameterGroups: {
        first: { parameters: [{ id: 'one', value: 'value1' }] },
        second: { parameters: [{ id: 'two', value: 'value2' }] },
      },
    };
    mountPanel();
    mocks.dispatch.mockClear();
    panelProps().onClose();
    expect(mocks.encode).toHaveBeenCalledWith(mocks.state.operations.operationInfo.Action);
    expect(mocks.validate).toHaveBeenCalledTimes(2);
    expect(mocks.validate).toHaveBeenCalledWith({ id: 'one', value: 'value1' }, 'value1', undefined, true);
    expect(mocks.dispatch.mock.calls.map(([action]) => action)).toEqual([
      {
        type: 'updateParameterValidation',
        payload: { nodeId: 'Action', groupId: 'first', parameterId: 'one', validationErrors: ['validation error'] },
      },
      {
        type: 'updateParameterValidation',
        payload: { nodeId: 'Action', groupId: 'second', parameterId: 'two', validationErrors: ['validation error'] },
      },
      { type: 'collapsePanel' },
    ]);
  });

  it.each([
    { alternate: undefined, actions: [{ type: 'collapsePanel' }] },
    { alternate: { nodeId: 'Pinned', persistence: 'pinned' as const }, actions: [{ type: 'clearPanel' }] },
    { alternate: { nodeId: 'Pinned', persistence: 'selected' as const }, actions: [{ type: 'collapsePanel' }] },
    {
      alternate: { nodeId: 'Action', persistence: 'pinned' as const },
      actions: [{ type: 'setAlternateSelectedNode', payload: { nodeId: '' } }, { type: 'collapsePanel' }],
    },
  ])('closes without parameters while preserving distinct pinned panels: %j', ({ alternate, actions }) => {
    mocks.alternate = alternate;
    mountPanel();
    mocks.dispatch.mockClear();
    panelProps().onClose();
    expect(mocks.dispatch.mock.calls.map(([action]) => action)).toEqual(actions);
    expect(mocks.validate).not.toHaveBeenCalled();
  });

  it.each(['Run', 'Draft'])('gates resubmission in %s mode and dispatches the selected run', (mode) => {
    mocks.runMode = mode;
    mocks.runData = { canResubmit: true };
    mocks.runInstance = { name: 'run-1' };
    mountPanel();
    expect(panelProps().canResubmit).toBe(mode !== 'Draft');
    panelProps().resubmitOperation?.('Action');
    expect(mocks.resubmit).toHaveBeenCalledWith('run-1', ['Action']);
    expect(mocks.dispatch).toHaveBeenLastCalledWith({ type: 'clearPanel' });
  });

  it('does not resubmit or dismiss without a run instance', () => {
    mountPanel();
    mocks.dispatch.mockClear();
    panelProps().resubmitOperation?.('Action');
    expect(panelProps().canResubmit).toBe(false);
    expect(mocks.resubmit).not.toHaveBeenCalled();
    expect(mocks.dispatch).not.toHaveBeenCalled();
  });

  it.each([
    { type: 'Workflow', host: true, monitor: true, runName: 'child-run', workflowId: '/workflows/child', visible: true, opens: true },
    { type: 'Http', host: true, monitor: true, runName: 'child-run', workflowId: undefined, visible: false, opens: false },
    { type: 'Workflow', host: false, monitor: true, runName: 'child-run', workflowId: '/workflows/child', visible: false, opens: false },
    { type: 'Workflow', host: true, monitor: false, runName: 'child-run', workflowId: '/workflows/child', visible: false, opens: false },
    { type: 'Workflow', host: true, monitor: true, runName: undefined, workflowId: '/workflows/child', visible: false, opens: false },
  ])('uses raw child-workflow data and available host capabilities: %j', ({ type, host, monitor, runName, workflowId, visible, opens }) => {
    mocks.nodeType = type;
    mocks.hostAvailable = host;
    mocks.monitorAvailable = monitor;
    vi.mocked(useRawInputsOutputs, { partial: true }).mockReturnValue({
      data: { inputs: { host: { workflow: { id: workflowId } } }, outputs: { headers: { 'x-ms-workflow-run-id': runName } } },
    });
    mountPanel();
    expect(panelProps().canShowLogicAppRun).toBe(visible);
    panelProps().showLogicAppRun?.();
    if (opens) {
      expect(mocks.monitor).toHaveBeenCalledWith(workflowId, runName);
    } else {
      expect(mocks.monitor).not.toHaveBeenCalled();
    }
  });
});
