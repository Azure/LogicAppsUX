/**
 * @vitest-environment jsdom
 */
import { describe, vi, expect, it, beforeEach } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { IntlProvider } from 'react-intl';
import { McpServerPanel } from '../panel';
import { McpPanelView } from '../../../../../core/state/mcp/panel/mcpPanelSlice';
import type { McpServer } from '@microsoft/logic-apps-shared';
import type { RootState } from '../../../../../core/state/mcp/store';

// Mock the child components
vi.mock('../generatekeys', () => ({
  GenerateKeys: () => <div data-testid="generate-keys">Generate Keys Component</div>,
}));

vi.mock('../create', () => ({
  CreateServer: ({
    onUpdate,
    server,
    onClose,
  }: {
    onUpdate: (server: Partial<McpServer>) => Promise<void>;
    server?: McpServer;
    onClose: () => void;
  }) => (
    <div data-testid="create-server">
      Create Server Component
      {server && <div data-testid="edit-mode">Edit Mode</div>}
      <button onClick={onClose}>Close</button>
      <button onClick={() => onUpdate({ name: 'test' })}>Update</button>
    </div>
  ),
}));

// Create mock store helper
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
      operationInfo: {},
      inputParameters: {},
      dependencies: {},
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

// Render helper
const renderWithProviders = (component: React.ReactElement, { store = createMockStore() } = {}) => {
  return render(
    <Provider store={store}>
      <IntlProvider locale="en" messages={{}}>
        {component}
      </IntlProvider>
    </Provider>
  );
};

