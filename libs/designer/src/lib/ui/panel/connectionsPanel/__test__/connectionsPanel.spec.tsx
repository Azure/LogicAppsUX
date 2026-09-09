import { render, screen } from '@testing-library/react';
import type { Connection, Connector } from '@microsoft/logic-apps-shared';
import { beforeEach, describe, expect, it, type Mock, vi } from 'vitest';
import { ConnectionPanel } from '../connectionsPanel';
import { autoCreateConnectionIfPossible, closeConnectionsFlow } from '../../../../core/actions/bjsworkflow/connections';
import { updateNodeConnection, useOperationInfo, useOperationPanelSelectedNodeId } from '../../../../core';
import { useConnectionsForConnector } from '../../../../core/queries/connections';
import { useConnectionRefs, useConnectorByNodeId, useNodeConnectionMapping } from '../../../../core/state/connection/connectionSelector';
import { useReadOnly } from '../../../../core/state/designerOptions/designerOptionsSelectors';
import { useConnectionPanelSelectedNodeIds, useIsCreatingConnection } from '../../../../core/state/panel/panelSelectors';
import { setIsCreatingConnection } from '../../../../core/state/panel/panelSlice';
import { useConnectionExpressionEnabled } from '../selectConnection/connectionExpression';

const mocks = vi.hoisted(() => ({ dispatch: vi.fn() }));

vi.mock('@microsoft/designer-ui', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  XLargeText: ({ text }: { text: string }) => <h1>{text}</h1>,
}));

vi.mock('react-intl', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  useIntl: () => ({ formatMessage: ({ defaultMessage }: { defaultMessage: string }) => defaultMessage }),
}));

vi.mock('react-redux', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  useDispatch: () => mocks.dispatch,
}));

vi.mock('../../../../core', () => ({
  updateNodeConnection: vi.fn((payload: unknown) => ({ payload, type: 'connections/updateNodeConnection' })),
  useOperationInfo: vi.fn(),
  useOperationPanelSelectedNodeId: vi.fn(),
}));

vi.mock('../../../../core/actions/bjsworkflow/connections', () => ({
  autoCreateConnectionIfPossible: vi.fn(),
  closeConnectionsFlow: vi.fn((payload: unknown) => ({ payload, type: 'connections/closeConnectionsFlow' })),
}));

vi.mock('../../../../core/queries/connections', () => ({ useConnectionsForConnector: vi.fn() }));

vi.mock('../../../../core/state/connection/connectionSelector', () => ({
  useConnectionRefs: vi.fn(),
  useConnectorByNodeId: vi.fn(),
  useNodeConnectionMapping: vi.fn(),
}));

vi.mock('../../../../core/state/designerOptions/designerOptionsSelectors', () => ({ useReadOnly: vi.fn() }));

vi.mock('../../../../core/state/panel/panelSelectors', () => ({
  useConnectionPanelSelectedNodeIds: vi.fn(),
  useIsCreatingConnection: vi.fn(),
}));

vi.mock('../../../../core/state/panel/panelSlice', () => ({
  setIsCreatingConnection: vi.fn((isCreating: boolean) => ({ payload: isCreating, type: 'panel/setIsCreatingConnection' })),
}));

vi.mock('../selectConnection/connectionExpression', () => ({ useConnectionExpressionEnabled: vi.fn() }));
vi.mock('../allConnections/allConnections', () => ({ AllConnections: () => <div data-testid="all-connections" /> }));
vi.mock('../createConnection/createConnectionWrapper', () => ({
  CreateConnectionWrapper: () => <div data-testid="create-connection-wrapper" />,
}));
vi.mock('../selectConnection/selectConnection', () => ({
  SelectConnectionWrapper: () => <div data-testid="select-connection-wrapper" />,
}));

const connector = { id: '/serviceProviders/sql', name: 'sql', properties: {} } as Connector;
const connection = { id: '/serviceProviders/sql/connections/sql', name: 'sql', properties: {} } as Connection;
const panelProps = { toggleCollapse: vi.fn() } as any;
const setConnectionsQuery = (overrides: Record<string, unknown> = {}) => {
  (useConnectionsForConnector as Mock).mockReturnValue({ data: [], isLoading: false, isError: false, ...overrides });
};
const expectSelectionWithoutMutation = () => {
  expect(screen.getByRole('heading', { name: 'Change connection' })).toBeInTheDocument();
  expect(screen.getByTestId('select-connection-wrapper')).toBeInTheDocument();
  expect(screen.queryByTestId('create-connection-wrapper')).not.toBeInTheDocument();
  expect(autoCreateConnectionIfPossible).not.toHaveBeenCalled();
  expect(updateNodeConnection).not.toHaveBeenCalled();
  expect(closeConnectionsFlow).not.toHaveBeenCalled();
  expect(setIsCreatingConnection).not.toHaveBeenCalled();
  expect(mocks.dispatch).not.toHaveBeenCalled();
};

