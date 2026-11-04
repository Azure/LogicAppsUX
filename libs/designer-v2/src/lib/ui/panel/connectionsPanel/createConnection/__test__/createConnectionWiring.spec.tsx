import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { IntlProvider } from 'react-intl';
import type { ComponentProps } from 'react';
import { ConnectionParameterTypes, type ConnectionParameterSet, type Connector } from '@microsoft/logic-apps-shared';
import constants from '../../../../../common/constants';
import type { CreateConnectionProps } from '../createConnection';
import { CreateConnectionInternal } from '../createConnectionInternal';
import { CreateConnectionWrapper } from '../createConnectionWrapper';

const mocks = vi.hoisted(() => ({
  dispatch: vi.fn(),
  createConnection: vi.fn(),
  createOAuthConnection: vi.fn(),
  uniqueName: vi.fn(),
  updateCache: vi.fn(),
  connectionProperties: vi.fn(),
  authentication: vi.fn(),
  connectionParameters: vi.fn(),
  log: vi.fn(),
  formProps: undefined as CreateConnectionProps | undefined,
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
    properties: { displayName: 'SQL', iconUri: 'https://example.com/sql.svg', connectionParameters: {} },
  } as Connector | undefined,
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
  getApiHubAuthentication: mocks.authentication,
  getConnectionProperties: mocks.connectionProperties,
  needsOAuth: () => false,
}));
vi.mock('../../../../../core/queries/connections', () => ({
  getUniqueConnectionName: mocks.uniqueName,
  updateNewConnectionInQueryCache: mocks.updateCache,
}));
vi.mock('../../../../../core/utils/connectors/connections', () => ({
  getAssistedConnectionProps: () => undefined,
  getSupportedParameterSets: () => undefined,
  getConnectionParametersForAzureConnection: mocks.connectionParameters,
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
  CreateConnection: (props: CreateConnectionProps) => {
    mocks.formProps = props;
    const { showActionBar, hideCancelButton, cancelCallback, createConnectionCallback, isLoading, errorMessage } = props;
    return (
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
    );
  },
}));

const newConnection = {
  id: '/connections/NewSql',
  name: 'NewSql',
  properties: { displayName: 'New connection' },
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.formProps = undefined;
  mocks.connector = {
    id: '/serviceProviders/sql',
    name: 'sql',
    type: 'ServiceProvider',
    properties: { displayName: 'SQL', iconUri: 'https://example.com/sql.svg', connectionParameters: {} },
  };
  mocks.state.connections.connectionsMapping = {};
  mocks.uniqueName.mockResolvedValue('NewSql');
  mocks.createConnection.mockResolvedValue(newConnection);
  mocks.createOAuthConnection.mockResolvedValue({ connection: newConnection });
  mocks.connectionProperties.mockReturnValue({ authentication: { type: 'ManagedServiceIdentity' } });
  mocks.authentication.mockReturnValue({ type: 'ManagedServiceIdentity' });
  mocks.connectionParameters.mockImplementation(async (_type, _resource, parameters) => parameters);
});

