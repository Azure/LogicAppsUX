import React from 'react';
import renderer, { act, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SUBGRAPH_TYPES } from '@microsoft/logic-apps-shared';
import { DesignerContextualMenu } from '../DesignerContextualMenu';
import * as designerViewSelectors from '../../../../core/state/designerView/designerViewSelectors';
import * as panelSelectors from '../../../../core/state/panel/panelSelectors';
import * as workflowSelectors from '../../../../core/state/workflow/workflowSelectors';
import * as designerOptionsSelectors from '../../../../core/state/designerOptions/designerOptionsSelectors';
import * as operationInfoHook from '../../../../core/state/selectors/actionMetadataSelector';
import { RUN_AFTER_PANEL_TAB } from '../../../../ui/CustomNodes/constants';

const mocks = vi.hoisted(() => ({
  dispatch: vi.fn(),
  screenToFlowPosition: vi.fn(({ x, y }: { x: number; y: number }) => ({ x: x / 2, y: y / 2 })),
  getRecordEntry: vi.fn(() => ({})),
  isScopeOperation: vi.fn(() => false),
  isUiInteractionsServiceEnabled: vi.fn(() => false),
  getNodeContextMenuItems: vi.fn(() => [] as any[]),
  resubmitWorkflow: vi.fn(),
  openMonitorView: vi.fn(),
  shouldDisplayRunAfter: vi.fn(() => false),
  getChildRunNameFromOutputs: vi.fn(() => undefined as string | undefined),
  getChildWorkflowIdFromInputs: vi.fn(() => undefined as string | undefined),
  rawInputsOutputs: { data: { inputs: {}, outputs: {} } } as { data?: { inputs?: unknown; outputs?: unknown } },
  copyOperation: vi.fn(({ nodeId }: { nodeId: string }) => ({ type: 'test/copyOperation', payload: { nodeId } })),
  copyScopeOperation: vi.fn(({ nodeId }: { nodeId: string }) => ({ type: 'test/copyScopeOperation', payload: { nodeId } })),
  copyOperations: vi.fn(({ nodeIds }: { nodeIds: string[] }) => ({ type: 'test/copyOperations', payload: { nodeIds } })),
  cutOperations: vi.fn(({ nodeIds }: { nodeIds: string[] }) => ({ type: 'test/cutOperations', payload: { nodeIds } })),
}));

vi.mock('react-redux', () => ({
  useDispatch: () => mocks.dispatch,
  useSelector: (selector: any) => selector({ workflow: { operations: {} } }),
}));

vi.mock('@xyflow/react', () => ({
  useReactFlow: () => ({
    screenToFlowPosition: mocks.screenToFlowPosition,
  }),
}));

vi.mock('react-intl', async () => {
  const actualIntl = await vi.importActual('react-intl');
  return {
    ...actualIntl,
    useIntl: () => ({
      formatMessage: ({ defaultMessage }: { defaultMessage: string }, values?: Record<string, unknown>) =>
        defaultMessage.replace('{count}', String(values?.count ?? '')),
    }),
  };
});

