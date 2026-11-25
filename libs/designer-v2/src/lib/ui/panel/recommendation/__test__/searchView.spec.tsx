import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, waitFor, fireEvent } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { IntlProvider } from 'react-intl';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { composeOperation, FavoriteContext, type DiscoveryOpArray } from '@microsoft/logic-apps-shared';
import { FluentProvider, webLightTheme } from '@fluentui/react-components';
import { builtinMcpServerOperation } from '../helpers';
import { SearchView } from '../searchView';

let renderRealGrid = false;

// Mock the selectors
vi.mock('../../../../core/state/panel/panelSelectors', () => ({
  useDiscoveryPanelIsAddingTrigger: vi.fn(() => false),
  useDiscoveryPanelRelationshipIds: vi.fn(() => ({
    graphId: 'root',
    parentId: undefined,
    childId: undefined,
  })),
  useIsAddingAgentTool: vi.fn(() => false),
}));

vi.mock('../../../../core/state/workflow/workflowSelectors', () => ({
  useIsWithinAgenticLoop: vi.fn(() => false),
}));

vi.mock('../../../../core/state/designerView/designerViewSelectors', () => ({
  useIsAgenticWorkflow: vi.fn(() => false),
  useIsA2AWorkflow: vi.fn(() => false),
}));

vi.mock('../../../../core/state/designerOptions/designerOptionsSelectors', () => ({
  useEnableNestedAgentLoops: vi.fn(() => false),
  useSharedNodeUi: vi.fn(() => false),
}));

vi.mock('../../../../core/state/panel/panelSlice', () => ({
  selectOperationGroupId: vi.fn((id) => ({ type: 'panel/selectOperationGroupId', payload: id })),
}));

vi.mock('../../../../core/queries/browse', () => ({
  useMcpServersQuery: vi.fn(() => ({
    data: { data: [] },
    isLoading: false,
  })),
}));

vi.mock('@microsoft/designer-ui', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@microsoft/designer-ui')>();
  return {
    ...actual,
    SearchResultsGridV2: vi.fn((props: Parameters<typeof actual.SearchResultsGridV2>[0]) => {
      // Keep the lightweight search/filter harness except when testing real row rendering.
      if (renderRealGrid) {
        return <actual.SearchResultsGridV2 {...props} />;
      }
      const { searchTerm, operationSearchResults, isLoadingSearch, onOperationClick, onConnectorClick } = props;
      return (
        <div data-testid="search-results-grid">
          <span data-testid="search-term">{searchTerm}</span>
          <span data-testid="loading-state">{isLoadingSearch ? 'loading' : 'loaded'}</span>
          <span data-testid="results-count">{operationSearchResults?.length ?? 0}</span>
          {operationSearchResults?.map((op) => (
            <button key={op.id} data-testid={`result-${op.id}`} onClick={() => onOperationClick(op.id, op.properties?.api?.id)}>
              {op.name}
            </button>
          ))}
          <button data-testid="connector-click" onClick={() => onConnectorClick('test-connector')}>
            Connector
          </button>
        </div>
      );
    }),
  };
});

vi.mock('../SearchOpeationsService', () => ({
  DefaultSearchOperationsService: class {
    constructor(private operations: DiscoveryOpArray) {}

    async searchOperations(term: string, filter?: (operation: DiscoveryOpArray[number]) => boolean) {
      if (!term) {
        return [];
      }

      return this.operations
        .filter((op) => op.name.toLowerCase().includes(term.toLowerCase()))
        .slice(0, 100)
        .filter((op) => !filter || filter(op));
    }
  },
}));

import {
  useDiscoveryPanelIsAddingTrigger,
  useDiscoveryPanelRelationshipIds,
  useIsAddingAgentTool,
} from '../../../../core/state/panel/panelSelectors';
import { useIsWithinAgenticLoop } from '../../../../core/state/workflow/workflowSelectors';
import { useIsAgenticWorkflow, useIsA2AWorkflow } from '../../../../core/state/designerView/designerViewSelectors';
import { useEnableNestedAgentLoops, useSharedNodeUi } from '../../../../core/state/designerOptions/designerOptionsSelectors';
import { selectOperationGroupId } from '../../../../core/state/panel/panelSlice';
import { useMcpServersQuery } from '../../../../core/queries/browse';

