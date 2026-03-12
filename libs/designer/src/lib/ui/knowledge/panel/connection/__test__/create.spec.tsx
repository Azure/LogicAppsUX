/**
 * @vitest-environment jsdom
 */
import { describe, vi, expect, it, beforeEach, afterEach } from 'vitest';
// biome-ignore lint/correctness/noUnusedImports: using react for render
import React from 'react';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { IntlProvider } from 'react-intl';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { KnowledgePanelView } from '../../../../../core/state/knowledge/panelSlice';

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
  Button: ({ children, onClick, 'aria-label': ariaLabel }: any) => (
    <button onClick={onClick} aria-label={ariaLabel}>
      {children}
    </button>
  ),
  Text: ({ children, ...props }: any) => <span {...props}>{children}</span>,
}));

// Import CreateConnectionPanel after mocks
import { CreateConnectionPanel } from '../create';

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
const mockSelectTab = vi.fn();
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
  TemplateContent: ({ tabs, selectedTab, selectTab }: { tabs: any[]; selectedTab?: string; selectTab?: (id: string) => void }) => (
    <div data-testid="template-content">
      {tabs.map((tab) => (
        <div key={tab.id} data-testid={`tab-${tab.id}`} onClick={() => selectTab?.(tab.id)}>
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

describe('CreateConnectionPanel Component', () => {
  const createMockStore = (
    panelState = {
      isOpen: true,
      currentPanelView: KnowledgePanelView.CreateConnection,
      selectedTabId: undefined as string | undefined,
    }
  ) => {
    return configureStore({
      reducer: {
        knowledgeHubPanel: () => panelState,
      },
    });
  };

  const renderComponent = (store = createMockStore(), mountNode: HTMLDivElement | null = null) => {
    return render(
      <Provider store={store}>
        <IntlProvider locale="en">
          <CreateConnectionPanel mountNode={mountNode} />
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

  describe('Rendering', () => {
    it('renders panel title "Set up connection"', () => {
      renderComponent();

      expect(screen.getByText('Set up connection')).toBeInTheDocument();
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

    it('renders drawer header', () => {
      renderComponent();

      expect(screen.getByTestId('drawer-header')).toBeInTheDocument();
    });

    it('renders drawer body', () => {
      renderComponent();

      expect(screen.getByTestId('drawer-body')).toBeInTheDocument();
    });

    it('renders drawer footer', () => {
      renderComponent();

      expect(screen.getByTestId('drawer-footer')).toBeInTheDocument();
    });
  });

  describe('Panel Visibility', () => {
    it('does not render drawer content when panel is closed', () => {
      const store = createMockStore({
        isOpen: false,
        currentPanelView: KnowledgePanelView.CreateConnection,
        selectedTabId: undefined,
      });
      renderComponent(store);

      expect(screen.queryByTestId('drawer')).not.toBeInTheDocument();
    });

    it('does not render drawer content when panel view is AddFiles', () => {
      const store = createMockStore({
        isOpen: true,
        currentPanelView: KnowledgePanelView.AddFiles,
        selectedTabId: undefined,
      });
      renderComponent(store);

      expect(screen.queryByTestId('drawer')).not.toBeInTheDocument();
    });

    it('renders drawer when panel is open and view is CreateConnection', () => {
      const store = createMockStore({
        isOpen: true,
        currentPanelView: KnowledgePanelView.CreateConnection,
        selectedTabId: undefined,
      });
      renderComponent(store);

      expect(screen.getByTestId('drawer')).toBeInTheDocument();
    });

    it('renders drawer when panel is open and view is EditConnection', () => {
      const store = createMockStore({
        isOpen: true,
        currentPanelView: KnowledgePanelView.EditConnection,
        selectedTabId: undefined,
      });
      renderComponent(store);

      expect(screen.getByTestId('drawer')).toBeInTheDocument();
    });
  });

  describe('Tab Selection', () => {
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
      renderComponent(store);

      expect(screen.getByTestId('selected-tab').textContent).toBe('MODEL');
    });

    it('dispatches selectPanelTab when tab is clicked', () => {
      const store = createMockStore();
      const dispatchSpy = vi.spyOn(store, 'dispatch');

      renderComponent(store);

      const modelTab = screen.getByTestId('tab-MODEL');
      fireEvent.click(modelTab);

      expect(dispatchSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: expect.stringContaining('selectPanelTab'),
          payload: 'MODEL',
        })
      );
    });
  });

  describe('Close Panel', () => {
    it('dispatches closePanel when close button is clicked', () => {
      const store = createMockStore();
      const dispatchSpy = vi.spyOn(store, 'dispatch');

      renderComponent(store);

      const closeButton = screen.getByRole('button', { name: 'Close panel' });
      fireEvent.click(closeButton);

      expect(dispatchSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: expect.stringContaining('closePanel'),
        })
      );
    });
  });

  describe('Footer Content', () => {
    it('renders footer with button content from first tab when no tab selected', () => {
      renderComponent();

      expect(screen.getByText('Next')).toBeInTheDocument();
    });

    it('renders footer with Create button when MODEL tab is selected', () => {
      const store = createMockStore({
        isOpen: true,
        currentPanelView: KnowledgePanelView.CreateConnection,
        selectedTabId: 'MODEL',
      });
      renderComponent(store);

      expect(screen.getByText('Create')).toBeInTheDocument();
    });
  });
});
