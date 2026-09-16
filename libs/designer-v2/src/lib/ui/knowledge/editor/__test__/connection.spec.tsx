/**
 * @vitest-environment jsdom
 */
import { describe, vi, expect, it, beforeEach, afterEach } from 'vitest';
// biome-ignore lint/correctness/noUnusedImports: using react for render
import React from 'react';
import { render, screen, fireEvent, cleanup, act } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { IntlProvider } from 'react-intl';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { CreateConnectionModal } from '../connection';

// Mock styles
vi.mock('../styles', () => ({
  useConnectionStyles: () => ({
    content: 'mock-content',
  }),
}));

// Mock Fluent UI components
vi.mock('@fluentui/react-components', () => ({
  Button: ({ children, onClick, 'aria-label': ariaLabel }: any) => (
    <button onClick={onClick} aria-label={ariaLabel}>
      {children}
    </button>
  ),
  Dialog: ({ children, open }: { children: React.ReactNode; open: boolean }) => (open ? <div data-testid="dialog">{children}</div> : null),
  DialogActions: ({ children }: { children: React.ReactNode }) => <div data-testid="dialog-actions">{children}</div>,
  DialogBody: ({ children }: { children: React.ReactNode }) => <div data-testid="dialog-body">{children}</div>,
  DialogContent: ({ children }: { children: React.ReactNode }) => <div data-testid="dialog-content">{children}</div>,
  DialogSurface: ({ children }: { children: React.ReactNode; mountNode?: any }) => <div data-testid="dialog-surface">{children}</div>,
  DialogTitle: ({ children, action }: { children: React.ReactNode; action?: React.ReactNode }) => (
    <div data-testid="dialog-title">
      {children}
      {action}
    </div>
  ),
  DialogTrigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  MessageBar: ({ children, intent, style }: { children: React.ReactNode; intent?: string; style?: React.CSSProperties }) => (
    <div data-testid="error-message-bar" data-intent={intent} style={style}>
      {children}
    </div>
  ),
  MessageBarBody: ({ children }: { children: React.ReactNode }) => <div data-testid="error-message-body">{children}</div>,
  MessageBarTitle: ({ children }: { children: React.ReactNode }) => <span data-testid="error-message-title">{children}</span>,
}));

// Mock useCreateConnectionPanelTabs
let capturedOnError: ((data: { title: string; content: string } | null) => void) | undefined;

const mockPanelTabs = [
  {
    id: 'basics',
    title: 'Basics',
    content: <div>Basics Content</div>,
    footerContent: {
      primaryButtonText: 'Next',
      primaryButtonOnClick: vi.fn(),
      primaryButtonDisabled: false,
    },
  },
  {
    id: 'review',
    title: 'Review',
    content: <div>Review Content</div>,
    footerContent: {
      primaryButtonText: 'Create',
      primaryButtonOnClick: vi.fn(),
      primaryButtonDisabled: false,
    },
  },
];

vi.mock('../../panel/connection/usepaneltabs', () => ({
  useCreateConnectionPanelTabs: ({ onError }: { onError: (data: { title: string; content: string } | null) => void }) => {
    capturedOnError = onError;
    return mockPanelTabs;
  },
}));

// Mock TemplateContent and TemplatesPanelFooter from designer-ui
vi.mock('@microsoft/designer-ui', () => ({
  TemplateContent: ({ tabs, selectedTab, selectTab }: { tabs: any[]; selectedTab: string; selectTab: (id: string) => void }) => (
    <div data-testid="template-content">
      <span data-testid="selected-tab">{selectedTab}</span>
      {tabs.map((tab) => (
        <button key={tab.id} data-testid={`tab-${tab.id}`} onClick={() => selectTab(tab.id)}>
          {tab.title}
        </button>
      ))}
    </div>
  ),
  TemplatesPanelFooter: ({ primaryButtonText }: { primaryButtonText?: string }) => (
    <div data-testid="panel-footer">
      <button data-testid="primary-button">{primaryButtonText}</button>
    </div>
  ),
  KnowledgeTabProps: {},
}));

// Mock constants
vi.mock('../../../../common/constants', () => ({
  default: {
    KNOWLEDGE_PANEL_TAB_NAMES: {
      BASICS: 'basics',
      REVIEW: 'review',
    },
  },
}));

describe('CreateConnectionModal', () => {
  const createMockStore = (isKnowledgeConnectionOpen = true) => {
    return configureStore({
      reducer: {
        modal: () => ({
          isKnowledgeConnectionOpen,
        }),
      },
    });
  };

  const renderComponent = (store = createMockStore(), mountNode: HTMLElement | null = null) => {
    return render(
      <Provider store={store}>
        <IntlProvider locale="en">
          <CreateConnectionModal mountNode={mountNode} />
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
    it('renders the modal with title', () => {
      renderComponent();

      expect(screen.getByText('Create Connection')).toBeInTheDocument();
    });

    it('renders template content with tabs', () => {
      renderComponent();

      expect(screen.getByTestId('template-content')).toBeInTheDocument();
      expect(screen.getByTestId('tab-basics')).toBeInTheDocument();
      expect(screen.getByTestId('tab-review')).toBeInTheDocument();
    });

    it('renders panel footer', () => {
      renderComponent();

      expect(screen.getByTestId('panel-footer')).toBeInTheDocument();
    });

    it('shows basics tab as selected by default', () => {
      renderComponent();

      expect(screen.getByTestId('selected-tab')).toHaveTextContent('basics');
    });
  });

  describe('Tab Navigation', () => {
    it('switches to review tab when clicked', () => {
      renderComponent();

      const reviewTab = screen.getByTestId('tab-review');
      fireEvent.click(reviewTab);

      expect(screen.getByTestId('selected-tab')).toHaveTextContent('review');
    });
  });

  describe('Close Button', () => {
    it('renders close button', () => {
      renderComponent();

      const closeButton = screen.getByLabelText('close');
      expect(closeButton).toBeInTheDocument();
    });
  });

  describe('Error Message Bar', () => {
    it('does not render error message bar when there is no error', () => {
      renderComponent();

      expect(screen.queryByTestId('error-message-bar')).not.toBeInTheDocument();
    });

    it('renders error message bar when createError is set', async () => {
      const { rerender } = renderComponent();

      // Simulate error by calling the captured onError callback
      act(() => {
        capturedOnError?.({ title: 'Connection Error', content: 'Failed to create connection' });
      });

      // Re-render to pick up state change
      rerender(
        <Provider store={createMockStore()}>
          <IntlProvider locale="en">
            <CreateConnectionModal mountNode={null} />
          </IntlProvider>
        </Provider>
      );

      expect(screen.getByTestId('error-message-bar')).toBeInTheDocument();
      expect(screen.getByTestId('error-message-bar')).toHaveAttribute('data-intent', 'error');
      expect(screen.getByTestId('error-message-title')).toHaveTextContent('Connection Error');
      expect(screen.getByTestId('error-message-body')).toHaveTextContent('Failed to create connection');
    });
  });
});
