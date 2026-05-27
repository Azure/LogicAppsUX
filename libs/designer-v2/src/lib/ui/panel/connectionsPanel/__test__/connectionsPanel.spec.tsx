import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { Connection, Connector } from '@microsoft/logic-apps-shared';
import { beforeEach, describe, expect, it, type Mock, vi } from 'vitest';
import { ConnectionPanel } from '../connectionsPanel';
import { autoCreateConnectionIfPossible, closeConnectionsFlow } from '../../../../core/actions/bjsworkflow/connections';
import { updateNodeConnection, useOperationInfo, useOperationPanelSelectedNodeId } from '../../../../core';
import { useConnectionsForConnector } from '../../../../core/queries/connections';
import { useConnectionRefs, useConnectorByNodeId } from '../../../../core/state/connection/connectionSelector';
import { useIsCreatingConnection } from '../../../../core/state/panel/panelSelectors';
import { setIsCreatingConnection } from '../../../../core/state/panel/panelSlice';

const mocks = vi.hoisted(() => ({
  dispatch: vi.fn(),
}));

vi.mock('@fluentui/react-components', async (importOriginal) => {
  const original = (await importOriginal()) as object;
  return {
    ...original,
    Button: ({ children, onClick, 'aria-label': ariaLabel, icon }: any) => (
      <button aria-label={ariaLabel} onClick={onClick} type="button">
        {icon}
        {children}
      </button>
    ),
  };
});

vi.mock('@microsoft/designer-ui', async (importOriginal) => {
  const original = (await importOriginal()) as object;
  return {
    ...original,
    XLargeText: ({ text }: { text: string }) => <h1>{text}</h1>,
  };
});

vi.mock('react-intl', async (importOriginal) => {
  const original = (await importOriginal()) as object;
  return {
    ...original,
    useIntl: () => ({
      formatMessage: ({ defaultMessage }: { defaultMessage: string }) => defaultMessage,
    }),
  };
});

vi.mock('react-redux', async (importOriginal) => {
  const original = (await importOriginal()) as object;
  return {
    ...original,
    useDispatch: () => mocks.dispatch,
  };
});

vi.mock('../../../../core', () => ({
  updateNodeConnection: vi.fn((payload: unknown) => ({ payload, type: 'connections/updateNodeConnection' })),
  useOperationInfo: vi.fn(),
  useOperationPanelSelectedNodeId: vi.fn(),
}));

vi.mock('../../../../core/actions/bjsworkflow/connections', () => ({
  autoCreateConnectionIfPossible: vi.fn(),
  closeConnectionsFlow: vi.fn((payload: unknown) => ({ payload, type: 'connections/closeConnectionsFlow' })),
}));

vi.mock('../../../../core/queries/connections', () => ({
  useConnectionsForConnector: vi.fn(),
}));

vi.mock('../../../../core/state/connection/connectionSelector', () => ({
  useConnectionRefs: vi.fn(),
  useConnectorByNodeId: vi.fn(),
}));

vi.mock('../../../../core/state/panel/panelSelectors', () => ({
  useIsCreatingConnection: vi.fn(),
}));

vi.mock('../../../../core/state/panel/panelSlice', () => ({
  setIsCreatingConnection: vi.fn((isCreating: boolean) => ({ payload: isCreating, type: 'panel/setIsCreatingConnection' })),
}));

vi.mock('../allConnections/allConnections', () => ({
  AllConnections: () => <div data-testid="all-connections" />,
}));

vi.mock('../createConnection/createConnectionWrapper', () => ({
  CreateConnectionWrapper: () => <div data-testid="create-connection-wrapper" />,
}));

vi.mock('../selectConnection/selectConnection', () => ({
  SelectConnectionWrapper: () => <div data-testid="select-connection-wrapper" />,
}));

const mockConnector = {
  id: 'connector-id',
  name: 'connector-name',
} as Connector;

const mockConnection = {
  id: '/subscriptions/sub1/resourceGroups/rg/providers/Microsoft.Web/connections/existing-connection',
  name: 'existing-connection',
  properties: {
    displayName: 'Existing connection',
  },
} as Connection;

const newConnection = {
  id: '/subscriptions/sub1/resourceGroups/rg/providers/Microsoft.Web/connections/new-connection',
  name: 'new-connection',
  properties: {
    displayName: 'New connection',
  },
} as Connection;

const setConnectionsQuery = (overrides: Record<string, unknown> = {}) => {
  (useConnectionsForConnector as Mock).mockReturnValue({
    data: [],
    error: null,
    isError: false,
    isLoading: false,
    ...overrides,
  });
};

const panelProps = {
  toggleCollapse: vi.fn(),
} as any;

