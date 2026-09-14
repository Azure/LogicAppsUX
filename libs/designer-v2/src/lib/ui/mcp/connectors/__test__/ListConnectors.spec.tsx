import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ListConnectors, ConnectionDisplayName } from '../ListConnectors';
import { useConnectionById } from '../../../../core/queries/connections';
import * as mcpActions from '../../../../core/actions/bjsworkflow/mcp';
import { McpPanelView, openConnectorPanelView } from '../../../../core/state/mcp/panel/mcpPanelSlice';
import { selectConnectorId, selectOperations } from '../../../../core/state/mcp/mcpselectionslice';
import { connectorId, createMcpHarness, createMcpState, expressionMapping } from '../../../../core/state/mcp/__test__/fixtures';

vi.mock('../../../../core/queries/connections', () => ({ useConnectionById: vi.fn() }));
vi.mock('../../../templates/connections/connector', () => ({
  ConnectorIconWithName: ({ connectorId, onNameClick }: { connectorId: string; onNameClick: () => void }) => (
    <button type="button" onClick={onNameClick}>
      {connectorId}
    </button>
  ),
}));

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(useConnectionById).mockReturnValue({ result: { properties: { displayName: 'Production SQL' } } } as any);
  vi.spyOn(mcpActions, 'deinitializeOperations').mockImplementation((payload) => ({ type: 'test/deinitialize', payload }) as any);
});
afterEach(cleanup);

describe('MCP connector list', () => {
  it.each([false, true])('renders the empty-state add action, respecting disabled=%s', (addDisabled) => {
    const state = createMcpState();
    state.operations.operationInfo = {};
    const addConnectors = vi.fn();
    render(<ListConnectors addConnectors={addConnectors} addDisabled={addDisabled} />, createMcpHarness(state));
    const add = screen.getByRole('button', { name: 'Add connector' });
    expect(add).toHaveProperty('disabled', addDisabled);
    fireEvent.click(add);
    expect(addConnectors).toHaveBeenCalledTimes(addDisabled ? 0 : 1);
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it.each(['concrete', 'expression', 'null', 'missing', 'dangling reference'] as const)(
    'shows connection status for a %s mapping without promoting a design-time reference',
    (kind) => {
      const state = createMcpState();
      if (kind === 'missing') {
        delete state.connection.connectionsMapping.Query;
      } else {
        state.connection.connectionsMapping.Query =
          kind === 'expression' ? expressionMapping : kind === 'null' ? null : kind === 'concrete' ? 'Sql' : 'Unknown';
      }
      const harness = createMcpHarness(state);
      render(<ListConnectors addConnectors={vi.fn()} addDisabled={false} />, harness);
      expect(screen.getByRole('table', { name: 'List of connectors with their connections' })).toBeInTheDocument();
      expect(screen.getByText(kind === 'concrete' ? 'Connected' : 'Disconnected')).toBeInTheDocument();
      expect(screen.getByText(kind === 'concrete' ? 'Production SQL' : 'No Connection')).toBeInTheDocument();
      if (kind === 'concrete') {
        expect(useConnectionById).toHaveBeenCalledWith('/connections/Sql', connectorId);
      } else {
        expect(useConnectionById).not.toHaveBeenCalled();
      }
      expect(harness.actions).toEqual([]);
    }
  );

  it.each(['name', 'edit button'])('edits all operations belonging to the connector via its %s', (entrypoint) => {
    const state = createMcpState();
    state.operations.operationInfo.Second = { ...state.operations.operationInfo.Query, operationId: 'Second' };
    state.operations.operationInfo.Blob = { connectorId: '/serviceProviders/blob', operationId: 'Blob', type: 'ServiceProvider' };
    state.operations.operationInfo.Invalid = undefined as any;
    const harness = createMcpHarness(state);
    render(<ListConnectors addConnectors={vi.fn()} addDisabled={false} />, harness);
    expect(screen.getAllByRole('row')).toHaveLength(3); // header + two distinct connectors
    const row = screen.getByRole('button', { name: connectorId }).closest('tr')!;
    fireEvent.click(
      entrypoint === 'name'
        ? within(row).getByRole('button', { name: connectorId })
        : within(row).getByRole('button', { name: 'Edit connector' })
    );
    expect(harness.actions).toEqual([
      selectConnectorId(connectorId),
      selectOperations(['Query', 'Second']),
      openConnectorPanelView({ panelView: McpPanelView.CreateConnection }),
    ]);
  });

  it('deletes only the selected connector operations, even when they use an expression', () => {
    const state = createMcpState();
    state.connection.connectionsMapping.Query = expressionMapping;
    state.operations.operationInfo.Second = { ...state.operations.operationInfo.Query, operationId: 'Second' };
    state.operations.operationInfo.Blob = { connectorId: '/serviceProviders/blob', operationId: 'Blob', type: 'ServiceProvider' };
    const harness = createMcpHarness(state);
    render(<ListConnectors addConnectors={vi.fn()} addDisabled={false} />, harness);
    const row = screen.getByRole('button', { name: connectorId }).closest('tr')!;
    fireEvent.click(within(row).getByRole('button', { name: 'Delete connector' }));
    expect(harness.actions).toEqual([{ type: 'test/deinitialize', payload: { operationIds: ['Query', 'Second'] } }]);
  });

  it('falls back to the resource name while connection display metadata is unavailable', () => {
    vi.mocked(useConnectionById).mockReturnValue({ result: undefined } as any);
    render(<ConnectionDisplayName connectorId={connectorId} connectionId="/connections/SqlFallback" />, createMcpHarness());
    expect(screen.getByText('SqlFallback')).toBeInTheDocument();
    expect(useConnectionById).toHaveBeenCalledWith('/connections/SqlFallback', connectorId);
  });
});
