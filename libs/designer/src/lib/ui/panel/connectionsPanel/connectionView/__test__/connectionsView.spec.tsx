import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { Connection, Connector } from '@microsoft/logic-apps-shared';
import { beforeEach, describe, expect, it, type Mock, vi } from 'vitest';
import { autoCreateConnectionIfPossible } from '../../../../../core/actions/bjsworkflow/connections';
import * as ConnectionSelectors from '../../../../../core/state/connection/connectionSelector';
import * as PanelSelectors from '../../../../../core/state/panel/panelSelectors';
import { setIsCreatingConnection } from '../../../../../core/state/panel/panelSlice';
import { ConnectionsView } from '../connectionsView';

const mocks = vi.hoisted(() => ({
  connectionService: {
    getSubscriptionLocationWebUrl: vi.fn(() => '/subscriptions/sub1/providers/Microsoft.Web/locations/westus/managedApis'),
  },
  createConnectionProps: [] as any[],
  dispatch: vi.fn(),
  selectConnectionProps: [] as any[],
}));

vi.mock('@fluentui/react-components', () => ({
  Button: ({ icon, onClick, 'aria-label': ariaLabel }: any) => (
    <button aria-label={ariaLabel} onClick={onClick} type="button">
      {icon}
    </button>
  ),
  makeStyles: () => () => ({ appActionHeader: 'app-action-header' }),
  tokens: {
    colorNeutralBackground1: '#fff',
  },
}));

vi.mock('@microsoft/designer-ui', () => ({
  XLargeText: ({ text }: { text: string }) => <h2>{text}</h2>,
}));

vi.mock('@microsoft/logic-apps-shared', async (importOriginal) => {
  const original = (await importOriginal()) as object;
  return {
    ...original,
    ConnectionService: () => mocks.connectionService,
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
}));

vi.mock('../../../../../core/queries/connections', () => ({
  useConnectionsForConnector: vi.fn(),
}));

vi.mock('../../../../../core/state/connection/connectionSelector', () => ({
  useConnectionRefs: vi.fn(),
  useConnector: vi.fn(),
}));

vi.mock('../../../../../core/state/panel/panelSelectors', () => ({
  useIsCreatingConnection: vi.fn(),
}));

vi.mock('../../../../../core/state/panel/panelSlice', () => ({
  setIsCreatingConnection: vi.fn((isCreating: boolean) => ({ payload: isCreating, type: 'panel/setIsCreatingConnection' })),
}));

vi.mock('../../createConnection/createConnectionWrapperFromConnector', () => ({
  CreateConnectionWrapper: (props: any) => {
    mocks.createConnectionProps.push(props);
    return <div data-testid="create-connection-wrapper">Create wrapper</div>;
  },
}));

vi.mock('../../selectConnection/selectConnectionFromConnector', () => ({
  SelectConnectionWrapper: (props: any) => {
    mocks.selectConnectionProps.push(props);
    return <div data-testid="select-connection-wrapper">Select wrapper</div>;
  },
}));

const mockConnector = {
  id: '/subscriptions/sub1/providers/Microsoft.Web/locations/westus/managedApis/sql',
  name: 'sql',
} as Connector;

const mockConnection = {
  id: '/subscriptions/sub1/resourceGroups/rg/providers/Microsoft.Web/connections/sql-1',
  name: 'sql-1',
  properties: {
    displayName: 'SQL connection',
  },
} as Connection;

describe('ConnectionsView', () => {
  const closeView = vi.fn();
  const onConnectionSuccessful = vi.fn();

  const defaultProps = {
    closeView,
    connectorName: 'sql',
    connectorType: 'ApiConnection',
    currentConnectionId: 'currentConnection',
    onConnectionSuccessful,
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    mocks.createConnectionProps = [];
    mocks.selectConnectionProps = [];

    (ConnectionSelectors.useConnector as Mock).mockReturnValue({ data: mockConnector });
    (ConnectionSelectors.useConnectionRefs as Mock).mockReturnValue({ refOne: {}, refTwo: {} });
    (PanelSelectors.useIsCreatingConnection as Mock).mockReturnValue(false);

    const connectionsQueries = await import('../../../../../core/queries/connections');
    (connectionsQueries.useConnectionsForConnector as Mock).mockReturnValue({
      data: [mockConnection],
      isError: false,
      isLoading: false,
    });
  });

  it('renders the select header and select wrapper props', () => {
    render(<ConnectionsView {...defaultProps} />);

    expect(screen.getByText('Change connection')).toBeInTheDocument();
    expect(screen.getByTestId('select-connection-wrapper')).toBeInTheDocument();
    expect(mocks.selectConnectionProps[0]).toMatchObject({
      connectorId: '/subscriptions/sub1/providers/Microsoft.Web/locations/westus/managedApis/sql',
      connectorName: 'sql',
      currentConnectionId: 'currentConnection',
      onConnectionClose: closeView,
      onConnectionSuccessful,
    });
  });

  it('renders the create header and create wrapper props', () => {
    (PanelSelectors.useIsCreatingConnection as Mock).mockReturnValue(true);

    render(<ConnectionsView {...defaultProps} />);

    expect(screen.getByText('Create connection')).toBeInTheDocument();
    expect(screen.getByTestId('create-connection-wrapper')).toBeInTheDocument();
    expect(mocks.createConnectionProps[0]).toMatchObject({
      connectorId: '/subscriptions/sub1/providers/Microsoft.Web/locations/westus/managedApis/sql',
      connectorType: 'ApiConnection',
      onConnectionSuccessful,
    });
  });

  it('closes from the close button', () => {
    render(<ConnectionsView {...defaultProps} />);

    fireEvent.click(screen.getByRole('button', { name: 'Close panel' }));

    expect(closeView).toHaveBeenCalledTimes(1);
  });

  it('uses the connection provider id for agent connectors', () => {
    render(<ConnectionsView {...defaultProps} connectorName="agent" />);

    expect(ConnectionSelectors.useConnector).toHaveBeenCalledWith('/connectionProviders/agent');
    expect(mocks.selectConnectionProps[0].connectorId).toBe('/connectionProviders/agent');
  });

  it('auto creates a connection when no existing connections are returned', async () => {
    const connectionsQueries = await import('../../../../../core/queries/connections');
    (connectionsQueries.useConnectionsForConnector as Mock).mockReturnValue({
      data: [],
      isError: false,
      isLoading: false,
    });

    render(<ConnectionsView {...defaultProps} />);

    await waitFor(() => expect(autoCreateConnectionIfPossible).toHaveBeenCalledTimes(1));

    const autoCreateProps = (autoCreateConnectionIfPossible as Mock).mock.calls[0][0];
    expect(autoCreateProps).toMatchObject({
      connector: mockConnector,
      operationInfo: undefined,
      referenceKeys: ['refOne', 'refTwo'],
      skipOAuth: true,
    });

    autoCreateProps.applyNewConnection(mockConnection);
    expect(onConnectionSuccessful).toHaveBeenCalledWith(mockConnection);

    autoCreateProps.onSuccess();
    expect(closeView).toHaveBeenCalledTimes(1);

    autoCreateProps.onManualConnectionCreation();
    expect(setIsCreatingConnection).toHaveBeenCalledWith(true);
    expect(mocks.dispatch).toHaveBeenCalledWith({ payload: true, type: 'panel/setIsCreatingConnection' });
  });
});
