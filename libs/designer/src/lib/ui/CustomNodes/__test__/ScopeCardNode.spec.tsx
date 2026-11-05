import React from 'react';
import type { ComponentProps } from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { MessageBarType } from '@fluentui/react';
import type { ScopeCard } from '@microsoft/designer-ui';
import type { NodeProps } from '@xyflow/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as workflow from '../../../core/state/workflow/workflowSelectors';
import * as options from '../../../core/state/designerOptions/designerOptionsSelectors';
import * as operation from '../../../core/state/operation/operationSelector';
import * as panel from '../../../core/state/panel/panelSelectors';
import { useOperationQuery } from '../../../core/state/selectors/actionMetadataSelector';
import { useSettingValidationErrors } from '../../../core/state/setting/settingSelector';
import { useIsA2AWorkflow } from '../../../core/state/designerView/designerViewSelectors';
import { useAgentActionsRepetition, useAgentRepetition, useNodeRepetition } from '../../../core/queries/runs';
import ScopeCardNode from '../ScopeCardNode';

const mocks = vi.hoisted(() => ({
  dispatch: vi.fn(),
  card: vi.fn(),
  drag: vi.fn(),
  dragRef: vi.fn(),
  dragPreview: vi.fn(),
  hotkeys: vi.fn(),
}));

vi.mock('react-redux', () => ({ useDispatch: () => mocks.dispatch }));
vi.mock('react-dnd', () => ({ useDrag: (...args: unknown[]) => mocks.drag(...args) }));
vi.mock('react-hotkeys-hook', () => ({ useHotkeys: (...args: unknown[]) => mocks.hotkeys(...args) }));

vi.mock('../../../core/state/designerOptions/designerOptionsSelectors', () => ({
  useReadOnly: vi.fn(),
  useMonitoringView: vi.fn(),
}));
vi.mock('../../../core/state/designerView/designerViewSelectors', () => ({ useIsA2AWorkflow: vi.fn() }));
vi.mock('../../../core/state/operation/operationSelector', () => ({
  useBrandColor: vi.fn(),
  useIconUri: vi.fn(),
  useParameterValidationErrors: vi.fn(),
  useTokenDependencies: vi.fn(),
}));
vi.mock('../../../core/state/panel/panelSelectors', () => ({
  useIsNodePinnedToOperationPanel: vi.fn(),
  useIsNodeSelectedInOperationPanel: vi.fn(),
}));
vi.mock('../../../core/state/selectors/actionMetadataSelector', () => ({
  useAllOperations: () => ({}),
  useOperationQuery: vi.fn(),
}));
vi.mock('../../../core/state/setting/settingSelector', () => ({ useSettingValidationErrors: vi.fn() }));
vi.mock('../../../core/state/workflow/workflowSelectors', () => ({
  useActionMetadata: vi.fn(),
  useIsGraphCollapsed: vi.fn(),
  useIsLeafNode: vi.fn(),
  useNodeDisplayName: () => 'Test scope',
  useNodeMetadata: vi.fn(),
  useNodesMetadata: vi.fn(),
  useRunData: vi.fn(),
  useParentRunIndex: () => 2,
  useRunInstance: () => ({ id: 'run-1' }),
  useParentNodeId: () => 'parent',
  useNodeDescription: vi.fn(),
  useShouldNodeFocus: vi.fn(),
  useRunIndex: vi.fn(),
  useActionTimelineRepetitionCount: () => 4,
  useTimelineRepetitionIndex: () => 1,
  useIsActionInSelectedTimelineRepetition: vi.fn(),
  useHandoffActionsForAgent: vi.fn(),
  useFlowErrorsForNode: vi.fn(),
}));
vi.mock('../../../core/queries/runs', () => ({
  useNodeRepetition: vi.fn(),
  useAgentRepetition: vi.fn(),
  useAgentActionsRepetition: vi.fn(),
}));

