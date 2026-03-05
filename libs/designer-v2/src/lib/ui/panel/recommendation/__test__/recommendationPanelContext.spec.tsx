/**
 * @vitest-environment jsdom
 */
import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { IntlProvider } from 'react-intl';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RecommendationPanelContext } from '../recommendationPanelContext';
import { SELECTION_STATES } from '../../../../core/state/panel/panelTypes';

// Mock the selectors
vi.mock('../../../../core/state/panel/panelSelectors', () => ({
  useDiscoveryPanelFavoriteOperations: vi.fn(() => []),
  useDiscoveryPanelIsAddingTrigger: vi.fn(() => false),
  useDiscoveryPanelIsParallelBranch: vi.fn(() => false),
  useDiscoveryPanelRelationshipIds: vi.fn(() => ({
    graphId: 'root',
    parentId: undefined,
    childId: undefined,
  })),
  useDiscoveryPanelSelectedOperationGroupId: vi.fn(() => ''),
  useDiscoveryPanelSelectedOperationId: vi.fn(() => ''),
  useDiscoveryPanelSelectedBrowseCategory: vi.fn(() => null),
  useDiscoveryPanelSelectionState: vi.fn(() => SELECTION_STATES.SEARCH),
  useMcpToolWizard: vi.fn(() => null),
  useIsAddingAgentTool: vi.fn(() => false),
}));

vi.mock('../../../../core/state/designerOptions/designerOptionsSelectors', () => ({
  useHostOptions: vi.fn(() => ({ displayRuntimeInfo: true })),
}));

vi.mock('../../../../core/state/panel/panelSlice', () => ({
  selectOperationGroupId: vi.fn((id) => ({ type: 'panel/selectOperationGroupId', payload: id })),
  selectOperationId: vi.fn((id) => ({ type: 'panel/selectOperationId', payload: id })),
  selectBrowseCategory: vi.fn((category) => ({ type: 'panel/selectBrowseCategory', payload: category })),
  setDiscoverySelectionState: vi.fn((state) => ({ type: 'panel/setDiscoverySelectionState', payload: state })),
  openMcpToolWizard: vi.fn((payload) => ({ type: 'panel/openMcpToolWizard', payload })),
}));

vi.mock('../../../../core/actions/bjsworkflow/add', () => ({
  addOperation: vi.fn((payload) => ({ type: 'bjsworkflow/addOperation', payload })),
}));

vi.mock('../../../../core/queries/browse', () => ({
  useAllConnectors: vi.fn(() => ({ data: [], isLoading: false })),
  useAllOperations: vi.fn(() => ({ data: [], isLoading: false })),
  useMcpServersQuery: vi.fn(() => ({ data: { data: [] }, isLoading: false })),
}));

vi.mock('../hooks', () => ({
  useOnFavoriteClick: vi.fn(() => vi.fn()),
}));

vi.mock('../searchView', () => ({
  SearchView: vi.fn(({ searchTerm }) => <div data-testid="search-view">Search: {searchTerm}</div>),
}));

vi.mock('../browse/browseView', () => ({
  BrowseView: vi.fn(({ isTrigger }) => <div data-testid="browse-view">Browse View - Trigger: {String(isTrigger)}</div>),
}));

vi.mock('../browse/mcpToolWizard', () => ({
  McpToolWizard: vi.fn(() => <div data-testid="mcp-tool-wizard">MCP Tool Wizard</div>),
}));

vi.mock('../azureResourceSelection', () => ({
  AzureResourceSelection: vi.fn(() => <div data-testid="azure-resource-selection">Azure Resource Selection</div>),
}));

vi.mock('../customSwaggerSelection', () => ({
  CustomSwaggerSelection: vi.fn(() => <div data-testid="custom-swagger-selection">Custom Swagger Selection</div>),
}));

vi.mock('../details/connectorDetailsView', () => ({
  ConnectorDetailsView: vi.fn(() => <div data-testid="connector-details-view">Connector Details View</div>),
}));

