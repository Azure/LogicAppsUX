/**
 * @vitest-environment jsdom
 */
import { describe, vi, expect, it, beforeEach, afterEach } from 'vitest';
// biome-ignore lint/correctness/noUnusedImports: using react for render
import React from 'react';
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { IntlProvider } from 'react-intl';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { KnowledgePanelView } from '../../../../../core/state/knowledge/panelSlice';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Mock ResizeObserver for JSDOM
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock Fluent UI components
vi.mock('@fluentui/react-components', () => ({
  Drawer: ({ children, open, className }: { children: React.ReactNode; open: boolean; className?: string }) =>
    open ? (
      <div data-testid="drawer" className={className}>
        {children}
      </div>
    ) : null,
  DrawerHeader: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div data-testid="drawer-header" className={className}>
      {children}
    </div>
  ),
  DrawerBody: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div data-testid="drawer-body" className={className}>
      {children}
    </div>
  ),
  DrawerFooter: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div data-testid="drawer-footer" className={className}>
      {children}
    </div>
  ),
  Button: ({ children, onClick, 'aria-label': ariaLabel, disabled }: any) => (
    <button onClick={onClick} aria-label={ariaLabel} disabled={disabled}>
      {children}
    </button>
  ),
  Spinner: ({ size }: { size?: string }) => (
    <div data-testid="spinner" data-size={size}>
      Loading...
    </div>
  ),
  Text: ({ children, ...props }: any) => <span {...props}>{children}</span>,
  MessageBar: ({ children, intent }: { children: React.ReactNode; intent?: string }) => (
    <div data-testid="message-bar" data-intent={intent}>
      {children}
    </div>
  ),
}));

// Import EditConnectionPanel after mocks
import { EditConnectionPanel } from '../edit';

// Mock styles
vi.mock('../../styles', () => ({
  usePanelStyles: () => ({
    drawer: 'mock-drawer',
    header: 'mock-header',
    headerContent: 'mock-header-content',
    body: 'mock-body',
    footer: 'mock-footer',
    loadingContainer: 'mock-loading-container',
    loadingText: 'mock-loading-text',
  }),
  useEditPanelStyles: () => ({
    sectionItem: 'mock-section-item',
    infoBar: 'mock-info-bar',
  }),
}));

// Mock useConnection hook
const mockConnection = {
  id: '/test/connection/id',
  name: 'testConnection',
  properties: {
    displayName: 'Test Connection',
    connectionParameters: {
      data: {
        metadata: {
          value: {
            cosmosDBAuthenticationType: 'managedIdentity',
            cosmosDBEndpoint: 'https://test-cosmos.documents.azure.com:443/',
            openAIAuthenticationType: 'managedIdentity',
            openAIEndpoint: 'https://test-openai.openai.azure.com/',
            openAICompletionsModel: 'gpt-4',
            openAIEmbeddingsModel: 'text-embedding-ada-002',
          },
        },
      },
    },
  },
  type: 'connections/knowledgehub',
};

const mockUseConnection = vi.fn(() => ({
  data: mockConnection,
  isLoading: false,
}));

vi.mock('../../../../../core/knowledge/utils/queries', () => ({
  useConnection: () => mockUseConnection(),
}));

// Mock connection utilities
const mockGetConnectionParametersForEdit = vi.fn(() => ({
  connectionParameters: {
    cosmosDBAuthenticationType: {
      uiDefinition: { displayName: 'Authentication Type', constraints: {} },
    },
    cosmosDBEndpoint: {
      uiDefinition: { displayName: 'Cosmos DB Endpoint', constraints: {} },
    },
    cosmosDBKey: {
      uiDefinition: { displayName: 'Cosmos DB Key', constraints: {} },
    },
    openAIAuthenticationType: {
      uiDefinition: { displayName: 'OpenAI Auth Type', constraints: {} },
    },
    openAIEndpoint: {
      uiDefinition: { displayName: 'OpenAI Endpoint', constraints: {} },
    },
    openAIKey: {
      uiDefinition: { displayName: 'OpenAI Key', constraints: {} },
    },
    openAICompletionsModel: {
      uiDefinition: { displayName: 'Completions Model', constraints: {} },
    },
    openAIEmbeddingsModel: {
      uiDefinition: { displayName: 'Embeddings Model', constraints: {} },
    },
  },
  parameterValues: {
    displayName: 'Test Connection',
    cosmosDBAuthenticationType: 'managedIdentity',
    cosmosDBEndpoint: 'https://test-cosmos.documents.azure.com:443/',
    openAIAuthenticationType: 'managedIdentity',
    openAIEndpoint: 'https://test-openai.openai.azure.com/',
    openAICompletionsModel: 'gpt-4',
    openAIEmbeddingsModel: 'text-embedding-ada-002',
  },
}));

