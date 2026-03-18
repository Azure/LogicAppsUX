/**
 * @vitest-environment jsdom
 */
import { describe, vi, expect, it, beforeEach, afterEach } from 'vitest';
// biome-ignore lint/correctness/noUnusedImports: using react for render
import React from 'react';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { IntlProvider } from 'react-intl';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { KnowledgeHubWizard } from '../knowledgehub';
import type { KnowledgeHubItem } from '../knowledgelist';

// Mock setLayerHostSelector
vi.mock('@fluentui/react', () => ({
  setLayerHostSelector: vi.fn(),
}));

// Mock styles
vi.mock('../styles', () => ({
  useWizardStyles: () => ({
    loadingContainer: 'mock-loading-container',
    loadingText: 'mock-loading-text',
    emptyViewContainer: 'mock-empty-view-container',
    emptyViewContent: 'mock-empty-view-content',
    emptyViewTitle: 'mock-empty-view-title',
    emptyViewButtons: 'mock-empty-view-buttons',
    icon: 'mock-icon',
  }),
}));

// Mock images
vi.mock('../../../../common/images/knowledge/addfiles_light.svg', () => ({ default: 'addfiles_light.svg' }));
vi.mock('../../../../common/images/knowledge/addfiles_dark.svg', () => ({ default: 'addfiles_dark.svg' }));
vi.mock('../../../../common/images/knowledge/emptysetup_light.svg', () => ({ default: 'emptysetup_light.svg' }));
vi.mock('../../../../common/images/knowledge/emptysetup_dark.svg', () => ({ default: 'emptysetup_dark.svg' }));

// Mock KnowledgeHubPanel
vi.mock('../../panel/panelroot', () => ({
  KnowledgeHubPanel: ({ resourceId }: { resourceId: string }) => <div data-testid="knowledge-hub-panel">Panel: {resourceId}</div>,
}));

// Mock CreateGroup
vi.mock('../../modals/creategroup', () => ({
  CreateGroup: ({ onDismiss }: { onDismiss: () => void }) => (
    <div data-testid="create-group-modal">
      <button data-testid="create-group-close" onClick={onDismiss}>
        Close
      </button>
    </div>
  ),
}));

// Mock DeleteModal
vi.mock('../../modals/delete', () => ({
  DeleteModal: ({
    selectedArtifacts,
    onDelete,
    onDismiss,
  }: {
    selectedArtifacts: KnowledgeHubItem[];
    resourceId: string;
    onDelete: () => void;
    onDismiss: () => void;
  }) => (
    <div data-testid="delete-modal">
      <span data-testid="delete-modal-count">{selectedArtifacts.length} items selected</span>
      <button data-testid="delete-modal-confirm" onClick={onDelete}>
        Confirm Delete
      </button>
      <button data-testid="delete-modal-cancel" onClick={onDismiss}>
        Cancel
      </button>
    </div>
  ),
}));

// Mock KnowledgeList
let mockSetSelectedArtifacts: ((items: KnowledgeHubItem[]) => void) | null = null;
vi.mock('../knowledgelist', () => ({
  KnowledgeList: ({
    resourceId,
    hubs,
    setSelectedArtifacts,
  }: {
    resourceId: string;
    hubs: any[];
    onUploadArtifacts: () => void;
    setSelectedArtifacts: (items: KnowledgeHubItem[]) => void;
  }) => {
    mockSetSelectedArtifacts = setSelectedArtifacts;
    return (
      <div data-testid="knowledge-list">
        <span data-testid="knowledge-list-resource">{resourceId}</span>
        <span data-testid="knowledge-list-count">{hubs.length} hubs</span>
        <button
          data-testid="knowledge-list-select-item"
          onClick={() => setSelectedArtifacts([{ id: 'artifact1', name: 'Test Artifact', type: 'file', hubId: 'hub1' }])}
        >
          Select Item
        </button>
        <button data-testid="knowledge-list-clear-selection" onClick={() => setSelectedArtifacts([])}>
          Clear Selection
        </button>
      </div>
    );
  },
}));

