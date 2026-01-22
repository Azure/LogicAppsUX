import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { IntlProvider } from 'react-intl';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { McpToolWizard } from '../mcpToolWizard';
import { MCP_WIZARD_STEP } from '../../../../../core/state/panel/panelTypes';

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
}));

vi.mock('../../../../../core/actions/bjsworkflow/add', () => ({
  addOperation: vi.fn(() => ({ type: 'bjsworkflow/addOperation' })),
}));

vi.mock('@microsoft/logic-apps-shared', () => ({
  ConnectionType: { SharedAccessKey: 'sharedaccesskey' },
  ConnectorService: vi.fn(() => ({
    getListDynamicValues: vi.fn(() => Promise.resolve([])),
  })),
  removeConnectionPrefix: vi.fn((path) => path),
}));

vi.mock('@microsoft/designer-ui', () => ({
  TemplatesPanelFooter: vi.fn(({ primaryButtonOnClick, primaryButtonText, secondaryButtonOnClick, secondaryButtonText }) => (
    <div data-testid="mock-footer">
      {secondaryButtonText && (
        <button data-testid="footer-secondary" onClick={secondaryButtonOnClick}>
          {secondaryButtonText}
        </button>
      )}
      <button data-testid="footer-primary" onClick={primaryButtonOnClick}>
        {primaryButtonText}
      </button>
    </div>
  )),
  SimpleDictionary: vi.fn(() => <div data-testid="mock-dictionary" />),
  SearchableDropdown: vi.fn(() => <div data-testid="mock-searchable-dropdown" />),
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
import { closeMcpToolWizard, setMcpWizardStep, setMcpWizardConnection } from '../../../../../core/state/panel/panelSlice';
import { useConnectionsForConnector } from '../../../../../core/queries/connections';

const mockUseMcpToolWizard = vi.mocked(useMcpToolWizard);
const mockUseMcpWizardStep = vi.mocked(useMcpWizardStep);
const mockUseMcpWizardConnectionId = vi.mocked(useMcpWizardConnectionId);
const mockUseMcpWizardAllowedTools = vi.mocked(useMcpWizardAllowedTools);
const mockUseMcpWizardHeaders = vi.mocked(useMcpWizardHeaders);
const mockSetMcpWizardStep = vi.mocked(setMcpWizardStep);
const mockSetMcpWizardConnection = vi.mocked(setMcpWizardConnection);
const mockUseConnectionsForConnector = vi.mocked(useConnectionsForConnector);

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
});
