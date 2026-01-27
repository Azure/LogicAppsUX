import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { IntlProvider } from 'react-intl';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { McpServersBrowse } from '../mcpServersBrowse';

vi.mock('../../../../../core/queries/browse', () => ({
  useMcpServersQuery: vi.fn(() => ({
    data: { data: [] },
    isLoading: false,
  })),
}));

vi.mock('../../../../../core/queries/connections', () => ({
  useConnectionsForConnector: vi.fn(() => ({
    data: [],
    isLoading: false,
  })),
}));

vi.mock('../../../../../core/state/panel/panelSlice', () => ({
  openMcpToolWizard: vi.fn((payload) => ({ type: 'panel/openMcpToolWizard', payload })),
}));

vi.mock('@microsoft/designer-ui', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@microsoft/designer-ui')>();
  return {
    ...actual,
    Grid: vi.fn(({ items, onOperationSelected }) => (
      <div data-testid="mock-grid">
        {items.map((item: any) => (
          <button key={item.id} data-testid={`grid-item-${item.id}`} onClick={() => onOperationSelected(item.id)}>
            {item.title}
          </button>
        ))}
      </div>
    )),
  };
});

import { useMcpServersQuery } from '../../../../../core/queries/browse';
import { useConnectionsForConnector } from '../../../../../core/queries/connections';
import { openMcpToolWizard } from '../../../../../core/state/panel/panelSlice';

const mockUseMcpServersQuery = vi.mocked(useMcpServersQuery);
const mockUseConnectionsForConnector = vi.mocked(useConnectionsForConnector);
const mockOpenMcpToolWizard = vi.mocked(openMcpToolWizard);

