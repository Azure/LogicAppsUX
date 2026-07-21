import { describe, test, expect, vi, beforeEach, beforeAll, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup, act } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { IntlProvider } from 'react-intl';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { McpToolWizard } from '../mcpToolWizard';
import { MCP_WIZARD_STEP } from '../../../../../core/state/panel/panelTypes';

// Hoisted holders so the (hoisted) vi.mock factories can share controllable references with tests.
const { mockGetListDynamicValues, dropdownProps } = vi.hoisted(() => ({
  mockGetListDynamicValues: vi.fn(() => Promise.resolve([] as any[])),
  dropdownProps: { current: null as any },
}));

beforeAll(() => {
  global.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
});

const mockWizardState = {
  operation: {
    id: 'test-server',
    name: 'test-server',
    type: 'McpClientTool',
    properties: {
      summary: 'Test MCP Server',
      description: 'A test server',
      api: {
        id: 'connectionProviders/mcpclient',
        name: 'mcpclient',
        displayName: 'MCP Client',
        brandColor: '#000000',
        iconUri: 'https://example.com/icon.svg',
      },
      operationType: 'McpClientTool',
      operationKind: 'Builtin',
    },
  },
  step: MCP_WIZARD_STEP.CONNECTION,
  connectionId: undefined,
  allowedTools: [],
  headers: {},
  isConnectionLocked: false,
};

vi.mock('../../../../../core/state/panel/panelSelectors', () => ({
  useMcpToolWizard: vi.fn(() => mockWizardState),
  useMcpWizardStep: vi.fn(() => mockWizardState.step),
  useMcpWizardConnectionId: vi.fn(() => mockWizardState.connectionId),
  useMcpWizardAllowedTools: vi.fn(() => mockWizardState.allowedTools),
  useMcpWizardHeaders: vi.fn(() => mockWizardState.headers),
  useDiscoveryPanelRelationshipIds: vi.fn(() => ({
    graphId: 'test-graph',
    parentId: 'test-parent',
    childId: undefined,
  })),
}));

vi.mock('../../../../../core/state/panel/panelSlice', () => ({
  closeMcpToolWizard: vi.fn(() => ({ type: 'panel/closeMcpToolWizard' })),
  setMcpWizardStep: vi.fn((step) => ({ type: 'panel/setMcpWizardStep', payload: step })),
  setMcpWizardConnection: vi.fn((id) => ({ type: 'panel/setMcpWizardConnection', payload: id })),
  setMcpWizardTools: vi.fn((tools) => ({ type: 'panel/setMcpWizardTools', payload: tools })),
  setMcpWizardHeaders: vi.fn((headers) => ({ type: 'panel/setMcpWizardHeaders', payload: headers })),
}));

vi.mock('../../../../../core/queries/connections', () => ({
  useConnectionsForConnector: vi.fn(() => ({
    data: [],
    isLoading: false,
    refetch: vi.fn(),
  })),
  useConnectionResource: vi.fn(() => ({ data: undefined, isLoading: false })),
  getConnectorWithSwagger: vi.fn(() => Promise.resolve({ parsedSwagger: { getOperationByOperationId: vi.fn() } })),
}));

vi.mock('../../../../../core/state/connection/connectionSelector', () => ({
  useConnector: vi.fn(() => ({
    data: {
      id: 'connectionProviders/mcpclient',
      name: 'mcpclient',
      properties: {
        connectionParameters: {},
      },
    },
  })),
}));

vi.mock('../../../../../core/utils/connectors/connections', () => ({
  isConnectionValid: vi.fn(() => true),
  getAssistedConnectionProps: vi.fn(() => undefined),
  getManagedIdentityFromConnection: vi.fn(() => undefined),
}));

vi.mock('../../../../../core/actions/bjsworkflow/add', () => ({
  addOperation: vi.fn(() => ({ type: 'bjsworkflow/addOperation' })),
}));

vi.mock('@microsoft/logic-apps-shared', () => ({
  ConnectionType: { SharedAccessKey: 'sharedaccesskey' },
  ConnectorService: vi.fn(() => ({
    getListDynamicValues: mockGetListDynamicValues,
  })),
  removeConnectionPrefix: vi.fn((path) => path),
  LoggerService: vi.fn(() => ({ log: vi.fn() })),
  LogEntryLevel: { Warning: 'Warning' },
}));