describe('CreateConnectionInternal parameter and resource wiring', () => {
  const renderInternal = (overrides: Partial<ComponentProps<typeof CreateConnectionInternal>> = {}) => {
    const callbacks = {
      updateConnectionInState: vi.fn(),
      onConnectionCreated: vi.fn(),
      onCreatingChange: vi.fn(),
      updateOperationParameterValues: vi.fn(),
    };
    const props = {
      connectorId: '/serviceProviders/sql',
      operationType: 'ServiceProvider',
      existingReferences: ['ExistingSql'],
      hideCancelButton: false,
      showActionBar: true,
      ...overrides,
      ...callbacks,
    };
    render(<CreateConnectionInternal {...props} />, {
      wrapper: ({ children }) => <IntlProvider locale="en">{children}</IntlProvider>,
    });
    return props;
  };

  it('fills required defaults and the OAuth redirect while excluding unknown keys from the parameter set', async () => {
    const props = renderInternal({ connectionName: 'ExactSql' });
    const parameterSet: ConnectionParameterSet = {
      name: 'oauth',
      uiDefinition: { displayName: 'OAuth', description: 'OAuth parameter set' },
      parameters: {
        tenant: {
          type: 'string',
          uiDefinition: {
            displayName: 'Tenant',
            description: 'Tenant identifier',
            constraints: { required: 'true', default: 'default-tenant' },
          },
        },
        token: {
          type: 'oauthSetting',
          uiDefinition: { displayName: 'Token', description: 'OAuth token' },
          oAuthSettings: {
            clientId: 'test-client',
            identityProvider: 'aad',
            scopes: [],
            redirectUrl: 'https://localhost/callback',
            properties: { IsFirstParty: 'false' },
          },
        },
      },
    };
    const values = { tenant: '', token: '', extra: 'not a parameter-set key' };
    const operationValues = { deployment: 'authored-deployment' };

    await act(async () => {
      await mocks.formProps?.createConnectionCallback?.(
        'OAuth SQL',
        parameterSet,
        values,
        true,
        { alternative: 'value' },
        undefined,
        { additional: 'value' },
        operationValues
      );
    });

    expect(mocks.uniqueName).not.toHaveBeenCalled();
    expect(mocks.createOAuthConnection).toHaveBeenCalledExactlyOnceWith(
      'ExactSql',
      '/serviceProviders/sql',
      {
        displayName: 'OAuth SQL',
        connectionParameters: { tenant: 'default-tenant', token: 'https://localhost/callback', extra: 'not a parameter-set key' },
        connectionParametersSet: {
          name: 'oauth',
          values: { tenant: { value: 'default-tenant' }, token: { value: 'https://localhost/callback' } },
        },
        operationParameterValues: operationValues,
        alternativeParameterValues: { alternative: 'value' },
        additionalParameterValues: { additional: 'value' },
        features: undefined,
      },
      { connectionMetadata: undefined, connectionParameterSet: parameterSet, connectionParameters: parameterSet.parameters }
    );
    expect(props.updateOperationParameterValues).toHaveBeenCalledExactlyOnceWith(operationValues);
    expect(props.updateConnectionInState).toHaveBeenCalledExactlyOnceWith({ connection: newConnection, connector: mocks.connector });
    expect(props.onConnectionCreated).toHaveBeenCalledExactlyOnceWith(newConnection);
    expect(props.onCreatingChange.mock.calls).toEqual([[true], [false]]);
  });

  it('clears a stale subresource when the resource changes and submits the newly selected resource parameters', async () => {
    const props = renderInternal({
      assistedConnectionProps: {} as NonNullable<ComponentProps<typeof CreateConnectionInternal>['assistedConnectionProps']>,
      connectionMetadata: { type: 'AzureFunction' } as ComponentProps<typeof CreateConnectionInternal>['connectionMetadata'],
    });
    act(() => mocks.formProps?.resourceSelectorProps?.onSubResourceSelect?.({ id: 'stale-function' }));
    // ResourceEntry passes the resource object at runtime despite the picker's legacy string callback annotation.
    act(() => Reflect.apply(mocks.formProps!.resourceSelectorProps!.onResourceSelect, undefined, [{ id: 'function-app' }]));
    expect(mocks.formProps?.resourceSelectorProps).toMatchObject({
      selectedResourceId: 'function-app',
      selectedSubResource: undefined,
    });
    const selectedFunction = { id: 'function-app/functions/current' };
    act(() => mocks.formProps?.resourceSelectorProps?.onSubResourceSelect?.(selectedFunction));
    mocks.connectionParameters.mockResolvedValueOnce({ function: selectedFunction.id, key: 'mock-key' });

    await act(async () => {
      await mocks.formProps?.createConnectionCallback?.('Function connection', undefined, { authored: 'retained' });
    });

    expect(mocks.connectionParameters).toHaveBeenCalledExactlyOnceWith('AzureFunction', selectedFunction, { authored: 'retained' }, false);
    expect(mocks.uniqueName).toHaveBeenCalledExactlyOnceWith('/serviceProviders/sql', ['ExistingSql']);
    expect(mocks.createConnection).toHaveBeenCalledWith(
      'NewSql',
      mocks.connector,
      expect.objectContaining({ connectionParameters: { function: selectedFunction.id, key: 'mock-key' } }),
      expect.objectContaining({ connectionMetadata: { type: 'AzureFunction' } })
    );
    expect(props.updateConnectionInState).toHaveBeenCalledExactlyOnceWith({ connection: newConnection, connector: mocks.connector });
  });

  it('retains managed-identity authentication when adding the dynamic runtime proxy properties', async () => {
    const props = renderInternal();
    const parameterSet: ConnectionParameterSet = {
      name: 'oauthMI',
      uiDefinition: { displayName: 'Managed identity', description: 'Managed identity parameter set' },
      parameters: {
        identity: {
          type: ConnectionParameterTypes.managedIdentity,
          uiDefinition: { displayName: 'Identity', description: 'User-assigned identity' },
        },
        audience: { type: 'string', uiDefinition: { displayName: 'Audience', description: 'Token audience' } },
      },
    };
    const identity = '/subscriptions/sub/resourceGroups/rg/providers/Microsoft.ManagedIdentity/userAssignedIdentities/test';
    const connection = { ...newConnection, properties: { ...newConnection.properties, dynamicConnectionProxyUrl: 'https://proxy.test' } };
    mocks.createConnection.mockResolvedValueOnce(connection);

    await act(async () => {
      await mocks.formProps?.createConnectionCallback?.(
        'Dynamic identity connection',
        parameterSet,
        { identity, audience: 'https://audience.test' },
        false,
        undefined,
        undefined,
        undefined,
        undefined,
        true
      );
    });

    expect(mocks.createConnection).toHaveBeenCalledWith(
      'NewSql',
      mocks.connector,
      expect.objectContaining({ features: 'DynamicUserInvoked' }),
      expect.objectContaining({ connectionParameterSet: parameterSet })
    );
    expect(props.updateConnectionInState).toHaveBeenCalledExactlyOnceWith({
      connection,
      connector: mocks.connector,
      connectionProperties: {
        authentication: { type: 'ManagedServiceIdentity', audience: 'https://audience.test', identity },
        runtimeSource: 'Dynamic',
        dynamicConnectionProxyUrl: 'https://proxy.test',
      },
    });
    expect(mocks.authentication).not.toHaveBeenCalled();
    expect(props.onConnectionCreated).toHaveBeenCalledExactlyOnceWith(connection);
  });

  it.each([constants.SYSTEM_ASSIGNED_MANAGED_IDENTITY, '/identities/UserAssigned'])(
    'applies an explicitly selected identity %s using both connection and API-hub authentication',
    async (identity) => {
      const props = renderInternal();
      const userAssignedIdentity = identity === constants.SYSTEM_ASSIGNED_MANAGED_IDENTITY ? undefined : identity;
      const authentication = { type: 'ManagedServiceIdentity', identity: userAssignedIdentity };
      mocks.authentication.mockReturnValueOnce(authentication);
      mocks.connectionProperties.mockReturnValueOnce({ authentication });

      await act(async () => {
        await mocks.formProps?.createConnectionCallback?.('Identity connection', undefined, {}, false, undefined, identity);
      });

      expect(mocks.connectionProperties).toHaveBeenCalledExactlyOnceWith(mocks.connector, userAssignedIdentity);
      expect(mocks.authentication).toHaveBeenCalledExactlyOnceWith(userAssignedIdentity);
      expect(props.updateConnectionInState).toHaveBeenCalledExactlyOnceWith({
        connection: newConnection,
        connector: mocks.connector,
        connectionProperties: { authentication },
        authentication,
      });
    }
  );

  it('reports a resource-parameter failure, releases the busy lock, and permits clearing the error without creating a connection', async () => {
    const props = renderInternal({
      assistedConnectionProps: {} as NonNullable<ComponentProps<typeof CreateConnectionInternal>['assistedConnectionProps']>,
    });
    mocks.connectionParameters.mockRejectedValueOnce({ responseText: 'Resource parameters unavailable' });

    await act(async () => {
      await mocks.formProps?.createConnectionCallback?.('Failed resource');
    });

    expect(screen.getByRole('alert')).toHaveTextContent('Resource parameters unavailable');
    expect(screen.getByRole('button', { name: 'Create connection' })).toBeEnabled();
    expect(props.onCreatingChange.mock.calls).toEqual([[true], [false]]);
    expect(mocks.log).toHaveBeenCalledWith(expect.objectContaining({ area: 'create connection tab' }));
    expect(mocks.createConnection).not.toHaveBeenCalled();
    expect(mocks.uniqueName).not.toHaveBeenCalled();
    expect(props.updateConnectionInState).not.toHaveBeenCalled();
    expect(props.onConnectionCreated).not.toHaveBeenCalled();

    act(() => mocks.formProps?.clearErrorCallback?.());
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('renders the loading state until connector properties exist without starting creation', () => {
    mocks.connector = undefined;
    const props = renderInternal();

    expect(screen.getByText('Loading connection data...')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Create connection' })).not.toBeInTheDocument();
    expect(mocks.createConnection).not.toHaveBeenCalled();
    expect(props.onCreatingChange).not.toHaveBeenCalled();
  });
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