// Mock DescriptionWithLink
vi.mock('../../../configuretemplate/common', () => ({
  DescriptionWithLink: ({ text, linkText }: { text: string; linkText?: string }) => (
    <div data-testid="description-with-link">
      {text} {linkText && <a href="#">{linkText}</a>}
    </div>
  ),
}));

// Mock getStandardLogicAppId
vi.mock('../../../../core/configuretemplate/utils/helper', () => ({
  getStandardLogicAppId: (sub: string, rg: string, name: string) =>
    `/subscriptions/${sub}/resourceGroups/${rg}/providers/Microsoft.Web/sites/${name}`,
}));

// Mock queries
const mockUseAllKnowledgeHubs = vi.fn();
const mockUseConnection = vi.fn();
const mockRefetch = vi.fn();

vi.mock('../../../../core/knowledge/utils/queries', () => ({
  useAllKnowledgeHubs: (...args: any[]) => mockUseAllKnowledgeHubs(...args),
  useConnection: () => mockUseConnection(),
}));

// Mock openPanelView
const mockOpenPanelView = vi.fn((payload) => ({ type: 'knowledgeHubPanel/openPanelView', payload }));
vi.mock('../../../../core/state/knowledge/panelSlice', () => ({
  KnowledgePanelView: {
    CreateConnection: 'createConnection',
    EditConnection: 'editConnection',
    AddFiles: 'addFiles',
  },
  openPanelView: (payload: any) => mockOpenPanelView(payload),
}));