// Keep the component's dispatch contract observable without loading the store or running thunks.
vi.mock('../../../core/state/panel/panelSlice', () => ({
  changePanelNode: (payload: unknown) => ({ type: 'panel/changePanelNode', payload }),
}));
vi.mock('../../../core/state/designerView/designerViewSlice', () => ({
  setNodeContextMenuData: (payload: unknown) => ({ type: 'designerView/setNodeContextMenuData', payload }),
  setShowDeleteModalNodeId: (payload: unknown) => ({ type: 'designerView/setShowDeleteModalNodeId', payload }),
}));
vi.mock('../../../core/state/workflow/workflowSlice', () => ({
  setFocusElement: (payload: unknown) => ({ type: 'workflow/setFocusElement', payload }),
  setRepetitionRunData: (payload: unknown) => ({ type: 'workflow/setRepetitionRunData', payload }),
  setSubgraphRunData: (payload: unknown) => ({ type: 'workflow/setSubgraphRunData', payload }),
  toggleCollapsedGraphId: (payload: unknown) => ({ type: 'workflow/toggleCollapsedGraphId', payload }),
  updateAgenticGraph: (payload: unknown) => ({ type: 'workflow/updateAgenticGraph', payload }),
  updateAgenticMetadata: (payload: unknown) => ({ type: 'workflow/updateAgenticMetadata', payload }),
}));
vi.mock('../../../core/actions/bjsworkflow/move', () => ({
  moveOperation: (payload: unknown) => ({ type: 'moveOperation', payload }),
}));
vi.mock('../../../core/actions/bjsworkflow/copypaste', () => ({
  copyScopeOperation: (payload: unknown) => ({ type: 'copyScopeOperation', payload }),
}));

vi.mock('@microsoft/logic-apps-shared', async (importOriginal) => ({
  ...((await importOriginal()) as object),
  useNodeIndex: () => 7,
}));
vi.mock('../../common/LoopsPager/helper', () => ({
  getRepetitionName: () => '000002',
  getScopeRepetitionName: () => '000001',
}));
vi.mock('../../common/LoopsPager/LoopsPager', () => ({
  LoopsPager: ({
    scopeId,
    collapsed,
    focusElement,
  }: { scopeId: string; collapsed: boolean; focusElement: (index: number, id: string) => void }) => (
    <button data-testid="loops-pager" data-collapsed={collapsed} onClick={() => focusElement(3, scopeId)}>
      Next repetition
    </button>
  ),
}));
vi.mock('../../connections/dropzone', () => ({
  DropZone: ({ graphId, parentId, tabIndex }: { graphId: string; parentId: string; tabIndex: number }) => (
    <div data-testid="dropzone" data-graph={graphId} data-parent={parentId} tabIndex={tabIndex} />
  ),
}));
vi.mock('../../common/DesignerContextualMenu/CopyTooltip', () => ({
  CopyTooltip: ({ id, hideTooltip }: { id: string; hideTooltip: () => void }) => <button onClick={hideTooltip}>Copied {id}</button>,
}));
vi.mock('../handles/EdgeDrawTargetHandle', () => ({
  EdgeDrawTargetHandle: () => <div data-testid="target-handle" />,
}));
vi.mock('../handles/EdgeDrawSourceHandle', () => ({
  EdgeDrawSourceHandle: () => <div data-testid="footer-source-handle" />,
}));
vi.mock('../handles/DefaultHandle', () => ({
  DefaultHandle: ({ type }: { type: string }) => <div data-testid={`default-${type}-handle`} />,
}));
vi.mock('@microsoft/designer-ui', () => ({
  ScopeCard: (props: ComponentProps<typeof ScopeCard>) => {
    mocks.card(props);
    return (
      <div data-testid="scope-card" onContextMenu={props.onContextMenu}>
        <button onClick={() => props.onClick?.()}>{props.title}</button>
        <button onClick={props.onDeleteClick}>Delete</button>
        <button onClick={() => props.handleCollapse?.()}>Collapse</button>
        {props.errorMessage && <span role="alert">{props.errorMessage}</span>}
      </div>
    );
  },
}));

const renderScope = (id = 'testScope-#scope') => render(<ScopeCardNode {...({ id } as NodeProps)} />);
const cardProps = (): ComponentProps<typeof ScopeCard> => mocks.card.mock.lastCall![0];
const expectAction = (type: string, payload: unknown) => expect(mocks.dispatch).toHaveBeenCalledWith({ type, payload });

// Partial query/selector fixtures deliberately contain only the fields consumed by this component.
const returns = (hook: unknown, value: unknown) => vi.mocked(hook as () => unknown).mockReturnValue(value);
const queryResult = (data?: unknown, isFetching = false) => ({ data, isFetching });

