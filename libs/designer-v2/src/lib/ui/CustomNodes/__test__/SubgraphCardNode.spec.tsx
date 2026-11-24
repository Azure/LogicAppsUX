import React from 'react';
import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { Position, type Node, type NodeProps } from '@xyflow/react';
import { adoptUserNodes, type NodeLookup, type ParentLookup } from '@xyflow/system';
import { SUBGRAPH_TYPES, WORKFLOW_NODE_TYPES } from '@microsoft/logic-apps-shared';
import { getPrecomputedHandles } from '../../../core/graphlayout/precomputedHandles';
import { ErrorLevel } from '../../../core/state/operation/errorLevel';

const mockDispatch = vi.fn();

vi.mock('react-redux', () => ({
  useDispatch: () => mockDispatch,
  useSelector: vi.fn(),
}));

// react-intl's useIntl is already mocked by test-setup.ts via mockUseIntl()

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

const mockUseIconUri = vi.fn().mockReturnValue('test-icon-uri');
const mockUseParameterValidationErrors = vi.fn().mockReturnValue([]);
const mockUseOperationErrorInfo = vi.fn().mockReturnValue(undefined);

vi.mock('../../../core/state/operation/operationSelector', () => ({
  useIconUri: (...args: any[]) => mockUseIconUri(...args),
  useParameterValidationErrors: (...args: any[]) => mockUseParameterValidationErrors(...args),
  useOperationErrorInfo: (...args: any[]) => mockUseOperationErrorInfo(...args),
}));

const mockUseSettingValidationErrors = vi.fn().mockReturnValue([]);

vi.mock('../../../core/state/setting/settingSelector', () => ({
  useSettingValidationErrors: (...args: any[]) => mockUseSettingValidationErrors(...args),
}));

const mockUseOperationQuery = vi.fn().mockReturnValue({ isError: false });

vi.mock('../../../core/state/selectors/actionMetadataSelector', () => ({
  useOperationQuery: (...args: any[]) => mockUseOperationQuery(...args),
}));