const createTestStore = () =>
  configureStore({
    reducer: {
      panel: () => ({}),
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

describe('McpServersBrowse', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseMcpServersQuery.mockReturnValue({
      data: { data: [] },
      isLoading: false,
    } as any);
    mockUseConnectionsForConnector.mockReturnValue({
      data: [],
      isLoading: false,
    } as any);
  });

  afterEach(() => {
    cleanup();
  });

  test('should show loading spinner when servers are loading', () => {
    mockUseMcpServersQuery.mockReturnValue({
      data: undefined,
      isLoading: true,
    } as any);

    render(<McpServersBrowse />, { wrapper: createWrapper() });

    expect(screen.getByRole('progressbar')).toBeDefined();
  });

  test('should render tab list with all tabs', () => {
    render(<McpServersBrowse />, { wrapper: createWrapper() });

    expect(screen.getByRole('tab', { name: 'All' })).toBeDefined();
    expect(screen.getByRole('tab', { name: 'Microsoft' })).toBeDefined();
    expect(screen.getByRole('tab', { name: 'Custom' })).toBeDefined();
    expect(screen.getByRole('tab', { name: 'Others' })).toBeDefined();
  });

  test('should display item count', () => {
    render(<McpServersBrowse />, { wrapper: createWrapper() });

    expect(screen.getByText(/Displaying \d+ item/)).toBeDefined();
  });

  test('should render sort dropdown', () => {
    render(<McpServersBrowse />, { wrapper: createWrapper() });

    expect(screen.getByText('Sort')).toBeDefined();
  });

  test('should dispatch openMcpToolWizard when server is clicked', async () => {
    const mockServer = {
      id: 'test-server',
      name: 'test-server',
      type: 'microsoft.web/locations/managedapis/apioperations',
      properties: {
        summary: 'Test Server',
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
    };

    mockUseMcpServersQuery.mockReturnValue({
      data: { data: [mockServer] },
      isLoading: false,
    } as any);

    render(<McpServersBrowse />, { wrapper: createWrapper() });

    const serverButton = screen.getByTestId('grid-item-test-server');
    fireEvent.click(serverButton);

    await waitFor(() => {
      expect(mockOpenMcpToolWizard).toHaveBeenCalledWith({
        operation: mockServer,
        connectionId: undefined,
        forceCreateConnection: true,
      });
    });
  });

  test('should handle existing connection click with connectionId', async () => {
    const mockConnection = {
      id: 'conn-123',
      name: 'my-connection',
      type: 'builtinMcpClientToolConnection',
      properties: {
        displayName: 'My Connection',
        api: {
          id: 'connectionProviders/mcpclient',
        },
      },
    };

    mockUseConnectionsForConnector.mockReturnValue({
      data: [mockConnection],
      isLoading: false,
    } as any);

    render(<McpServersBrowse />, { wrapper: createWrapper() });

    const othersTab = screen.getByRole('tab', { name: 'Others' });
    fireEvent.click(othersTab);

    await waitFor(() => {
      const connectionButton = screen.getByTestId('grid-item-conn-123');
      fireEvent.click(connectionButton);
    });

    await waitFor(() => {
      expect(mockOpenMcpToolWizard).toHaveBeenCalledWith(
        expect.objectContaining({
          connectionId: 'conn-123',
        })
      );
    });
  });

  test('should filter servers by Microsoft tab', async () => {
    const microsoftServer = {
      id: 'ms-server',
      name: 'ms-server',
      type: 'microsoft.web/locations/managedapis/apioperations',
      properties: {
        summary: 'Microsoft Server',
        api: { id: 'test', brandColor: '#000', iconUri: '' },
      },
    };
    const customServer = {
      id: 'custom-server',
      name: 'custom-server',
      type: 'custom',
      properties: {
        summary: 'Custom Server',
        api: { id: 'test', brandColor: '#000', iconUri: '' },
      },
    };

    mockUseMcpServersQuery.mockReturnValue({
      data: { data: [microsoftServer, customServer] },
      isLoading: false,
    } as any);

    render(<McpServersBrowse />, { wrapper: createWrapper() });

    const microsoftTab = screen.getByRole('tab', { name: 'Microsoft' });
    fireEvent.click(microsoftTab);

    await waitFor(() => {
      expect(screen.getByTestId('grid-item-ms-server')).toBeDefined();
      expect(screen.queryByTestId('grid-item-custom-server')).toBeNull();
    });
  });

  test('should filter servers by Custom tab', async () => {
    const microsoftServer = {
      id: 'ms-server',
      name: 'ms-server',
      type: 'microsoft.web/locations/managedapis/apioperations',
      properties: {
        summary: 'Microsoft Server',
        api: { id: 'test', brandColor: '#000', iconUri: '' },
      },
    };
    const customServer = {
      id: 'custom-server',
      name: 'custom-server',
      type: 'custom',
      properties: {
        summary: 'Custom Server',
        api: { id: 'test', brandColor: '#000', iconUri: '' },
      },
    };

    mockUseMcpServersQuery.mockReturnValue({
      data: { data: [microsoftServer, customServer] },
      isLoading: false,
    } as any);

    render(<McpServersBrowse />, { wrapper: createWrapper() });

    const customTab = screen.getByRole('tab', { name: 'Custom' });
    fireEvent.click(customTab);

    await waitFor(() => {
      expect(screen.queryByTestId('grid-item-ms-server')).toBeNull();
      expect(screen.getByTestId('grid-item-custom-server')).toBeDefined();
    });
  });

  test('should show empty state when no servers available', async () => {
    mockUseMcpServersQuery.mockReturnValue({
      data: { data: [] },
      isLoading: false,
    } as any);

    render(<McpServersBrowse />, { wrapper: createWrapper() });

    const microsoftTab = screen.getByRole('tab', { name: 'Microsoft' });
    fireEvent.click(microsoftTab);

    await waitFor(() => {
      expect(screen.getByText('No MCP servers available')).toBeDefined();
    });
  });

  test('should include builtin MCP server operation in All tab', () => {
    render(<McpServersBrowse />, { wrapper: createWrapper() });

    expect(screen.getByTestId('grid-item-nativemcpclient')).toBeDefined();
  });

  test('should force create connection for builtin MCP server', async () => {
    render(<McpServersBrowse />, { wrapper: createWrapper() });

    const builtinButton = screen.getByTestId('grid-item-nativemcpclient');
    fireEvent.click(builtinButton);

    await waitFor(() => {
      expect(mockOpenMcpToolWizard).toHaveBeenCalledWith(
        expect.objectContaining({
          forceCreateConnection: true,
        })
      );
    });
  });
});