describe('ConnectionPanel (designer)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useOperationPanelSelectedNodeId as Mock).mockReturnValue('node-id');
    (useConnectionPanelSelectedNodeIds as Mock).mockReturnValue(['node-id']);
    (useConnectorByNodeId as Mock).mockReturnValue(connector);
    (useOperationInfo as Mock).mockReturnValue({ type: 'ServiceProvider', connectorId: connector.id, operationId: 'executeQuery' });
    (useConnectionRefs as Mock).mockReturnValue({});
    (useNodeConnectionMapping as Mock).mockReturnValue(null);
    (useConnectionExpressionEnabled as Mock).mockReturnValue(false);
    (useReadOnly as Mock).mockReturnValue(false);
    (useIsCreatingConnection as Mock).mockReturnValue(false);
    (autoCreateConnectionIfPossible as Mock).mockResolvedValue(undefined);
    setConnectionsQuery();
  });

  it('does not auto-create or force Create connection when new runtime authoring is eligible and no connections exist', () => {
    (useConnectionExpressionEnabled as Mock).mockReturnValue(true);
    setConnectionsQuery({ isLoading: true });
    const { rerender } = render(<ConnectionPanel {...panelProps} />);

    setConnectionsQuery({ data: [], isLoading: false });
    rerender(<ConnectionPanel {...panelProps} />);

    expect(useConnectionExpressionEnabled).toHaveBeenCalledWith(['node-id']);
    expectSelectionWithoutMutation();
  });

  it('preserves an imported expression with authoring disabled using the connection-panel selection', () => {
    const expressionMapping = { kind: 'expression', expression: "@outputs('Resolve_Connection')" };
    (useConnectionPanelSelectedNodeIds as Mock).mockReturnValue(['runtime-node']);
    (useNodeConnectionMapping as Mock).mockImplementation((id: string) => (id === 'runtime-node' ? expressionMapping : 'static-ref'));
    (autoCreateConnectionIfPossible as Mock).mockImplementation(({ applyNewConnection, onSuccess }) => {
      applyNewConnection(connection);
      onSuccess();
      return Promise.resolve();
    });
    const { rerender } = render(<ConnectionPanel {...panelProps} />);
    setConnectionsQuery({ data: [] });
    rerender(<ConnectionPanel {...panelProps} />);

    expect(useConnectionExpressionEnabled).toHaveBeenCalledWith(['runtime-node']);
    expect(useNodeConnectionMapping).toHaveBeenCalledWith('runtime-node');
    expectSelectionWithoutMutation();
  });

  it.each([null, 'static-ref'])(
    'does not mutate read-only connections when the mapping is %s and expression authoring is disabled',
    (mapping) => {
      (useReadOnly as Mock).mockReturnValue(true);
      (useNodeConnectionMapping as Mock).mockReturnValue(mapping);
      (autoCreateConnectionIfPossible as Mock).mockImplementation(({ onManualConnectionCreation }) => {
        onManualConnectionCreation();
        return Promise.resolve();
      });

      render(<ConnectionPanel {...panelProps} />);

      expectSelectionWithoutMutation();
    }
  );

  it.each([
    ['unsupported connector', '/managedApis/sql'],
    ['disabled provider authoring', '/serviceProviders/sql'],
  ])('retains static auto-create for %s when no runtime expression is mapped', (_case, connectorId) => {
    const selectedConnector = { ...connector, id: connectorId };
    (useConnectorByNodeId as Mock).mockReturnValue(selectedConnector);
    (useOperationInfo as Mock).mockReturnValue({
      connectorId,
      operationId: 'executeQuery',
      type: connectorId.startsWith('/serviceProviders') ? 'ServiceProvider' : 'ApiConnection',
    });
    (useNodeConnectionMapping as Mock).mockReturnValue('static-ref');
    (autoCreateConnectionIfPossible as Mock).mockImplementation(({ applyNewConnection, onSuccess }) => {
      applyNewConnection(connection);
      onSuccess();
      return Promise.resolve();
    });

    render(<ConnectionPanel {...panelProps} />);

    expect(autoCreateConnectionIfPossible).toHaveBeenCalledTimes(1);
    expect(updateNodeConnection).toHaveBeenCalledWith({ nodeId: 'node-id', connection, connector: selectedConnector });
    expect(mocks.dispatch).toHaveBeenCalledWith({
      type: 'connections/updateNodeConnection',
      payload: { nodeId: 'node-id', connection, connector: selectedConnector },
    });
    expect(closeConnectionsFlow).toHaveBeenCalledWith({ nodeId: 'node-id' });
  });

  it('retains the manual-create fallback for static connections when authoring is disabled', () => {
    (autoCreateConnectionIfPossible as Mock).mockImplementation(({ onManualConnectionCreation }) => {
      onManualConnectionCreation();
      return Promise.resolve();
    });

    render(<ConnectionPanel {...panelProps} />);

    expect(autoCreateConnectionIfPossible).toHaveBeenCalledTimes(1);
    expect(setIsCreatingConnection).toHaveBeenCalledWith(true);
    expect(mocks.dispatch).toHaveBeenCalledWith({ payload: true, type: 'panel/setIsCreatingConnection' });
    expect(updateNodeConnection).not.toHaveBeenCalled();
  });

  it.each<[string, Record<string, unknown>]>([
    ['loading', { isLoading: true }],
    ['failed', { isError: true }],
    ['existing connections', { data: [connection] }],
  ])('does not auto-create for a query with %s', (_case, query) => {
    setConnectionsQuery(query);

    render(<ConnectionPanel {...panelProps} />);

    expectSelectionWithoutMutation();
  });

  it('renders AllConnections without mutations when no operation is selected', () => {
    (useOperationPanelSelectedNodeId as Mock).mockReturnValue(undefined);
    (useConnectionPanelSelectedNodeIds as Mock).mockReturnValue([]);
    (useConnectorByNodeId as Mock).mockReturnValue(undefined);

    render(<ConnectionPanel {...panelProps} />);

    expect(screen.getByRole('heading', { name: 'Connections' })).toBeInTheDocument();
    expect(screen.getByTestId('all-connections')).toBeInTheDocument();
    expect(autoCreateConnectionIfPossible).not.toHaveBeenCalled();
    expect(mocks.dispatch).not.toHaveBeenCalled();
  });
});