const mockUseDiscoveryPanelRelationshipIds = vi.mocked(useDiscoveryPanelRelationshipIds);
const mockUseIsAddingAgentTool = vi.mocked(useIsAddingAgentTool);
const mockUseIsWithinAgenticLoop = vi.mocked(useIsWithinAgenticLoop);
const mockUseIsAgenticWorkflow = vi.mocked(useIsAgenticWorkflow);
const mockUseIsA2AWorkflow = vi.mocked(useIsA2AWorkflow);
const mockUseEnableNestedAgentLoops = vi.mocked(useEnableNestedAgentLoops);
const mockUseSharedNodeUi = vi.mocked(useSharedNodeUi);
const mockSelectOperationGroupId = vi.mocked(selectOperationGroupId);
const mockUseMcpServersQuery = vi.mocked(useMcpServersQuery);

const createTestStore = () =>
  configureStore({
    reducer: {
      panel: () => ({}),
      workflow: () => ({}),
      designerView: () => ({}),
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

const favoriteContext = { isOperationFavorited: () => false, onFavoriteClick: vi.fn() };

describe('SearchView', () => {
  const mockOnOperationClick = vi.fn();
  const mockSetGroupByConnector = vi.fn();

  const mockOperations = [
    {
      id: 'http-request',
      name: 'HTTP Request',
      type: 'action',
      properties: {
        api: { id: 'http-api', name: 'http', type: 'Microsoft.Web/locations/managedApis' },
      },
    },
    {
      id: 'send-email',
      name: 'Send Email',
      type: 'action',
      properties: {
        api: { id: 'email-api', name: 'office365' },
      },
    },
    {
      id: 'initialize-variable',
      name: 'Initialize Variable',
      type: 'action',
      properties: {},
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    renderRealGrid = false;
    vi.mocked(useDiscoveryPanelIsAddingTrigger).mockReturnValue(false);
    mockUseDiscoveryPanelRelationshipIds.mockReturnValue({
      graphId: 'root',
      parentId: undefined,
      childId: undefined,
    });
    mockUseIsAddingAgentTool.mockReturnValue(false);
    mockUseIsWithinAgenticLoop.mockReturnValue(false);
    mockUseIsAgenticWorkflow.mockReturnValue(false);
    mockUseIsA2AWorkflow.mockReturnValue(false);
    mockUseEnableNestedAgentLoops.mockReturnValue(false);
    mockUseSharedNodeUi.mockReturnValue(false);
    mockUseMcpServersQuery.mockReturnValue({
      data: { data: [] },
      isLoading: false,
    } as any);
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  test.each([
    { mode: 'flat', groupByConnector: false, mcpName: 'MCP server', mcpIcon: /^data:image\/svg\+xml/ },
    { mode: 'grouped', groupByConnector: true, mcpName: 'MCP server (MCP)', mcpIcon: 'https://example.com/mcp.svg' },
  ])('gates a built-in tile without changing the $mode MCP row', async ({ groupByConnector, mcpName, mcpIcon }) => {
    renderRealGrid = true;
    vi.stubGlobal(
      'ResizeObserver',
      class {
        observe() {}
        disconnect() {}
      }
    );
    const allOperations: DiscoveryOpArray = [
      { ...composeOperation, name: 'match-compose' },
      {
        ...builtinMcpServerOperation,
        id: 'mcp-connection',
        name: 'match-mcp',
        type: 'builtinMcpClientToolConnection',
        properties: {
          ...builtinMcpServerOperation.properties,
          summary: 'MCP server',
          api: { ...builtinMcpServerOperation.properties.api, iconUri: 'https://example.com/mcp.svg' },
        },
      },
    ];
    const search = () => (
      <FluentProvider theme={webLightTheme}>
        <FavoriteContext.Provider value={favoriteContext}>
          <SearchView
            searchTerm="match"
            allOperations={allOperations}
            groupByConnector={groupByConnector}
            setGroupByConnector={mockSetGroupByConnector}
            isLoading={false}
            onOperationClick={mockOnOperationClick}
            displayRuntimeInfo={false}
          />
        </FavoriteContext.Provider>
      </FluentProvider>
    );
    const { rerender } = render(search(), { wrapper: createWrapper() });
    const expectMcpArtwork = () => {
      const row = screen.getByRole('button', { name: mcpName });
      expect(row.querySelector('[data-node-glyph]')).not.toBeInTheDocument();
      expect(row.querySelector('img')).toHaveAttribute('src', expect.stringMatching(mcpIcon));
    };

    const composeRow = await screen.findByRole('button', { name: 'Compose' });
    expect(composeRow.querySelector('img')).toHaveAttribute('src', composeOperation.properties.api.iconUri);
    expectMcpArtwork();

    mockUseSharedNodeUi.mockReturnValue(true);
    rerender(search());
    const row = screen.getByRole('button', { name: 'Compose' });
    const glyph = row.querySelector('[data-tone="violet"] [data-icon-name="BracesRegular"]');
    expect(glyph).toBeInTheDocument();
    expect(glyph?.closest('[aria-hidden]')).toHaveAttribute('aria-hidden', 'true');
    expect(row).toHaveAttribute('tabindex', '0');
    expect(row.querySelector('img')).not.toBeInTheDocument();
    fireEvent.keyDown(row, { key: 'Enter' });
    expect(mockOnOperationClick).toHaveBeenCalledWith(composeOperation.id, composeOperation.properties.api.id);

    expectMcpArtwork();
  });

  describe('Rendering', () => {
    test('should render SearchResultsGridV2 component', () => {
      render(
        <SearchView
          searchTerm=""
          allOperations={mockOperations}
          groupByConnector={false}
          setGroupByConnector={mockSetGroupByConnector}
          isLoading={false}
          onOperationClick={mockOnOperationClick}
          displayRuntimeInfo={true}
        />,
        { wrapper: createWrapper() }
      );

      expect(screen.getByTestId('search-results-grid')).toBeDefined();
    });

    test('should pass searchTerm to SearchResultsGridV2', () => {
      render(
        <SearchView
          searchTerm="http"
          allOperations={mockOperations}
          groupByConnector={false}
          setGroupByConnector={mockSetGroupByConnector}
          isLoading={false}
          onOperationClick={mockOnOperationClick}
          displayRuntimeInfo={true}
        />,
        { wrapper: createWrapper() }
      );

      expect(screen.getByTestId('search-term').textContent).toBe('http');
    });

    test('should show loading state when search term changes', async () => {
      render(
        <SearchView
          searchTerm="test"
          allOperations={mockOperations}
          groupByConnector={false}
          setGroupByConnector={mockSetGroupByConnector}
          isLoading={false}
          onOperationClick={mockOnOperationClick}
          displayRuntimeInfo={true}
        />,
        { wrapper: createWrapper() }
      );

      // Initially should be loading when searchTerm is not empty
      expect(screen.getByTestId('loading-state').textContent).toBe('loading');
    });
  });

  describe('Search Filtering', () => {
    test('finds a matching trigger after more than 100 matching actions', async () => {
      vi.mocked(useDiscoveryPanelIsAddingTrigger).mockReturnValue(true);
      const actions = Array.from({ length: 101 }, (_, index) => ({ ...mockOperations[0], id: `http-action-${index}` }));
      const operations = [
        ...actions,
        {
          id: 'http-trigger',
          name: 'When an HTTP request is received',
          type: 'trigger',
          properties: { ...mockOperations[0].properties, trigger: 'Request' },
        },
      ];

      render(
        <SearchView
          searchTerm="http"
          allOperations={operations}
          groupByConnector={true}
          setGroupByConnector={mockSetGroupByConnector}
          isLoading={false}
          onOperationClick={mockOnOperationClick}
          displayRuntimeInfo={true}
        />,
        { wrapper: createWrapper() }
      );

      await screen.findByTestId('result-http-trigger');
      expect(screen.getByTestId('results-count').textContent).toBe('1');
    });

    test.each([true, false])('only hides matching actions when adding a trigger (%s)', async (isAddingTrigger) => {
      vi.mocked(useDiscoveryPanelIsAddingTrigger).mockReturnValue(isAddingTrigger);
      const operations = [
        ...mockOperations,
        {
          id: 'http-trigger',
          name: 'When an HTTP request is received',
          type: 'trigger',
          properties: { ...mockOperations[0].properties, trigger: 'Request' },
        },
      ];

      render(
        <SearchView
          searchTerm="http"
          allOperations={operations}
          groupByConnector={true}
          setGroupByConnector={mockSetGroupByConnector}
          isLoading={false}
          onOperationClick={mockOnOperationClick}
          displayRuntimeInfo={true}
        />,
        { wrapper: createWrapper() }
      );

      await screen.findByTestId('result-http-trigger');
      expect(screen.queryByTestId('result-http-request') !== null).toBe(!isAddingTrigger);
    });

    test('should filter operations based on search term', async () => {
      const { rerender } = render(
        <SearchView
          searchTerm=""
          allOperations={mockOperations}
          groupByConnector={false}
          setGroupByConnector={mockSetGroupByConnector}
          isLoading={false}
          onOperationClick={mockOnOperationClick}
          displayRuntimeInfo={true}
        />,
        { wrapper: createWrapper() }
      );

      // Search for "http"
      rerender(
        <Provider store={createTestStore()}>
          <QueryClientProvider
            client={
              new QueryClient({
                defaultOptions: {
                  queries: {
                    retry: false,
                  },
                },
              })
            }
          >
            <IntlProvider locale="en" messages={{}}>
              <SearchView
                searchTerm="http"
                allOperations={mockOperations}
                groupByConnector={false}
                setGroupByConnector={mockSetGroupByConnector}
                isLoading={false}
                onOperationClick={mockOnOperationClick}
                displayRuntimeInfo={true}
              />
            </IntlProvider>
          </QueryClientProvider>
        </Provider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('search-term').textContent).toBe('http');
      });
    });
  });

  describe('Connector Click', () => {
    test('should dispatch selectOperationGroupId when connector is clicked', () => {
      render(
        <SearchView
          searchTerm=""
          allOperations={mockOperations}
          groupByConnector={false}
          setGroupByConnector={mockSetGroupByConnector}
          isLoading={false}
          onOperationClick={mockOnOperationClick}
          displayRuntimeInfo={true}
        />,
        { wrapper: createWrapper() }
      );

      const connectorButton = screen.getByTestId('connector-click');
      connectorButton.click();

      expect(mockSelectOperationGroupId).toHaveBeenCalledWith('test-connector');
    });
  });

  describe('MCP Servers Integration', () => {
    test('should include MCP servers in search when adding agent tool', () => {
      const mcpServers = [
        {
          id: 'mcp-server-1',
          name: 'MCP Server',
          type: 'McpClientTool',
          properties: {},
        },
      ];

      mockUseIsAddingAgentTool.mockReturnValue(true);
      mockUseMcpServersQuery.mockReturnValue({
        data: { data: mcpServers },
        isLoading: false,
      } as any);

      render(
        <SearchView
          searchTerm="mcp"
          allOperations={mockOperations}
          groupByConnector={false}
          setGroupByConnector={mockSetGroupByConnector}
          isLoading={false}
          onOperationClick={mockOnOperationClick}
          displayRuntimeInfo={true}
        />,
        { wrapper: createWrapper() }
      );

      // The component should include MCP servers when isAgentTool is true
      expect(mockUseMcpServersQuery).toHaveBeenCalled();
    });
  });

  describe('Workflow Context', () => {
    test('should use graphId from relationship IDs', () => {
      mockUseDiscoveryPanelRelationshipIds.mockReturnValue({
        graphId: 'agent-loop-1',
        parentId: 'root',
        childId: undefined,
      });

      render(
        <SearchView
          searchTerm=""
          allOperations={mockOperations}
          groupByConnector={false}
          setGroupByConnector={mockSetGroupByConnector}
          isLoading={false}
          onOperationClick={mockOnOperationClick}
          displayRuntimeInfo={true}
        />,
        { wrapper: createWrapper() }
      );

      expect(mockUseDiscoveryPanelRelationshipIds).toHaveBeenCalled();
      expect(mockUseIsWithinAgenticLoop).toHaveBeenCalledWith('agent-loop-1');
    });

    test('should check for agentic workflow state', () => {
      mockUseIsAgenticWorkflow.mockReturnValue(true);

      render(
        <SearchView
          searchTerm=""
          allOperations={mockOperations}
          groupByConnector={false}
          setGroupByConnector={mockSetGroupByConnector}
          isLoading={false}
          onOperationClick={mockOnOperationClick}
          displayRuntimeInfo={true}
        />,
        { wrapper: createWrapper() }
      );

      expect(mockUseIsAgenticWorkflow).toHaveBeenCalled();
    });

    test('should check for A2A workflow state', () => {
      mockUseIsA2AWorkflow.mockReturnValue(true);

      render(
        <SearchView
          searchTerm=""
          allOperations={mockOperations}
          groupByConnector={false}
          setGroupByConnector={mockSetGroupByConnector}
          isLoading={false}
          onOperationClick={mockOnOperationClick}
          displayRuntimeInfo={true}
        />,
        { wrapper: createWrapper() }
      );

      expect(mockUseIsA2AWorkflow).toHaveBeenCalled();
    });
  });

  describe('Props Passing', () => {
    test('should pass groupByConnector to SearchResultsGridV2', () => {
      render(
        <SearchView
          searchTerm=""
          allOperations={mockOperations}
          groupByConnector={true}
          setGroupByConnector={mockSetGroupByConnector}
          isLoading={false}
          onOperationClick={mockOnOperationClick}
          displayRuntimeInfo={true}
        />,
        { wrapper: createWrapper() }
      );

      expect(screen.getByTestId('search-results-grid')).toBeDefined();
    });

    test('should pass displayRuntimeInfo to SearchResultsGridV2', () => {
      render(
        <SearchView
          searchTerm=""
          allOperations={mockOperations}
          groupByConnector={false}
          setGroupByConnector={mockSetGroupByConnector}
          isLoading={false}
          onOperationClick={mockOnOperationClick}
          displayRuntimeInfo={false}
        />,
        { wrapper: createWrapper() }
      );

      expect(screen.getByTestId('search-results-grid')).toBeDefined();
    });
  });
});