vi.mock('@microsoft/designer-ui', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@microsoft/designer-ui')>();
  return {
    ...actual,
    OperationSearchHeaderV2: vi.fn(({ searchCallback, searchTerm }) => (
      <div data-testid="search-header">
        <input data-testid="search-input" value={searchTerm} onChange={(e) => searchCallback(e.target.value)} placeholder="Search" />
      </div>
    )),
    XLargeText: vi.fn(({ text }) => <h2 data-testid="panel-heading">{text}</h2>),
  };
});

vi.mock('@microsoft/logic-apps-shared', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@microsoft/logic-apps-shared')>();
  return {
    ...actual,
    SearchService: vi.fn(() => ({
      getActiveSearchOperations: vi.fn(() => Promise.resolve([])),
    })),
    FavoriteContext: {
      Provider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    },
    equals: vi.fn((a, b) => a?.toLowerCase() === b?.toLowerCase()),
    requestOperation: { id: 'request', type: 'Request' },
  };
});

import {
  useDiscoveryPanelIsAddingTrigger,
  useDiscoveryPanelSelectedOperationGroupId,
  useDiscoveryPanelSelectedOperationId,
  useDiscoveryPanelSelectedBrowseCategory,
  useDiscoveryPanelSelectionState,
  useMcpToolWizard,
} from '../../../../core/state/panel/panelSelectors';
import { selectOperationGroupId, selectBrowseCategory } from '../../../../core/state/panel/panelSlice';
import { useAllOperations } from '../../../../core/queries/browse';

const mockUseDiscoveryPanelIsAddingTrigger = vi.mocked(useDiscoveryPanelIsAddingTrigger);
const mockUseDiscoveryPanelSelectedOperationGroupId = vi.mocked(useDiscoveryPanelSelectedOperationGroupId);
const mockUseDiscoveryPanelSelectedOperationId = vi.mocked(useDiscoveryPanelSelectedOperationId);
const mockUseDiscoveryPanelSelectedBrowseCategory = vi.mocked(useDiscoveryPanelSelectedBrowseCategory);
const mockUseDiscoveryPanelSelectionState = vi.mocked(useDiscoveryPanelSelectionState);
const mockUseMcpToolWizard = vi.mocked(useMcpToolWizard);
const mockSelectOperationGroupId = vi.mocked(selectOperationGroupId);
const mockSelectBrowseCategory = vi.mocked(selectBrowseCategory);
const mockUseAllOperations = vi.mocked(useAllOperations);