describe('ConnectionPanel (designer-v2)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useOperationPanelSelectedNodeId as Mock).mockReturnValue('node-id');
    (useConnectorByNodeId as Mock).mockReturnValue(mockConnector);
    (useOperationInfo as Mock).mockReturnValue({ connectorId: 'connector-id', operationId: 'op-id' });
    (useConnectionRefs as Mock).mockReturnValue({ referenceOne: {}, referenceTwo: {} });
    (useIsCreatingConnection as Mock).mockReturnValue(false);
    (autoCreateConnectionIfPossible as Mock).mockResolvedValue(undefined);
    setConnectionsQuery();
  });

  describe('panel rendering', () => {
    it('renders the default header and AllConnections when no node is selected', () => {
      (useOperationPanelSelectedNodeId as Mock).mockReturnValue(undefined);
      (useConnectorByNodeId as Mock).mockReturnValue(undefined);

      render(<ConnectionPanel {...panelProps} />);

      expect(screen.getByRole('heading', { name: 'Connections' })).toBeInTheDocument();
      expect(screen.getByTestId('all-connections')).toBeInTheDocument();
      expect(screen.queryByTestId('select-connection-wrapper')).not.toBeInTheDocument();
      expect(screen.queryByTestId('create-connection-wrapper')).not.toBeInTheDocument();
    });

    it('renders the change-connection header and SelectConnectionWrapper when a node is selected', () => {
      setConnectionsQuery({ data: [mockConnection] });

      render(<ConnectionPanel {...panelProps} />);

      expect(screen.getByRole('heading', { name: 'Change connection' })).toBeInTheDocument();
      expect(screen.getByTestId('select-connection-wrapper')).toBeInTheDocument();
      expect(screen.queryByTestId('create-connection-wrapper')).not.toBeInTheDocument();
    });

    it('renders the create-connection header and CreateConnectionWrapper when creating', () => {
      (useIsCreatingConnection as Mock).mockReturnValue(true);
      setConnectionsQuery({ data: [mockConnection] });

      render(<ConnectionPanel {...panelProps} />);

      expect(screen.getByRole('heading', { name: 'Create connection' })).toBeInTheDocument();
      expect(screen.getByTestId('create-connection-wrapper')).toBeInTheDocument();
      expect(screen.queryByTestId('select-connection-wrapper')).not.toBeInTheDocument();
    });

    it('invokes the toggleCollapse prop when the close button is clicked', () => {
      const toggleCollapse = vi.fn();

      render(<ConnectionPanel toggleCollapse={toggleCollapse} {...({} as any)} />);

      fireEvent.click(screen.getByRole('button', { name: 'Close panel' }));

      expect(toggleCollapse).toHaveBeenCalledTimes(1);
    });
  });

  describe('autoCreateConnectionIfPossible', () => {
    it('does not run while connections are still loading', () => {
      setConnectionsQuery({ isLoading: true });

      render(<ConnectionPanel {...panelProps} />);

      expect(autoCreateConnectionIfPossible).not.toHaveBeenCalled();
    });

    it('does not run when the connections query is in an error state', () => {
      setConnectionsQuery({ isError: true, error: new Error('failure') });

      render(<ConnectionPanel {...panelProps} />);

      expect(autoCreateConnectionIfPossible).not.toHaveBeenCalled();
    });

    it('does not run when existing connections are returned', () => {
      setConnectionsQuery({ data: [mockConnection] });

      render(<ConnectionPanel {...panelProps} />);

      expect(autoCreateConnectionIfPossible).not.toHaveBeenCalled();
    });

    it('does not run when there is no selected node', () => {
      (useOperationPanelSelectedNodeId as Mock).mockReturnValue(undefined);
      (useConnectorByNodeId as Mock).mockReturnValue(undefined);

      render(<ConnectionPanel {...panelProps} />);

      expect(autoCreateConnectionIfPossible).not.toHaveBeenCalled();
    });

    it('does not run when the connector has not loaded yet', () => {
      (useConnectorByNodeId as Mock).mockReturnValue(undefined);

      render(<ConnectionPanel {...panelProps} />);

      expect(autoCreateConnectionIfPossible).not.toHaveBeenCalled();
    });

    it('runs once with the expected payload when no connections exist', async () => {
      render(<ConnectionPanel {...panelProps} />);

      await waitFor(() => expect(autoCreateConnectionIfPossible).toHaveBeenCalledTimes(1));
      expect(autoCreateConnectionIfPossible).toHaveBeenCalledWith(
        expect.objectContaining({
          connector: mockConnector,
          referenceKeys: ['referenceOne', 'referenceTwo'],
          operationInfo: { connectorId: 'connector-id', operationId: 'op-id' },
          skipOAuth: true,
        })
      );
    });

    // Regression test for issue #9131: the re-entry guard must prevent the
    // useEffect from firing autoCreateConnectionIfPossible multiple times
    // when the React Query cache write triggers a re-render with a new
    // connections array reference.
    it('only invokes autoCreateConnectionIfPossible once across multiple re-renders while in flight', async () => {
      // autoCreate is never resolved here, simulating the in-flight state
      // where the React Query cache write would re-render the component.
      (autoCreateConnectionIfPossible as Mock).mockReturnValue(new Promise(() => {}));

      const { rerender } = render(<ConnectionPanel {...panelProps} />);

      await waitFor(() => expect(autoCreateConnectionIfPossible).toHaveBeenCalledTimes(1));

      // Simulate the React Query cache update producing a brand-new empty
      // array reference (cacheTime/staleTime are 0 on useConnectionsForConnector).
      setConnectionsQuery({ data: [] });
      rerender(<ConnectionPanel {...panelProps} />);
      setConnectionsQuery({ data: [] });
      rerender(<ConnectionPanel {...panelProps} />);
      setConnectionsQuery({ data: [] });
      rerender(<ConnectionPanel {...panelProps} />);

      // Re-entry guard must hold — the effect cannot fire again until the
      // in-flight call resolves.
      expect(autoCreateConnectionIfPossible).toHaveBeenCalledTimes(1);
    });

    it('dispatches updateNodeConnection and closes the flow when applyNewConnection + onSuccess are invoked', async () => {
      (autoCreateConnectionIfPossible as Mock).mockImplementation(({ applyNewConnection, onSuccess }) => {
        applyNewConnection(newConnection);
        onSuccess(newConnection);
        return Promise.resolve();
      });

      render(<ConnectionPanel {...panelProps} />);

      await waitFor(() => expect(autoCreateConnectionIfPossible).toHaveBeenCalledTimes(1));

      expect(updateNodeConnection).toHaveBeenCalledWith({
        nodeId: 'node-id',
        connection: newConnection,
        connector: mockConnector,
      });
      expect(closeConnectionsFlow).toHaveBeenCalledWith({ nodeId: 'node-id' });
      expect(mocks.dispatch).toHaveBeenCalledWith({
        payload: { nodeId: 'node-id' },
        type: 'connections/closeConnectionsFlow',
      });
    });

    it('dispatches setIsCreatingConnection(true) when onManualConnectionCreation is invoked', async () => {
      (autoCreateConnectionIfPossible as Mock).mockImplementation(({ onManualConnectionCreation }) => {
        onManualConnectionCreation();
        return Promise.resolve();
      });

      render(<ConnectionPanel {...panelProps} />);

      await waitFor(() => expect(autoCreateConnectionIfPossible).toHaveBeenCalledTimes(1));

      expect(setIsCreatingConnection).toHaveBeenCalledWith(true);
      expect(mocks.dispatch).toHaveBeenCalledWith({ payload: true, type: 'panel/setIsCreatingConnection' });
    });

    it('clears the re-entry guard so a subsequent attempt can run after onManualConnectionCreation', async () => {
      (autoCreateConnectionIfPossible as Mock).mockImplementation(({ onManualConnectionCreation }) => {
        onManualConnectionCreation();
        return Promise.resolve();
      });

      const { rerender } = render(<ConnectionPanel {...panelProps} />);

      await waitFor(() => expect(autoCreateConnectionIfPossible).toHaveBeenCalledTimes(1));

      // A new render with a fresh empty connections reference (e.g. cache refetch)
      // should be allowed to re-trigger the auto-create flow now that the prior
      // attempt has resolved via onManualConnectionCreation.
      setConnectionsQuery({ data: [] });
      rerender(<ConnectionPanel {...panelProps} />);

      await waitFor(() => expect(autoCreateConnectionIfPossible).toHaveBeenCalledTimes(2));
    });

    it('clears the re-entry guard so a subsequent attempt can run after the promise rejects', async () => {
      (autoCreateConnectionIfPossible as Mock).mockRejectedValueOnce(new Error('boom'));

      const { rerender } = render(<ConnectionPanel {...panelProps} />);

      await waitFor(() => expect(autoCreateConnectionIfPossible).toHaveBeenCalledTimes(1));

      // Allow the rejected promise's .catch handler to run.
      await new Promise((resolve) => setTimeout(resolve, 0));

      (autoCreateConnectionIfPossible as Mock).mockResolvedValueOnce(undefined);
      setConnectionsQuery({ data: [] });
      rerender(<ConnectionPanel {...panelProps} />);

      await waitFor(() => expect(autoCreateConnectionIfPossible).toHaveBeenCalledTimes(2));
    });
  });
});
