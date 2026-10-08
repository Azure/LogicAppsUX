import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { IntlProvider } from 'react-intl';
import type { CreateConnectionProps } from '../createConnection';
import { CreateConnectionWrapper } from '../createConnectionWrapper';

const mocks = vi.hoisted(() => ({
  dispatch: vi.fn(),
  createConnection: vi.fn(),
  createOAuthConnection: vi.fn(),
  uniqueName: vi.fn(),
  updateCache: vi.fn(),
  log: vi.fn(),
  state: {
    connections: {
      connectionsMapping: {} as Record<string, string>,
      connectionReferences: {},
    },
    operations: {
      inputParameters: { action: { parameterGroups: {} } },
      dependencies: { action: {} },
    },
    workflow: { workflowKind: 'stateful' },
  },
  connector: {
    id: '/serviceProviders/sql',
    name: 'sql',
    properties: { displayName: 'SQL', connectionParameters: {} },
  },
}));

vi.mock('react-redux', () => ({
  useDispatch: () => mocks.dispatch,
  useSelector: (selector: (state: typeof mocks.state) => unknown) => selector(mocks.state),
}));
vi.mock('../../../../../core', () => ({
  useOperationInfo: () => ({ type: 'ServiceProvider', connectorId: '/serviceProviders/sql', operationId: 'executeQuery' }),
}));
vi.mock('../../../../../common/hooks/agent', () => ({ useIsAgentSubGraph: () => false }));
vi.mock('../../../../../core/state/panel/panelSelectors', () => ({
  useOperationPanelSelectedNodeId: () => 'action',
  useConnectionPanelSelectedNodeIds: () => ['action'],
  usePreviousPanelMode: () => 'Operation',
}));
vi.mock('../../../../../core/state/panel/panelSlice', () => ({
  setIsCreatingConnection: (payload: boolean) => ({ type: 'createPanel', payload }),
}));
vi.mock('../../../../../core/state/selectors/actionMetadataSelector', () => ({
  useOperationManifest: () => ({ data: undefined }),
}));
vi.mock('../../../../../core/state/operation/operationMetadataSlice', () => ({
  updateNodeParameters: (payload: unknown) => ({ type: 'parameters', payload }),
}));
vi.mock('../../../../../core/state/connection/connectionSelector', () => ({
  useConnectorByNodeId: () => mocks.connector,
  useConnector: () => ({ data: mocks.connector }),
  useSubscriptions: () => ({ data: [] }),
  useGateways: () => ({ data: [] }),
  useGatewayServiceConfig: () => undefined,
}));
vi.mock('../../../../../core/actions/bjsworkflow/connections', () => ({
  closeConnectionsFlow: (payload: unknown) => ({ type: 'closeConnections', payload }),
  updateNodeConnection: (payload: unknown) => ({ type: 'static', payload }),
  getConnectionMetadata: () => undefined,
  getApiHubAuthentication: vi.fn(),
  getConnectionProperties: vi.fn(),
  needsOAuth: () => false,
}));
vi.mock('../../../../../core/queries/connections', () => ({
  getUniqueConnectionName: mocks.uniqueName,
  updateNewConnectionInQueryCache: mocks.updateCache,
}));
vi.mock('../../../../../core/utils/connectors/connections', () => ({
  getAssistedConnectionProps: () => undefined,
  getSupportedParameterSets: () => undefined,
  getConnectionParametersForAzureConnection: vi.fn(),
}));
vi.mock('@microsoft/logic-apps-shared', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@microsoft/logic-apps-shared')>()),
  ConnectionService: () => ({
    createConnection: mocks.createConnection,
    createAndAuthorizeOAuthConnection: mocks.createOAuthConnection,
  }),
  WorkflowService: () => ({}),
  LoggerService: () => ({ log: mocks.log }),
}));
vi.mock('../createConnection', () => ({
  CreateConnection: ({
    showActionBar,
    hideCancelButton,
    cancelCallback,
    createConnectionCallback,
    isLoading,
    errorMessage,
  }: CreateConnectionProps) => (
    <div>
      {showActionBar ? <div data-testid="creation-action-bar" /> : null}
      {errorMessage ? <div role="alert">{errorMessage}</div> : null}
      <button type="button" disabled={isLoading} onClick={() => createConnectionCallback?.('New connection')}>
        Create connection
      </button>
      <button type="button" disabled={isLoading} onClick={() => createConnectionCallback?.('New connection', undefined, {}, true)}>
        Authorize connection
      </button>
      {hideCancelButton ? null : (
        <button type="button" disabled={isLoading} onClick={cancelCallback}>
          Cancel
        </button>
      )}
    </div>
  ),
}));

const newConnection = {
  id: '/connections/NewSql',
  name: 'NewSql',
  properties: { displayName: 'New connection' },
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.state.connections.connectionsMapping = {};
  mocks.uniqueName.mockResolvedValue('NewSql');
  mocks.createConnection.mockResolvedValue(newConnection);
  mocks.createOAuthConnection.mockResolvedValue({ connection: newConnection });
});
afterEach(cleanup);

