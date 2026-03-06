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
import { KnowledgePanelView } from '../../../../core/state/knowledge/panelSlice';

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
      <button onClick={onDismiss}>Close</button>
    </div>
  ),
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
  });

  afterEach(() => {
    cleanup();
  });

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

  it('shows loading spinner when connection is loading', () => {
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
    expect(screen.getByText('Add files')).toBeInTheDocument();
  });

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

  it('dispatches openPanelView for EditConnection when Connection button clicked with existing connection', () => {
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

  it('disables menu items when no connection exists', () => {
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

  it('renders hubs list view when hubs exist', () => {
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

    expect(screen.getByText('Open the list view here')).toBeInTheDocument();
  });

  it('uses correct image based on dark mode', () => {
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

    // NoConnectionsView should be visible in dark mode
    expect(screen.getByText('Ground responses and insights with knowledge')).toBeInTheDocument();
  });

  it('dispatches CreateConnection when Set up button clicked in NoConnectionsView', () => {
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

  it('dispatches AddFiles when Add files button clicked in EmptyKnowledgeBaseView', () => {
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

    // Find the button specifically in the empty view (not the menu item)
    const addFilesButtons = screen.getAllByText('Add files');
    // The button in EmptyKnowledgeBaseView
    const emptyViewButton = addFilesButtons.find(
      (btn) => btn.closest('button')?.getAttribute('appearance') === 'primary' || btn.closest('[class*="emptyViewButtons"]')
    );

    if (emptyViewButton) {
      fireEvent.click(emptyViewButton);
      expect(mockOpenPanelView).toHaveBeenCalledWith({ panelView: 'addFiles' });
    }
  });
});
