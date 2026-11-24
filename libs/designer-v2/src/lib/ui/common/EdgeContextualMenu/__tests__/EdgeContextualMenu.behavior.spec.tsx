import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { EdgeContextualMenu } from '../EdgeContextualMenu';

const state = vi.hoisted(() => ({
  dispatch: vi.fn(),
  a2a: false,
  agentic: true,
  upstreamAgent: false,
  menu: { graphId: 'root', parentId: 'parent', childId: 'child', isLeaf: false, isHandoff: false, location: { x: 10, y: 10 } },
}));
vi.mock('react-redux', () => ({ useDispatch: () => state.dispatch, batch: (callback: () => void) => callback() }));
vi.mock('@xyflow/react', () => ({ useOnViewportChange: vi.fn() }));
vi.mock('@fluentui/react-components', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  Popover: ({ children, open }: any) => (open ? <div>{children}</div> : null),
  PopoverSurface: ({ children }: any) => <div>{children}</div>,
  MenuList: ({ children, onClick }: any) => <div onClick={onClick}>{children}</div>,
  MenuItem: ({ children, icon, ...props }: any) => <button {...props}>{children}</button>,
  Tooltip: ({ children }: any) => children,
}));
vi.mock('@microsoft/logic-apps-shared', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  guid: () => 'new-action',
  customLengthGuid: () => 'abcd',
  isUiInteractionsServiceEnabled: () => false,
}));
vi.mock('../../../../core', () => ({
  useNodeMetadata: () => undefined,
  useNodeDisplayName: (id: string) => id,
  addOperation: (payload: unknown) => ({ type: 'addOperation', payload }),
}));
vi.mock('../../../../core/state/designerView/designerViewSelectors', () => ({
  useEdgeContextMenuData: () => state.menu,
  useIsAgenticWorkflow: () => state.agentic,
  useIsA2AWorkflow: () => state.a2a,
}));
vi.mock('../../../../core/state/designerOptions/designerOptionsSelectors', () => ({ useEnableNestedAgentLoops: () => false }));
vi.mock('../../../../core/state/tokens/tokenSelectors', () => ({ useUpstreamNodes: () => ['parent'] }));
vi.mock('../../../../core/state/workflow/workflowSelectors', () => ({
  useHasUpstreamAgenticLoop: () => state.upstreamAgent,
  useIsAgentLoop: () => true,
  useHandoffActionsForAgent: () => [{ targetId: 'child', toolId: 'actual-handoff-tool' }],
}));
vi.mock('../../../../core/utils/clipboard', () => ({ retrieveClipboardData: async () => undefined }));
vi.mock('../../../../core/actions/bjsworkflow/copypaste', () => ({ pasteOperation: vi.fn(), pasteScopeOperation: vi.fn() }));
vi.mock('../../../../core/actions/bjsworkflow/handoff', () => ({
  addAgentHandoff: (payload: unknown) => ({ type: 'addAgentHandoff', payload }),
  removeAgentHandoff: (payload: unknown) => ({ type: 'removeAgentHandoff', payload }),
}));
vi.mock('../../../../core/actions/bjsworkflow/runafter', () => ({
  removeOperationRunAfter: (payload: unknown) => ({ type: 'removeOperationRunAfter', payload }),
}));
vi.mock('../../../../core/state/workflow/workflowSlice', () => ({ addRunAfter: vi.fn(), removeRunAfter: vi.fn() }));
vi.mock('../../../../core/state/panel/panelSlice', () => ({
  changePanelNode: (payload: unknown) => ({ type: 'changePanelNode', payload }),
  setSelectedPanelActiveTab: (payload: unknown) => ({ type: 'setSelectedPanelActiveTab', payload }),
  expandDiscoveryPanel: (payload: unknown) => ({ type: 'expandDiscoveryPanel', payload }),
}));

describe('shared edge controls retain the host insertion and handoff menu commands', () => {
  beforeEach(() => {
    state.dispatch.mockClear();
    state.a2a = false;
    state.agentic = true;
    state.upstreamAgent = false;
    state.menu = { graphId: 'root', parentId: 'parent', childId: 'child', isLeaf: false, isHandoff: false, location: { x: 10, y: 10 } };
  });

  it('inserts sequentially with the actual parent and child instead of changing the relationship', () => {
    render(<EdgeContextualMenu />);
    fireEvent.click(screen.getByRole('button', { name: 'Add an action' }));
    expect(state.dispatch).toHaveBeenCalledWith({
      type: 'expandDiscoveryPanel',
      payload: { nodeId: 'new-action', relationshipIds: { graphId: 'root', parentId: 'parent', childId: 'child' } },
    });
  });

  it('inserts a parallel branch without retaining the sequential child', () => {
    render(<EdgeContextualMenu />);
    fireEvent.click(screen.getByRole('button', { name: 'Add a parallel branch' }));
    expect(state.dispatch).toHaveBeenCalledWith({
      type: 'expandDiscoveryPanel',
      payload: {
        nodeId: 'new-action',
        relationshipIds: { graphId: 'root', parentId: 'parent', childId: undefined },
        isParallelBranch: true,
      },
    });
  });

  it('keeps A2A subsequent-action and root-parallel restrictions without disabling the permitted handoff Agent action', () => {
    state.a2a = true;
    state.upstreamAgent = true;
    render(<EdgeContextualMenu />);
    expect(screen.getByRole('button', { name: 'Add an action' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Add a parallel branch' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Add a hand-off agent' })).toBeEnabled();
    fireEvent.click(screen.getByRole('button', { name: 'Add an action' }));
    expect(state.dispatch).not.toHaveBeenCalled();
  });

  it('converts sequential Agent relations into real handoff mutations on both sides', () => {
    state.a2a = true;
    state.upstreamAgent = true;
    render(<EdgeContextualMenu />);
    fireEvent.click(screen.getByRole('button', { name: 'Add a hand-off agent' }));
    expect(state.dispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'addOperation',
        payload: expect.objectContaining({
          nodeId: 'Agent_abcd',
          relationshipIds: { graphId: 'root', parentId: 'parent', childId: 'child' },
        }),
      })
    );
    expect(state.dispatch).toHaveBeenCalledWith({
      type: 'removeOperationRunAfter',
      payload: { parentOperationId: 'parent', childOperationId: 'Agent_abcd' },
    });
    expect(state.dispatch).toHaveBeenCalledWith({ type: 'addAgentHandoff', payload: { sourceId: 'parent', targetId: 'Agent_abcd' } });
    expect(state.dispatch).toHaveBeenCalledWith({
      type: 'removeOperationRunAfter',
      payload: { parentOperationId: 'Agent_abcd', childOperationId: 'child' },
    });
    expect(state.dispatch).toHaveBeenCalledWith({ type: 'addAgentHandoff', payload: { sourceId: 'Agent_abcd', targetId: 'child' } });
  });

  it('deletes the actual handoff tool rather than deleting the dependency or target node', () => {
    state.menu.isHandoff = true;
    render(<EdgeContextualMenu />);
    fireEvent.click(screen.getByRole('button', { name: 'Delete handoff' }));
    expect(state.dispatch).toHaveBeenCalledExactlyOnceWith({
      type: 'removeAgentHandoff',
      payload: { agentId: 'parent', toolId: 'actual-handoff-tool' },
    });
  });

  it('keeps leaf insertion restrictions and nested-Agent policy', () => {
    state.menu.graphId = 'nested';
    state.menu.isLeaf = true;
    render(<EdgeContextualMenu />);
    expect(screen.queryByRole('button', { name: 'Add a parallel branch' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Add an agent' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Add an action' })).toBeEnabled();
  });
});