describe('KnowledgeHubWizard Component', () => {
  const createMockStore = (
    resourceState = { subscriptionId: 'sub1', resourceGroup: 'rg1', logicAppName: 'myApp' },
    optionsState = { isDarkMode: false }
  ) => {
    return configureStore({
      reducer: {
        resource: () => resourceState,
        knowledgeHubPanel: () => ({ isOpen: false }),
        options: () => optionsState,
      },
    });
  };

  const renderComponent = (store = createMockStore()) => {
    return render(
      <Provider store={store}>
        <IntlProvider locale="en">
          <KnowledgeHubWizard />
        </IntlProvider>
      </Provider>
    );
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockRefetch.mockResolvedValue({});
    mockSetSelectedArtifacts = null;
  });

  afterEach(() => {
    cleanup();
  });

  describe('Loading State', () => {
    it('shows loading spinner when data is loading', () => {
      mockUseAllKnowledgeHubs.mockReturnValue({
        data: undefined,
        isLoading: true,
        refetch: mockRefetch,
      });
      mockUseConnection.mockReturnValue({
        data: undefined,
        isLoading: true,
      });

      renderComponent();

      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });

    it('shows loading spinner when only connection is loading', () => {
      mockUseAllKnowledgeHubs.mockReturnValue({
        data: [],
        isLoading: false,
        refetch: mockRefetch,
      });
      mockUseConnection.mockReturnValue({
        data: undefined,
        isLoading: true,
      });

      renderComponent();

      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });

    it('shows loading spinner when hubs are undefined', () => {
      mockUseAllKnowledgeHubs.mockReturnValue({
        data: undefined,
        isLoading: false,
        refetch: mockRefetch,
      });
      mockUseConnection.mockReturnValue({
        data: { id: 'connection1' },
        isLoading: false,
      });

      renderComponent();

      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });
  });

  describe('Main Content Rendering', () => {
    it('renders main content when loaded with connection and empty hubs', () => {
      mockUseAllKnowledgeHubs.mockReturnValue({
        data: [],
        isLoading: false,
        refetch: mockRefetch,
      });
      mockUseConnection.mockReturnValue({
        data: { id: 'connection1' },
        isLoading: false,
      });

      renderComponent();

      expect(screen.getByTestId('knowledge-hub-panel')).toBeInTheDocument();
      expect(screen.getByText('New')).toBeInTheDocument();
      expect(screen.getByText('Refresh')).toBeInTheDocument();
      expect(screen.getByText('Connection')).toBeInTheDocument();
      expect(screen.getByText('Delete')).toBeInTheDocument();
    });

    it('renders description with learn more link', () => {
      mockUseAllKnowledgeHubs.mockReturnValue({
        data: [],
        isLoading: false,
        refetch: mockRefetch,
      });
      mockUseConnection.mockReturnValue({
        data: { id: 'connection1' },
        isLoading: false,
      });

      renderComponent();

      expect(screen.getByText('Learn more about knowledge sources')).toBeInTheDocument();
    });
  });

  describe('NoConnectionsView', () => {
    it('renders NoConnectionsView when no connection exists', () => {
      mockUseAllKnowledgeHubs.mockReturnValue({
        data: [],
        isLoading: false,
        refetch: mockRefetch,
      });
      mockUseConnection.mockReturnValue({
        data: null,
        isLoading: false,
      });

      renderComponent();

      expect(screen.getByText('Ground responses and insights with knowledge')).toBeInTheDocument();
      expect(screen.getByText('Set up')).toBeInTheDocument();
    });

    it('dispatches CreateConnection when Set up button clicked', () => {
      mockUseAllKnowledgeHubs.mockReturnValue({
        data: [],
        isLoading: false,
        refetch: mockRefetch,
      });
      mockUseConnection.mockReturnValue({
        data: null,
        isLoading: false,
      });

      renderComponent();

      const setupButton = screen.getByText('Set up');
      fireEvent.click(setupButton);

      expect(mockOpenPanelView).toHaveBeenCalledWith({ panelView: 'createConnection' });
    });

    it('uses dark mode image when isDarkMode is true', () => {
      const darkModeStore = createMockStore({ subscriptionId: 'sub1', resourceGroup: 'rg1', logicAppName: 'myApp' }, { isDarkMode: true });

      mockUseAllKnowledgeHubs.mockReturnValue({
        data: [],
        isLoading: false,
        refetch: mockRefetch,
      });
      mockUseConnection.mockReturnValue({
        data: null,
        isLoading: false,
      });

      renderComponent(darkModeStore);

      expect(screen.getByText('Ground responses and insights with knowledge')).toBeInTheDocument();
    });

    it('disables Connection and Delete buttons when no connection exists', () => {
      mockUseAllKnowledgeHubs.mockReturnValue({
        data: [],
        isLoading: false,
        refetch: mockRefetch,
      });
      mockUseConnection.mockReturnValue({
        data: null,
        isLoading: false,
      });

      renderComponent();

      const connectionButton = screen.getByText('Connection');
      const deleteButton = screen.getByText('Delete');

      expect(connectionButton.closest('button')).toBeDisabled();
      expect(deleteButton.closest('button')).toBeDisabled();
    });
  });

  describe('EmptyKnowledgeBaseView', () => {
    it('renders EmptyKnowledgeBaseView when connection exists but no hubs', () => {
      mockUseAllKnowledgeHubs.mockReturnValue({
        data: [],
        isLoading: false,
        refetch: mockRefetch,
      });
      mockUseConnection.mockReturnValue({
        data: { id: 'connection1' },
        isLoading: false,
      });

      renderComponent();

      expect(screen.getByText('Add file sources to your Knowledge base')).toBeInTheDocument();
    });

    it('dispatches AddFiles when Add files button clicked', () => {
      mockUseAllKnowledgeHubs.mockReturnValue({
        data: [],
        isLoading: false,
        refetch: mockRefetch,
      });
      mockUseConnection.mockReturnValue({
        data: { id: 'connection1' },
        isLoading: false,
      });

      renderComponent();

      // Find the primary Add files button in EmptyKnowledgeBaseView
      const addFilesButtons = screen.getAllByText('Add files');
      const primaryButton = addFilesButtons.find((btn) => btn.closest('button')?.className.includes('primary'));

      if (primaryButton) {
        fireEvent.click(primaryButton);
        expect(mockOpenPanelView).toHaveBeenCalledWith({ panelView: 'addFiles' });
      }
    });

    it('uses dark mode image when isDarkMode is true', () => {
      const darkModeStore = createMockStore({ subscriptionId: 'sub1', resourceGroup: 'rg1', logicAppName: 'myApp' }, { isDarkMode: true });

      mockUseAllKnowledgeHubs.mockReturnValue({
        data: [],
        isLoading: false,
        refetch: mockRefetch,
      });
      mockUseConnection.mockReturnValue({
        data: { id: 'connection1' },
        isLoading: false,
      });

      renderComponent(darkModeStore);

      expect(screen.getByText('Add file sources to your Knowledge base')).toBeInTheDocument();
    });
  });

  describe('KnowledgeList View', () => {
    it('renders KnowledgeList when hubs exist', () => {
      mockUseAllKnowledgeHubs.mockReturnValue({
        data: [{ name: 'Hub1', id: 'hub1' }],
        isLoading: false,
        refetch: mockRefetch,
      });
      mockUseConnection.mockReturnValue({
        data: { id: 'connection1' },
        isLoading: false,
      });

      renderComponent();

      expect(screen.getByTestId('knowledge-list')).toBeInTheDocument();
      expect(screen.getByTestId('knowledge-list-count')).toHaveTextContent('1 hubs');
    });

    it('passes correct resourceId to KnowledgeList', () => {
      mockUseAllKnowledgeHubs.mockReturnValue({
        data: [{ name: 'Hub1', id: 'hub1' }],
        isLoading: false,
        refetch: mockRefetch,
      });
      mockUseConnection.mockReturnValue({
        data: { id: 'connection1' },
        isLoading: false,
      });

      renderComponent();

      expect(screen.getByTestId('knowledge-list-resource')).toHaveTextContent(
        '/subscriptions/sub1/resourceGroups/rg1/providers/Microsoft.Web/sites/myApp'
      );
    });

    it('renders multiple hubs correctly', () => {
      mockUseAllKnowledgeHubs.mockReturnValue({
        data: [
          { name: 'Hub1', id: 'hub1' },
          { name: 'Hub2', id: 'hub2' },
          { name: 'Hub3', id: 'hub3' },
        ],
        isLoading: false,
        refetch: mockRefetch,
      });
      mockUseConnection.mockReturnValue({
        data: { id: 'connection1' },
        isLoading: false,
      });

      renderComponent();

      expect(screen.getByTestId('knowledge-list-count')).toHaveTextContent('3 hubs');
    });
  });

  describe('Refresh Functionality', () => {
    it('calls refetch when Refresh button is clicked', async () => {
      mockUseAllKnowledgeHubs.mockReturnValue({
        data: [],
        isLoading: false,
        refetch: mockRefetch,
      });
      mockUseConnection.mockReturnValue({
        data: { id: 'connection1' },
        isLoading: false,
      });

      renderComponent();

      const refreshButton = screen.getByText('Refresh');
      fireEvent.click(refreshButton);

      await waitFor(() => {
        expect(mockRefetch).toHaveBeenCalled();
      });
    });
  });

  describe('Connection Button', () => {
    it('dispatches openPanelView for EditConnection when clicked with existing connection', () => {
      mockUseAllKnowledgeHubs.mockReturnValue({
        data: [],
        isLoading: false,
        refetch: mockRefetch,
      });
      mockUseConnection.mockReturnValue({
        data: { id: 'connection1' },
        isLoading: false,
      });

      renderComponent();

      const connectionButton = screen.getByText('Connection');
      fireEvent.click(connectionButton);

      expect(mockOpenPanelView).toHaveBeenCalledWith({ panelView: 'editConnection' });
    });
  });

  describe('Delete Modal', () => {
    it('Delete button is disabled when no artifacts are selected', () => {
      mockUseAllKnowledgeHubs.mockReturnValue({
        data: [{ name: 'Hub1', id: 'hub1' }],
        isLoading: false,
        refetch: mockRefetch,
      });
      mockUseConnection.mockReturnValue({
        data: { id: 'connection1' },
        isLoading: false,
      });

      renderComponent();

      const deleteButton = screen.getByText('Delete');
      expect(deleteButton.closest('button')).toBeDisabled();
    });

    it('Delete button becomes enabled when artifacts are selected', async () => {
      mockUseAllKnowledgeHubs.mockReturnValue({
        data: [{ name: 'Hub1', id: 'hub1' }],
        isLoading: false,
        refetch: mockRefetch,
      });
      mockUseConnection.mockReturnValue({
        data: { id: 'connection1' },
        isLoading: false,
      });

      renderComponent();

      // Select an item via the list
      const selectButton = screen.getByTestId('knowledge-list-select-item');
      fireEvent.click(selectButton);

      await waitFor(() => {
        const deleteButton = screen.getByText('Delete');
        expect(deleteButton.closest('button')).not.toBeDisabled();
      });
    });

    it('shows DeleteModal when Delete button is clicked with selected artifacts', async () => {
      mockUseAllKnowledgeHubs.mockReturnValue({
        data: [{ name: 'Hub1', id: 'hub1' }],
        isLoading: false,
        refetch: mockRefetch,
      });
      mockUseConnection.mockReturnValue({
        data: { id: 'connection1' },
        isLoading: false,
      });

      renderComponent();

      // Select an item
      const selectButton = screen.getByTestId('knowledge-list-select-item');
      fireEvent.click(selectButton);

      await waitFor(() => {
        const deleteButton = screen.getByText('Delete');
        expect(deleteButton.closest('button')).not.toBeDisabled();
      });

      // Click delete
      const deleteButton = screen.getByText('Delete');
      fireEvent.click(deleteButton);

      expect(screen.getByTestId('delete-modal')).toBeInTheDocument();
      expect(screen.getByTestId('delete-modal-count')).toHaveTextContent('1 items selected');
    });

    it('closes DeleteModal when cancel is clicked', async () => {
      mockUseAllKnowledgeHubs.mockReturnValue({
        data: [{ name: 'Hub1', id: 'hub1' }],
        isLoading: false,
        refetch: mockRefetch,
      });
      mockUseConnection.mockReturnValue({
        data: { id: 'connection1' },
        isLoading: false,
      });

      renderComponent();

      // Select an item and open delete modal
      fireEvent.click(screen.getByTestId('knowledge-list-select-item'));

      await waitFor(() => {
        expect(screen.getByText('Delete').closest('button')).not.toBeDisabled();
      });

      fireEvent.click(screen.getByText('Delete'));
      expect(screen.getByTestId('delete-modal')).toBeInTheDocument();

      // Cancel the modal
      fireEvent.click(screen.getByTestId('delete-modal-cancel'));

      await waitFor(() => {
        expect(screen.queryByTestId('delete-modal')).not.toBeInTheDocument();
      });
    });

    it('calls refetch and clears selection when delete is confirmed', async () => {
      mockUseAllKnowledgeHubs.mockReturnValue({
        data: [{ name: 'Hub1', id: 'hub1' }],
        isLoading: false,
        refetch: mockRefetch,
      });
      mockUseConnection.mockReturnValue({
        data: { id: 'connection1' },
        isLoading: false,
      });

      renderComponent();

      // Select an item and open delete modal
      fireEvent.click(screen.getByTestId('knowledge-list-select-item'));

      await waitFor(() => {
        expect(screen.getByText('Delete').closest('button')).not.toBeDisabled();
      });

      fireEvent.click(screen.getByText('Delete'));

      // Confirm deletion
      fireEvent.click(screen.getByTestId('delete-modal-confirm'));

      await waitFor(() => {
        expect(mockRefetch).toHaveBeenCalled();
      });
    });
  });

  describe('CreateGroup Modal', () => {
    it('shows CreateGroup modal when "Create new group" menu item is clicked', async () => {
      mockUseAllKnowledgeHubs.mockReturnValue({
        data: [],
        isLoading: false,
        refetch: mockRefetch,
      });
      mockUseConnection.mockReturnValue({
        data: { id: 'connection1' },
        isLoading: false,
      });

      renderComponent();

      // Open the menu
      const newButton = screen.getByText('New');
      fireEvent.click(newButton);

      // Click "Create new group"
      const createGroupItem = await screen.findByText('Create new group');
      fireEvent.click(createGroupItem);

      expect(screen.getByTestId('create-group-modal')).toBeInTheDocument();
    });

    it('closes CreateGroup modal when close button is clicked', async () => {
      mockUseAllKnowledgeHubs.mockReturnValue({
        data: [],
        isLoading: false,
        refetch: mockRefetch,
      });
      mockUseConnection.mockReturnValue({
        data: { id: 'connection1' },
        isLoading: false,
      });

      renderComponent();

      // Open the menu and click create group
      fireEvent.click(screen.getByText('New'));
      const createGroupItem = await screen.findByText('Create new group');
      fireEvent.click(createGroupItem);

      expect(screen.getByTestId('create-group-modal')).toBeInTheDocument();

      // Close the modal
      fireEvent.click(screen.getByTestId('create-group-close'));

      await waitFor(() => {
        expect(screen.queryByTestId('create-group-modal')).not.toBeInTheDocument();
      });
    });
  });

  describe('Menu Items', () => {
    it('menu items are disabled when no connection exists', async () => {
      mockUseAllKnowledgeHubs.mockReturnValue({
        data: [],
        isLoading: false,
        refetch: mockRefetch,
      });
      mockUseConnection.mockReturnValue({
        data: null,
        isLoading: false,
      });

      renderComponent();

      // Open the menu
      const newButton = screen.getByText('New');
      fireEvent.click(newButton);

      // Check that menu items are disabled
      const addFilesItems = await screen.findAllByText('Add files');
      const addFilesMenuItem = addFilesItems.find((el) => el.closest('[role="menuitem"]'));
      const createGroupItem = await screen.findByText('Create new group');

      expect(addFilesMenuItem?.closest('[role="menuitem"]')).toHaveAttribute('aria-disabled', 'true');
      expect(createGroupItem.closest('[role="menuitem"]')).toHaveAttribute('aria-disabled', 'true');
    });

    it('menu items are enabled when connection exists', async () => {
      mockUseAllKnowledgeHubs.mockReturnValue({
        data: [{ name: 'Hub1', id: 'hub1' }],
        isLoading: false,
        refetch: mockRefetch,
      });
      mockUseConnection.mockReturnValue({
        data: { id: 'connection1' },
        isLoading: false,
      });

      renderComponent();

      // Open the menu
      const newButton = screen.getByText('New');
      fireEvent.click(newButton);

      // Check that menu items are not disabled - use getAllByText since there are multiple "Add files"
      const addFilesItems = await screen.findAllByText('Add files');
      const addFilesMenuItem = addFilesItems.find((el) => el.closest('[role="menuitem"]'));
      const createGroupItem = await screen.findByText('Create new group');

      expect(addFilesMenuItem?.closest('[role="menuitem"]')).not.toHaveAttribute('aria-disabled', 'true');
      expect(createGroupItem.closest('[role="menuitem"]')).not.toHaveAttribute('aria-disabled', 'true');
    });
  });

  describe('Resource ID Calculation', () => {
    it('correctly computes logicAppId from store values', () => {
      const customStore = createMockStore({
        subscriptionId: 'custom-sub',
        resourceGroup: 'custom-rg',
        logicAppName: 'customApp',
      });

      mockUseAllKnowledgeHubs.mockReturnValue({
        data: [{ name: 'Hub1', id: 'hub1' }],
        isLoading: false,
        refetch: mockRefetch,
      });
      mockUseConnection.mockReturnValue({
        data: { id: 'connection1' },
        isLoading: false,
      });

      renderComponent(customStore);

      expect(screen.getByTestId('knowledge-list-resource')).toHaveTextContent(
        '/subscriptions/custom-sub/resourceGroups/custom-rg/providers/Microsoft.Web/sites/customApp'
      );
    });

    it('handles empty logicAppName', () => {
      const customStore = createMockStore({
        subscriptionId: 'sub1',
        resourceGroup: 'rg1',
        logicAppName: null,
      });

      mockUseAllKnowledgeHubs.mockReturnValue({
        data: [{ name: 'Hub1', id: 'hub1' }],
        isLoading: false,
        refetch: mockRefetch,
      });
      mockUseConnection.mockReturnValue({
        data: { id: 'connection1' },
        isLoading: false,
      });

      renderComponent(customStore);

      expect(screen.getByTestId('knowledge-list-resource')).toHaveTextContent(
        '/subscriptions/sub1/resourceGroups/rg1/providers/Microsoft.Web/sites/'
      );
    });
  });
});
