import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as mcpActions from '../../../../../core/actions/bjsworkflow/mcp';
import { LoggerService } from '@microsoft/logic-apps-shared';
import { useMcpConnectorPanelTabs } from '../usePanelTabs';
import { closePanel, McpPanelView } from '../../../../../core/state/mcp/panel/mcpPanelSlice';
import { clearAllSelections } from '../../../../../core/state/mcp/mcpselectionslice';
import { connectorId, createMcpHarness, createMcpState, expressionMapping } from '../../../../../core/state/mcp/__test__/fixtures';

vi.mock('@microsoft/logic-apps-shared', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@microsoft/logic-apps-shared')>()),
  LoggerService: vi.fn(() => ({ log: vi.fn() })),
}));

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(mcpActions, 'initializeConnectionMappings').mockImplementation((payload) => ({ type: 'test/connections', payload }) as any);
  vi.spyOn(mcpActions, 'initializeOperationsMetadata').mockImplementation((payload) => ({ type: 'test/metadata', payload }) as any);
  vi.spyOn(mcpActions, 'deinitializeOperations').mockImplementation((payload) => ({ type: 'test/deinitialize', payload }) as any);
});
afterEach(cleanup);

const renderTabs = (state = createMcpState()) => {
  const harness = createMcpHarness(state);
  return { ...renderHook(useMcpConnectorPanelTabs, harness), ...harness };
};
const primary = (tab: ReturnType<typeof useMcpConnectorPanelTabs>[number]) => tab.footerContent!.buttonContents[1];

describe('MCP connector panel tabs', () => {
  it.each([
    [McpPanelView.SelectConnector, ['Choose connector', 'Select actions', 'Create connection']],
    [McpPanelView.SelectOperation, ['Select actions', 'Create connection']],
    [McpPanelView.UpdateOperation, ['Select actions']],
    [McpPanelView.CreateConnection, ['Create connection']],
  ] as const)('presents the tabs for %s', (view, titles) => {
    const state = createMcpState();
    state.mcpPanel.currentPanelView = view;
    const { result } = renderTabs(state);
    expect(result.current.map((tab) => tab.title)).toEqual(titles);
    if (view === McpPanelView.UpdateOperation) {
      expect(primary(result.current[0]).text).toBe('Save');
    }
    if (view === McpPanelView.CreateConnection) {
      expect(result.current[0].footerContent!.buttonContents[0].text).toBe('Close');
    }
  });

  it.each(['concrete', 'expression', 'null', 'missing', 'dangling reference'] as const)(
    'allows connection submission only for a usable concrete reference (%s)',
    (kind) => {
      const state = createMcpState();
      state.mcpPanel.currentPanelView = McpPanelView.CreateConnection;
      if (kind === 'missing') {
        delete state.connection.connectionsMapping.Query;
      } else {
        state.connection.connectionsMapping.Query =
          kind === 'expression' ? expressionMapping : kind === 'null' ? null : kind === 'concrete' ? 'Sql' : 'Unknown';
      }
      const { result, actions } = renderTabs(state);
      expect(primary(result.current[0]).disabled).toBe(kind !== 'concrete');
      expect(actions).toEqual([]);
    }
  );

  it('does not let an unselected concrete operation validate selected expressions', () => {
    const state = createMcpState();
    state.mcpSelection.selectedOperations = ['Runtime'];
    state.connection.connectionsMapping.Runtime = expressionMapping;
    const { result } = renderTabs(state);
    expect(primary(result.current[2]).disabled).toBe(true);
  });

  it('keeps next/save disabled until connector and operations are selected', () => {
    const state = createMcpState();
    state.mcpSelection.selectedConnectorId = undefined;
    state.mcpSelection.selectedOperations = [];
    const { result } = renderTabs(state);
    expect(primary(result.current[0]).disabled).toBe(true);
    expect(result.current[1].disabled).toBe(true);
    expect(primary(result.current[1]).text).toBe('Next');
    expect(primary(result.current[1]).disabled).toBe(true);
    expect(result.current[2].disabled).toBe(true);
    expect(primary(result.current[2]).disabled).toBe(true);
  });

  it('shows loading and operation errors without allowing duplicate initialization', () => {
    const state = createMcpState();
    state.connection.loading.initializeConnectionMappings = true;
    state.mcpSelection.errors.operations = 'Could not load operations';
    const { result } = renderTabs(state);
    expect(primary(result.current[1])).toMatchObject({ text: 'Next (1 selected)', loading: true, disabled: true });
    expect(result.current[1].tabStatusIcon).toBe('error');
    expect(result.current[2].disabled).toBe(true);
  });

  it.each([McpPanelView.SelectConnector, McpPanelView.SelectOperation])(
    'initializes connections from either navigation entrypoint in %s',
    (view) => {
      const state = createMcpState();
      state.mcpPanel.currentPanelView = view;
      const { result, actions } = renderTabs(state);
      const operations = result.current.find((tab) => tab.title === 'Select actions')!;
      const connections = result.current.find((tab) => tab.title === 'Create connection')!;
      act(() => {
        primary(operations).onClick!();
        connections.onTabClick!();
      });
      const expected = {
        type: 'test/connections',
        payload: { connectorId, operations: ['Query'], area: view === McpPanelView.SelectConnector ? 'AddConnector' : 'EditConnector' },
      };
      expect(actions).toEqual([expected, expected]);
    }
  );

  it.each([McpPanelView.SelectConnector, McpPanelView.CreateConnection])('saves existing selections and closes from %s', (view) => {
    const state = createMcpState();
    state.mcpPanel.currentPanelView = view;
    const { result, actions } = renderTabs(state);
    act(() => primary(result.current.at(-1)!).onClick!());
    expect(actions).toEqual([closePanel(), clearAllSelections()]);
    expect(LoggerService).toHaveBeenCalled();
  });

  it('initializes only newly selected actions and deinitializes deselections when saving updated actions', () => {
    const state = createMcpState();
    state.mcpPanel.currentPanelView = McpPanelView.UpdateOperation;
    state.mcpSelection.selectedOperations = ['/operations/NewQuery'];
    const { result, actions } = renderTabs(state);
    act(() => primary(result.current[0]).onClick!());
    expect(actions).toEqual([
      { type: 'test/connections', payload: { connectorId, operations: ['/operations/NewQuery'], area: 'AddActions' } },
      { type: 'test/deinitialize', payload: { operationIds: ['Query'] } },
      {
        type: 'test/metadata',
        payload: { operations: [{ connectorId, operationId: 'NewQuery', type: 'apiconnection' }], area: 'AddActions' },
      },
    ]);
  });

  it('does not submit an invalid empty selection even if a stale footer callback is invoked', () => {
    const state = createMcpState();
    state.mcpSelection.selectedOperations = [];
    const { result, actions } = renderTabs(state);
    act(() => primary(result.current.at(-1)!).onClick!());
    expect(actions).toEqual([]);
  });
});
