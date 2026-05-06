import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { Connection, Connector } from '@microsoft/logic-apps-shared';
import { beforeEach, describe, expect, it, type Mock, vi } from 'vitest';
import { autoCreateConnectionIfPossible, updateNodeConnection } from '../../../../../core/actions/bjsworkflow/connections';
import * as ConnectionSelectors from '../../../../../core/state/connection/connectionSelector';
import * as DesignerOptionsSelectors from '../../../../../core/state/designerOptions/designerOptionsSelectors';
import { setIsCreatingConnection } from '../../../../../core/state/panel/panelSlice';
import { SelectConnection, SelectConnectionWrapper } from '../selectConnectionFromConnector';

const mocks = vi.hoisted(() => ({
  connectionTableProps: [] as any[],
  dispatch: vi.fn(),
  getIconUriFromConnector: vi.fn(() => 'https://example.com/icon.png'),
  parseErrorMessage: vi.fn((error: Error) => error.message),
  setupConnectionIfNeeded: vi.fn(),
}));

vi.mock('@fluentui/react-components', () => ({
  Body1Strong: ({ children }: any) => <strong>{children}</strong>,
  Button: ({ children, disabled, onClick, 'aria-label': ariaLabel }: any) => (
    <button aria-label={ariaLabel} disabled={disabled} onClick={onClick} type="button">
      {children}
    </button>
  ),
  Divider: () => <hr />,
  MessageBar: ({ children }: any) => <div role="alert">{children}</div>,
  MessageBarBody: ({ children }: any) => <div>{children}</div>,
  MessageBarTitle: ({ children }: any) => <strong>{children}</strong>,
  Spinner: ({ label }: any) => <div role="status">{label}</div>,
  Text: ({ children }: any) => <span>{children}</span>,
}));

vi.mock('@microsoft/logic-apps-shared', async (importOriginal) => {
  const original = (await importOriginal()) as object;
  return {
    ...original,
    ConnectionService: () => ({
      setupConnectionIfNeeded: mocks.setupConnectionIfNeeded,
    }),
    getIconUriFromConnector: mocks.getIconUriFromConnector,
    parseErrorMessage: mocks.parseErrorMessage,
  };
});

vi.mock('react-redux', async (importOriginal) => {
  const original = (await importOriginal()) as object;
  return {
    ...original,
    useDispatch: () => mocks.dispatch,
  };
});

vi.mock('../../../../../core/actions/bjsworkflow/connections', () => ({
  autoCreateConnectionIfPossible: vi.fn(),
  updateNodeConnection: vi.fn((payload: unknown) => ({ payload, type: 'connections/updateNodeConnection' })),
}));

vi.mock('../../../../../core/queries/connections', () => ({
  useConnectionsForConnector: vi.fn(),
}));

vi.mock('../../../../../core/state/connection/connectionSelector', () => ({
  useConnectionRefs: vi.fn(),
  useConnector: vi.fn(),
}));

vi.mock('../../../../../core/state/designerOptions/designerOptionsSelectors', () => ({
  useIsXrmConnectionReferenceMode: vi.fn(),
}));

vi.mock('../../../../../core/state/panel/panelSlice', () => ({
  setIsCreatingConnection: vi.fn((isCreating: boolean) => ({ payload: isCreating, type: 'panel/setIsCreatingConnection' })),
}));

vi.mock('../connectionTable', () => ({
  ConnectionTable: (props: any) => {
    mocks.connectionTableProps.push(props);
    return (
      <div data-testid="connection-table">
        <div data-testid="connection-table-xrm-mode">{String(props.isXrmConnectionReferenceMode)}</div>
        <button onClick={() => props.saveSelectionCallback(props.connections[0])} type="button">
          Select first connection
        </button>
        <button onClick={() => props.cancelSelectionCallback?.()} type="button">
          Cancel table selection
        </button>
      </div>
    );
  },
}));

vi.mock('../../actionList/actionList', () => ({
  ActionList: ({ iconUri, nodeIds }: { iconUri: string; nodeIds: string[] }) => (
    <div data-testid="action-list">
      {iconUri}:{nodeIds.join(',')}
    </div>
  ),
}));

const mockConnector = {
  id: 'connector-id',
  name: 'connector-name',
} as Connector;

const mockConnection = {
  id: '/subscriptions/sub1/resourceGroups/rg/providers/Microsoft.Web/connections/connection-one',
  name: 'connection-one',
  properties: {
    displayName: 'Connection one',
  },
} as Connection;

const newConnection = {
  id: '/subscriptions/sub1/resourceGroups/rg/providers/Microsoft.Web/connections/connection-two',
  name: 'connection-two',
  properties: {
    displayName: 'Connection two',
  },
} as Connection;