vi.mock('@microsoft/designer-ui', () => ({
  TemplatesPanelFooter: vi.fn(
    ({ buttonContents = [], primaryButtonOnClick, primaryButtonText, secondaryButtonOnClick, secondaryButtonText }) => (
      <div data-testid="mock-footer">
        {secondaryButtonText && (
          <button data-testid="footer-secondary" onClick={secondaryButtonOnClick}>
            {secondaryButtonText}
          </button>
        )}
        {primaryButtonText && (
          <button data-testid="footer-primary" onClick={primaryButtonOnClick}>
            {primaryButtonText}
          </button>
        )}
        {buttonContents.map((b: any, i: number) => (
          <button key={i} data-testid={`footer-button-${b.appearance ?? 'subtle'}`} onClick={b.onClick} disabled={b.disabled}>
            {b.text}
          </button>
        ))}
      </div>
    )
  ),
  SimpleDictionary: vi.fn(() => <div data-testid="mock-dictionary" />),
  SearchableDropdown: vi.fn((props: any) => {
    dropdownProps.current = props;
    return (
      <div
        data-testid="mock-searchable-dropdown"
        data-selected-keys={JSON.stringify(props.selectedKeys ?? [])}
        data-option-keys={JSON.stringify((props.options ?? []).map((option: any) => option.key))}
      />
    );
  }),
}));

vi.mock('../../../../panel/connectionsPanel/selectConnection/connectionTable', () => ({
  ConnectionTable: vi.fn(({ connections, saveSelectionCallback }) => (
    <div data-testid="mock-connection-table">
      {connections.map((conn: any) => (
        <button key={conn.id} data-testid={`connection-${conn.id}`} onClick={() => saveSelectionCallback?.(conn)}>
          {conn.properties?.displayName ?? conn.name}
        </button>
      ))}
    </div>
  )),
}));

vi.mock('../../../../panel/connectionsPanel/createConnection/createConnectionInternal', () => ({
  CreateConnectionInternal: vi.fn(({ cancelCallback }) => (
    <div data-testid="mock-create-connection">
      <button data-testid="create-connection-cancel" onClick={cancelCallback}>
        Cancel
      </button>
    </div>
  )),
}));

import {
  useMcpToolWizard,
  useMcpWizardStep,
  useMcpWizardConnectionId,
  useMcpWizardAllowedTools,
  useMcpWizardHeaders,
} from '../../../../../core/state/panel/panelSelectors';
import {
  closeMcpToolWizard,
  setMcpWizardStep,
  setMcpWizardConnection,
  setMcpWizardTools,
} from '../../../../../core/state/panel/panelSlice';
import { useConnectionsForConnector, useConnectionResource } from '../../../../../core/queries/connections';
import { getManagedIdentityFromConnection } from '../../../../../core/utils/connectors/connections';

const mockUseMcpToolWizard = vi.mocked(useMcpToolWizard);
const mockUseMcpWizardStep = vi.mocked(useMcpWizardStep);
const mockUseMcpWizardConnectionId = vi.mocked(useMcpWizardConnectionId);
const mockUseMcpWizardAllowedTools = vi.mocked(useMcpWizardAllowedTools);
const mockUseMcpWizardHeaders = vi.mocked(useMcpWizardHeaders);
const mockSetMcpWizardStep = vi.mocked(setMcpWizardStep);
const mockSetMcpWizardConnection = vi.mocked(setMcpWizardConnection);
const mockSetMcpWizardTools = vi.mocked(setMcpWizardTools);
const mockUseConnectionsForConnector = vi.mocked(useConnectionsForConnector);
const mockUseConnectionResource = vi.mocked(useConnectionResource);
const mockGetManagedIdentityFromConnection = vi.mocked(getManagedIdentityFromConnection);

const createTestStore = () =>
  configureStore({
    reducer: {
      panel: () => ({}),
      operations: () => ({}),
      workflow: () => ({}),
    },
  });

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
  const store = createTestStore();

  return ({ children }: { children: React.ReactNode }) => (
    <Provider store={store}>
      <QueryClientProvider client={queryClient}>
        <IntlProvider locale="en" messages={{}}>
          {children}
        </IntlProvider>
      </QueryClientProvider>
    </Provider>
  );
};

