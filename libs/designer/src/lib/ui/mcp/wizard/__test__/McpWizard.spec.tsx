/**
 * @vitest-environment jsdom
 */
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { Provider } from 'react-redux';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { IntlProvider } from 'react-intl';
import { configureStore } from '@reduxjs/toolkit';
import { vi, describe, beforeEach, afterEach, it, expect, type MockedFunction } from 'vitest';
import { McpWizard, type RegisterMcpServerHandler } from '../McpWizard';
import type { RootState } from '../../../../core/state/mcp/store';
import { useAllMcpServersFromVfs } from '../../../../core/mcp/utils/queries';

// Mock the heavy dependencies
vi.mock('../../../panel/mcpPanelRoot', () => ({
  McpPanelRoot: ({ onCreateApp }: { onCreateApp: () => void }) => (
    <div data-testid="mcp-panel-root">
      <button onClick={onCreateApp}>Create App</button>
    </div>
  ),
}));

vi.mock('../operations/ListOperations', () => ({
  ListOperations: () => <div data-testid="list-operations">List Operations</div>,
}));

vi.mock('../connectors/ListConnectors', () => ({
  ListConnectors: ({ addConnectors, addDisabled }: { addConnectors: () => void; addDisabled: boolean }) => (
    <div data-testid="list-connectors">
      <button onClick={addConnectors} disabled={addDisabled}>
        Add Connectors
      </button>
    </div>
  ),
}));

vi.mock('../details/logicAppSelector', () => ({
  LogicAppSelector: () => <div data-testid="logic-app-selector">Logic App Selector</div>,
}));

vi.mock('../hooks/connection', () => ({
  useValidMcpConnection: () => true,
}));

vi.mock('../../../../core/mcp/utils/serializer', () => ({
  serializeMcpWorkflows: vi.fn().mockResolvedValue({
    serverInfo: { name: 'test-server', description: 'test description' },
    workflows: [],
  }),
}));

vi.mock('../../../../core/mcp/utils/queries', () => ({
  resetQueriesOnRegisterMcpServer: vi.fn(),
  useEmptyLogicApps: vi.fn(() => ({
    data: [],
    isLoading: false,
  })),
  useAllMcpServers: vi.fn(() => ({
    data: [],
    isLoading: false,
    isError: false,
  })),
  useAllMcpServersFromVfs: vi.fn(() => ({
    data: [],
    isLoading: false,
    isError: false,
  })),
  useMcpConnectors: vi.fn(() => ({
    data: [],
    isLoading: false,
    isError: false,
  })),
  useMcpOperations: vi.fn(() => ({
    data: [],
    isLoading: false,
    isError: false,
  })),
}));

vi.mock('../../../../core/mcp/utils/server', () => ({
  validateMcpServerName: vi.fn().mockReturnValue(undefined),
  validateMcpServerDescription: vi.fn().mockReturnValue(undefined),
}));

vi.mock('@microsoft/logic-apps-shared', () => ({
  equals: vi.fn((a, b) => a === b),
  LogEntryLevel: {
    Trace: 'trace',
    Error: 'error',
  },
  LoggerService: () => ({
    log: vi.fn(),
  }),
}));

// Mock all the heavy dependencies to keep tests lightweight
vi.mock('../../../panel/mcpPanelRoot', () => ({
  McpPanelRoot: () => <div data-testid="mcp-panel-root">Panel Root</div>,
}));

vi.mock('../operations/ListOperations', () => ({
  ListOperations: () => <div data-testid="list-operations">List Operations</div>,
}));

vi.mock('../connectors/ListConnectors', () => ({
  ListConnectors: ({ addConnectors }: { addConnectors: () => void }) => (
    <div data-testid="list-connectors">
      List Connectors
      <button onClick={addConnectors} disabled={false}>
        Add
      </button>
      <div>Some parameters might need configuration. Review before you continue.</div>
    </div>
  ),
}));

vi.mock('../details/logicAppSelector', () => ({
  LogicAppSelector: () => (
    <div data-testid="logic-app-selector">
      Logic App Selector
      <button>Create App</button>
    </div>
  ),
}));

vi.mock('../hooks/connection', () => ({
  useValidMcpConnection: () => true,
}));

vi.mock('../../../../core/mcp/utils/serializer', () => ({
  serializeMcpWorkflows: vi.fn().mockResolvedValue({
    serverInfo: { name: 'test', description: 'test' },
  }),
}));

vi.mock('../../../../core/mcp/utils/helper', () => ({
  operationHasEmptyStaticDependencies: vi.fn().mockReturnValue(false),
}));

vi.mock('@microsoft/logic-apps-shared', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    equals: (a: any, b: any) => a === b,
    LogEntryLevel: { Trace: 'trace', Error: 'error' },
    LoggerService: () => ({ log: vi.fn() }),
  };
});

// Simple mock store
const createMockStore = (initialState: Partial<RootState> = {}) => {
  const defaultState: RootState = {
    mcpPanel: {
      isOpen: false,
      currentPanelView: undefined,
      selectedTabId: undefined,
    },
    mcpSelection: {
      selectedConnectorId: '',
      disableConnectorSelection: false,
      selectedOperations: [],
    },
    operations: {
      operationInfo: {
        'test-operation': {
          type: 'test',
          id: 'test-operation',
        },
      },
      inputParameters: {
        'test-operation': {},
      },
      dependencies: {
        'test-operation': {
          inputs: {},
        },
      },
      operationMetadata: {},
      dynamicInputs: {},
    },
    connection: {
      connectionReferences: {},
      connectionsMapping: {},
      connectionMapping: {},
      nonConnectorConnectionMapping: {},
    },
    resource: {
      subscriptionId: 'test-sub',
      resourceGroup: 'test-rg',
      location: 'eastus',
      logicAppName: 'test-app',
      newLogicAppDetails: undefined,
    },
    mcpOptions: {
      servicesInitialized: true,
      disableConfiguration: false,
    },
    ...initialState,
  };

  return configureStore({
    reducer: {
      mcpPanel: (state = defaultState.mcpPanel) => state,
      mcpSelection: (state = defaultState.mcpSelection) => state,
      operations: (state = defaultState.operations) => state,
      connection: (state = defaultState.connection) => state,
      resource: (state = defaultState.resource) => state,
      mcpOptions: (state = defaultState.mcpOptions) => state,
    },
    preloadedState: defaultState,
  });
};