vi.mock('../../../core/state/panel/panelSelectors', () => ({
  useIsNodeSelectedInOperationPanel: vi.fn().mockReturnValue(false),
  useIsNodePinnedToOperationPanel: vi.fn().mockReturnValue(false),
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
const mockUseReplacedIds = vi.fn().mockReturnValue({});
const mockUseRunData = vi.fn().mockReturnValue(undefined);
const mockUseRunIndex = vi.fn().mockReturnValue(0);
const mockUseRunInstance = vi.fn().mockReturnValue(undefined);
const mockUseWorkflowNode = vi.fn().mockReturnValue({ id: 'graph1', children: [] });
const mockUseNodesMetadata = vi.fn().mockReturnValue({});
const mockUseFlowErrorsForNode = vi.fn().mockReturnValue([]);
const mockUseBranchValidationCount = vi.fn().mockReturnValue(0);

vi.mock('../../../core/state/workflow/workflowSelectors', () => ({
  useActionMetadata: (...args: any[]) => mockUseActionMetadata(...args),
  useIsGraphCollapsed: (...args: any[]) => mockUseIsGraphCollapsed(...args),
  useIsLeafNode: (...args: any[]) => mockUseIsLeafNode(...args),
  useNewAdditiveSubgraphId: (...args: any[]) => mockUseNewAdditiveSubgraphId(...args),
  useNodeDisplayName: (...args: any[]) => mockUseNodeDisplayName(...args),
  useNodeMetadata: (...args: any[]) => mockUseNodeMetadata(...args),
  useParentNodeId: (...args: any[]) => mockUseParentNodeId(...args),
  useReplacedIds: (...args: any[]) => mockUseReplacedIds(...args),
  useRunData: (...args: any[]) => mockUseRunData(...args),
  useRunIndex: (...args: any[]) => mockUseRunIndex(...args),
  useRunInstance: (...args: any[]) => mockUseRunInstance(...args),
  useWorkflowNode: (...args: any[]) => mockUseWorkflowNode(...args),
  useNodesMetadata: (...args: any[]) => mockUseNodesMetadata(...args),
  useFlowErrorsForNode: (...args: any[]) => mockUseFlowErrorsForNode(...args),
  useBranchValidationCount: (...args: any[]) => mockUseBranchValidationCount(...args),
}));

vi.mock('../../../core/state/workflow/workflowSlice', () => ({
  addSwitchCase: vi.fn((payload) => ({ type: 'workflow/addSwitchCase', payload })),
  replaceId: vi.fn((payload) => ({ type: 'workflow/replaceId', payload })),
  setFocusNode: vi.fn((payload) => ({ type: 'workflow/setFocusNode', payload })),
  toggleCollapsedGraphId: vi.fn((payload) => ({ type: 'workflow/toggleCollapsedGraphId', payload })),
}));

vi.mock('../../../core/actions/bjsworkflow/monitoring', () => ({
  fetchBuiltInToolRunData: vi.fn((payload) => ({ type: 'fetchBuiltInToolRunData', payload })),
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
  getScopeRepetitionName: vi.fn((index) => String(index).padStart(6, '0')),
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

// Mock local SubgraphCard (v2 uses local component, not from designer-ui)
vi.mock('../components/card/subgraphCard', () => ({
  SubgraphCard: ({ id, title, subgraphType, onClick, onContextMenu, onDeleteClick, errorMessages, collapsed, handleCollapse }: any) => (
    <div
      data-testid={`subgraph-card-${id}`}
      data-subgraph-type={subgraphType}
      onClick={() => onClick?.(id)}
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
    </div>
  ),
}));

import SubgraphCardNode from '../SubgraphCardNode';
import { fetchBuiltInToolRunData } from '../../../core/actions/bjsworkflow/monitoring';

describe('SubgraphCardNode (v2)', () => {
  const defaultProps = { id: 'testNode-#subgraph' } as NodeProps;

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseSharedNodeUi.mockReturnValue(false);
    mockUseNodeMetadata.mockReturnValue({ graphId: 'graph1', subgraphType: SUBGRAPH_TYPES.SWITCH_CASE, actionCount: 2 });
    mockUseActionMetadata.mockReturnValue({ type: 'Scope', runAfter: {} });
    mockUseIsLeafNode.mockReturnValue(false);
    mockUseIsGraphCollapsed.mockReturnValue(false);
    mockUseMonitoringView.mockReturnValue(false);
    mockUseReadOnly.mockReturnValue(false);
    mockUseRunData.mockReturnValue(undefined);
    mockUseNodeDisplayName.mockReturnValue('Test Subgraph');
    mockUseNewAdditiveSubgraphId.mockReturnValue('newCase-1');
    mockUseParentNodeId.mockReturnValue(undefined);
    mockUseRunIndex.mockReturnValue(0);
    mockUseRunInstance.mockReturnValue(undefined);
    mockUseWorkflowNode.mockReturnValue({ id: 'graph1', children: [] });
    mockUseReplacedIds.mockReturnValue({});
    mockUseNodesMetadata.mockReturnValue({});
    mockUseFlowErrorsForNode.mockReturnValue([]);
    mockUseBranchValidationCount.mockReturnValue(0);
    mockUseIconUri.mockReturnValue('test-icon-uri');
    mockUseParameterValidationErrors.mockReturnValue([]);
    mockUseOperationErrorInfo.mockReturnValue(undefined);
    mockUseSettingValidationErrors.mockReturnValue([]);
    mockUseOperationQuery.mockReturnValue({ isError: false });
  });

  it.each([
    [SUBGRAPH_TYPES.SWITCH_ADD_CASE, 'Add case'],
    [SUBGRAPH_TYPES.AGENT_ADD_CONDITON, 'Add tool'],
  ])('preserves actual %s add commands and suppresses them read-only', (subgraphType, label) => {
    mockUseSharedNodeUi.mockReturnValue(true);
    mockUseNodeMetadata.mockReturnValue({ graphId: 'graph1', subgraphType, actionCount: 0 });
    const view = render(<SubgraphCardNode {...defaultProps} />);
    fireEvent.click(screen.getByRole('button', { name: label }));
    expect(mockDispatch).toHaveBeenCalledWith(
      subgraphType === SUBGRAPH_TYPES.SWITCH_ADD_CASE
        ? { type: 'workflow/addSwitchCase', payload: { caseId: 'newCase-1', graphId: 'graph1' } }
        : expect.objectContaining({ type: 'panel/expandDiscoveryPanel', payload: expect.objectContaining({ isAgentTool: true }) })
    );
    mockUseReadOnly.mockReturnValue(true);
    view.rerender(<SubgraphCardNode {...defaultProps} data={{ presentation: { shared: true, family: 'add' } }} />);
    expect(screen.queryByRole('button', { name: label })).toBeNull();
  });

  it('keeps the actual multi-action tool editor and canonical tool surface', () => {
    mockUseSharedNodeUi.mockReturnValue(true);
    mockUseNodeMetadata.mockReturnValue({ graphId: 'graph1', subgraphType: SUBGRAPH_TYPES.AGENT_CONDITION, actionCount: 2 });
    const { container } = render(<SubgraphCardNode {...defaultProps} />);
    const tool = container.querySelector('[data-node-card="tool"]')!;
    expect(tool).toHaveAttribute('id', 'msla-node-testNode');
    fireEvent.click(tool);
    expect(mockDispatch).toHaveBeenCalledWith({ type: 'panel/changePanelNode', payload: 'testNode' });
  });

  it.each([false, true])(
    'opens built-in tool details and only fetches if the current repetition has no pending selection (%s)',
    (pending) => {
      mockUseSharedNodeUi.mockReturnValue(true);
      mockUseMonitoringView.mockReturnValue(true);
      mockUseRunInstance.mockReturnValue({ id: 'run' });
      mockUseRunIndex.mockReturnValue(1);
      mockUseNodeMetadata.mockReturnValue({
        graphId: 'Agent',
        subgraphType: SUBGRAPH_TYPES.AGENT_CONDITION,
        agentRepetitionIdentity: 'run|Agent|000000|0|',
      });
      mockUseNodesMetadata.mockReturnValue({
        Agent: {
          pendingBuiltInTool: {
            toolNodeId: 'code_interpreter',
            invocation: { agentRepetitionIdentity: pending ? 'run|Agent|000001|1|' : 'run|Agent|000000|0|', page: 2 },
            requestId: 'chat-request',
          },
        },
      });
      const { container } = render(<SubgraphCardNode {...defaultProps} id="code_interpreter-#subgraph" />);
      fireEvent.click(container.querySelector('[data-node-card="tool"]')!);

      expect(mockDispatch).toHaveBeenCalledWith({ type: 'panel/changePanelNode', payload: 'code_interpreter' });
      if (pending) {
        expect(fetchBuiltInToolRunData).not.toHaveBeenCalled();
      } else {
        expect(fetchBuiltInToolRunData).toHaveBeenCalledWith({
          toolNodeId: 'code_interpreter',
          agentNodeId: 'Agent',
          runId: 'run',
          repetitionName: '000001',
          agentToolInvocation: { agentRepetitionIdentity: 'run|Agent|000001|1|', page: 0 },
        });
      }
    }
  );

  it('opts shared condition false branches into the neutral identity without changing legacy defaults', () => {
    mockUseSharedNodeUi.mockReturnValue(true);
    mockUseNodeMetadata.mockReturnValue({ graphId: 'graph1', subgraphType: SUBGRAPH_TYPES.CONDITIONAL_FALSE, actionCount: 0 });
    const { container } = render(<SubgraphCardNode {...defaultProps} />);
    expect(container.querySelector('[data-branch="false"]')).toBeInTheDocument();
    expect(container.querySelector('[data-branch="false"] [data-icon-name="DismissRegular"]')).toBeNull();
  });

  it('passes resolved MCP server art to the shared tool row untinted', () => {
    mockUseSharedNodeUi.mockReturnValue(true);
    mockUseActionMetadata.mockReturnValue({ type: 'McpClientTool', kind: 'Managed', runAfter: {} });
    mockUseNodeMetadata.mockReturnValue({ graphId: 'graph1', subgraphType: SUBGRAPH_TYPES.MCP_CLIENT, actionCount: 0 });
    mockUseIconUri.mockReturnValue('office365.svg');
    const { container } = render(<SubgraphCardNode {...defaultProps} />);
    const tool = container.querySelector('[data-node-card="tool"]')!;
    expect(tool.querySelector('img')).toHaveAttribute('src', 'office365.svg');
    expect(tool.querySelector('[data-artwork="true"]')).not.toBeNull();
  });

  it('keeps the tool-kind default glyph when a tool has no resolved art', () => {
    mockUseSharedNodeUi.mockReturnValue(true);
    mockUseActionMetadata.mockReturnValue({ type: 'McpClientTool', kind: 'Managed', runAfter: {} });
    mockUseNodeMetadata.mockReturnValue({ graphId: 'graph1', subgraphType: SUBGRAPH_TYPES.MCP_CLIENT, actionCount: 0 });
    mockUseIconUri.mockReturnValue('');
    const { container } = render(<SubgraphCardNode {...defaultProps} />);
    const tool = container.querySelector('[data-node-card="tool"]')!;
    expect(tool.querySelector('img')).toBeNull();
    expect(tool.querySelector('[data-artwork="true"]')).toBeNull();
    expect(tool.querySelector('[data-tone="neutral"]')).toBeNull();
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

  it('moves a collapsed shared tool count into the tool card', () => {
    mockUseSharedNodeUi.mockReturnValue(true);
    mockUseIsGraphCollapsed.mockReturnValue(true);
    mockUseNodeMetadata.mockReturnValue({ graphId: 'graph1', subgraphType: SUBGRAPH_TYPES.AGENT_CONDITION, actionCount: 3 });
    const { container } = render(<SubgraphCardNode {...defaultProps} />);
    expect(container.querySelector('[data-node-count="actions"]')).toHaveTextContent('3');
    expect(container.querySelector('.no-actions-text')).toBeNull();
  });

  it('keeps the host count below fixed-height shared case headers', () => {
    mockUseSharedNodeUi.mockReturnValue(true);
    mockUseIsGraphCollapsed.mockReturnValue(true);
    const { container } = render(<SubgraphCardNode {...defaultProps} />);
    expect(container.querySelector('.no-actions-text')).toBeInTheDocument();
    expect(container.querySelector('[data-node-count]')).toBeNull();
  });

  it('renames a shared switch-case key through the edit glyph without touching case values', () => {
    mockUseSharedNodeUi.mockReturnValue(true);
    mockUseNodeMetadata.mockReturnValue({ graphId: 'graph1', subgraphType: SUBGRAPH_TYPES.SWITCH_CASE, actionCount: 2 });
    mockUseNodesMetadata.mockReturnValue({ ExistingCase: { graphId: 'graph1' } });
    render(<SubgraphCardNode {...defaultProps} data={{ presentation: { shared: true, family: 'branch' } }} />);
    fireEvent.click(screen.getByRole('button', { name: 'Rename case' }));
    const input = screen.getByRole('textbox', { name: 'Case name' });
    fireEvent.change(input, { target: { value: 'Renamed case key' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'workflow/replaceId',
      payload: { originalId: 'testNode', newId: 'Renamed case key' },
    });
  });

  it('shows validation feedback for invalid switch-case rename attempts and keeps the dialog open', () => {
    mockUseSharedNodeUi.mockReturnValue(true);
    mockUseNodeMetadata.mockReturnValue({ graphId: 'graph1', subgraphType: SUBGRAPH_TYPES.SWITCH_CASE, actionCount: 2 });
    render(<SubgraphCardNode {...defaultProps} data={{ presentation: { shared: true, family: 'branch' } }} />);
    fireEvent.click(screen.getByRole('button', { name: 'Rename case' }));
    const input = screen.getByRole('textbox', { name: 'Case name' });
    fireEvent.change(input, { target: { value: '' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(mockDispatch).not.toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'workflow/replaceId',
      })
    );
  });

  it('closes the switch-case rename dialog when escape is pressed', () => {
    mockUseSharedNodeUi.mockReturnValue(true);
    mockUseNodeMetadata.mockReturnValue({ graphId: 'graph1', subgraphType: SUBGRAPH_TYPES.SWITCH_CASE, actionCount: 2 });
    render(<SubgraphCardNode {...defaultProps} data={{ presentation: { shared: true, family: 'branch' } }} />);
    fireEvent.click(screen.getByRole('button', { name: 'Rename case' }));
    const input = screen.getByRole('textbox', { name: 'Case name' });
    fireEvent.keyDown(input, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('opens the host lane context menu from the switch-case more button', () => {
    mockUseSharedNodeUi.mockReturnValue(true);
    mockUseNodeMetadata.mockReturnValue({ graphId: 'graph1', subgraphType: SUBGRAPH_TYPES.SWITCH_CASE, actionCount: 2 });
    render(<SubgraphCardNode {...defaultProps} data={{ presentation: { shared: true, family: 'branch' } }} />);
    const more = screen.getByRole('button', { name: 'More case actions' });
    vi.spyOn(more, 'getBoundingClientRect').mockReturnValue({
      left: 100,
      top: 40,
      right: 132,
      bottom: 64,
      width: 32,
      height: 24,
      x: 100,
      y: 40,
      toJSON: () => ({}),
    } as DOMRect);
    fireEvent.click(more);
    expect(mockDispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'designerView/setNodeContextMenuData',
        payload: {
          nodeId: 'testNode',
          entryPoint: 'shared-lane-more',
          location: { x: 116, y: 64 },
        },
      })
    );
  });

  it('does not render shared lane actions when shared mode is disabled', () => {
    mockUseSharedNodeUi.mockReturnValue(false);
    mockUseNodeMetadata.mockReturnValue({ graphId: 'graph1', subgraphType: SUBGRAPH_TYPES.SWITCH_CASE, actionCount: 2 });
    render(<SubgraphCardNode {...defaultProps} data={{ presentation: { family: 'branch' } }} />);
    expect(screen.queryByRole('button', { name: 'Rename case' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'More case actions' })).not.toBeInTheDocument();
  });

  it('should show collapsed text when graph is collapsed', () => {
    mockUseIsGraphCollapsed.mockReturnValue(true);
    render(<SubgraphCardNode {...defaultProps} />);
    expect(screen.getByTestId('collapsed-indicator')).toBeInTheDocument();
  });

  it('should show DropZone for leaf nodes when not collapsed and not add-case', () => {
    mockUseIsLeafNode.mockReturnValue(true);
    mockUseIsGraphCollapsed.mockReturnValue(false);
    mockUseNodeMetadata.mockReturnValue({ graphId: 'graph1', subgraphType: SUBGRAPH_TYPES.SWITCH_CASE, actionCount: 0 });

    render(<SubgraphCardNode {...defaultProps} />);
    expect(screen.getByTestId('dropzone-testNode')).toBeInTheDocument();
  });

  it('places an empty Tool accepted RIGHT terminal after its header while the live shared option is off', () => {
    mockUseIsLeafNode.mockReturnValue(true);
    mockUseNodeMetadata.mockReturnValue({ graphId: 'graph1', subgraphType: SUBGRAPH_TYPES.AGENT_CONDITION, actionCount: 0 });
    render(<SubgraphCardNode {...defaultProps} data={{ presentation: { shared: true }, handleAxis: 'horizontal' }} />);
    const terminal = screen.getByTestId('dropzone-testNode');
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

  it.each([true, false])('keeps accepted DOWN branch terminal placement while the live option differs (shared=%s)', (shared) => {
    mockUseIsLeafNode.mockReturnValue(true);
    mockUseNodeMetadata.mockReturnValue({ graphId: 'graph1', subgraphType: SUBGRAPH_TYPES.SWITCH_CASE, actionCount: 0 });
    mockUseSharedNodeUi.mockReturnValue(!shared);
    render(<SubgraphCardNode {...defaultProps} data={{ presentation: { shared }, handleAxis: 'vertical' }} />);
    const terminal = screen.getByTestId('dropzone-testNode');
    expect(terminal).toHaveAttribute('data-axis', 'vertical');
    expect(terminal).toHaveAttribute('data-shared', String(shared));
    expect(terminal.parentElement?.style.transform).toBe('');
    expect(terminal.parentElement?.style.left).toBe('');
  });

  it('keeps an accepted RIGHT empty Tool read-only without an insertion control', () => {
    mockUseIsLeafNode.mockReturnValue(true);
    mockUseReadOnly.mockReturnValue(true);
    mockUseNodeMetadata.mockReturnValue({ graphId: 'graph1', subgraphType: SUBGRAPH_TYPES.AGENT_CONDITION, actionCount: 0 });
    render(<SubgraphCardNode {...defaultProps} data={{ presentation: { shared: true }, handleAxis: 'horizontal' }} />);
    expect(screen.queryByTestId('dropzone-testNode')).not.toBeInTheDocument();
    expect(screen.getByText('No actions')).toBeInTheDocument();
  });

  it('should not show DropZone when not a leaf node', () => {
    mockUseIsLeafNode.mockReturnValue(false);
    render(<SubgraphCardNode {...defaultProps} />);
    expect(screen.queryByTestId('dropzone-testNode')).not.toBeInTheDocument();
  });

  it('should show error messages when parameter validation errors exist', () => {
    mockUseParameterValidationErrors.mockReturnValue([{ error: 'test' }]);

    render(<SubgraphCardNode {...defaultProps} />);
    expect(screen.getByTestId('error-messages')).toBeInTheDocument();
  });

  it('keeps the collapsed Until Do header’s own validation when descendants also have errors', () => {
    mockUseNodeMetadata.mockReturnValue({ graphId: 'graph1', subgraphType: SUBGRAPH_TYPES.UNTIL_DO, actionCount: 2 });
    mockUseActionMetadata.mockReturnValue({ type: 'Until', runAfter: {} });
    mockUseOperationErrorInfo.mockReturnValue({ level: ErrorLevel.Default, message: 'Invalid Until expression' });
    mockUseIsGraphCollapsed.mockReturnValue(true);
    const data = { presentation: { shared: true, family: 'branch' } };
    const view = render(<SubgraphCardNode {...defaultProps} data={data} />);
    const header = screen.getByRole('button', { name: 'Do' });
    expect(mockUseOperationErrorInfo).toHaveBeenLastCalledWith('testNode');
    expect(header).toHaveAttribute('aria-description', 'Invalid Until expression');
    expect(screen.getByAltText('Errors')).toBeVisible();

    mockUseBranchValidationCount.mockReturnValue(1);
    view.rerender(<SubgraphCardNode {...defaultProps} data={{ ...data }} />);
    expect(mockUseBranchValidationCount).toHaveBeenLastCalledWith('testNode');
    expect(header).toHaveAttribute('aria-description', 'Invalid Until expression\n1 nested step has validation errors');
    expect(screen.getByLabelText('Errors: 2')).toBeVisible();
  });

  it('remeasures an Until header when selection recreates its node after the monitoring pager mounts', () => {
    mockUseMonitoringView.mockReturnValue(true);
    mockUseReadOnly.mockReturnValue(true);
    mockUseActionMetadata.mockReturnValue({ type: 'Until', runAfter: {} });
    mockUseNodeMetadata.mockReturnValue({
      graphId: 'graph1',
      subgraphType: SUBGRAPH_TYPES.UNTIL_DO,
      actionCount: 1,
      runData: { iterationCount: 3 },
    });
    const branch: Node = {
      id: 'until-#subgraph',
      type: WORKFLOW_NODE_TYPES.SUBGRAPH_CARD_NODE,
      position: { x: 0, y: 0 },
      initialWidth: 120,
      initialHeight: 32,
      data: { presentation: { shared: false } },
    };
    branch.handles = getPrecomputedHandles(branch, 120, 32, true, SUBGRAPH_TYPES.UNTIL_DO);
    render(<SubgraphCardNode {...defaultProps} id={branch.id} data={branch.data} />);
    expect(screen.getByTestId('handle-source').parentElement).toContainElement(screen.getByTestId('loops-pager-until'));

    const nodeLookup: NodeLookup = new Map();
    const parentLookup: ParentLookup = new Map();
    adoptUserNodes([branch], nodeLookup, parentLookup);
    const measured = nodeLookup.get(branch.id)!;
    measured.measured = { width: 120, height: 64 };
    measured.internals.handleBounds = {
      target: [{ nodeId: branch.id, type: 'target', position: Position.Top, x: 0, y: 0, width: 120, height: 64 }],
      source: [{ nodeId: branch.id, type: 'source', position: Position.Bottom, x: 57, y: 58, width: 6, height: 6 }],
    };

    adoptUserNodes([{ ...branch, selected: false, selectable: false }], nodeLookup, parentLookup);

    expect(nodeLookup.get(branch.id)?.internals.handleBounds).toBeUndefined();
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

  it('selects the shared pager for agent subgraphs when the shared flag is on', () => {
    mockUseSharedNodeUi.mockReturnValue(true);
    mockUseMonitoringView.mockReturnValue(true);
    mockUseParentNodeId.mockReturnValue('parentAgent');
    mockUseActionMetadata.mockImplementation((id: string) =>
      id === 'parentAgent' ? { type: 'Agent', runAfter: {} } : { type: 'Scope', runAfter: {} }
    );
    mockUseNodeMetadata.mockReturnValue({
      graphId: 'graph1',
      subgraphType: SUBGRAPH_TYPES.AGENT_CONDITION,
      actionCount: 1,
      runData: { repetitionCount: 3 },
    });

    render(<SubgraphCardNode {...defaultProps} />);
    expect(screen.getByTestId('shared-loops-pager-testNode')).toBeInTheDocument();
    expect(screen.queryByTestId('loops-pager-testNode')).toBeNull();
  });

  it('hides the shared tool pager while metadata belongs to a previous selected iteration', () => {
    mockUseSharedNodeUi.mockReturnValue(true);
    mockUseMonitoringView.mockReturnValue(true);
    mockUseRunInstance.mockReturnValue({ id: 'run-1' });
    mockUseRunIndex.mockReturnValue(2);
    mockUseParentNodeId.mockImplementation((id: string) => {
      if (id === 'testNode') {
        return 'parentAgent';
      }
      if (id === 'parentAgent') {
        return 'agent-parent';
      }
      return undefined;
    });
    mockUseRunData.mockImplementation((id: string) => {
      if (id === 'agent-parent') {
        return { status: 'Succeeded' };
      }
      return undefined;
    });
    mockUseActionMetadata.mockImplementation((id: string) =>
      id === 'parentAgent' ? { type: 'Agent', runAfter: {} } : { type: 'Scope', runAfter: {} }
    );
    const staleMetadata = {
      graphId: 'parentAgent',
      subgraphType: SUBGRAPH_TYPES.AGENT_CONDITION,
      actionCount: 1,
      runData: { repetitionCount: 3 },
      agentRepetitionIdentity: 'run-1|parentAgent|000001|1|Succeeded',
    };
    mockUseNodeMetadata.mockReturnValue(staleMetadata);

    const { rerender } = render(<SubgraphCardNode {...defaultProps} />);
    expect(screen.queryByTestId('shared-loops-pager-testNode')).toBeNull();

    mockUseNodeMetadata.mockReturnValue({
      ...staleMetadata,
      agentRepetitionIdentity: 'run-1|parentAgent|000002|2|Succeeded',
    });
    rerender(<SubgraphCardNode {...defaultProps} data={{}} />);
    expect(screen.getByTestId('shared-loops-pager-testNode')).toBeInTheDocument();
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