describe('CreateConnectionWrapper and Internal tab wiring', () => {
  it('keeps the standalone action bar and hides Cancel when no mapping or tab cancel callback exists', () => {
    render(<CreateConnectionWrapper />, { wrapper: ({ children }) => <IntlProvider locale="en">{children}</IntlProvider> });

    expect(screen.getByTestId('creation-action-bar')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Cancel' })).not.toBeInTheDocument();
    expect(mocks.uniqueName).not.toHaveBeenCalled();
    expect(mocks.createConnection).not.toHaveBeenCalled();
    expect(mocks.createOAuthConnection).not.toHaveBeenCalled();
  });

  it('hides the duplicate action bar and allows tab cancellation even without an existing mapping', () => {
    const onConnectionCancelled = vi.fn();
    const onCreatingChange = vi.fn();
    render(
      <CreateConnectionWrapper showActionBar={false} onConnectionCancelled={onConnectionCancelled} onCreatingChange={onCreatingChange} />,
      { wrapper: ({ children }) => <IntlProvider locale="en">{children}</IntlProvider> }
    );

    expect(screen.queryByTestId('creation-action-bar')).not.toBeInTheDocument();
    expect(mocks.uniqueName).not.toHaveBeenCalled();
    expect(mocks.createConnection).not.toHaveBeenCalled();
    expect(mocks.createOAuthConnection).not.toHaveBeenCalled();
    expect(onCreatingChange).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(onConnectionCancelled).toHaveBeenCalledExactlyOnceWith();
    expect(mocks.dispatch).toHaveBeenCalledExactlyOnceWith({ type: 'createPanel', payload: false });
    expect(onCreatingChange).not.toHaveBeenCalled();
  });

  it('retains standalone cancellation for an existing connection without requiring the new callback', () => {
    mocks.state.connections.connectionsMapping.action = 'ExistingSql';
    render(<CreateConnectionWrapper />, { wrapper: ({ children }) => <IntlProvider locale="en">{children}</IntlProvider> });

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(mocks.dispatch).toHaveBeenCalledExactlyOnceWith({ type: 'createPanel', payload: false });
  });

  it.each(['Create connection', 'Authorize connection'])(
    'forwards busy state around %s and applies/closes only after success',
    async (button) => {
      let finishCreation: (() => void) | undefined;
      const pendingCreation = new Promise<typeof newConnection>((resolve) => {
        finishCreation = () => resolve(newConnection);
      });
      if (button === 'Create connection') {
        mocks.createConnection.mockReturnValueOnce(pendingCreation);
      } else {
        mocks.createOAuthConnection.mockReturnValueOnce(pendingCreation.then((connection) => ({ connection })));
      }
      const onCreatingChange = vi.fn();
      render(<CreateConnectionWrapper showActionBar={false} onConnectionCancelled={vi.fn()} onCreatingChange={onCreatingChange} />, {
        wrapper: ({ children }) => <IntlProvider locale="en">{children}</IntlProvider>,
      });
      fireEvent.click(screen.getByRole('button', { name: button }));

      await waitFor(() =>
        expect(button === 'Create connection' ? mocks.createConnection : mocks.createOAuthConnection).toHaveBeenCalledTimes(1)
      );
      expect(onCreatingChange.mock.calls).toEqual([[true]]);
      expect(screen.getByRole('button', { name: button })).toBeDisabled();
      expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled();
      expect(mocks.dispatch).not.toHaveBeenCalled();
      expect(mocks.updateCache).not.toHaveBeenCalled();

      await act(async () => finishCreation?.());
      await waitFor(() => expect(onCreatingChange.mock.calls).toEqual([[true], [false]]));
      expect(mocks.updateCache).toHaveBeenCalledExactlyOnceWith('/serviceProviders/sql', newConnection);
      expect(mocks.dispatch).toHaveBeenCalledWith({
        type: 'static',
        payload: { nodeId: 'action', connector: mocks.connector, connection: newConnection },
      });
      expect(mocks.dispatch).toHaveBeenLastCalledWith({
        type: 'closeConnections',
        payload: { nodeId: 'action', panelMode: 'Operation' },
      });
    }
  );

  it.each(['name generation', 'connection service', 'OAuth service'])(
    'releases busy state and keeps the form open after a %s failure',
    async (stage) => {
      if (stage === 'name generation') {
        mocks.uniqueName.mockRejectedValueOnce(new Error('Connection setup failed'));
      } else if (stage === 'connection service') {
        mocks.createConnection.mockRejectedValueOnce(new Error('Connection setup failed'));
      } else {
        mocks.createOAuthConnection.mockResolvedValueOnce({ errorMessage: 'Connection setup failed' });
      }
      const onCreatingChange = vi.fn();
      const onConnectionCancelled = vi.fn();
      render(
        <CreateConnectionWrapper showActionBar={false} onConnectionCancelled={onConnectionCancelled} onCreatingChange={onCreatingChange} />,
        { wrapper: ({ children }) => <IntlProvider locale="en">{children}</IntlProvider> }
      );
      fireEvent.click(screen.getByRole('button', { name: stage === 'OAuth service' ? 'Authorize connection' : 'Create connection' }));

      expect(await screen.findByRole('alert')).toHaveTextContent('Connection setup failed');
      expect(onCreatingChange.mock.calls).toEqual([[true], [false]]);
      expect(screen.getByRole('button', { name: 'Create connection' })).toBeEnabled();
      expect(screen.getByRole('button', { name: 'Cancel' })).toBeEnabled();
      expect(mocks.updateCache).not.toHaveBeenCalled();
      expect(mocks.dispatch).not.toHaveBeenCalled();
      expect(onConnectionCancelled).not.toHaveBeenCalled();
    }
  );
});