const createTestStore = () =>
  configureStore({
    reducer: {
      panel: () => ({}),
      operations: () => ({}),
      workflow: () => ({}),
      designerOptions: () => ({}),
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

describe('RecommendationPanelContext', () => {
  const mockToggleCollapse = vi.fn();
  const defaultProps = {
    toggleCollapse: mockToggleCollapse,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseDiscoveryPanelIsAddingTrigger.mockReturnValue(false);
    mockUseDiscoveryPanelSelectedOperationGroupId.mockReturnValue('');
    mockUseDiscoveryPanelSelectedBrowseCategory.mockReturnValue(null);
    mockUseDiscoveryPanelSelectionState.mockReturnValue(SELECTION_STATES.SEARCH);
    mockUseMcpToolWizard.mockReturnValue(null);
    mockUseAllOperations.mockReturnValue({ data: [], isLoading: false } as any);
  });

  afterEach(() => {
    cleanup();
  });

  describe('Header', () => {
    test('should render panel heading for actions', () => {
      render(<RecommendationPanelContext {...defaultProps} />, { wrapper: createWrapper() });

      expect(screen.getByTestId('panel-heading').textContent).toBe('Add an action');
    });

    test('should render panel heading for triggers', () => {
      mockUseDiscoveryPanelIsAddingTrigger.mockReturnValue(true);

      render(<RecommendationPanelContext {...defaultProps} />, { wrapper: createWrapper() });

      expect(screen.getByTestId('panel-heading').textContent).toBe('Add a trigger');
    });

    test('should render subcategory title when browse category is selected', () => {
      mockUseDiscoveryPanelSelectedBrowseCategory.mockReturnValue({ key: 'favorites', title: 'Favorites' });

      render(<RecommendationPanelContext {...defaultProps} />, { wrapper: createWrapper() });

      expect(screen.getByTestId('panel-heading').textContent).toBe('Favorites');
    });

    test('should render close button', () => {
      render(<RecommendationPanelContext {...defaultProps} />, { wrapper: createWrapper() });

      const closeButton = screen.getByRole('button', { name: /close panel/i });
      expect(closeButton).toBeDefined();
    });

    test('should call toggleCollapse when close button is clicked', () => {
      render(<RecommendationPanelContext {...defaultProps} />, { wrapper: createWrapper() });

      const closeButton = screen.getByRole('button', { name: /close panel/i });
      fireEvent.click(closeButton);

      expect(mockToggleCollapse).toHaveBeenCalled();
    });

    test('should render search header', () => {
      render(<RecommendationPanelContext {...defaultProps} />, { wrapper: createWrapper() });

      expect(screen.getByTestId('search-header')).toBeDefined();
    });
  });

  describe('Navigation', () => {
    test('should show back button when browse category is selected', () => {
      mockUseDiscoveryPanelSelectedBrowseCategory.mockReturnValue({ key: 'favorites', title: 'Favorites' });

      render(<RecommendationPanelContext {...defaultProps} />, { wrapper: createWrapper() });

      const backButton = screen.getByRole('button', { name: /return to search/i });
      expect(backButton).toBeDefined();
    });

    test('should dispatch selectBrowseCategory(undefined) when back button is clicked from category', () => {
      mockUseDiscoveryPanelSelectedBrowseCategory.mockReturnValue({ key: 'favorites', title: 'Favorites' });

      render(<RecommendationPanelContext {...defaultProps} />, { wrapper: createWrapper() });

      const backButton = screen.getByRole('button', { name: /return to search/i });
      fireEvent.click(backButton);

      expect(mockSelectBrowseCategory).toHaveBeenCalledWith(undefined);
    });

    test('should show back button when connector is selected', () => {
      mockUseDiscoveryPanelSelectedOperationGroupId.mockReturnValue('connector-123');

      render(<RecommendationPanelContext {...defaultProps} />, { wrapper: createWrapper() });

      const backButton = screen.getByRole('button', { name: /return to search/i });
      expect(backButton).toBeDefined();
    });

    test('should dispatch selectOperationGroupId when navigating back from connector', () => {
      mockUseDiscoveryPanelSelectedOperationGroupId.mockReturnValue('connector-123');

      render(<RecommendationPanelContext {...defaultProps} />, { wrapper: createWrapper() });

      const backButton = screen.getByRole('button', { name: /return to search/i });
      fireEvent.click(backButton);

      expect(mockSelectOperationGroupId).toHaveBeenCalledWith('');
    });

    test('should not show back button when no category or connector is selected', () => {
      render(<RecommendationPanelContext {...defaultProps} />, { wrapper: createWrapper() });

      const backButton = screen.queryByRole('button', { name: /return to search/i });
      expect(backButton).toBeNull();
    });
  });

  describe('Content Views', () => {
    test('should render BrowseView when no search term and SEARCH state', () => {
      render(<RecommendationPanelContext {...defaultProps} />, { wrapper: createWrapper() });

      expect(screen.getByTestId('browse-view')).toBeDefined();
    });

    test('should render BrowseView with isTrigger=true when adding trigger', () => {
      mockUseDiscoveryPanelIsAddingTrigger.mockReturnValue(true);

      render(<RecommendationPanelContext {...defaultProps} />, { wrapper: createWrapper() });

      expect(screen.getByTestId('browse-view').textContent).toContain('Trigger: true');
    });

    test('should render SearchView when search term is entered', () => {
      render(<RecommendationPanelContext {...defaultProps} />, { wrapper: createWrapper() });

      const searchInput = screen.getByTestId('search-input');
      fireEvent.change(searchInput, { target: { value: 'http' } });

      expect(screen.getByTestId('search-view')).toBeDefined();
      expect(screen.getByTestId('search-view').textContent).toContain('Search: http');
    });

    test('should render McpToolWizard when MCP wizard state is set', () => {
      mockUseMcpToolWizard.mockReturnValue({
        operation: {
          id: 'mcp-server-1',
          name: 'MCP Server',
          type: 'McpClientTool',
          properties: {
            summary: 'Test MCP Server',
            api: { iconUri: 'https://example.com/icon.svg' },
          },
        },
        step: 0,
      } as any);

      render(<RecommendationPanelContext {...defaultProps} />, { wrapper: createWrapper() });

      expect(screen.getByTestId('mcp-tool-wizard')).toBeDefined();
    });

    test('should hide search header when MCP wizard is open', () => {
      mockUseMcpToolWizard.mockReturnValue({
        operation: {
          id: 'mcp-server-1',
          name: 'MCP Server',
          type: 'McpClientTool',
          properties: {
            summary: 'Test MCP Server',
          },
        },
        step: 0,
      } as any);

      render(<RecommendationPanelContext {...defaultProps} />, { wrapper: createWrapper() });

      expect(screen.queryByTestId('search-header')).toBeNull();
    });

    test('should render ConnectorDetailsView when in DETAILS state with connector selected', () => {
      mockUseDiscoveryPanelSelectionState.mockReturnValue(SELECTION_STATES.DETAILS);
      mockUseDiscoveryPanelSelectedOperationGroupId.mockReturnValue('connector-123');

      render(<RecommendationPanelContext {...defaultProps} />, { wrapper: createWrapper() });

      expect(screen.getByTestId('connector-details-view')).toBeDefined();
    });

    test('should render AzureResourceSelection when in AZURE_RESOURCE state', () => {
      const mockOperation = {
        id: 'azure-op',
        name: 'Azure Operation',
        type: 'action',
        properties: {},
      };
      mockUseAllOperations.mockReturnValue({ data: [mockOperation], isLoading: false } as any);
      mockUseDiscoveryPanelSelectionState.mockReturnValue(SELECTION_STATES.AZURE_RESOURCE);
      mockUseDiscoveryPanelSelectedOperationId.mockReturnValue('azure-op');

      render(<RecommendationPanelContext {...defaultProps} />, { wrapper: createWrapper() });

      expect(screen.getByTestId('azure-resource-selection')).toBeDefined();
    });

    test('should render CustomSwaggerSelection when in CUSTOM_SWAGGER state', () => {
      const mockOperation = {
        id: 'swagger-op',
        name: 'Swagger Operation',
        type: 'action',
        properties: {},
      };
      mockUseAllOperations.mockReturnValue({ data: [mockOperation], isLoading: false } as any);
      mockUseDiscoveryPanelSelectionState.mockReturnValue(SELECTION_STATES.CUSTOM_SWAGGER);
      mockUseDiscoveryPanelSelectedOperationId.mockReturnValue('swagger-op');

      render(<RecommendationPanelContext {...defaultProps} />, { wrapper: createWrapper() });

      expect(screen.getByTestId('custom-swagger-selection')).toBeDefined();
    });
  });

  describe('MCP Wizard Header', () => {
    test('should show MCP server name as heading when wizard is open', () => {
      mockUseMcpToolWizard.mockReturnValue({
        operation: {
          id: 'mcp-server-1',
          name: 'MCP Server',
          type: 'McpClientTool',
          properties: {
            summary: 'My Custom MCP Server',
          },
        },
        step: 0,
      } as any);

      render(<RecommendationPanelContext {...defaultProps} />, { wrapper: createWrapper() });

      expect(screen.getByTestId('panel-heading').textContent).toBe('My Custom MCP Server');
    });

    test('should show MCP server icon when wizard is open', () => {
      mockUseMcpToolWizard.mockReturnValue({
        operation: {
          id: 'mcp-server-1',
          name: 'MCP Server',
          type: 'McpClientTool',
          properties: {
            summary: 'Test MCP Server',
            api: { iconUri: 'https://example.com/icon.svg' },
          },
        },
        step: 0,
      } as any);

      render(<RecommendationPanelContext {...defaultProps} />, { wrapper: createWrapper() });

      // The icon has role="presentation" because alt="" is used for decorative images
      const icon = screen.getByRole('presentation');
      expect(icon).toBeDefined();
      expect(icon.getAttribute('src')).toBe('https://example.com/icon.svg');
    });
  });
});