describe('SelectConnectionWrapper from connector', () => {
  const onConnectionClose = vi.fn();
  const onConnectionSuccessful = vi.fn();

  const wrapperProps = {
    connectorId: 'requested-connector-id',
    connectorName: 'connector-name',
    currentConnectionId: 'connection-one',
    onConnectionClose,
    onConnectionSuccessful,
  };

  const setConnectionsQuery = async (overrides: Record<string, unknown> = {}) => {
    const connectionsQueries = await import('../../../../../core/queries/connections');
    (connectionsQueries.useConnectionsForConnector as Mock).mockReturnValue({
      data: [mockConnection],
      error: null,
      isError: false,
      isLoading: false,
      ...overrides,
    });
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    mocks.connectionTableProps = [];
    (autoCreateConnectionIfPossible as Mock).mockImplementation(() => undefined);

    (ConnectionSelectors.useConnector as Mock).mockReturnValue({ data: mockConnector });
    (ConnectionSelectors.useConnectionRefs as Mock).mockReturnValue({ referenceOne: {}, referenceTwo: {} });
    (DesignerOptionsSelectors.useIsXrmConnectionReferenceMode as Mock).mockReturnValue(false);
    await setConnectionsQuery();
  });

  it('renders a loading state while connections load', async () => {
    await setConnectionsQuery({ isLoading: true });

    render(<SelectConnectionWrapper {...wrapperProps} />);

    expect(screen.getByRole('status')).toHaveTextContent('Loading connection data...');
  });

  it('renders an error state when loading connections fails', async () => {
    await setConnectionsQuery({ error: new Error('connection load failed'), isError: true });

    render(<SelectConnectionWrapper {...wrapperProps} />);

    expect(screen.getByText('Error loading connections')).toBeInTheDocument();
    expect(screen.getByText('connection load failed')).toBeInTheDocument();
    expect(screen.queryByTestId('connection-table')).not.toBeInTheDocument();
  });

  it('selects an existing connection and dispatches setup state', async () => {
    render(<SelectConnectionWrapper {...wrapperProps} />);

    fireEvent.click(screen.getByRole('button', { name: 'Select first connection' }));

    expect(updateNodeConnection).toHaveBeenCalledWith({
      connection: mockConnection,
      connector: mockConnector,
      nodeId: 'temp-node-id',
    });
    expect(mocks.dispatch).toHaveBeenCalledWith({
      payload: {
        connection: mockConnection,
        connector: mockConnector,
        nodeId: 'temp-node-id',
      },
      type: 'connections/updateNodeConnection',
    });
    expect(mocks.setupConnectionIfNeeded).toHaveBeenCalledWith(mockConnection);
    expect(onConnectionSuccessful).toHaveBeenCalledWith(mockConnection);
  });

  it('auto creates a new connection when no connections exist', async () => {
    await setConnectionsQuery({ data: [] });
    (autoCreateConnectionIfPossible as Mock).mockImplementation(({ applyNewConnection }) => applyNewConnection(newConnection));

    render(<SelectConnectionWrapper {...wrapperProps} />);

    await waitFor(() => expect(autoCreateConnectionIfPossible).toHaveBeenCalledTimes(1));
    expect(autoCreateConnectionIfPossible).toHaveBeenCalledWith(
      expect.objectContaining({
        connector: mockConnector,
        operationInfo: undefined,
        referenceKeys: ['referenceOne', 'referenceTwo'],
        skipOAuth: true,
      })
    );
    expect(onConnectionSuccessful).toHaveBeenCalledWith(newConnection);
  });

  it('starts manual connection creation from the add-new button', () => {
    (autoCreateConnectionIfPossible as Mock).mockImplementation(({ onManualConnectionCreation }) => onManualConnectionCreation());

    render(<SelectConnectionWrapper {...wrapperProps} />);

    fireEvent.click(screen.getByRole('button', { name: 'Add a new connection' }));

    expect(setIsCreatingConnection).toHaveBeenCalledWith(true);
    expect(mocks.dispatch).toHaveBeenCalledWith({ payload: true, type: 'panel/setIsCreatingConnection' });
  });

  it('disables the add button while inline connection creation is in progress', () => {
    render(<SelectConnectionWrapper {...wrapperProps} />);

    fireEvent.click(screen.getByRole('button', { name: 'Add a new connection' }));

    expect(screen.getByRole('button', { name: 'Add a new connection' })).toBeDisabled();
    expect(screen.getByText('Adding new connection...')).toBeInTheDocument();
  });

  it('cancels connection selection from the cancel button', () => {
    render(<SelectConnectionWrapper {...wrapperProps} />);

    fireEvent.click(screen.getByRole('button', { name: 'Cancel the selection' }));

    expect(onConnectionClose).toHaveBeenCalledTimes(1);
  });

  it('passes action list and XRM mode to SelectConnection', () => {
    (DesignerOptionsSelectors.useIsXrmConnectionReferenceMode as Mock).mockReturnValue(true);

    render(<SelectConnectionWrapper {...wrapperProps} />);

    expect(screen.getByTestId('action-list')).toHaveTextContent('https://example.com/icon.png:connector-name');
    expect(screen.getByText('Select an existing connection reference or create a new one')).toBeInTheDocument();
    expect(mocks.connectionTableProps[0]).toMatchObject({
      currentConnectionId: 'connection-one',
      isXrmConnectionReferenceMode: true,
      shouldRenderDetails: true,
    });
  });
});

describe('SelectConnection from connector', () => {
  it('renders XRM copy and calls add and cancel callbacks', () => {
    const onAdd = vi.fn();
    const onCancel = vi.fn();

    render(
      <SelectConnection
        addButton={{ onAdd, text: 'Add new' }}
        cancelButton={{ onCancel }}
        cancelSelectionCallback={onCancel}
        connections={[mockConnection]}
        currentConnectionId="connection-one"
        isXrmConnectionReferenceMode={true}
        saveSelectionCallback={vi.fn()}
      />
    );

    expect(screen.getByText('Select an existing connection reference or create a new one')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Add a new connection' }));
    fireEvent.click(screen.getByRole('button', { name: 'Cancel the selection' }));

    expect(onAdd).toHaveBeenCalledTimes(1);
    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});