const mockCreateOrUpdateConnection = vi.fn().mockResolvedValue({});

vi.mock('../../../../../core/knowledge/utils/connection', () => ({
  getConnectionParametersForEdit: (...args: any[]) => mockGetConnectionParametersForEdit(...args),
  createOrUpdateConnection: (...args: any[]) => mockCreateOrUpdateConnection(...args),
}));

// Mock TemplatesSection and TemplatesPanelFooter
vi.mock('@microsoft/designer-ui', () => ({
  TemplatesSection: ({ title, items }: { title: string; items: any[] }) => (
    <div data-testid={`section-${title.toLowerCase().replace(/\s+/g, '-')}`}>
      <h3>{title}</h3>
      {items.map((item, index) => (
        <div key={index} data-testid={`item-${item.label?.toLowerCase().replace(/\s+/g, '-')}`}>
          <label>{item.label}</label>
          <input
            data-testid={`input-${item.label?.toLowerCase().replace(/\s+/g, '-')}`}
            value={item.value}
            onChange={(e) => item.onChange?.(e.target.value)}
            disabled={item.disabled}
          />
          {item.errorMessage && <span className="error">{item.errorMessage}</span>}
        </div>
      ))}
    </div>
  ),
  TemplatesPanelFooter: ({ buttonContents }: { buttonContents: any[] }) => (
    <div data-testid="panel-footer">
      {buttonContents?.map((btn, i) => (
        <button key={i} data-testid={`footer-btn-${i}`} onClick={btn.onClick} disabled={btn.disabled}>
          {btn.text}
        </button>
      ))}
    </div>
  ),
}));