describe('legacy ScopeCardNode', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    returns(options.useReadOnly, false);
    returns(options.useMonitoringView, false);
    returns(useIsA2AWorkflow, false);
    returns(operation.useBrandColor, '#123456');
    returns(operation.useIconUri, 'scope.svg');
    returns(operation.useParameterValidationErrors, []);
    returns(operation.useTokenDependencies, { dependencies: ['input'], loopSources: ['loop'] });
    returns(panel.useIsNodePinnedToOperationPanel, false);
    returns(panel.useIsNodeSelectedInOperationPanel, false);
    returns(useOperationQuery, { isLoading: false, isError: false });
    returns(useSettingValidationErrors, []);
    returns(workflow.useActionMetadata, { type: 'Scope' });
    returns(workflow.useIsGraphCollapsed, false);
    returns(workflow.useIsLeafNode, false);
    returns(workflow.useNodeMetadata, { graphId: 'old-graph', actionCount: 3 });
    returns(workflow.useNodesMetadata, {});
    returns(workflow.useRunData, undefined);
    returns(workflow.useNodeDescription, undefined);
    returns(workflow.useShouldNodeFocus, false);
    returns(workflow.useRunIndex, 1);
    returns(workflow.useIsActionInSelectedTimelineRepetition, true);
    returns(workflow.useHandoffActionsForAgent, []);
    returns(workflow.useFlowErrorsForNode, []);
    returns(useNodeRepetition, queryResult());
    returns(useAgentRepetition, queryResult());
    returns(useAgentActionsRepetition, queryResult());
    mocks.drag.mockReturnValue([{ isDragging: false }, mocks.dragRef, mocks.dragPreview]);
    mocks.hotkeys.mockReturnValue(vi.fn());
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('passes legacy identity, appearance, focus, comments and run information to the card', () => {
    returns(workflow.useNodeDescription, 'Review these actions');
    returns(workflow.useShouldNodeFocus, true);
    renderScope();

    expect(screen.getByRole('button', { name: 'Test scope' })).toBeInTheDocument();
    expect(cardProps()).toMatchObject({
      id: 'testScope',
      title: 'Test scope',
      brandColor: '#123456',
      icon: 'scope.svg',
      active: true,
      showStatusPill: false,
      isLoading: false,
      selectionMode: false,
      setFocus: true,
      nodeIndex: 7,
      timelineRepetitionCount: 4,
      commentBox: { brandColor: '#123456', comment: 'Review these actions', isDismissed: false, isEditing: false },
    });
    expect(screen.getByTestId('target-handle')).toBeInTheDocument();
    expect(screen.getByTestId('default-source-handle')).toBeInTheDocument();
    expect(screen.queryByTestId('footer-source-handle')).not.toBeInTheDocument();
    expect(mocks.dispatch).not.toHaveBeenCalled();
  });

  it('renders nothing for an operation that no longer exists', () => {
    returns(workflow.useActionMetadata, undefined);
    const { container } = renderScope();
    expect(container).toBeEmptyDOMElement();
    expect(mocks.card).not.toHaveBeenCalled();
  });

  it.each([
    [false, false, false],
    [true, false, 'pinned'],
    [true, true, 'selected'],
  ])('maps pinned=%s and selected=%s to selection mode %s', (pinned, selected, mode) => {
    returns(panel.useIsNodePinnedToOperationPanel, pinned);
    returns(panel.useIsNodeSelectedInOperationPanel, selected);
    renderScope();
    expect(cardProps().selectionMode).toBe(mode);
    expect(cardProps().commentBox).toBeUndefined();
  });

  it('selects, deletes, collapses and opens the context menu using the normalized scope id', () => {
    renderScope();
    fireEvent.click(screen.getByRole('button', { name: 'Test scope' }));
    expectAction('panel/changePanelNode', 'testScope');
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    expectAction('designerView/setShowDeleteModalNodeId', 'testScope');
    fireEvent.click(screen.getByRole('button', { name: 'Collapse', exact: true }));
    expectAction('workflow/toggleCollapsedGraphId', { id: 'testScope', includeNested: undefined });
    expect(fireEvent.contextMenu(screen.getByTestId('scope-card'), { clientX: 15, clientY: 29 })).toBe(false);
    expectAction('designerView/setNodeContextMenuData', { nodeId: 'testScope', location: { x: 15, y: 29 } });
  });

  it('copies the full canvas id through the hotkey and expires the feedback after three seconds', () => {
    vi.useFakeTimers();
    renderScope();
    expect(mocks.hotkeys).toHaveBeenCalledWith(['meta+c', 'ctrl+c'], expect.any(Function), { preventDefault: true });
    act(() => mocks.hotkeys.mock.lastCall![1]());
    expectAction('copyScopeOperation', { nodeId: 'testScope-#scope' });
    expect(screen.getByRole('button', { name: 'Copied testScope' })).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(2999));
    expect(screen.getByRole('button', { name: 'Copied testScope' })).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(1));
    expect(screen.queryByRole('button', { name: 'Copied testScope' })).not.toBeInTheDocument();
  });

  it('dismisses copy feedback and clears its pending timeout', () => {
    vi.useFakeTimers();
    renderScope();
    act(() => mocks.hotkeys.mock.lastCall![1]());
    fireEvent.click(screen.getByRole('button', { name: 'Copied testScope' }));
    expect(screen.queryByRole('button', { name: 'Copied testScope' })).not.toBeInTheDocument();
    expect(vi.getTimerCount()).toBe(0);
  });

  it.each(['old-graph', undefined])('moves a dragged scope from graph %s only after a successful drop', (graphId) => {
    returns(workflow.useNodeMetadata, { graphId, actionCount: 3 });
    mocks.drag.mockReturnValue([{ isDragging: true }, mocks.dragRef, mocks.dragPreview]);
    renderScope();
    const spec = mocks.drag.mock.lastCall![0]();
    expect(spec).toMatchObject({
      type: 'BOX',
      canDrag: true,
      item: { id: 'testScope-#scope', dependencies: ['input'], loopSources: ['loop'], isScope: true, isAgent: false },
    });
    expect(spec.collect({ isDragging: () => true })).toEqual({ isDragging: true });
    expect(cardProps()).toMatchObject({ isDragging: true, drag: mocks.dragRef, dragPreview: mocks.dragPreview });
    const dropResult = { graphId: 'new-graph', parentId: 'before', childId: 'after' };
    spec.end(undefined, { getDropResult: () => dropResult });
    spec.end(spec.item, { getDropResult: () => null });
    expect(mocks.dispatch).not.toHaveBeenCalled();
    spec.end(spec.item, { getDropResult: () => dropResult });
    expectAction('moveOperation', {
      nodeId: 'testScope',
      oldGraphId: graphId ?? 'root',
      newGraphId: 'new-graph',
      relationshipIds: dropResult,
    });
  });

  it('offers an insertion dropzone for an editable empty scope', () => {
    returns(workflow.useIsLeafNode, true);
    renderScope();
    expect(screen.getByTestId('dropzone')).toHaveAttribute('data-graph', 'testScope');
    expect(screen.getByTestId('dropzone')).toHaveAttribute('data-parent', 'testScope-#scope');
    expect(screen.getByTestId('dropzone')).toHaveAttribute('tabindex', '7');
  });

  it('disables dragging and replaces the insertion zone with No actions in read-only mode', () => {
    returns(workflow.useIsLeafNode, true);
    returns(options.useReadOnly, true);
    renderScope();
    expect(screen.getByText('No actions')).toBeInTheDocument();
    expect(screen.queryByTestId('dropzone')).not.toBeInTheDocument();
    expect(cardProps()).toMatchObject({ readOnly: true, draggable: false });
    expect(mocks.drag.mock.lastCall![0]().canDrag).toBe(false);
  });

  it.each([
    ['Scope', '3 Actions'],
    ['Switch', '3 Cases'],
    ['If', '3 Cases'],
    ['Agent', '3 Cases'],
  ])('shows the collapsed %s count without an insertion zone', (type, text) => {
    returns(workflow.useActionMetadata, { type });
    returns(workflow.useIsGraphCollapsed, true);
    returns(workflow.useIsLeafNode, true);
    renderScope();
    expect(screen.getByText(text)).toBeInTheDocument();
    expect(screen.queryByTestId('dropzone')).not.toBeInTheDocument();
    expect(cardProps().collapsed).toBe(true);
  });

  it('uses the footer source handle and suppresses collapsed text and empty insertion UI', () => {
    returns(workflow.useIsGraphCollapsed, true);
    returns(workflow.useIsLeafNode, true);
    renderScope('testScope-#footer');
    expect(screen.getByTestId('footer-source-handle')).toBeInTheDocument();
    expect(screen.queryByTestId('default-source-handle')).not.toBeInTheDocument();
    expect(screen.queryByText('3 Actions')).not.toBeInTheDocument();
    expect(screen.queryByTestId('dropzone')).not.toBeInTheDocument();
  });

  it.each([false, true])('excludes single-action handoffs from empty agent messaging (monitoring=%s)', (monitoring) => {
    returns(workflow.useActionMetadata, { type: 'Agent' });
    returns(workflow.useNodeMetadata, { actionCount: 1 });
    returns(workflow.useHandoffActionsForAgent, [{ isSingleAction: true }, { isSingleAction: false }]);
    returns(workflow.useIsLeafNode, true);
    returns(options.useMonitoringView, monitoring);
    renderScope();
    expect(screen.getByText(monitoring ? 'This iteration has completed without any tool execution' : 'Add tool')).toBeInTheDocument();
    expect(screen.queryByTestId('dropzone')).not.toBeInTheDocument();
    expect(cardProps().showStatusPill).toBe(false);
    expect(mocks.drag.mock.lastCall![0]().item.isAgent).toBe(true);
  });

  it.each(['manifest', 'settings', 'parameters', 'flow'])('prioritizes %s errors over lower-priority errors', (error) => {
    returns(useOperationQuery, { isError: error === 'manifest' });
    returns(useSettingValidationErrors, ['manifest', 'settings'].includes(error) ? ['invalid'] : []);
    returns(operation.useParameterValidationErrors, error !== 'flow' ? ['invalid'] : []);
    returns(workflow.useFlowErrorsForNode, ['unreachable']);
    const messages = {
      manifest: 'Error fetching manifest',
      settings: 'Invalid settings',
      parameters: 'Invalid parameters',
      flow: 'Action unreachable',
    };
    renderScope();
    expect(screen.getByRole('alert')).toHaveTextContent(messages[error as keyof typeof messages]);
    expect(cardProps().errorLevel).toBe(error === 'manifest' ? MessageBarType.error : MessageBarType.severeWarning);
  });

  it('shows the real monitoring error and run status for a failed scope', () => {
    const runData = { status: 'Failed', code: 'BadRequest', error: { code: 'BadRequest', message: 'Invalid input' } };
    returns(options.useMonitoringView, true);
    returns(workflow.useRunData, runData);
    renderScope();
    expect(screen.getByRole('alert')).toHaveTextContent('BadRequest. Invalid input');
    expect(cardProps()).toMatchObject({ active: true, showStatusPill: true, runData, errorLevel: MessageBarType.severeWarning });
  });

  it('marks an unexecuted monitored scope inactive without a status pill', () => {
    returns(options.useMonitoringView, true);
    renderScope();
    expect(cardProps()).toMatchObject({ active: false, showStatusPill: false });
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it.each(['node', 'agent', 'actions', 'manifest', 'appearance'])('shows loading while %s data is unavailable', (source) => {
    if (source === 'node') returns(useNodeRepetition, queryResult(undefined, true));
    if (source === 'agent') returns(useAgentRepetition, queryResult(undefined, true));
    if (source === 'actions') returns(useAgentActionsRepetition, queryResult(undefined, true));
    if (source === 'manifest') returns(useOperationQuery, { isLoading: true });
    if (source === 'appearance') {
      returns(operation.useBrandColor, undefined);
      returns(operation.useIconUri, undefined);
    }
    renderScope();
    expect(cardProps().isLoading).toBe(true);
  });

  it('renders the completed loop pager and dispatches focus for its selected repetition', () => {
    returns(options.useMonitoringView, true);
    returns(workflow.useActionMetadata, { type: 'Foreach' });
    returns(workflow.useNodeMetadata, { actionCount: 3, runData: { status: 'Succeeded' } });
    returns(workflow.useIsGraphCollapsed, true);
    renderScope();
    expect(screen.getByTestId('loops-pager')).toHaveAttribute('data-collapsed', 'true');
    fireEvent.click(screen.getByRole('button', { name: 'Next repetition' }));
    expectAction('workflow/setFocusElement', 'testScope-3-0');
  });

  it.each([undefined, [], { status: 'InProgress' }])('omits the loop pager for incomplete or aggregate run data %j', (runData) => {
    returns(options.useMonitoringView, true);
    returns(workflow.useActionMetadata, { type: 'Foreach' });
    returns(workflow.useNodeMetadata, { runData });
    renderScope();
    expect(screen.queryByTestId('loops-pager')).not.toBeInTheDocument();
  });

  it('loads agent repetitions with the scope, run and parent status and dispatches all fresh run data', () => {
    returns(options.useMonitoringView, true);
    returns(workflow.useActionMetadata, { type: 'Agent' });
    returns(workflow.useRunData, { status: 'Succeeded', correlation: { actionTrackingId: 'old' } });
    const agent = { inputsLink: { uri: 'new-inputs' } };
    const repetition = { correlation: { actionTrackingId: 'new' }, status: 'Succeeded' };
    const actions = [{ name: 'tool-1', properties: { status: 'Succeeded' } }];
    returns(useAgentRepetition, queryResult({ properties: agent }));
    returns(useNodeRepetition, queryResult({ properties: repetition }));
    returns(useAgentActionsRepetition, queryResult(actions));
    renderScope();
    expect(useNodeRepetition).toHaveBeenCalledWith(true, 'testScope', 'run-1', '000002', 'Succeeded', 2, false);
    expect(useAgentRepetition).toHaveBeenCalledWith(true, true, 'testScope', 'run-1', '000001', 'Succeeded', 1);
    expect(useAgentActionsRepetition).toHaveBeenCalledWith(true, 'testScope', 'run-1', '000001', 'Succeeded', 1);
    expectAction('workflow/setSubgraphRunData', { nodeId: 'testScope', runData: actions });
    expectAction('workflow/updateAgenticGraph', { nodeId: 'testScope', scopeRepetitionRunData: agent });
    expectAction('workflow/updateAgenticMetadata', { nodeId: 'testScope', scopeRepetitionRunData: agent });
    expectAction('workflow/setRepetitionRunData', { nodeId: 'testScope', runData: repetition });
    expect(mocks.dispatch).toHaveBeenCalledTimes(4);
  });

  it('does not dispatch duplicate agent inputs or repetition correlation data', () => {
    returns(options.useMonitoringView, true);
    returns(workflow.useActionMetadata, { type: 'Agent' });
    returns(workflow.useNodesMetadata, { testScope: { runData: { inputsLink: { uri: 'existing' } } } });
    returns(workflow.useRunData, { correlation: { actionTrackingId: 'existing' } });
    returns(useAgentRepetition, queryResult({ properties: { inputsLink: { uri: 'existing' } } }));
    returns(useNodeRepetition, queryResult({ properties: { correlation: { actionTrackingId: 'existing' } } }));
    renderScope();
    expect(mocks.dispatch).not.toHaveBeenCalled();
  });

  it('ignores repetition graph updates outside the selected monitoring timeline', () => {
    returns(options.useMonitoringView, true);
    returns(workflow.useActionMetadata, { type: 'Agent' });
    returns(workflow.useIsActionInSelectedTimelineRepetition, false);
    returns(useAgentRepetition, queryResult({ properties: { inputsLink: { uri: 'other-inputs' } } }));
    returns(useNodeRepetition, queryResult({ properties: { correlation: { actionTrackingId: 'other' } } }));
    renderScope();
    expect(useAgentRepetition).toHaveBeenCalledWith(true, true, 'testScope', undefined, '000001', undefined, 1);
    expect(mocks.dispatch).not.toHaveBeenCalled();
  });

  it('disables agent iteration requests in A2A workflows but still loads their action repetitions', () => {
    returns(options.useMonitoringView, true);
    returns(workflow.useActionMetadata, { type: 'Agent' });
    returns(useIsA2AWorkflow, true);
    renderScope();
    expect(useAgentRepetition).toHaveBeenCalledWith(false, true, 'testScope', 'run-1', '000001', undefined, 1);
    expect(useAgentActionsRepetition).toHaveBeenCalledWith(true, 'testScope', 'run-1', '000001', undefined, 1);
  });
});
