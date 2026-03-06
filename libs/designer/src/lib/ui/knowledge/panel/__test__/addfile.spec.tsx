/**
 * @vitest-environment jsdom
 */
import { describe, vi, expect, it, beforeEach } from 'vitest';
// biome-ignore lint/correctness/noUnusedImports: using react for render
import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { IntlProvider } from 'react-intl';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { AddFilePanel } from '../addfile';
import { KnowledgePanelView } from '../../../../core/state/knowledge/panelSlice';

// Mock queries
const mockUseAllKnowledgeHubs = vi.fn();
vi.mock('../../../../core/knowledge/utils/queries', () => ({
  useAllKnowledgeHubs: (...args: any[]) => mockUseAllKnowledgeHubs(...args),
}));

// Mock CreateGroup component
vi.mock('../../modals/creategroup', () => ({
  CreateGroup: ({ onDismiss, onCreate }: { onDismiss: () => void; onCreate: (name: string) => void }) => (
    <div data-testid="create-group-modal">
      <button onClick={onDismiss}>Dismiss</button>
      <button onClick={() => onCreate('NewGroup')}>Create</button>
    </div>
  ),
}));

describe('AddFilePanel Component', () => {
  const resourceId = '/subscriptions/sub1/resourceGroups/rg/providers/Microsoft.Web/sites/myApp';

  const createMockStore = (panelState = { isOpen: true, currentPanelView: KnowledgePanelView.AddFiles }) => {
    return configureStore({
      reducer: {
        knowledgeHubPanel: () => panelState,
      },
    });
  };

  const renderComponent = (store = createMockStore()) => {
    return render(
      <Provider store={store}>
        <IntlProvider locale="en">
          <AddFilePanel resourceId={resourceId} />
        </IntlProvider>
      </Provider>
    );
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAllKnowledgeHubs.mockReturnValue({
      data: [
        { name: 'Group1', id: 'group1' },
        { name: 'Group2', id: 'group2' },
      ],
      isLoading: false,
    });
  });

  it('renders the panel title', () => {
    renderComponent();

    // Title appears in header - use getAllByText since it appears multiple places
    const titles = screen.getAllByText('Add files');
    expect(titles.length).toBeGreaterThan(0);
  });

  it('renders group section with title and description', () => {
    renderComponent();

    const groupLabels = screen.getAllByText('Group');
    expect(groupLabels.length).toBeGreaterThan(0);

    const descriptions = screen.getAllByText('Create a group or select an existing one to manage your knowledge base files.');
    expect(descriptions.length).toBeGreaterThan(0);
  });

  it('renders add files section with description', () => {
    renderComponent();

    const descriptions = screen.getAllByText(
      'Files will be added to the group name above. Each file can be up to 16MB, with a maximum or 100MB per upload.'
    );
    expect(descriptions.length).toBeGreaterThan(0);
  });

  it('renders Add and Cancel buttons', () => {
    renderComponent();

    const addButtons = screen.getAllByRole('button', { name: 'Add' });
    const cancelButtons = screen.getAllByRole('button', { name: 'Cancel' });
    expect(addButtons.length).toBeGreaterThan(0);
    expect(cancelButtons.length).toBeGreaterThan(0);
  });

  it('renders close button', () => {
    renderComponent();

    const closeButtons = screen.getAllByRole('button', { name: 'Close panel' });
    expect(closeButtons.length).toBeGreaterThan(0);
  });

  it('does not render drawer content when panel is closed', () => {
    const store = createMockStore({ isOpen: false, currentPanelView: undefined });
    const { container } = renderComponent(store);

    // When panel is closed, there should be no visible drawer content
    const drawer = container.querySelector('[role="dialog"]');
    expect(drawer).toBeNull();
  });

  it('does not render drawer content when different panel view is active', () => {
    const store = createMockStore({ isOpen: true, currentPanelView: KnowledgePanelView.CreateConnection });
    const { container } = renderComponent(store);

    // When different view is active, this panel's drawer should not be visible
    const drawer = container.querySelector('[role="dialog"]');
    expect(drawer).toBeNull();
  });

  it('shows loading state when hubs are loading', () => {
    mockUseAllKnowledgeHubs.mockReturnValue({
      data: undefined,
      isLoading: true,
    });
    renderComponent();

    const loadingPlaceholders = screen.getAllByPlaceholderText('Loading groups...');
    expect(loadingPlaceholders.length).toBeGreaterThan(0);
  });

  it('shows placeholder when not loading', () => {
    renderComponent();

    const placeholders = screen.getAllByPlaceholderText('Choose or create a new group');
    expect(placeholders.length).toBeGreaterThan(0);
  });

  it('renders combobox for group selection', () => {
    renderComponent();

    const comboboxes = screen.getAllByRole('combobox');
    expect(comboboxes.length).toBeGreaterThan(0);
  });

  it('calls useAllKnowledgeHubs with resourceId', () => {
    renderComponent();

    expect(mockUseAllKnowledgeHubs).toHaveBeenCalledWith(resourceId);
  });

  it('renders learn more links', () => {
    renderComponent();

    const learnMoreLinks = screen.getAllByText('Learn more');
    expect(learnMoreLinks.length).toBeGreaterThanOrEqual(1);
  });
});