describe('McpToolWizard', () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    vi.clearAllMocks();

    // Reset mock states
    mockUseMcpToolWizard.mockReturnValue(mockWizardState);
    mockUseMcpWizardStep.mockReturnValue(MCP_WIZARD_STEP.CONNECTION);
    mockUseMcpWizardConnectionId.mockReturnValue(undefined);
    mockUseMcpWizardAllowedTools.mockReturnValue([]);
    mockUseMcpWizardHeaders.mockReturnValue({});
    mockUseConnectionsForConnector.mockReturnValue({
      data: [],
      isLoading: false,
      refetch: vi.fn(),
    } as any);
    mockUseConnectionResource.mockReturnValue({ data: undefined, isLoading: false } as any);

    // Regression-suite controllable defaults.
    mockGetListDynamicValues.mockReset();
    mockGetListDynamicValues.mockResolvedValue([]);
    mockGetManagedIdentityFromConnection.mockReset();
    mockGetManagedIdentityFromConnection.mockReturnValue(undefined as any);
    dropdownProps.current = null;
  });

  describe('Connection Step', () => {
    test('should render connection step when step is CONNECTION with connections available', () => {
      const mockConnections = [
        {
          id: 'conn-1',
          name: 'connection-1',
          properties: { displayName: 'Connection 1' },
        },
      ];

      mockUseConnectionsForConnector.mockReturnValue({
        data: mockConnections,
        isLoading: false,
        refetch: vi.fn(),
      } as any);

      render(<McpToolWizard />, { wrapper: createWrapper() });

      expect(screen.queryByText('Choose a connection to use for this MCP server')).toBeDefined();
    });

    test('should auto-navigate to create connection when no connections available', () => {
      mockUseConnectionsForConnector.mockReturnValue({
        data: [],
        isLoading: false,
        refetch: vi.fn(),
      } as any);

      render(<McpToolWizard />, { wrapper: createWrapper() });

      expect(mockSetMcpWizardStep).toHaveBeenCalledWith(MCP_WIZARD_STEP.CREATE_CONNECTION);
    });

    test('should render connection table when connections are available', () => {
      const mockConnections = [
        {
          id: 'conn-1',
          name: 'connection-1',
          properties: { displayName: 'Connection 1' },
        },
        {
          id: 'conn-2',
          name: 'connection-2',
          properties: { displayName: 'Connection 2' },
        },
      ];

      mockUseConnectionsForConnector.mockReturnValue({
        data: mockConnections,
        isLoading: false,
        refetch: vi.fn(),
      } as any);

      render(<McpToolWizard />, { wrapper: createWrapper() });

      expect(screen.getByTestId('mock-connection-table')).toBeDefined();
      expect(screen.getByTestId('connection-conn-1')).toBeDefined();
      expect(screen.getByTestId('connection-conn-2')).toBeDefined();
    });

    test('should dispatch setMcpWizardConnection when connection is selected', async () => {
      const mockConnections = [
        {
          id: 'conn-1',
          name: 'connection-1',
          properties: { displayName: 'Connection 1' },
        },
      ];

      mockUseConnectionsForConnector.mockReturnValue({
        data: mockConnections,
        isLoading: false,
        refetch: vi.fn(),
      } as any);

      render(<McpToolWizard />, { wrapper: createWrapper() });

      const connectionButton = screen.getByTestId('connection-conn-1');
      fireEvent.click(connectionButton);

      await waitFor(() => {
        expect(mockSetMcpWizardConnection).toHaveBeenCalledWith('conn-1');
      });
    });

    test('should show footer with back button when connections are available', async () => {
      const mockConnections = [
        {
          id: 'conn-1',
          name: 'connection-1',
          properties: { displayName: 'Connection 1' },
        },
      ];

      mockUseConnectionsForConnector.mockReturnValue({
        data: mockConnections,
        isLoading: false,
        refetch: vi.fn(),
      } as any);

      render(<McpToolWizard />, { wrapper: createWrapper() });

      const footer = screen.getByTestId('mock-footer');
      expect(footer).toBeDefined();
    });

    test('should warn and disable Next when managed MCP connection has no resolvable identity', () => {
      const mockConnections = [
        {
          id: 'conn-1',
          name: 'connection-1',
          properties: { displayName: 'Connection 1' },
        },
      ];

      mockUseMcpToolWizard.mockReturnValue({
        ...mockWizardState,
        operation: {
          ...mockWizardState.operation,
          properties: {
            ...mockWizardState.operation.properties,
            operationKind: 'Managed',
            api: { ...mockWizardState.operation.properties.api, id: '/subscriptions/x/providers/Microsoft.Web/customApis/managed-mcp' },
          },
        },
        connectionId: 'conn-1',
      } as any);
      mockUseMcpWizardConnectionId.mockReturnValue('conn-1');
      mockUseConnectionsForConnector.mockReturnValue({
        data: mockConnections,
        isLoading: false,
        refetch: vi.fn(),
      } as any);
      mockUseConnectionResource.mockReturnValue({
        data: { id: 'conn-1', properties: {} },
        isLoading: false,
      } as any);

      render(<McpToolWizard />, { wrapper: createWrapper() });

      expect(
        screen.queryByText(
          'This MCP connection has no resolvable managed identity. Re-create the connection and select a managed identity to load tools.'
        )
      ).toBeDefined();
      const primaryButton = screen.getByTestId('footer-button-primary') as HTMLButtonElement;
      expect(primaryButton.disabled).toBe(true);
    });

    test('should disable Next while full connection resource is still loading', () => {
      const mockConnections = [
        {
          id: 'conn-1',
          name: 'connection-1',
          properties: { displayName: 'Connection 1' },
        },
      ];

      mockUseMcpToolWizard.mockReturnValue({
        ...mockWizardState,
        operation: {
          ...mockWizardState.operation,
          properties: {
            ...mockWizardState.operation.properties,
            operationKind: 'Managed',
            api: { ...mockWizardState.operation.properties.api, id: '/subscriptions/x/providers/Microsoft.Web/customApis/managed-mcp' },
          },
        },
        connectionId: 'conn-1',
      } as any);
      mockUseMcpWizardConnectionId.mockReturnValue('conn-1');
      mockUseConnectionsForConnector.mockReturnValue({
        data: mockConnections,
        isLoading: false,
        refetch: vi.fn(),
      } as any);
      mockUseConnectionResource.mockReturnValue({ data: undefined, isLoading: true } as any);

      render(<McpToolWizard />, { wrapper: createWrapper() });

      const primaryButton = screen.getByTestId('footer-button-primary') as HTMLButtonElement;
      expect(primaryButton.disabled).toBe(true);
    });
  });

  describe('Parameters Step', () => {
    beforeEach(() => {
      mockUseMcpWizardStep.mockReturnValue(MCP_WIZARD_STEP.PARAMETERS);
      mockUseMcpWizardConnectionId.mockReturnValue('conn-1');
      mockUseMcpToolWizard.mockReturnValue({
        ...mockWizardState,
        step: MCP_WIZARD_STEP.PARAMETERS,
        connectionId: 'conn-1',
      });
      // Need to have connections so it doesn't auto-navigate away
      mockUseConnectionsForConnector.mockReturnValue({
        data: [{ id: 'conn-1', name: 'connection-1', properties: { displayName: 'Connection 1' } }],
        isLoading: false,
        refetch: vi.fn(),
      } as any);
    });

    test('should render parameters step when step is PARAMETERS', () => {
      render(<McpToolWizard />, { wrapper: createWrapper() });

      // Check for the parameters step content
      expect(screen.queryByText('Select allowed tools')).toBeDefined();
    });

    test('should render wizard with footer on parameters step', () => {
      render(<McpToolWizard />, { wrapper: createWrapper() });

      expect(screen.getByTestId('mock-footer')).toBeDefined();
    });
  });

  describe('Create Connection Step', () => {
    beforeEach(() => {
      mockUseMcpWizardStep.mockReturnValue(MCP_WIZARD_STEP.CREATE_CONNECTION);
      mockUseMcpToolWizard.mockReturnValue({
        ...mockWizardState,
        step: MCP_WIZARD_STEP.CREATE_CONNECTION,
      });
    });

    test('should render create connection form when step is CREATE_CONNECTION', () => {
      render(<McpToolWizard />, { wrapper: createWrapper() });

      expect(screen.getByTestId('mock-create-connection')).toBeDefined();
    });

    test('should render cancel button in create connection form', async () => {
      render(<McpToolWizard />, { wrapper: createWrapper() });

      const cancelButtons = screen.getAllByTestId('create-connection-cancel');
      expect(cancelButtons.length).toBeGreaterThan(0);
    });

    test('should not show create-connection description text in empty state', () => {
      render(<McpToolWizard />, { wrapper: createWrapper() });

      expect(screen.queryByText('Create a new connection for the MCP server.')).toBeNull();
    });

    test('should not show create-connection description text when connections exist', () => {
      mockUseConnectionsForConnector.mockReturnValue({
        data: [
          {
            id: 'conn-1',
            name: 'connection-1',
            properties: { displayName: 'Connection 1' },
          },
        ],
        isLoading: false,
        refetch: vi.fn(),
      } as any);

      render(<McpToolWizard />, { wrapper: createWrapper() });

      expect(screen.queryByText('Create a new connection for the MCP server.')).toBeNull();
    });
  });

  describe('Wizard Navigation', () => {
    test('should show step indicator with correct steps', () => {
      const mockConnections = [
        {
          id: 'conn-1',
          name: 'connection-1',
          properties: { displayName: 'Connection 1' },
        },
      ];

      mockUseConnectionsForConnector.mockReturnValue({
        data: mockConnections,
        isLoading: false,
        refetch: vi.fn(),
      } as any);

      render(<McpToolWizard />, { wrapper: createWrapper() });

      // Check that step labels exist (use getAllByText since they may appear multiple times)
      expect(screen.getAllByText('Connection').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Parameters').length).toBeGreaterThan(0);
    });

    test('should render footer component', () => {
      const mockConnections = [
        {
          id: 'conn-1',
          name: 'connection-1',
          properties: { displayName: 'Connection 1' },
        },
      ];

      mockUseConnectionsForConnector.mockReturnValue({
        data: mockConnections,
        isLoading: false,
        refetch: vi.fn(),
      } as any);

      render(<McpToolWizard />, { wrapper: createWrapper() });

      expect(screen.getByTestId('mock-footer')).toBeDefined();
    });
  });

  describe('Connection Locked State', () => {
    test('should render wizard with locked connection state', async () => {
      mockUseMcpWizardStep.mockReturnValue(MCP_WIZARD_STEP.PARAMETERS);
      mockUseMcpToolWizard.mockReturnValue({
        ...mockWizardState,
        step: MCP_WIZARD_STEP.PARAMETERS,
        connectionId: 'conn-1',
        isConnectionLocked: true,
      });
      mockUseConnectionsForConnector.mockReturnValue({
        data: [{ id: 'conn-1', name: 'connection-1', properties: { displayName: 'Connection 1' } }],
        isLoading: false,
        refetch: vi.fn(),
      } as any);

      render(<McpToolWizard />, { wrapper: createWrapper() });

      expect(screen.getByTestId('mock-footer')).toBeDefined();
    });
  });

  describe('Managed MCP Server', () => {
    test('should use api.id as connectorId for managed MCP servers', () => {
      const managedServer = {
        ...mockWizardState,
        operation: {
          ...mockWizardState.operation,
          properties: {
            ...mockWizardState.operation.properties,
            operationKind: 'Managed',
            api: {
              id: 'subscriptions/xxx/managedApis/mcpserver',
              name: 'mcpserver',
              displayName: 'Managed MCP Server',
              brandColor: '#000000',
              iconUri: 'https://example.com/icon.svg',
            },
          },
        },
      };

      mockUseMcpToolWizard.mockReturnValue(managedServer);

      render(<McpToolWizard />, { wrapper: createWrapper() });

      // The component should use the managed api.id for fetching connections
      expect(mockUseConnectionsForConnector).toHaveBeenCalledWith('subscriptions/xxx/managedApis/mcpserver', true);
    });
  });

  // Regression: creating an MCP connection cleared every "allowed tools" checkbox because the
  // tools query re-keys on the connection identity (which resolves a beat after the wizard
  // advances). These tests exercise the real useQuery flow (only getListDynamicValues is mocked)
  // to lock in that the selection survives the identity-triggered refetch.
  describe('Allowed tools selection persistence (regression)', () => {
    const toolsV1 = [
      { value: 'toolA', displayName: 'Tool A', description: '' },
      { value: 'toolB', displayName: 'Tool B', description: '' },
      { value: 'toolC', displayName: 'Tool C', description: '' },
    ];

    const getDropdown = () => screen.getByTestId('mock-searchable-dropdown');
    const getSelectedKeys = () => JSON.parse(getDropdown().getAttribute('data-selected-keys') ?? '[]');

    // Simulate the connection identity resolving after the wizard advanced: hand the component a
    // fresh connection-resource object (so the selectedIdentity useMemo dependency actually changes)
    // and surface the UAMI. This changes the tools query key and triggers the refetch that used to
    // wipe the checkboxes.
    const resolveIdentity = (identity: string) => {
      mockUseConnectionResource.mockReturnValue({
        data: { id: 'conn-1', properties: { resolved: true } },
        isLoading: false,
      } as any);
      mockGetManagedIdentityFromConnection.mockReturnValue(identity as any);
    };

    const renderManagedParametersStep = () => {
      mockUseMcpToolWizard.mockReturnValue({
        ...mockWizardState,
        step: MCP_WIZARD_STEP.PARAMETERS,
        connectionId: 'conn-1',
        operation: {
          ...mockWizardState.operation,
          properties: {
            ...mockWizardState.operation.properties,
            operationKind: 'Managed',
            api: { ...mockWizardState.operation.properties.api, id: 'subscriptions/xxx/managedApis/mcpserver' },
          },
        },
      } as any);
      mockUseMcpWizardStep.mockReturnValue(MCP_WIZARD_STEP.PARAMETERS);
      mockUseMcpWizardConnectionId.mockReturnValue('conn-1');
      mockUseConnectionsForConnector.mockReturnValue({
        data: [{ id: 'conn-1', name: 'connection-1', properties: { displayName: 'Connection 1' } }],
        isLoading: false,
        refetch: vi.fn(),
      } as any);
      mockUseConnectionResource.mockReturnValue({ data: { id: 'conn-1', properties: {} }, isLoading: false } as any);
      return render(<McpToolWizard />, { wrapper: createWrapper() });
    };

    test('auto-selects all tools when the tool list first loads', async () => {
      mockGetListDynamicValues.mockResolvedValue(toolsV1);

      renderManagedParametersStep();

      await waitFor(() => expect(getSelectedKeys()).toEqual(['toolA', 'toolB', 'toolC']));
      expect(mockSetMcpWizardTools).toHaveBeenCalledWith(['toolA', 'toolB', 'toolC']);
    });

    test('preserves the tool selection when the connection identity resolves (does not clear checkboxes)', async () => {
      mockGetListDynamicValues.mockResolvedValue(toolsV1);

      const { rerender } = renderManagedParametersStep();
      await waitFor(() => expect(getSelectedKeys()).toEqual(['toolA', 'toolB', 'toolC']));

      // Identity resolves after connection creation -> tools query key changes -> refetch (same tools).
      resolveIdentity('uami-1');
      rerender(<McpToolWizard />);

      await waitFor(() => expect(mockGetListDynamicValues.mock.calls.length).toBeGreaterThanOrEqual(2));
      await waitFor(() => expect(getSelectedKeys()).toEqual(['toolA', 'toolB', 'toolC']));
      // The selection must never have been reset to empty during the refetch.
      expect(mockSetMcpWizardTools).not.toHaveBeenCalledWith([]);
    });

    test('keeps only still-valid tools when the refetched tool set changes', async () => {
      mockGetListDynamicValues.mockResolvedValue(toolsV1);

      const { rerender } = renderManagedParametersStep();
      await waitFor(() => expect(getSelectedKeys()).toEqual(['toolA', 'toolB', 'toolC']));

      // On identity resolution the server returns a changed tool set (toolC replaced by toolD).
      mockGetListDynamicValues.mockResolvedValue([
        { value: 'toolA', displayName: 'Tool A', description: '' },
        { value: 'toolB', displayName: 'Tool B', description: '' },
        { value: 'toolD', displayName: 'Tool D', description: '' },
      ]);
      resolveIdentity('uami-1');
      rerender(<McpToolWizard />);

      await waitFor(() => expect(getSelectedKeys()).toEqual(['toolA', 'toolB']));
    });

    test('does not re-select tools after the user intentionally clears the selection', async () => {
      mockGetListDynamicValues.mockResolvedValue(toolsV1);

      renderManagedParametersStep();
      await waitFor(() => expect(getSelectedKeys()).toEqual(['toolA', 'toolB', 'toolC']));

      // User clears every tool within the same tool set.
      await act(async () => {
        dropdownProps.current.onSelectedKeysChange([]);
      });

      await waitFor(() => expect(getSelectedKeys()).toEqual([]));
      // Flush any pending effects; the reconcile must not snap the selection back to "all".
      await act(async () => {
        await Promise.resolve();
      });
      expect(getSelectedKeys()).toEqual([]);
    });
  });
});
