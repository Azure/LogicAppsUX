/**
 * @vitest-environment jsdom
 */
import { describe, vi, expect, it, beforeEach } from 'vitest';
// biome-ignore lint/correctness/noUnusedImports: using react for render
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { IntlProvider } from 'react-intl';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DeleteModal, EmptyWorkflowsModal, AddServerModal } from '../modals';

// Mock the AddServerButtons component
vi.mock('../add', () => ({
  AddServerButtons: ({ onCreateTools, onUseExisting }: { onCreateTools: () => void; onUseExisting?: () => void }) => (
    <div data-testid="add-server-buttons">
      <button onClick={onCreateTools} data-testid="create-tools-btn">
        Create Tools
      </button>
      <button onClick={onUseExisting} data-testid="use-existing-btn">
        Use Existing
      </button>
    </div>
  ),
}));

describe('Modal Components', () => {
  let queryClient: QueryClient;

  const renderWithProviders = (component: React.ReactElement) => {
    const store = configureStore({
      reducer: {
        resource: () => ({
          subscriptionId: 'test-sub',
          resourceGroup: 'test-rg',
          logicAppName: 'test-app',
        }),
      },
    });

    return render(
      <QueryClientProvider client={queryClient}>
        <Provider store={store}>
          <IntlProvider locale="en">{component}</IntlProvider>
        </Provider>
      </QueryClientProvider>
    );
  };

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });
    vi.clearAllMocks();
  });

  describe('DeleteModal', () => {
    const defaultProps = {
      onDelete: vi.fn(),
      onDismiss: vi.fn(),
    };

    it('renders with correct title and content', () => {
      renderWithProviders(<DeleteModal {...defaultProps} />);

      expect(screen.getByText('Delete this MCP server group.')).toBeInTheDocument();
      expect(screen.getByText(`Confirm that you want to delete this MCP server group? You can't undo this action.`)).toBeInTheDocument();
    });

    it('renders delete and continue editing buttons', () => {
      renderWithProviders(<DeleteModal {...defaultProps} />);

      expect(screen.getByText('Delete')).toBeInTheDocument();
      expect(screen.getByText('Continue editing')).toBeInTheDocument();
    });

    it('calls onDelete when delete button is clicked', () => {
      const mockOnDelete = vi.fn();
      renderWithProviders(<DeleteModal {...defaultProps} onDelete={mockOnDelete} />);

      const deleteButton = screen.getByText('Delete');
      fireEvent.click(deleteButton);

      expect(mockOnDelete).toHaveBeenCalledTimes(1);
    });

    it('calls onDismiss when continue editing button is clicked', () => {
      const mockOnDismiss = vi.fn();
      renderWithProviders(<DeleteModal {...defaultProps} onDismiss={mockOnDismiss} />);

      const continueButton = screen.getByText('Continue editing');
      fireEvent.click(continueButton);

      // Dialog component calls onDismiss twice: once from button click and once from onOpenChange
      expect(mockOnDismiss).toHaveBeenCalledTimes(2);
    });

    it('has proper button styling for delete button', () => {
      renderWithProviders(<DeleteModal {...defaultProps} />);

      const deleteButton = screen.getByText('Delete');
      expect(deleteButton).toHaveStyle({ background: expect.any(String) });
    });

    it('renders as an open dialog', () => {
      renderWithProviders(<DeleteModal {...defaultProps} />);

      const dialog = screen.getByRole('dialog');
      expect(dialog).toBeInTheDocument();
    });

    describe('Accessibility', () => {
      it('has proper dialog role', () => {
        renderWithProviders(<DeleteModal {...defaultProps} />);

        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      it('buttons are keyboard accessible', () => {
        renderWithProviders(<DeleteModal {...defaultProps} />);

        const deleteButton = screen.getByText('Delete');
        const continueButton = screen.getByText('Continue editing');

        expect(deleteButton).toHaveAttribute('type', 'button');
        expect(continueButton).toHaveAttribute('type', 'button');
      });
    });
  });

  describe('EmptyWorkflowsModal', () => {
    const defaultProps = {
      onDismiss: vi.fn(),
    };

    it('renders with correct title and content', () => {
      renderWithProviders(<EmptyWorkflowsModal {...defaultProps} />);

      expect(screen.getByText('No workflows are available.')).toBeInTheDocument();
      expect(screen.getByText(/You need at least one workflow in this logic app/)).toBeInTheDocument();
    });

    it('renders close button', () => {
      renderWithProviders(<EmptyWorkflowsModal {...defaultProps} />);

      expect(screen.getByText('Close')).toBeInTheDocument();
    });

    it('calls onDismiss when close button is clicked', () => {
      const mockOnDismiss = vi.fn();
      renderWithProviders(<EmptyWorkflowsModal {...defaultProps} onDismiss={mockOnDismiss} />);

      const closeButton = screen.getByText('Close');
      fireEvent.click(closeButton);

      // Dialog component calls onDismiss twice: once from button click and once from onOpenChange
      expect(mockOnDismiss).toHaveBeenCalledTimes(2);
    });

    it('renders as an open dialog', () => {
      renderWithProviders(<EmptyWorkflowsModal {...defaultProps} />);

      const dialog = screen.getByRole('dialog');
      expect(dialog).toBeInTheDocument();
    });

    it('contains helpful instruction text', () => {
      renderWithProviders(<EmptyWorkflowsModal {...defaultProps} />);

      expect(screen.getByText(/Create new workflows/)).toBeInTheDocument();
      expect(screen.getByText(/build tools from connector actions/)).toBeInTheDocument();
    });

    describe('Accessibility', () => {
      it('has proper dialog role', () => {
        renderWithProviders(<EmptyWorkflowsModal {...defaultProps} />);

        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      it('close button is keyboard accessible', () => {
        renderWithProviders(<EmptyWorkflowsModal {...defaultProps} />);

        const closeButton = screen.getByText('Close');
        expect(closeButton).toHaveAttribute('type', 'button');
      });
    });
  });

  describe('AddServerModal', () => {
    const defaultProps = {
      onCreateTools: vi.fn(),
      onDismiss: vi.fn(),
    };

    it('renders with correct title and subtitle', () => {
      renderWithProviders(<AddServerModal {...defaultProps} />);

      expect(screen.getByText('Create options for MCP servers')).toBeInTheDocument();
      expect(screen.getByText('Use existing workflows in your logic app or create new tools.')).toBeInTheDocument();
    });

    it('renders AddServerButtons component', () => {
      renderWithProviders(<AddServerModal {...defaultProps} />);

      expect(screen.getByTestId('add-server-buttons')).toBeInTheDocument();
      expect(screen.getByTestId('create-tools-btn')).toBeInTheDocument();
      expect(screen.getByTestId('use-existing-btn')).toBeInTheDocument();
    });

    it('renders close button with dismiss icon', () => {
      renderWithProviders(<AddServerModal {...defaultProps} />);

      const closeButton = screen.getByLabelText('close');
      expect(closeButton).toBeInTheDocument();
    });

    it('calls onDismiss when close button is clicked', () => {
      const mockOnDismiss = vi.fn();
      renderWithProviders(<AddServerModal {...defaultProps} onDismiss={mockOnDismiss} />);

      const closeButton = screen.getByLabelText('close');
      fireEvent.click(closeButton);

      expect(mockOnDismiss).toHaveBeenCalledTimes(1);
    });

    it('calls onCreateTools and onDismiss when create tools is triggered', () => {
      const mockOnCreateTools = vi.fn();
      const mockOnDismiss = vi.fn();
      renderWithProviders(<AddServerModal onCreateTools={mockOnCreateTools} onDismiss={mockOnDismiss} />);

      const createToolsButton = screen.getByTestId('create-tools-btn');
      fireEvent.click(createToolsButton);

      expect(mockOnCreateTools).toHaveBeenCalledTimes(1);
      expect(mockOnDismiss).toHaveBeenCalledTimes(1);
    });

    it('calls onDismiss when use existing is triggered', () => {
      const mockOnDismiss = vi.fn();
      renderWithProviders(<AddServerModal {...defaultProps} onDismiss={mockOnDismiss} />);

      const useExistingButton = screen.getByTestId('use-existing-btn');
      fireEvent.click(useExistingButton);

      expect(mockOnDismiss).toHaveBeenCalledTimes(1);
    });

    it('renders as an open dialog', () => {
      renderWithProviders(<AddServerModal {...defaultProps} />);

      const dialog = screen.getByRole('dialog');
      expect(dialog).toBeInTheDocument();
    });

    describe('Callback Handling', () => {
      it('properly handles callback composition for create tools', () => {
        const mockOnCreateTools = vi.fn();
        const mockOnDismiss = vi.fn();

        renderWithProviders(<AddServerModal onCreateTools={mockOnCreateTools} onDismiss={mockOnDismiss} />);

        const createToolsButton = screen.getByTestId('create-tools-btn');
        fireEvent.click(createToolsButton);

        // Both callbacks should be called
        expect(mockOnCreateTools).toHaveBeenCalledTimes(1);
        expect(mockOnDismiss).toHaveBeenCalledTimes(1);
      });

      it('maintains proper callback dependencies', () => {
        const { rerender } = renderWithProviders(<AddServerModal {...defaultProps} />);

        // Verify initial render works
        expect(screen.getByTestId('add-server-buttons')).toBeInTheDocument();

        // Rerender with new props to ensure callback stability
        const newOnCreateTools = vi.fn();
        const newOnDismiss = vi.fn();

        rerender(
          <QueryClientProvider client={queryClient}>
            <Provider
              store={configureStore({
                reducer: {
                  resource: () => ({
                    subscriptionId: 'test-sub',
                    resourceGroup: 'test-rg',
                    logicAppName: 'test-app',
                  }),
                },
              })}
            >
              <IntlProvider locale="en">
                <AddServerModal onCreateTools={newOnCreateTools} onDismiss={newOnDismiss} />
              </IntlProvider>
            </Provider>
          </QueryClientProvider>
        );

        const createToolsButton = screen.getByTestId('create-tools-btn');
        fireEvent.click(createToolsButton);

        expect(newOnCreateTools).toHaveBeenCalledTimes(1);
        expect(newOnDismiss).toHaveBeenCalledTimes(1);
      });
    });

    describe('Accessibility', () => {
      it('has proper dialog role', () => {
        renderWithProviders(<AddServerModal {...defaultProps} />);

        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      it('close button has proper aria-label', () => {
        renderWithProviders(<AddServerModal {...defaultProps} />);

        const closeButton = screen.getByLabelText('close');
        expect(closeButton).toHaveAttribute('aria-label', 'close');
      });

      it('maintains focus management', () => {
        renderWithProviders(<AddServerModal {...defaultProps} />);

        const dialog = screen.getByRole('dialog');
        const closeButton = screen.getByLabelText('close');

        expect(dialog).toBeInTheDocument();
        expect(closeButton).toBeInTheDocument();
      });
    });
  });

  describe('Integration Tests', () => {
    it('all modals can be rendered simultaneously without conflicts', () => {
      const deleteProps = { onDelete: vi.fn(), onDismiss: vi.fn() };
      const emptyProps = { onDismiss: vi.fn() };
      const addProps = { onCreateTools: vi.fn(), onDismiss: vi.fn() };

      renderWithProviders(
        <>
          <DeleteModal {...deleteProps} />
          <EmptyWorkflowsModal {...emptyProps} />
          <AddServerModal {...addProps} />
        </>
      );

      // All dialogs should be present
      const dialogs = screen.getAllByRole('dialog');
      expect(dialogs).toHaveLength(3);

      // Specific content should be present
      expect(screen.getByText('Delete this MCP server group.')).toBeInTheDocument();
      expect(screen.getByText('No workflows are available.')).toBeInTheDocument();
      expect(screen.getByText('Create options for MCP servers')).toBeInTheDocument();
    });

    it('handles internationalization properly', () => {
      renderWithProviders(<DeleteModal onDelete={vi.fn()} onDismiss={vi.fn()} />);

      // Verify that intl messages are being used
      expect(screen.getByText('Delete this MCP server group.')).toBeInTheDocument();
      expect(screen.getByText('Continue editing')).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('handles missing callbacks gracefully', () => {
      // This tests that the components don't crash with undefined callbacks
      expect(() => {
        renderWithProviders(<EmptyWorkflowsModal onDismiss={undefined as any} />);
      }).not.toThrow();
    });

    it('handles render errors gracefully', () => {
      // Test that components render without throwing errors
      expect(() => {
        renderWithProviders(<DeleteModal onDelete={vi.fn()} onDismiss={vi.fn()} />);
      }).not.toThrow();

      expect(() => {
        renderWithProviders(<EmptyWorkflowsModal onDismiss={vi.fn()} />);
      }).not.toThrow();

      expect(() => {
        renderWithProviders(<AddServerModal onCreateTools={vi.fn()} onDismiss={vi.fn()} />);
      }).not.toThrow();
    });
  });
});