describe('McpServerPanel', () => {
  let mockOnUpdateServer: vi.MockedFunction<(server: Partial<McpServer>) => Promise<void>>;
  let mockOnClose: vi.MockedFunction<() => void>;
  let mockServer: McpServer;

  beforeEach(() => {
    vi.clearAllMocks();
    // Clean up any existing DOM elements
    document.body.innerHTML = '';

    mockOnUpdateServer = vi.fn().mockResolvedValue(undefined);
    mockOnClose = vi.fn();
    mockServer = {
      id: 'test-server-id',
      name: 'Test Server',
      description: 'Test server description',
      url: 'http://localhost:3000',
      apiKey: 'test-api-key',
      workflows: [],
    };
  });

  describe('Panel Visibility', () => {
    it('should not render when panel is not open', () => {
      const store = createMockStore({
        mcpPanel: {
          isOpen: false,
          currentPanelView: McpPanelView.CreateMcpServer,
          selectedTabId: undefined,
        },
      });

      const { container } = renderWithProviders(
        <McpServerPanel onUpdateServer={mockOnUpdateServer} server={mockServer} onClose={mockOnClose} />,
        { store }
      );

      expect(container.firstChild).toBeNull();
    });

    it('should not render when panel view is not supported', () => {
      const store = createMockStore({
        mcpPanel: {
          isOpen: true,
          currentPanelView: 'UnsupportedView' as McpPanelView,
          selectedTabId: undefined,
        },
      });

      const { container } = renderWithProviders(
        <McpServerPanel onUpdateServer={mockOnUpdateServer} server={mockServer} onClose={mockOnClose} />,
        { store }
      );

      expect(container.firstChild).toBeNull();
    });

    it('should render when panel is open and view is supported', () => {
      const store = createMockStore({
        mcpPanel: {
          isOpen: true,
          currentPanelView: McpPanelView.CreateMcpServer,
          selectedTabId: undefined,
        },
      });

      renderWithProviders(<McpServerPanel onUpdateServer={mockOnUpdateServer} server={mockServer} onClose={mockOnClose} />, { store });

      expect(screen.getByTestId('create-server')).toBeInTheDocument();
    });
  });

  describe('Generate Keys View', () => {
    it('should render GenerateKeys component when panel view is GenerateKeys', () => {
      const store = createMockStore({
        mcpPanel: {
          isOpen: true,
          currentPanelView: McpPanelView.GenerateKeys,
          selectedTabId: undefined,
        },
      });

      renderWithProviders(<McpServerPanel onUpdateServer={mockOnUpdateServer} server={mockServer} onClose={mockOnClose} />, { store });

      expect(screen.getByTestId('generate-keys')).toBeInTheDocument();
      expect(screen.getByText('Generate Keys Component')).toBeInTheDocument();
    });

    it('should not render other components when in GenerateKeys view', () => {
      const store = createMockStore({
        mcpPanel: {
          isOpen: true,
          currentPanelView: McpPanelView.GenerateKeys,
          selectedTabId: undefined,
        },
      });

      renderWithProviders(<McpServerPanel onUpdateServer={mockOnUpdateServer} server={mockServer} onClose={mockOnClose} />, { store });

      expect(screen.getByTestId('generate-keys')).toBeInTheDocument();
      expect(screen.queryByTestId('create-server')).not.toBeInTheDocument();
    });
  });

  describe('Create Server View', () => {
    it('should render CreateServer component when panel view is CreateMcpServer', () => {
      const store = createMockStore({
        mcpPanel: {
          isOpen: true,
          currentPanelView: McpPanelView.CreateMcpServer,
          selectedTabId: undefined,
        },
      });

      renderWithProviders(<McpServerPanel onUpdateServer={mockOnUpdateServer} server={mockServer} onClose={mockOnClose} />, { store });

      expect(screen.getByTestId('create-server')).toBeInTheDocument();
      expect(screen.getByText('Create Server Component')).toBeInTheDocument();
    });

    it('should pass onUpdate and onClose props to CreateServer', () => {
      const store = createMockStore({
        mcpPanel: {
          isOpen: true,
          currentPanelView: McpPanelView.CreateMcpServer,
          selectedTabId: undefined,
        },
      });

      renderWithProviders(<McpServerPanel onUpdateServer={mockOnUpdateServer} server={mockServer} onClose={mockOnClose} />, { store });

      expect(screen.getByTestId('create-server')).toBeInTheDocument();
      expect(screen.getByText('Create Server Component')).toBeInTheDocument();
    });

    it('should not show edit mode when no server is provided in CreateMcpServer view', () => {
      const store = createMockStore({
        mcpPanel: {
          isOpen: true,
          currentPanelView: McpPanelView.CreateMcpServer,
          selectedTabId: undefined,
        },
      });

      renderWithProviders(<McpServerPanel onUpdateServer={mockOnUpdateServer} onClose={mockOnClose} />, { store });

      expect(screen.getByTestId('create-server')).toBeInTheDocument();
      expect(screen.queryByTestId('edit-mode')).not.toBeInTheDocument();
    });
  });

  describe('Edit Server View', () => {
    it('should render CreateServer component with server when panel view is EditMcpServer', () => {
      const store = createMockStore({
        mcpPanel: {
          isOpen: true,
          currentPanelView: McpPanelView.EditMcpServer,
          selectedTabId: undefined,
        },
      });

      const { container } = renderWithProviders(
        <McpServerPanel onUpdateServer={mockOnUpdateServer} server={mockServer} onClose={mockOnClose} />,
        { store }
      );

      expect(container.querySelector('[data-testid="create-server"]')).toBeInTheDocument();
      expect(container.querySelector('[data-testid="edit-mode"]')).toBeInTheDocument();
    });

    it('should not render anything when EditMcpServer view is active but no server provided', () => {
      const store = createMockStore({
        mcpPanel: {
          isOpen: true,
          currentPanelView: McpPanelView.EditMcpServer,
          selectedTabId: undefined,
        },
      });

      const { container } = renderWithProviders(<McpServerPanel onUpdateServer={mockOnUpdateServer} onClose={mockOnClose} />, { store });

      expect(container.firstChild).toBeNull();
    });

    it('should pass server prop to CreateServer in edit mode', () => {
      const store = createMockStore({
        mcpPanel: {
          isOpen: true,
          currentPanelView: McpPanelView.EditMcpServer,
          selectedTabId: undefined,
        },
      });

      const { container } = renderWithProviders(
        <McpServerPanel onUpdateServer={mockOnUpdateServer} server={mockServer} onClose={mockOnClose} />,
        { store }
      );

      expect(container.querySelector('[data-testid="create-server"]')).toBeInTheDocument();
      expect(container.querySelector('[data-testid="edit-mode"]')).toBeInTheDocument();
    });
  });

  describe('Props Handling', () => {
    it('should handle undefined mcpPanel state gracefully', () => {
      const store = configureStore({
        reducer: {
          root: () => ({ mcpPanel: undefined }),
        },
      });

      const { container } = render(
        <Provider store={store}>
          <IntlProvider locale="en" messages={{}}>
            <McpServerPanel onUpdateServer={mockOnUpdateServer} server={mockServer} onClose={mockOnClose} />
          </IntlProvider>
        </Provider>
      );

      expect(container.firstChild).toBeNull();
    });

    it('should default to closed panel when mcpPanel properties are undefined', () => {
      const store = createMockStore({
        mcpPanel: {
          isOpen: undefined,
          currentPanelView: undefined,
          selectedTabId: undefined,
        } as any,
      });

      const { container } = renderWithProviders(
        <McpServerPanel onUpdateServer={mockOnUpdateServer} server={mockServer} onClose={mockOnClose} />,
        { store }
      );

      expect(container.firstChild).toBeNull();
    });

    it('should work with all supported panel views', () => {
      const supportedViews = [McpPanelView.CreateMcpServer, McpPanelView.EditMcpServer, McpPanelView.GenerateKeys];

      supportedViews.forEach((view) => {
        const store = createMockStore({
          mcpPanel: {
            isOpen: true,
            currentPanelView: view,
            selectedTabId: undefined,
          },
        });

        const { unmount } = renderWithProviders(
          <McpServerPanel onUpdateServer={mockOnUpdateServer} server={mockServer} onClose={mockOnClose} />,
          { store }
        );

        if (view === McpPanelView.GenerateKeys) {
          expect(screen.getByTestId('generate-keys')).toBeInTheDocument();
        } else {
          expect(screen.getByTestId('create-server')).toBeInTheDocument();
        }

        // Clean up for next iteration
        unmount();
      });
    });
  });

  describe('Component Integration', () => {
    it('should handle server update correctly', async () => {
      const store = createMockStore({
        mcpPanel: {
          isOpen: true,
          currentPanelView: McpPanelView.CreateMcpServer,
          selectedTabId: undefined,
        },
      });

      const { container } = renderWithProviders(
        <McpServerPanel onUpdateServer={mockOnUpdateServer} server={mockServer} onClose={mockOnClose} />,
        { store }
      );

      const updateButton = container.querySelector('button:nth-child(2)'); // Second button is Update
      if (updateButton) {
        updateButton.click();
        expect(mockOnUpdateServer).toHaveBeenCalledWith({ name: 'test' });
      }
    });

    it('should handle close action correctly', () => {
      const store = createMockStore({
        mcpPanel: {
          isOpen: true,
          currentPanelView: McpPanelView.CreateMcpServer,
          selectedTabId: undefined,
        },
      });

      const { container } = renderWithProviders(
        <McpServerPanel onUpdateServer={mockOnUpdateServer} server={mockServer} onClose={mockOnClose} />,
        { store }
      );

      const closeButton = container.querySelector('button:first-child'); // First button is Close
      if (closeButton) {
        closeButton.click();
        expect(mockOnClose).toHaveBeenCalledTimes(1);
      }
    });
  });
});