describe('EditConnectionPanel Component', () => {
  let queryClient: QueryClient;

  const createMockStore = (
    panelState = {
      isOpen: true,
      currentPanelView: KnowledgePanelView.EditConnection,
      selectedTabId: undefined,
    }
  ) => {
    return configureStore({
      reducer: {
        knowledgeHubPanel: () => panelState,
      },
    });
  };

  const renderComponent = (store = createMockStore(), mountNode: HTMLDivElement | null = null) => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });

    return render(
      <QueryClientProvider client={queryClient}>
        <Provider store={store}>
          <IntlProvider locale="en">
            <EditConnectionPanel mountNode={mountNode} />
          </IntlProvider>
        </Provider>
      </QueryClientProvider>
    );
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseConnection.mockReturnValue({
      data: mockConnection,
      isLoading: false,
    });
    mockGetConnectionParametersForEdit.mockReturnValue({
      connectionParameters: {
        cosmosDBAuthenticationType: {
          uiDefinition: { displayName: 'Authentication Type', constraints: {} },
        },
        cosmosDBEndpoint: {
          uiDefinition: { displayName: 'Cosmos DB Endpoint', constraints: {} },
        },
        cosmosDBKey: {
          uiDefinition: { displayName: 'Cosmos DB Key', constraints: {} },
        },
        openAIAuthenticationType: {
          uiDefinition: { displayName: 'OpenAI Auth Type', constraints: {} },
        },
        openAIEndpoint: {
          uiDefinition: { displayName: 'OpenAI Endpoint', constraints: {} },
        },
        openAIKey: {
          uiDefinition: { displayName: 'OpenAI Key', constraints: {} },
        },
        openAICompletionsModel: {
          uiDefinition: { displayName: 'Completions Model', constraints: {} },
        },
        openAIEmbeddingsModel: {
          uiDefinition: { displayName: 'Embeddings Model', constraints: {} },
        },
      },
      parameterValues: {
        displayName: 'Test Connection',
        cosmosDBAuthenticationType: 'managedIdentity',
        cosmosDBEndpoint: 'https://test-cosmos.documents.azure.com:443/',
        openAIAuthenticationType: 'managedIdentity',
        openAIEndpoint: 'https://test-openai.openai.azure.com/',
        openAICompletionsModel: 'gpt-4',
        openAIEmbeddingsModel: 'text-embedding-ada-002',
      },
    });
  });

  afterEach(() => {
    cleanup();
    queryClient?.clear();
  });

  describe('Rendering', () => {
    it('renders the panel header with update title', () => {
      renderComponent();
      expect(screen.getByText('Update connection')).toBeInTheDocument();
    });

    it('renders close button with aria-label', () => {
      renderComponent();
      expect(screen.getByRole('button', { name: 'Close panel' })).toBeInTheDocument();
    });

    it('renders info message bar', () => {
      renderComponent();
      expect(screen.getByText('You can edit only the names for the connection and models at this time.')).toBeInTheDocument();
    });

    it('renders the Details section with display name field', () => {
      renderComponent();
      expect(screen.getByTestId('section-details')).toBeInTheDocument();
      expect(screen.getByText('Details')).toBeInTheDocument();
    });

    it('renders the Cosmos Database section', () => {
      renderComponent();
      expect(screen.getByTestId('section-cosmos-database')).toBeInTheDocument();
      expect(screen.getByText('Cosmos database')).toBeInTheDocument();
    });

    it('renders the Open AI Model section', () => {
      renderComponent();
      expect(screen.getByTestId('section-openai-model')).toBeInTheDocument();
      expect(screen.getByText('Azure OpenAI model')).toBeInTheDocument();
    });

    it('renders the footer with Save and Cancel buttons', () => {
      renderComponent();
      expect(screen.getByTestId('panel-footer')).toBeInTheDocument();
      expect(screen.getByText('Save')).toBeInTheDocument();
      expect(screen.getByText('Cancel')).toBeInTheDocument();
    });
  });

  describe('Loading State', () => {
    it('displays loading spinner when connection data is loading', () => {
      mockUseConnection.mockReturnValue({
        data: undefined,
        isLoading: true,
      });

      renderComponent();

      expect(screen.getByText('Loading connection details...')).toBeInTheDocument();
    });

    it('does not show form sections while loading', () => {
      mockUseConnection.mockReturnValue({
        data: undefined,
        isLoading: true,
      });

      renderComponent();

      expect(screen.queryByTestId('section-details')).not.toBeInTheDocument();
      expect(screen.queryByTestId('section-cosmos-database')).not.toBeInTheDocument();
      expect(screen.queryByTestId('section-openai-model')).not.toBeInTheDocument();
    });
  });

  describe('Panel Visibility', () => {
    it('does not render drawer content when panel is closed', () => {
      const store = createMockStore({
        isOpen: false,
        currentPanelView: KnowledgePanelView.EditConnection,
        selectedTabId: undefined,
      });
      const { container } = renderComponent(store);

      expect(container.querySelector('[role="dialog"]')).toBeNull();
    });

    it('does not render drawer content when panel view is AddFiles', () => {
      const store = createMockStore({
        isOpen: true,
        currentPanelView: KnowledgePanelView.AddFiles,
        selectedTabId: undefined,
      });
      const { container } = renderComponent(store);

      expect(container.querySelector('[role="dialog"]')).toBeNull();
    });

    it('does not render drawer content when panel view is CreateConnection', () => {
      const store = createMockStore({
        isOpen: true,
        currentPanelView: KnowledgePanelView.CreateConnection,
        selectedTabId: undefined,
      });
      const { container } = renderComponent(store);

      expect(container.querySelector('[role="dialog"]')).toBeNull();
    });

    it('renders drawer content when panel is open and view is EditConnection', () => {
      const store = createMockStore({
        isOpen: true,
        currentPanelView: KnowledgePanelView.EditConnection,
        selectedTabId: undefined,
      });
      renderComponent(store);

      expect(screen.getByText('Update connection')).toBeInTheDocument();
    });
  });

  describe('Save Button State', () => {
    it('disables save button when no changes are made', () => {
      renderComponent();

      const saveButton = screen.getByTestId('footer-btn-0');
      expect(saveButton).toBeDisabled();
    });

    it('disables save button while loading', () => {
      mockUseConnection.mockReturnValue({
        data: undefined,
        isLoading: true,
      });

      renderComponent();

      const saveButton = screen.getByTestId('footer-btn-0');
      expect(saveButton).toBeDisabled();
    });
  });

  describe('Form Interactions', () => {
    it('enables save button when display name is changed', async () => {
      renderComponent();

      const displayNameInput = screen.getByTestId('input-connection-display-name');
      fireEvent.change(displayNameInput, { target: { value: 'New Connection Name' } });

      await waitFor(() => {
        const saveButton = screen.getByTestId('footer-btn-0');
        expect(saveButton).not.toBeDisabled();
      });
    });

    it('shows error when display name is cleared', async () => {
      renderComponent();

      const displayNameInput = screen.getByTestId('input-connection-display-name');
      fireEvent.change(displayNameInput, { target: { value: '' } });

      await waitFor(() => {
        expect(screen.getByText('Requires a parameter value.')).toBeInTheDocument();
      });
    });
  });

  describe('Save and Cancel Actions', () => {
    it('calls createOrUpdateConnection when save button is clicked', async () => {
      renderComponent();

      // Change a value to enable the save button
      const displayNameInput = screen.getByTestId('input-connection-display-name');
      fireEvent.change(displayNameInput, { target: { value: 'Updated Name' } });

      await waitFor(() => {
        const saveButton = screen.getByTestId('footer-btn-0');
        expect(saveButton).not.toBeDisabled();
      });

      const saveButton = screen.getByTestId('footer-btn-0');
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(mockCreateOrUpdateConnection).toHaveBeenCalled();
      });
    });

    it('dispatches closePanel when cancel button is clicked', () => {
      const store = createMockStore();
      const dispatchSpy = vi.spyOn(store, 'dispatch');

      renderComponent(store);

      const cancelButton = screen.getByText('Cancel');
      fireEvent.click(cancelButton);

      expect(dispatchSpy).toHaveBeenCalled();
    });

    it('dispatches closePanel when close icon button is clicked', () => {
      const store = createMockStore();
      const dispatchSpy = vi.spyOn(store, 'dispatch');

      renderComponent(store);

      const closeButton = screen.getByRole('button', { name: 'Close panel' });
      fireEvent.click(closeButton);

      expect(dispatchSpy).toHaveBeenCalled();
    });
  });

  describe('Key Authentication Fields', () => {
    it('shows cosmosDBKey field when auth type is key', () => {
      mockGetConnectionParametersForEdit.mockReturnValue({
        connectionParameters: {
          cosmosDBAuthenticationType: {
            uiDefinition: { displayName: 'Authentication Type', constraints: {} },
          },
          cosmosDBEndpoint: {
            uiDefinition: { displayName: 'Cosmos DB Endpoint', constraints: {} },
          },
          cosmosDBKey: {
            uiDefinition: { displayName: 'Cosmos DB Key', constraints: {} },
          },
          openAIAuthenticationType: {
            uiDefinition: { displayName: 'OpenAI Auth Type', constraints: {} },
          },
          openAIEndpoint: {
            uiDefinition: { displayName: 'OpenAI Endpoint', constraints: {} },
          },
          openAIKey: {
            uiDefinition: { displayName: 'OpenAI Key', constraints: {} },
          },
          openAICompletionsModel: {
            uiDefinition: { displayName: 'Completions Model', constraints: {} },
          },
          openAIEmbeddingsModel: {
            uiDefinition: { displayName: 'Embeddings Model', constraints: {} },
          },
        },
        parameterValues: {
          displayName: 'Test Connection',
          cosmosDBAuthenticationType: 'key',
          cosmosDBEndpoint: 'https://test-cosmos.documents.azure.com:443/',
          cosmosDBKey: 'test-cosmos-key',
          openAIAuthenticationType: 'managedIdentity',
          openAIEndpoint: 'https://test-openai.openai.azure.com/',
          openAICompletionsModel: 'gpt-4',
          openAIEmbeddingsModel: 'text-embedding-ada-002',
        },
      });

      renderComponent();

      expect(screen.getByTestId('item-cosmos-db-key')).toBeInTheDocument();
    });

    it('shows openAIKey field when openAI auth type is key', () => {
      mockGetConnectionParametersForEdit.mockReturnValue({
        connectionParameters: {
          cosmosDBAuthenticationType: {
            uiDefinition: { displayName: 'Authentication Type', constraints: {} },
          },
          cosmosDBEndpoint: {
            uiDefinition: { displayName: 'Cosmos DB Endpoint', constraints: {} },
          },
          cosmosDBKey: {
            uiDefinition: { displayName: 'Cosmos DB Key', constraints: {} },
          },
          openAIAuthenticationType: {
            uiDefinition: { displayName: 'OpenAI Auth Type', constraints: {} },
          },
          openAIEndpoint: {
            uiDefinition: { displayName: 'OpenAI Endpoint', constraints: {} },
          },
          openAIKey: {
            uiDefinition: { displayName: 'OpenAI Key', constraints: {} },
          },
          openAICompletionsModel: {
            uiDefinition: { displayName: 'Completions Model', constraints: {} },
          },
          openAIEmbeddingsModel: {
            uiDefinition: { displayName: 'Embeddings Model', constraints: {} },
          },
        },
        parameterValues: {
          displayName: 'Test Connection',
          cosmosDBAuthenticationType: 'managedIdentity',
          cosmosDBEndpoint: 'https://test-cosmos.documents.azure.com:443/',
          openAIAuthenticationType: 'key',
          openAIEndpoint: 'https://test-openai.openai.azure.com/',
          openAIKey: 'test-openai-key',
          openAICompletionsModel: 'gpt-4',
          openAIEmbeddingsModel: 'text-embedding-ada-002',
        },
      });

      renderComponent();

      expect(screen.getByTestId('item-openai-key')).toBeInTheDocument();
    });
  });

  describe('Connection Parameter Edit', () => {
    it('uses getConnectionParametersForEdit with intl and connection', () => {
      renderComponent();

      expect(mockGetConnectionParametersForEdit).toHaveBeenCalledWith(expect.anything(), mockConnection);
    });
  });

  describe('Saving State', () => {
    it('displays "Saving..." text when save is in progress', async () => {
      mockCreateOrUpdateConnection.mockImplementation(() => new Promise((resolve) => setTimeout(resolve, 100)));

      renderComponent();

      // Change a value to enable the save button
      const displayNameInput = screen.getByTestId('input-connection-display-name');
      fireEvent.change(displayNameInput, { target: { value: 'Updated Name' } });

      await waitFor(() => {
        const saveButton = screen.getByTestId('footer-btn-0');
        expect(saveButton).not.toBeDisabled();
      });

      const saveButton = screen.getByTestId('footer-btn-0');
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText('Saving...')).toBeInTheDocument();
      });
    });

    it('handles save errors gracefully', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockCreateOrUpdateConnection.mockRejectedValue(new Error('Save failed'));

      renderComponent();

      // Change a value to enable the save button
      const displayNameInput = screen.getByTestId('input-connection-display-name');
      fireEvent.change(displayNameInput, { target: { value: 'Updated Name' } });

      await waitFor(() => {
        const saveButton = screen.getByTestId('footer-btn-0');
        expect(saveButton).not.toBeDisabled();
      });

      const saveButton = screen.getByTestId('footer-btn-0');
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalledWith('Error updating connection:', expect.any(Error));
      });

      consoleErrorSpy.mockRestore();
    });
  });
});
