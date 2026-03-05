/**
 * @vitest-environment jsdom
 */
import { describe, vi, expect, it, beforeEach, afterEach } from 'vitest';
// biome-ignore lint/correctness/noUnusedImports: using react for render
import React from 'react';
import { render, screen, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { IntlProvider } from 'react-intl';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { CreateOrUpdateConnectionPanel } from '../create';
import { KnowledgePanelView } from '../../../../../core/state/knowledge/panelSlice';

// Mock usePanelStyles
vi.mock('../../styles', () => ({
  usePanelStyles: () => ({
    drawer: 'mock-drawer',
    header: 'mock-header',
    headerContent: 'mock-header-content',
    body: 'mock-body',
    footer: 'mock-footer',
  }),
}));

// Mock useCreateConnectionPanelTabs
const mockPanelTabs = [
  {
    id: 'BASICS',
    title: 'Basics',
    content: <div data-testid="basics-content">Basics Content</div>,
    footerContent: { buttonContents: [{ type: 'action', text: 'Next' }] },
  },
  {
    id: 'MODEL',
    title: 'Model',
    content: <div data-testid="model-content">Model Content</div>,
    footerContent: { buttonContents: [{ type: 'action', text: 'Create' }] },
  },
];

vi.mock('../usepaneltabs', () => ({
  useCreateConnectionPanelTabs: () => mockPanelTabs,
}));

// Mock TemplateContent and TemplatesPanelFooter
vi.mock('@microsoft/designer-ui', () => ({
  TemplateContent: ({ tabs, selectedTab }: { tabs: any[]; selectedTab?: string }) => (
    <div data-testid="template-content">
      {tabs.map((tab) => (
        <div key={tab.id} data-testid={`tab-${tab.id}`}>
          {tab.title}
        </div>
      ))}
      <div data-testid="selected-tab">{selectedTab || tabs[0]?.id}</div>
    </div>
  ),
  TemplatesPanelFooter: ({ buttonContents }: { buttonContents: any[] }) => (
    <div data-testid="panel-footer">
      {buttonContents?.map((btn, i) => (
        <button key={i}>{btn.text}</button>
      ))}
    </div>
  ),
}));

describe('CreateOrUpdateConnectionPanel Component', () => {
  const createMockStore = (
    panelState = {
      isOpen: true,
      currentPanelView: KnowledgePanelView.CreateConnection,
      selectedTabId: undefined,
    }
  ) => {
    return configureStore({
      reducer: {
        knowledgeHubPanel: () => panelState,
      },
    });
  };

  const renderComponent = (isCreate = true, store = createMockStore()) => {
    return render(
      <Provider store={store}>
        <IntlProvider locale="en">
          <CreateOrUpdateConnectionPanel isCreate={isCreate} />
        </IntlProvider>
      </Provider>
    );
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('renders create title when isCreate is true', () => {
    renderComponent(true);

    expect(screen.getByText('Set up connection')).toBeInTheDocument();
  });

  it('renders update title when isCreate is false', () => {
    renderComponent(false);

    expect(screen.getByText('Update connection')).toBeInTheDocument();
  });

  it('renders close button with aria-label', () => {
    renderComponent();

    expect(screen.getByRole('button', { name: 'Close panel' })).toBeInTheDocument();
  });

  it('renders TemplateContent with tabs', () => {
    renderComponent();

    expect(screen.getByTestId('template-content')).toBeInTheDocument();
    expect(screen.getByTestId('tab-BASICS')).toBeInTheDocument();
    expect(screen.getByTestId('tab-MODEL')).toBeInTheDocument();
  });

  it('renders footer when selectedTabProps has footerContent', () => {
    renderComponent();

    expect(screen.getByTestId('panel-footer')).toBeInTheDocument();
  });

  it('does not render drawer content when panel is closed', () => {
    const store = createMockStore({
      isOpen: false,
      currentPanelView: KnowledgePanelView.CreateConnection,
      selectedTabId: undefined,
    });
    const { container } = renderComponent(true, store);

    // Drawer should not have visible content when closed
    expect(container.querySelector('[role="dialog"]')).toBeNull();
  });

  it('does not render drawer content when panel view is AddFiles', () => {
    const store = createMockStore({
      isOpen: true,
      currentPanelView: KnowledgePanelView.AddFiles,
      selectedTabId: undefined,
    });
    const { container } = renderComponent(true, store);

    // Panel should not be visible when view is AddFiles
    expect(container.querySelector('[role="dialog"]')).toBeNull();
  });

  it('selects first tab by default when no selectedTabId', () => {
    renderComponent();

    expect(screen.getByTestId('selected-tab').textContent).toBe('BASICS');
  });

  it('shows selected tab when selectedTabId is set', () => {
    const store = createMockStore({
      isOpen: true,
      currentPanelView: KnowledgePanelView.CreateConnection,
      selectedTabId: 'MODEL',
    });
    renderComponent(true, store);

    expect(screen.getByTestId('selected-tab').textContent).toBe('MODEL');
  });

  it('renders for EditConnection panel view', () => {
    const store = createMockStore({
      isOpen: true,
      currentPanelView: KnowledgePanelView.EditConnection,
      selectedTabId: undefined,
    });
    renderComponent(false, store);

    expect(screen.getByText('Update connection')).toBeInTheDocument();
    expect(screen.getByTestId('template-content')).toBeInTheDocument();
  });
});