vi.mock('@fluentui/react-components', async () => {
  const actual = await vi.importActual('@fluentui/react-components');
  return {
    ...actual,
    MenuItem: ({ children, disabled, onClick, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
      <button type="button" disabled={disabled} onClick={onClick} {...props}>
        {children}
      </button>
    ),
  };
});

vi.mock('@microsoft/designer-ui', () => ({
  PanelLocation: { Left: 'left', Right: 'right' },
  CardContextMenu: ({
    contextMenuLocation,
    menuItems,
    open,
    setOpen,
    title,
  }: {
    contextMenuLocation?: { x: number; y: number };
    menuItems: JSX.Element[];
    open: boolean;
    setOpen: (open: boolean) => void;
    title: string;
  }) => (
    <div
      data-testid="card-context-menu"
      data-location={contextMenuLocation ? `${contextMenuLocation.x},${contextMenuLocation.y}` : ''}
      data-open={open}
      data-title={title}
    >
      <button type="button" data-testid="close-context-menu" onClick={() => setOpen(false)}>
        Close
      </button>
      {menuItems.map((item, index) => React.cloneElement(item, { key: item.key ?? index }))}
    </div>
  ),
}));

vi.mock('@microsoft/logic-apps-shared', async () => {
  const actual = await vi.importActual('@microsoft/logic-apps-shared');
  return {
    ...actual,
    getRecordEntry: mocks.getRecordEntry,
    HostService: () => ({ openMonitorView: mocks.openMonitorView }),
    isScopeOperation: mocks.isScopeOperation,
    isUiInteractionsServiceEnabled: mocks.isUiInteractionsServiceEnabled,
    UiInteractionsService: () => ({ getNodeContextMenuItems: mocks.getNodeContextMenuItems }),
    WorkflowService: () => ({ resubmitWorkflow: mocks.resubmitWorkflow }),
  };
});

vi.mock('../../../../core/actions/bjsworkflow/copypaste', () => ({
  copyOperation: mocks.copyOperation,
  copyOperations: mocks.copyOperations,
  copyScopeOperation: mocks.copyScopeOperation,
  cutOperations: mocks.cutOperations,
}));

vi.mock('../../../../ui/CustomNodes/helpers', () => ({
  shouldDisplayRunAfter: mocks.shouldDisplayRunAfter,
}));

vi.mock('../../../panel/nodeDetailsPanel/childWorkflowHelpers', () => ({
  getChildRunNameFromOutputs: mocks.getChildRunNameFromOutputs,
  getChildWorkflowIdFromInputs: mocks.getChildWorkflowIdFromInputs,
}));

vi.mock('../../../panel/nodeDetailsPanel/useRawInputsOutputs', () => ({
  useRawInputsOutputs: () => mocks.rawInputsOutputs,
}));

vi.mock('../../../../ui/menuItems', () => ({
  DeleteMenuItem: ({ onClick, showKey }: { onClick: () => void; showKey?: boolean }) => (
    <button type="button" data-testid="delete-menu-item" data-show-key={showKey} onClick={onClick}>
      Delete
    </button>
  ),
  CopyMenuItem: ({ isScope, onClick }: { isScope: boolean; onClick: () => void }) => (
    <button type="button" data-testid="copy-menu-item" data-is-scope={isScope} onClick={onClick}>
      Copy
    </button>
  ),
  ResubmitMenuItem: ({ onClick }: { onClick: () => void }) => (
    <button type="button" data-testid="resubmit-menu-item" onClick={onClick}>
      Resubmit
    </button>
  ),
  ExpandCollapseMenuItem: ({ nodeId }: { nodeId: string }) => (
    <div data-testid="expand-collapse-menu-item" data-node-id={nodeId}>
      Expand/Collapse
    </div>
  ),
  CollapseMenuItem: ({ nodeId, onClick }: { nodeId: string; onClick: () => void }) => (
    <button type="button" data-testid="collapse-menu-item" data-node-id={nodeId} onClick={onClick}>
      Collapse
    </button>
  ),
}));

vi.mock('../../../../ui/menuItems/showLogicAppRunMenuItem', () => ({
  ShowLogicAppRunMenuItem: ({ onClick }: { onClick: () => void }) => (
    <button type="button" data-testid="show-logic-app-run-menu-item" onClick={onClick}>
      Show child run
    </button>
  ),
}));

vi.mock('../../../../ui/menuItems/pinMenuItem', () => ({
  PinMenuItem: ({ onClick }: { onClick: () => void }) => (
    <button type="button" data-testid="pin-menu-item" onClick={onClick}>
      Pin
    </button>
  ),
}));

vi.mock('../../../../ui/menuItems/runAfterMenuItem', () => ({
  RunAfterMenuItem: ({ onClick }: { onClick: () => void }) => (
    <button type="button" data-testid="run-after-menu-item" onClick={onClick}>
      Run After
    </button>
  ),
}));

vi.mock('../../../../ui/menuItems/addNoteMenuItem', () => ({
  AddNoteMenuItem: ({ onClick }: { onClick: () => void }) => (
    <button type="button" data-testid="add-note-menu-item" onClick={onClick}>
      Add Note
    </button>
  ),
}));

vi.mock('../CopyTooltip', () => ({
  CopyTooltip: ({ hideTooltip, id }: { hideTooltip: () => void; id: string }) => (
    <button type="button" data-testid="copy-tooltip" data-node-id={id} onClick={hideTooltip}>
      Copied
    </button>
  ),
}));

vi.mock('../../EdgeContextualMenu/customMenu', () => ({
  CustomMenu: ({ item }: { item: { text?: string } }) => <div data-testid="custom-menu-item">{item.text}</div>,
}));

vi.mock('../../../panel/multiSelectPanel/workflowExtraction', () => ({
  WorkflowExtractionAction: ({ onClick, variant }: { onClick: () => void; variant: string }) => (
    <button type="button" data-testid="workflow-extraction-action" data-variant={variant} onClick={onClick}>
      Extract to new workflow
    </button>
  ),
}));

const renderMenu = (): ReactTestRenderer => {
  let tree!: ReactTestRenderer;
  act(() => {
    tree = renderer.create(<DesignerContextualMenu />);
  });
  return tree;
};

const click = (instance: ReactTestInstance) => {
  act(() => {
    instance.props.onClick();
  });
};

const dispatchedAction = (typeSuffix: string) =>
  mocks.dispatch.mock.calls.map(([action]) => action).find((action) => action?.type?.endsWith(typeSuffix));

const menuItemText = (instance: ReactTestInstance) => {
  const button = instance.type === 'button' ? instance : instance.findByType('button');
  return button.children.filter((child): child is string => typeof child === 'string').join('');
};

describe('DesignerContextualMenu', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    mocks.rawInputsOutputs = { data: { inputs: {}, outputs: {} } };

    vi.spyOn(designerViewSelectors, 'useNodeContextMenuData').mockReturnValue({
      nodeId: 'test-node',
      location: { x: 100, y: 80 },
    });
    vi.spyOn(workflowSelectors, 'useIsActionCollapsed').mockReturnValue(false);
    vi.spyOn(workflowSelectors, 'useNodeDisplayName').mockReturnValue('Test Node');
    vi.spyOn(workflowSelectors, 'useNodeMetadata').mockReturnValue({});
    vi.spyOn(workflowSelectors, 'useRunData').mockReturnValue({});
    vi.spyOn(workflowSelectors, 'useRunInstance').mockReturnValue(undefined);
    vi.spyOn(workflowSelectors, 'useRunMode').mockReturnValue('Draft');
    vi.spyOn(workflowSelectors, 'useIsAgentLoop').mockReturnValue(false);
    vi.spyOn(panelSelectors, 'useOperationAlternateSelectedNodeId').mockReturnValue('');
    vi.spyOn(panelSelectors, 'useOperationPanelSelectedNodeIds').mockReturnValue([]);
    vi.spyOn(designerOptionsSelectors, 'useSuppressDefaultNodeSelectFunctionality').mockReturnValue(false);
    vi.spyOn(designerOptionsSelectors, 'useNodeSelectAdditionalCallback').mockReturnValue(undefined);
    vi.spyOn(operationInfoHook, 'useOperationInfo').mockReturnValue({ type: 'action' } as any);
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  it('renders the standard action commands and handles delete, copy, pin, collapse, and tooltip dismissal', () => {
    const tree = renderMenu();

    expect(tree.root.findByProps({ 'data-testid': 'card-context-menu' }).props).toMatchObject({
      'data-location': '100,80',
      'data-open': true,
      'data-title': 'Test Node',
    });
    expect(tree.root.findAllByProps({ 'data-testid': 'workflow-extraction-action' })).toHaveLength(0);

    click(tree.root.findByProps({ 'data-testid': 'delete-menu-item' }));
    expect(dispatchedAction('setShowDeleteModalNodeId')?.payload).toBe('test-node');

    click(tree.root.findByProps({ 'data-testid': 'copy-menu-item' }));
    expect(mocks.copyOperation).toHaveBeenCalledWith({ nodeId: 'test-node' });
    expect(mocks.dispatch).toHaveBeenCalledWith({ type: 'test/copyOperation', payload: { nodeId: 'test-node' } });
    expect(tree.root.findByProps({ 'data-testid': 'copy-tooltip' }).props['data-node-id']).toBe('test-node');

    click(tree.root.findByProps({ 'data-testid': 'copy-tooltip' }));
    expect(tree.root.findAllByProps({ 'data-testid': 'copy-tooltip' })).toHaveLength(0);

    click(tree.root.findByProps({ 'data-testid': 'pin-menu-item' }));
    expect(dispatchedAction('setAlternateSelectedNode')?.payload).toEqual({
      nodeId: 'test-node',
      updatePanelOpenState: true,
      panelPersistence: 'pinned',
    });

    click(tree.root.findByProps({ 'data-testid': 'collapse-menu-item' }));
    expect(dispatchedAction('toggleCollapsedActionId')?.payload).toBe('test-node');

    click(tree.root.findByProps({ 'data-testid': 'close-context-menu' }));
    expect(tree.root.findByProps({ 'data-testid': 'card-context-menu' }).props['data-open']).toBe(false);
  });

  it('copies a scope with the scope-specific action and unpins the alternate node', () => {
    mocks.isScopeOperation.mockReturnValue(true);
    vi.spyOn(panelSelectors, 'useOperationAlternateSelectedNodeId').mockReturnValue('test-node');

    const tree = renderMenu();

    expect(tree.root.findByProps({ 'data-testid': 'copy-menu-item' }).props['data-is-scope']).toBe(true);
    click(tree.root.findByProps({ 'data-testid': 'copy-menu-item' }));
    expect(mocks.copyScopeOperation).toHaveBeenCalledWith({ nodeId: 'test-node' });

    click(tree.root.findByProps({ 'data-testid': 'pin-menu-item' }));
    expect(dispatchedAction('setAlternateSelectedNode')?.payload.nodeId).toBe('');
    expect(tree.root.findByProps({ 'data-testid': 'expand-collapse-menu-item' }).props['data-node-id']).toBe('test-node');
  });

  it('renders only collapse for a collapsed action', () => {
    vi.spyOn(workflowSelectors, 'useIsActionCollapsed').mockReturnValue(true);

    const tree = renderMenu();

    expect(tree.root.findAllByProps({ 'data-testid': 'collapse-menu-item' })).toHaveLength(1);
    expect(tree.root.findAllByProps({ 'data-testid': 'delete-menu-item' })).toHaveLength(0);
    expect(tree.root.findAllByProps({ 'data-testid': 'copy-menu-item' })).toHaveLength(0);
  });

  it('renders optional custom, resubmit, child-run, and run-after commands and invokes them', () => {
    const nodeSelectCallback = vi.fn();
    mocks.isUiInteractionsServiceEnabled.mockReturnValue(true);
    mocks.getNodeContextMenuItems.mockReturnValue([{ priority: 50, text: 'Host command' }]);
    mocks.shouldDisplayRunAfter.mockReturnValue(true);
    mocks.getChildRunNameFromOutputs.mockReturnValue('child-run');
    mocks.getChildWorkflowIdFromInputs.mockReturnValue('/workflows/child');
    mocks.rawInputsOutputs = { data: { inputs: { host: true }, outputs: { headers: true } } };
    vi.spyOn(workflowSelectors, 'useRunData').mockReturnValue({ canResubmit: true } as any);
    vi.spyOn(workflowSelectors, 'useRunInstance').mockReturnValue({ name: 'parent-run' } as any);
    vi.spyOn(workflowSelectors, 'useRunMode').mockReturnValue('Run' as any);
    vi.spyOn(designerOptionsSelectors, 'useNodeSelectAdditionalCallback').mockReturnValue(nodeSelectCallback);
    vi.spyOn(operationInfoHook, 'useOperationInfo').mockReturnValue({ type: 'workflow' } as any);
    vi.spyOn(workflowSelectors, 'useNodeMetadata').mockReturnValue({ graphId: 'graph-a' } as any);

    const tree = renderMenu();

    expect(tree.root.findByProps({ 'data-testid': 'custom-menu-item' }).children).toEqual(['Host command']);
    expect(mocks.getNodeContextMenuItems).toHaveBeenCalledWith({ graphId: 'graph-a', nodeId: 'test-node' });

    click(tree.root.findByProps({ 'data-testid': 'resubmit-menu-item' }));
    expect(mocks.resubmitWorkflow).toHaveBeenCalledWith('parent-run', ['test-node']);

    click(tree.root.findByProps({ 'data-testid': 'show-logic-app-run-menu-item' }));
    expect(mocks.openMonitorView).toHaveBeenCalledWith('/workflows/child', 'child-run');

    click(tree.root.findByProps({ 'data-testid': 'run-after-menu-item' }));
    expect(nodeSelectCallback).toHaveBeenCalledWith('test-node');
    expect(dispatchedAction('changePanelNode')?.payload).toBe('test-node');
    expect(dispatchedAction('setSelectedPanelActiveTab')?.payload).toBe(RUN_AFTER_PANEL_TAB);
  });

  it('uses the selected-node action when default node selection is suppressed', () => {
    mocks.shouldDisplayRunAfter.mockReturnValue(true);
    vi.spyOn(designerOptionsSelectors, 'useSuppressDefaultNodeSelectFunctionality').mockReturnValue(true);

    const tree = renderMenu();
    click(tree.root.findByProps({ 'data-testid': 'run-after-menu-item' }));

    expect(dispatchedAction('setSelectedNodeId')?.payload).toBe('test-node');
    expect(dispatchedAction('changePanelNode')).toBeUndefined();
  });

  it('shows the canvas menu and adds a note at the translated click position', () => {
    vi.spyOn(designerViewSelectors, 'useNodeContextMenuData').mockReturnValue({
      nodeId: '',
      location: { x: 40, y: 60 },
    });

    const tree = renderMenu();

    expect(tree.root.findAllByProps({ 'data-testid': 'add-note-menu-item' })).toHaveLength(1);
    expect(tree.root.findAllByProps({ 'data-testid': 'delete-menu-item' })).toHaveLength(0);
    click(tree.root.findByProps({ 'data-testid': 'add-note-menu-item' }));

    expect(mocks.screenToFlowPosition).toHaveBeenCalledWith({ x: 40, y: 60 });
    expect(dispatchedAction('addNote')?.payload).toEqual({ x: 20, y: 30 });
  });

  it('shows bulk commands, including extraction, only when the clicked node is in the multi-selection', () => {
    const selectedNodeIds = ['test-node', 'second-node'];
    vi.spyOn(panelSelectors, 'useOperationPanelSelectedNodeIds').mockReturnValue(selectedNodeIds);

    const tree = renderMenu();

    expect(tree.root.findByProps({ 'data-testid': 'workflow-extraction-action' }).props['data-variant']).toBe('menuItem');
    expect(tree.root.findAllByProps({ 'data-testid': 'copy-menu-item' })).toHaveLength(0);
    expect(menuItemText(tree.root.findByProps({ 'data-automation-id': 'msla-bulk-cut-menu-option' }))).toBe('Cut 2 actions');
    expect(menuItemText(tree.root.findByProps({ 'data-automation-id': 'msla-bulk-copy-menu-option' }))).toBe('Copy 2 actions');
    expect(menuItemText(tree.root.findByProps({ 'data-automation-id': 'msla-bulk-delete-menu-option' }))).toBe('Delete 2 actions');

    click(tree.root.findByProps({ 'data-automation-id': 'msla-bulk-copy-menu-option' }));
    expect(mocks.copyOperations).toHaveBeenCalledWith({ nodeIds: selectedNodeIds });

    click(tree.root.findByProps({ 'data-automation-id': 'msla-bulk-cut-menu-option' }));
    expect(mocks.cutOperations).toHaveBeenCalledWith({ nodeIds: selectedNodeIds });

    click(tree.root.findByProps({ 'data-automation-id': 'msla-bulk-delete-menu-option' }));
    expect(dispatchedAction('setShowMultiSelectDeleteModal')?.payload).toBe(true);

    click(tree.root.findByProps({ 'data-testid': 'workflow-extraction-action' }));
    expect(tree.root.findByProps({ 'data-testid': 'card-context-menu' }).props['data-open']).toBe(false);
  });

  it('does not show bulk extraction when the clicked node is outside the multi-selection', () => {
    vi.spyOn(panelSelectors, 'useOperationPanelSelectedNodeIds').mockReturnValue(['first-node', 'second-node']);

    const tree = renderMenu();

    expect(tree.root.findAllByProps({ 'data-testid': 'workflow-extraction-action' })).toHaveLength(0);
    expect(tree.root.findAllByProps({ 'data-testid': 'copy-menu-item' })).toHaveLength(1);
  });

  it('shows delete and graph commands for a switch-case subgraph', () => {
    vi.spyOn(workflowSelectors, 'useNodeMetadata').mockReturnValue({
      subgraphType: SUBGRAPH_TYPES.SWITCH_CASE,
    } as any);

    const tree = renderMenu();

    expect(tree.root.findAllByProps({ 'data-testid': 'delete-menu-item' })).toHaveLength(1);
    expect(tree.root.findAllByProps({ 'data-testid': 'expand-collapse-menu-item' })).toHaveLength(1);
    expect(tree.root.findAllByProps({ 'data-testid': 'copy-menu-item' })).toHaveLength(0);
  });

  it('shows delete without graph commands for an MCP client subgraph', () => {
    vi.spyOn(workflowSelectors, 'useNodeMetadata').mockReturnValue({
      subgraphType: SUBGRAPH_TYPES.MCP_CLIENT,
    } as any);

    const tree = renderMenu();

    expect(tree.root.findAllByProps({ 'data-testid': 'delete-menu-item' })).toHaveLength(1);
    expect(tree.root.findAllByProps({ 'data-testid': 'expand-collapse-menu-item' })).toHaveLength(0);
  });

  it('uses normal action commands plus graph commands for an until-do subgraph', () => {
    vi.spyOn(workflowSelectors, 'useNodeMetadata').mockReturnValue({
      subgraphType: SUBGRAPH_TYPES.UNTIL_DO,
    } as any);

    const tree = renderMenu();

    expect(tree.root.findAllByProps({ 'data-testid': 'copy-menu-item' })).toHaveLength(1);
    expect(tree.root.findAllByProps({ 'data-testid': 'expand-collapse-menu-item' })).toHaveLength(1);
  });
});
