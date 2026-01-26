import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { IntlProvider } from 'react-intl';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowseView } from '../browseView';

vi.mock('../../../../../core/state/panel/panelSelectors', () => ({
  useDiscoveryPanelRelationshipIds: vi.fn(() => ({
    graphId: 'root',
    parentId: undefined,
    childId: undefined,
  })),
  useDiscoveryPanelIsParallelBranch: vi.fn(() => false),
  useDiscoveryPanelSelectedBrowseCategory: vi.fn(() => null),
  useIsAddingAgentTool: vi.fn(() => false),
}));

vi.mock('../../../../../core/state/panel/panelSlice', () => ({
  selectOperationGroupId: vi.fn((id) => ({ type: 'panel/selectOperationGroupId', payload: id })),
  selectBrowseCategory: vi.fn((category) => ({ type: 'panel/selectBrowseCategory', payload: category })),
}));

vi.mock('../../../../../core/actions/bjsworkflow/add', () => ({
  addOperation: vi.fn((payload) => ({ type: 'bjsworkflow/addOperation', payload })),
}));

vi.mock('../categoryCard', () => ({
  CategoryCard: vi.fn(({ categoryKey, categoryTitle, onCategoryClick }) => (
    <button data-testid={`category-${categoryKey}`} onClick={() => onCategoryClick(categoryKey)}>
      {categoryTitle}
    </button>
  )),
}));

vi.mock('../connectorBrowse', () => ({
  ConnectorBrowse: vi.fn(({ categoryKey }) => <div data-testid={`connector-browse-${categoryKey}`}>Connector Browse</div>),
}));

vi.mock('../mcpServersBrowse', () => ({
  McpServersBrowse: vi.fn(() => <div data-testid="mcp-servers-browse">MCP Servers Browse</div>),
}));

vi.mock('../../categories/Favorites', () => ({
  Favorites: vi.fn(() => <div data-testid="favorites">Favorites</div>),
}));

vi.mock('../helper', () => ({
  getTriggerCategories: vi.fn(() => [
    {
      key: 'manual',
      text: 'When an HTTP request is received',
      description: 'Get started quickly',
      icon: null,
      type: 'immediate',
      operation: { id: 'manual', type: 'Request' },
    },
    {
      key: 'schedule',
      text: 'On a schedule',
      description: 'Run from a recurring schedule',
      icon: null,
      type: 'immediate',
      operation: { id: 'schedule', type: 'Recurrence' },
    },
    {
      key: 'appEvent',
      text: 'From an app',
      description: 'Events from apps or services',
      icon: null,
      type: 'browse',
    },
  ]),
  getActionCategories: vi.fn(() => [
    {
      key: 'favorites',
      text: 'Favorites',
      description: 'Your favorite connectors',
      icon: null,
      type: 'browse',
    },
    {
      key: 'allApps',
      text: 'All apps',
      description: 'Browse all connectors',
      icon: null,
      type: 'browse',
    },
    {
      key: 'mcpServers',
      text: 'MCP Servers',
      description: 'Model Context Protocol servers',
      icon: null,
      type: 'browse',
    },
    {
      key: 'controlFlow',
      text: 'Control flow',
      description: 'Control workflow execution',
      icon: null,
      type: 'browse',
    },
  ]),
  BrowseCategoryType: {
    IMMEDIATE: 'immediate',
    BROWSE: 'browse',
  },
}));

import {
  useDiscoveryPanelSelectedBrowseCategory,
  useIsAddingAgentTool,
  useDiscoveryPanelRelationshipIds,
} from '../../../../../core/state/panel/panelSelectors';
import { selectBrowseCategory } from '../../../../../core/state/panel/panelSlice';
import { addOperation } from '../../../../../core/actions/bjsworkflow/add';
import { getTriggerCategories, getActionCategories } from '../helper';

const mockUseDiscoveryPanelSelectedBrowseCategory = vi.mocked(useDiscoveryPanelSelectedBrowseCategory);
const mockUseIsAddingAgentTool = vi.mocked(useIsAddingAgentTool);
const mockUseDiscoveryPanelRelationshipIds = vi.mocked(useDiscoveryPanelRelationshipIds);
const mockSelectBrowseCategory = vi.mocked(selectBrowseCategory);
const mockAddOperation = vi.mocked(addOperation);
const mockGetTriggerCategories = vi.mocked(getTriggerCategories);
const mockGetActionCategories = vi.mocked(getActionCategories);

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

