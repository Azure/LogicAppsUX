import { render, screen } from '@testing-library/react';
import type { Connection, Connector } from '@microsoft/logic-apps-shared';
import { beforeEach, describe, expect, it, type Mock, vi } from 'vitest';
import { getConnectionMetadata, updateNodeConnection } from '../../../../../core/actions/bjsworkflow/connections';
import { useConnector } from '../../../../../core/state/connection/connectionSelector';
import { useOperationManifest } from '../../../../../core/state/selectors/actionMetadataSelector';
import { getAssistedConnectionProps } from '../../../../../core/utils/connectors/connections';
import { CreateConnectionWrapper } from '../createConnectionWrapperFromConnector';

const mocks = vi.hoisted(() => ({
  createConnectionInternalProps: [] as any[],
  dispatch: vi.fn(),
  state: {
    connections: {
      connectionReferences: {
        referenceOne: {},
        referenceTwo: {},
      },
    },
  },
}));

vi.mock('react-redux', async (importOriginal) => {
  const original = (await importOriginal()) as object;
  return {
    ...original,
    useDispatch: () => mocks.dispatch,
    useSelector: (selector: any) => selector(mocks.state),
  };
});

vi.mock('../../../../../core/actions/bjsworkflow/connections', () => ({
  getConnectionMetadata: vi.fn(),
  updateNodeConnection: vi.fn((payload: unknown) => ({ payload, type: 'connections/updateNodeConnection' })),
}));

vi.mock('../../../../../core/queries/connections', () => ({
  useConnectionsForConnector: vi.fn(),
}));

vi.mock('../../../../../core/state/connection/connectionSelector', () => ({
  useConnector: vi.fn(),
}));

vi.mock('../../../../../core/state/selectors/actionMetadataSelector', () => ({
  useOperationManifest: vi.fn(),
}));

vi.mock('../../../../../core/utils/connectors/connections', () => ({
  getAssistedConnectionProps: vi.fn(),
}));

vi.mock('../createConnectionInternal', () => ({
  CreateConnectionInternal: (props: any) => {
    mocks.createConnectionInternalProps.push(props);
    return <div data-testid="create-connection-internal">Create internal</div>;
  },
}));

const mockConnector = {
  id: 'connector-id',
  name: 'connector-name',
} as Connector;

const mockConnection = {
  id: 'connection-id',
  name: 'connection-name',
  properties: {
    displayName: 'Connection',
  },
} as Connection;

const mockOperationManifest = {
  properties: {
    connection: {
      metadata: {
        type: 'azureConnection',
      },
    },
  },
};

describe('CreateConnectionWrapper from connector', () => {
  const onConnectionSuccessful = vi.fn();
  const assistedConnectionProps = { resourceId: '/subscriptions/sub1/resourceGroups/rg' };
  const connectionMetadata = { type: 'azureConnection' };

  const renderWrapper = async (connections: Connection[] = [mockConnection]) => {
    const connectionsQueries = await import('../../../../../core/queries/connections');
    (connectionsQueries.useConnectionsForConnector as Mock).mockReturnValue({ data: connections });

    return render(
      <CreateConnectionWrapper
        connectorId="requested-connector-id"
        connectorType="ApiConnection"
        onConnectionSuccessful={onConnectionSuccessful}
      />
    );
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.createConnectionInternalProps = [];
    mocks.state.connections.connectionReferences = {
      referenceOne: {},
      referenceTwo: {},
    };

    (useConnector as Mock).mockReturnValue({ data: mockConnector });
    (useOperationManifest as Mock).mockReturnValue({ data: mockOperationManifest });
    (getAssistedConnectionProps as Mock).mockReturnValue(assistedConnectionProps);
    (getConnectionMetadata as Mock).mockReturnValue(connectionMetadata);
  });

  it('passes connector, references, metadata, and callbacks to CreateConnectionInternal', async () => {
    await renderWrapper();

    expect(screen.getByTestId('create-connection-internal')).toBeInTheDocument();
    expect(useConnector).toHaveBeenCalledWith('requested-connector-id');
    expect(useOperationManifest).toHaveBeenCalledWith({
      connectorId: 'connector-id',
      operationId: 'connector-name',
      type: 'agent',
    });
    expect(getAssistedConnectionProps).toHaveBeenCalledWith(mockConnector);
    expect(getConnectionMetadata).toHaveBeenCalledWith(mockOperationManifest);
    expect(mocks.createConnectionInternalProps[0]).toMatchObject({
      assistedConnectionProps,
      connectionMetadata,
      connectorId: 'connector-id',
      existingReferences: ['referenceOne', 'referenceTwo'],
      hideCancelButton: false,
      isAgentSubgraph: false,
      onConnectionCreated: onConnectionSuccessful,
      operationManifest: mockOperationManifest,
      operationType: 'ApiConnection',
      showActionBar: true,
      workflowKind: 'stateful',
    });
  });

  it('hides the cancel button when there are no existing connections', async () => {
    await renderWrapper([]);

    expect(mocks.createConnectionInternalProps[0].hideCancelButton).toBe(true);
  });

  it('dispatches updateNodeConnection from updateConnectionInState', async () => {
    await renderWrapper();

    const payload = {
      authentication: { type: 'Raw', scheme: 'Key' },
      connection: mockConnection,
      connectionProperties: { runtimeSource: 'Dynamic' },
      connector: mockConnector,
    };

    mocks.createConnectionInternalProps[0].updateConnectionInState(payload);

    expect(updateNodeConnection).toHaveBeenCalledWith({
      ...payload,
      nodeId: 'temp-node-id',
    });
    expect(mocks.dispatch).toHaveBeenCalledWith({
      payload: {
        ...payload,
        nodeId: 'temp-node-id',
      },
      type: 'connections/updateNodeConnection',
    });
  });
});