const renderWithProviders = (
  component: React.ReactElement,
  {
    store = createMockStore(),
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    }),
  } = {}
) => {
  return render(
    <Provider store={store}>
      <QueryClientProvider client={queryClient}>
        <IntlProvider locale="en" messages={{}}>
          {component}
        </IntlProvider>
      </QueryClientProvider>
    </Provider>
  );
};

describe('McpWizard', () => {
  let mockRegisterMcpServer: MockedFunction<RegisterMcpServerHandler>;
  let mockOnClose: MockedFunction<() => void>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockRegisterMcpServer = vi.fn().mockResolvedValue(undefined);
    mockOnClose = vi.fn();
  });

  afterEach(() => {
    cleanup();
  });

  describe('Component Initialization', () => {
    it('should render wizard with title and description', () => {
      renderWithProviders(<McpWizard registerMcpServer={mockRegisterMcpServer} onClose={mockOnClose} />);

      expect(screen.getByText(/Register an MCP server that you create/)).toBeInTheDocument();
      expect(screen.getByText('Learn about logic apps')).toBeInTheDocument();
    });

    it('should render project details section', () => {
      renderWithProviders(<McpWizard registerMcpServer={mockRegisterMcpServer} onClose={mockOnClose} />);

      expect(screen.getByText('Project details')).toBeInTheDocument();
      expect(screen.getByText('MCP server name')).toBeInTheDocument();
      expect(screen.getByText('Description')).toBeInTheDocument();
      expect(screen.getByText('Logic app')).toBeInTheDocument();
    });

    it('should render tools section with connectors', () => {
      renderWithProviders(<McpWizard registerMcpServer={mockRegisterMcpServer} onClose={mockOnClose} />);

      expect(screen.getByText('Tools')).toBeInTheDocument();
      expect(screen.getByText('Connectors')).toBeInTheDocument();
    });

    it('should render register and cancel buttons', () => {
      renderWithProviders(<McpWizard registerMcpServer={mockRegisterMcpServer} onClose={mockOnClose} />);

      expect(screen.getByText('Register')).toBeInTheDocument();
      expect(screen.getByText('Cancel')).toBeInTheDocument();
    });
  });

  describe('Form Input Handling', () => {
    it('should update server name when typing', () => {
      renderWithProviders(<McpWizard registerMcpServer={mockRegisterMcpServer} onClose={mockOnClose} />);

      const serverNameInput = screen.getByPlaceholderText('Enter a name for the MCP server');
      fireEvent.change(serverNameInput, { target: { value: 'MyTest Server' } });

      expect(serverNameInput).toHaveValue('MyTest Server');
    });

    it('should update server description when typing', () => {
      renderWithProviders(<McpWizard registerMcpServer={mockRegisterMcpServer} onClose={mockOnClose} />);

      const descriptionInput = screen.getByLabelText('Description');
      fireEvent.change(descriptionInput, { target: { value: 'Test description' } });

      expect(descriptionInput).toHaveValue('Test description');
    });

    it('should have disabled register button initially', () => {
      renderWithProviders(<McpWizard registerMcpServer={mockRegisterMcpServer} onClose={mockOnClose} />);

      const registerButton = screen.getByText('Register');
      expect(registerButton).toBeDisabled();
    });
  });

  describe('Button Actions', () => {
    it('should call onClose when cancel button is clicked', () => {
      renderWithProviders(<McpWizard registerMcpServer={mockRegisterMcpServer} onClose={mockOnClose} />);

      const cancelButton = screen.getByText('Cancel');
      fireEvent.click(cancelButton);

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('should show add connectors button when no connectors exist', () => {
      renderWithProviders(<McpWizard registerMcpServer={mockRegisterMcpServer} onClose={mockOnClose} />);

      expect(screen.getAllByText('Add')).toHaveLength(2);
    });
  });

  describe('Tools Count Display', () => {
    it('should display zero tools count initially', () => {
      renderWithProviders(<McpWizard registerMcpServer={mockRegisterMcpServer} onClose={mockOnClose} />);

      expect(screen.getByText('(0)')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper aria labels and roles', () => {
      renderWithProviders(<McpWizard registerMcpServer={mockRegisterMcpServer} onClose={mockOnClose} />);

      const serverNameInput = screen.getByPlaceholderText('Enter a name for the MCP server');
      const descriptionInput = screen.getByLabelText('Description');

      expect(serverNameInput).toBeInTheDocument();
      expect(descriptionInput).toBeInTheDocument();
    });

    it('should have proper button accessibility', () => {
      renderWithProviders(<McpWizard registerMcpServer={mockRegisterMcpServer} onClose={mockOnClose} />);

      const registerButton = screen.getByText('Register');
      const cancelButton = screen.getByText('Cancel');

      expect(registerButton).toHaveAttribute('type', 'button');
      expect(cancelButton).toHaveAttribute('type', 'button');
    });
  });
});