describe('BrowseView', () => {
  const mockOnOperationClick = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseDiscoveryPanelSelectedBrowseCategory.mockReturnValue(null);
    mockUseIsAddingAgentTool.mockReturnValue(false);
    mockUseDiscoveryPanelRelationshipIds.mockReturnValue({
      graphId: 'root',
      parentId: undefined,
      childId: undefined,
    });
  });

  afterEach(() => {
    cleanup();
  });

  describe('Category Cards View', () => {
    test('should render trigger categories when isTrigger is true', () => {
      render(<BrowseView isTrigger={true} onOperationClick={mockOnOperationClick} />, { wrapper: createWrapper() });

      expect(mockGetTriggerCategories).toHaveBeenCalled();
      expect(screen.getByTestId('category-manual')).toBeDefined();
      expect(screen.getByTestId('category-schedule')).toBeDefined();
      expect(screen.getByTestId('category-appEvent')).toBeDefined();
    });

    test('should render action categories when isTrigger is false', () => {
      render(<BrowseView isTrigger={false} onOperationClick={mockOnOperationClick} />, { wrapper: createWrapper() });

      expect(mockGetActionCategories).toHaveBeenCalled();
      expect(screen.getByTestId('category-favorites')).toBeDefined();
      expect(screen.getByTestId('category-allApps')).toBeDefined();
      expect(screen.getByTestId('category-mcpServers')).toBeDefined();
    });

    test('should dispatch selectBrowseCategory when browse category is clicked', () => {
      render(<BrowseView isTrigger={false} onOperationClick={mockOnOperationClick} />, { wrapper: createWrapper() });

      const allAppsButton = screen.getByTestId('category-allApps');
      fireEvent.click(allAppsButton);

      expect(mockSelectBrowseCategory).toHaveBeenCalledWith({ key: 'allApps', title: 'All apps' });
    });

    test('should dispatch addOperation for immediate trigger category', () => {
      render(<BrowseView isTrigger={true} onOperationClick={mockOnOperationClick} />, { wrapper: createWrapper() });

      const manualButton = screen.getByTestId('category-manual');
      fireEvent.click(manualButton);

      expect(mockAddOperation).toHaveBeenCalled();
    });

    test('should not render categories with visible=false', () => {
      mockGetActionCategories.mockReturnValue([
        {
          key: 'visible',
          text: 'Visible',
          description: 'Visible category',
          icon: null,
          type: 'browse',
          visible: true,
        },
        {
          key: 'hidden',
          text: 'Hidden',
          description: 'Hidden category',
          icon: null,
          type: 'browse',
          visible: false,
        },
      ]);

      render(<BrowseView isTrigger={false} onOperationClick={mockOnOperationClick} />, { wrapper: createWrapper() });

      expect(screen.getByTestId('category-visible')).toBeDefined();
      expect(screen.queryByTestId('category-hidden')).toBeNull();
    });
  });

  describe('Selected Category View', () => {
    beforeEach(() => {
      // Reset action categories mock to default for selected category tests
      mockGetActionCategories.mockReturnValue([
        {
          key: 'favorites',
          text: 'Favorites',
          description: 'Your favorite connectors',
          icon: null,
          type: 'browse',
        },
        {
          key: 'allApps',
          text: 'All apps',
          description: 'Browse all connectors',
          icon: null,
          type: 'browse',
        },
        {
          key: 'mcpServers',
          text: 'MCP Servers',
          description: 'Model Context Protocol servers',
          icon: null,
          type: 'browse',
        },
        {
          key: 'controlFlow',
          text: 'Control flow',
          description: 'Control workflow execution',
          icon: null,
          type: 'browse',
        },
      ]);
    });

    test('should render Favorites when favorites category is selected', () => {
      mockUseDiscoveryPanelSelectedBrowseCategory.mockReturnValue({ key: 'favorites', title: 'Favorites' });

      render(<BrowseView isTrigger={false} onOperationClick={mockOnOperationClick} />, { wrapper: createWrapper() });

      expect(screen.getByTestId('favorites')).toBeDefined();
    });

    test('should render McpServersBrowse when mcpServers category is selected', () => {
      mockUseDiscoveryPanelSelectedBrowseCategory.mockReturnValue({ key: 'mcpServers', title: 'MCP Servers' });

      render(<BrowseView isTrigger={false} onOperationClick={mockOnOperationClick} />, { wrapper: createWrapper() });

      expect(screen.getByTestId('mcp-servers-browse')).toBeDefined();
    });

    test('should render ConnectorBrowse for other browse categories', () => {
      mockUseDiscoveryPanelSelectedBrowseCategory.mockReturnValue({ key: 'allApps', title: 'All apps' });

      render(<BrowseView isTrigger={false} onOperationClick={mockOnOperationClick} />, { wrapper: createWrapper() });

      expect(screen.getByTestId('connector-browse-allApps')).toBeDefined();
    });

    test('should render ConnectorBrowse for trigger browse categories', () => {
      mockUseDiscoveryPanelSelectedBrowseCategory.mockReturnValue({ key: 'appEvent', title: 'From an app' });

      render(<BrowseView isTrigger={true} onOperationClick={mockOnOperationClick} />, { wrapper: createWrapper() });

      expect(screen.getByTestId('connector-browse-appEvent')).toBeDefined();
    });
  });

  describe('Agent Context', () => {
    test('should pass allowAgents as true when graphId is root', () => {
      mockUseDiscoveryPanelRelationshipIds.mockReturnValue({
        graphId: 'root',
        parentId: undefined,
        childId: undefined,
      });

      render(<BrowseView isTrigger={false} onOperationClick={mockOnOperationClick} />, { wrapper: createWrapper() });

      // getActionCategories should be called with allowAgents=true
      expect(mockGetActionCategories).toHaveBeenCalledWith(true, false);
    });

    test('should pass allowAgents as false when graphId is not root', () => {
      mockUseDiscoveryPanelRelationshipIds.mockReturnValue({
        graphId: 'agent-loop-1',
        parentId: 'root',
        childId: undefined,
      });

      render(<BrowseView isTrigger={false} onOperationClick={mockOnOperationClick} />, { wrapper: createWrapper() });

      // getActionCategories should be called with allowAgents=false
      expect(mockGetActionCategories).toHaveBeenCalledWith(false, false);
    });

    test('should pass isAddingAgentTool to getActionCategories', () => {
      mockUseIsAddingAgentTool.mockReturnValue(true);

      render(<BrowseView isTrigger={false} onOperationClick={mockOnOperationClick} />, { wrapper: createWrapper() });

      expect(mockGetActionCategories).toHaveBeenCalledWith(true, true);
    });
  });
});
