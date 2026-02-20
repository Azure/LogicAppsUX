/**
 * @vitest-environment jsdom
 */
import { describe, vi, expect, it, beforeEach } from 'vitest';
// biome-ignore lint/correctness/noUnusedImports: using react for render
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { IntlProvider } from 'react-intl';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { CreateServer } from '../create';
import type { McpServer } from '@microsoft/logic-apps-shared';

// Mock the queries
vi.mock('../../../../../core/mcp/utils/queries', () => ({
  useMcpEligibleWorkflows: vi.fn(),
}));

// Mock the panel slice actions
vi.mock('../../../../../core/state/mcp/panel/mcpPanelSlice', () => ({
  closePanel: vi.fn(() => ({ type: 'mcp/panel/closePanel' })),
}));

// Mock the validation functions
vi.mock('../../../../../core/mcp/utils/server', () => ({
  validateMcpServerName: vi.fn(),
  validateMcpServerDescription: vi.fn(),
}));

// Mock the styles hooks
vi.mock('../../styles', () => ({
  useMcpPanelStyles: () => ({
    drawer: 'drawer-class',
    header: 'header-class',
    headerContent: 'header-content-class',
    headerSubtitle: 'header-subtitle-class',
    body: 'body-class',
    footer: 'footer-class',
  }),
  useMcpServerPanelStyles: () => ({
    workflowSection: 'workflow-section-class',
  }),
}));

// Mock @microsoft/designer-ui components
vi.mock('@microsoft/designer-ui', () => ({
  TemplatesSection: ({ title, description, items }: any) => (
    <div data-testid="templates-section">
      <h3>{title}</h3>
      <p>{description}</p>
      {items?.map((item: any, index: number) => (
        <div key={index} data-testid={`template-item-${index}`}>
          <label>{item.label}</label>
          {item.type === 'textfield' && (
            <input
              type="text"
              value={item.value}
              placeholder={item.placeholder}
              onChange={(e) => item.onChange?.(e.target.value)}
              data-testid={`textfield-${item.label.toLowerCase()}`}
              required={item.required}
            />
          )}
          {item.type === 'textarea' && (
            <textarea
              value={item.value}
              placeholder={item.placeholder}
              onChange={(e) => item.onChange?.(e.target.value)}
              data-testid={`textarea-${item.label.toLowerCase()}`}
              required={item.required}
            />
          )}
          {item.type === 'dropdown' && (
            <div data-testid={`dropdown-${item.label.toLowerCase()}`}>
              <input type="text" value={item.value} placeholder={item.placeholder} readOnly disabled={item.disabled} />
              <div>
                {item.options?.map((option: any) => (
                  <button
                    key={option.id}
                    onClick={() => {
                      const newSelection = item.selectedOptions?.includes(option.value)
                        ? item.selectedOptions.filter((s: string) => s !== option.value)
                        : [...(item.selectedOptions || []), option.value];
                      item.onOptionSelect?.(newSelection);
                    }}
                    data-testid={`option-${option.value}`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          )}
          {item.errorMessage && <div data-testid={`error-${index}`}>{item.errorMessage}</div>}
        </div>
      ))}
    </div>
  ),
  TemplatesPanelFooter: ({ buttonContents }: any) => (
    <div data-testid="templates-panel-footer">
      {buttonContents?.map((button: any, index: number) => (
        <button
          key={index}
          onClick={button.onClick}
          disabled={button.disabled}
          data-testid={`footer-button-${index}`}
          className={button.appearance}
        >
          {button.text}
        </button>
      ))}
    </div>
  ),
}));

describe('CreateServer', () => {
  let queryClient: QueryClient;
  let mockOnUpdate: ReturnType<typeof vi.fn>;
  let mockOnClose: ReturnType<typeof vi.fn>;
  let mockClosePanel: ReturnType<typeof vi.fn>;
  let mockValidateMcpServerName: ReturnType<typeof vi.fn>;
  let mockValidateMcpServerDescription: ReturnType<typeof vi.fn>;
  let mockUseMcpEligibleWorkflows: ReturnType<typeof vi.fn>;

  const defaultProps = {
    onUpdate: vi.fn(),
    onClose: vi.fn(),
  };

  const renderWithProviders = (props = {}) => {
    const store = configureStore({
      reducer: {
        resource: () => ({
          subscriptionId: 'test-subscription',
          resourceGroup: 'test-resource-group',
          logicAppName: 'test-logic-app',
        }),
      },
    });

    return render(
      <QueryClientProvider client={queryClient}>
        <Provider store={store}>
          <IntlProvider locale="en">
            <CreateServer {...defaultProps} {...props} />
          </IntlProvider>
        </Provider>
      </QueryClientProvider>
    );
  };

  beforeEach(async () => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });

    mockOnUpdate = vi.fn().mockResolvedValue(undefined);
    mockOnClose = vi.fn();

    // Import mocked functions
    const { closePanel } = await import('../../../../../core/state/mcp/panel/mcpPanelSlice');
    const { validateMcpServerName, validateMcpServerDescription } = await import('../../../../../core/mcp/utils/server');
    const { useMcpEligibleWorkflows } = await import('../../../../../core/mcp/utils/queries');

    mockClosePanel = closePanel as any;
    mockValidateMcpServerName = validateMcpServerName as any;
    mockValidateMcpServerDescription = validateMcpServerDescription as any;
    mockUseMcpEligibleWorkflows = useMcpEligibleWorkflows as any;

    vi.clearAllMocks();

    // Default mock implementations
    mockUseMcpEligibleWorkflows.mockReturnValue({
      data: ['Workflow1', 'Workflow2', 'Workflow3'],
      isLoading: false,
    });

    mockValidateMcpServerName.mockReturnValue(undefined);
    mockValidateMcpServerDescription.mockReturnValue(undefined);
  });

  describe('Component Rendering', () => {
    it('renders create mode with correct title', () => {
      renderWithProviders({ onUpdate: mockOnUpdate, onClose: mockOnClose });

      expect(screen.getByText('Create an MCP server')).toBeInTheDocument();
      expect(screen.getByText('Standard logic app')).toBeInTheDocument();
    });

    it('renders update mode with correct title when server is provided', () => {
      const mockServer: Partial<McpServer> = {
        name: 'TestServer',
        description: 'Test Description',
        tools: [{ name: 'Workflow1' }],
      };

      renderWithProviders({ server: mockServer as McpServer, onUpdate: mockOnUpdate, onClose: mockOnClose });

      expect(screen.getByText('Update MCP server')).toBeInTheDocument();
    });

    it('renders both template sections', () => {
      renderWithProviders({ onUpdate: mockOnUpdate, onClose: mockOnClose });

      const sections = screen.getAllByTestId('templates-section');
      expect(sections).toHaveLength(2);

      expect(screen.getByText('MCP server details')).toBeInTheDocument();
      const workflowsElements = screen.getAllByText('Workflows');
      expect(workflowsElements.length).toBeGreaterThanOrEqual(1);
    });

    it('renders server details form fields', () => {
      renderWithProviders({ onUpdate: mockOnUpdate, onClose: mockOnClose });

      expect(screen.getByTestId('textfield-name')).toBeInTheDocument();
      expect(screen.getByTestId('textarea-description')).toBeInTheDocument();
    });

    it('renders workflows dropdown', () => {
      renderWithProviders({ onUpdate: mockOnUpdate, onClose: mockOnClose });

      expect(screen.getByTestId('dropdown-workflows')).toBeInTheDocument();
    });

    it('renders footer with action buttons', () => {
      renderWithProviders({ onUpdate: mockOnUpdate, onClose: mockOnClose });

      expect(screen.getByTestId('templates-panel-footer')).toBeInTheDocument();
      expect(screen.getByTestId('footer-button-0')).toBeInTheDocument();
      expect(screen.getByTestId('footer-button-1')).toBeInTheDocument();
    });

    it('renders close button in header', () => {
      renderWithProviders({ onUpdate: mockOnUpdate, onClose: mockOnClose });

      const closeButton = screen.getByLabelText('Close MCP server creation panel');
      expect(closeButton).toBeInTheDocument();
    });
  });

  describe('Form Field Interactions', () => {
    it('updates server name when typing in name field', async () => {
      renderWithProviders({ onUpdate: mockOnUpdate, onClose: mockOnClose });

      const nameInput = screen.getByTestId('textfield-name');

      // Use fireEvent.change for more direct control
      fireEvent.change(nameInput, { target: { value: 'TestServerName' } });

      // Add a small delay to ensure change completes
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Check that validation was called with the final complete value
      expect(mockValidateMcpServerName).toHaveBeenLastCalledWith('TestServerName', []);
    });

    it('updates server description when typing in description field', async () => {
      renderWithProviders({ onUpdate: mockOnUpdate, onClose: mockOnClose });

      const descriptionInput = screen.getByTestId('textarea-description');

      // Use fireEvent.change for more direct control
      fireEvent.change(descriptionInput, { target: { value: 'Test description' } });

      // Add a small delay to ensure change completes
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Check that validation was called with the final complete value
      expect(mockValidateMcpServerDescription).toHaveBeenLastCalledWith('Test description');
    });

    it('handles workflow selection in dropdown', () => {
      renderWithProviders({ onUpdate: mockOnUpdate, onClose: mockOnClose });

      const workflow1Option = screen.getByTestId('option-workflow1');
      fireEvent.click(workflow1Option);

      // The component should update internal state
      expect(workflow1Option).toBeInTheDocument();
    });

    it('displays validation errors for name field', async () => {
      mockValidateMcpServerName.mockReturnValue('Name is required');
      const user = userEvent.setup();

      renderWithProviders({ onUpdate: mockOnUpdate, onClose: mockOnClose });

      const nameInput = screen.getByTestId('textfield-name');
      await user.type(nameInput, 'invalid');

      await waitFor(() => {
        expect(screen.getByText('Name is required')).toBeInTheDocument();
      });
    });

    it('displays validation errors for description field', async () => {
      mockValidateMcpServerDescription.mockReturnValue('Description is required');
      const user = userEvent.setup();

      renderWithProviders({ onUpdate: mockOnUpdate, onClose: mockOnClose });

      const descriptionInput = screen.getByTestId('textarea-description');
      await user.type(descriptionInput, 'invalid');

      await waitFor(() => {
        expect(screen.getByText('Description is required')).toBeInTheDocument();
      });
    });
  });

  describe('Workflow Loading States', () => {
    it('shows loading state when workflows are being fetched', () => {
      mockUseMcpEligibleWorkflows.mockReturnValue({
        data: undefined,
        isLoading: true,
      });

      renderWithProviders({ onUpdate: mockOnUpdate, onClose: mockOnClose });

      const dropdown = screen.getByTestId('dropdown-workflows');
      const input = dropdown.querySelector('input');
      expect(input).toHaveAttribute('placeholder', 'Loading workflows...');
      expect(input).toBeDisabled();
    });

    it('shows workflow options when loaded', () => {
      renderWithProviders({ onUpdate: mockOnUpdate, onClose: mockOnClose });

      expect(screen.getByTestId('option-workflow1')).toBeInTheDocument();
      expect(screen.getByTestId('option-workflow2')).toBeInTheDocument();
      expect(screen.getByTestId('option-workflow3')).toBeInTheDocument();
    });

    it('handles empty workflow data', () => {
      mockUseMcpEligibleWorkflows.mockReturnValue({
        data: [],
        isLoading: false,
      });

      renderWithProviders({ onUpdate: mockOnUpdate, onClose: mockOnClose });

      const dropdown = screen.getByTestId('dropdown-workflows');
      expect(dropdown).toBeInTheDocument();
    });
  });

  describe('Server Initialization', () => {
    it('initializes form with server data when provided', () => {
      const mockServer: Partial<McpServer> = {
        name: 'Existing Server',
        description: 'Existing Description',
        tools: [{ name: 'Workflow1' }, { name: 'Workflow2' }],
      };

      renderWithProviders({ server: mockServer as McpServer, onUpdate: mockOnUpdate, onClose: mockOnClose });

      const nameInput = screen.getByTestId('textfield-name');
      const descriptionInput = screen.getByTestId('textarea-description');

      expect(nameInput).toHaveValue('Existing Server');
      expect(descriptionInput).toHaveValue('Existing Description');
    });

    it('initializes empty form in create mode', () => {
      renderWithProviders({ onUpdate: mockOnUpdate, onClose: mockOnClose });

      const nameInput = screen.getByTestId('textfield-name');
      const descriptionInput = screen.getByTestId('textarea-description');

      expect(nameInput).toHaveValue('');
      expect(descriptionInput).toHaveValue('');
    });
  });

  describe('Button States', () => {
    it('shows correct button text in create mode', () => {
      renderWithProviders({ onUpdate: mockOnUpdate, onClose: mockOnClose });

      const createButton = screen.getByTestId('footer-button-0');
      expect(createButton).toHaveTextContent('Create');
    });

    it('shows correct button text in update mode', () => {
      const mockServer: Partial<McpServer> = {
        name: 'TestServer',
        description: 'Test Description',
      };

      renderWithProviders({ server: mockServer as McpServer, onUpdate: mockOnUpdate, onClose: mockOnClose });

      const updateButton = screen.getByTestId('footer-button-0');
      expect(updateButton).toHaveTextContent('Update');
    });

    it('disables submit button when form is invalid', async () => {
      const user = userEvent.setup();
      mockValidateMcpServerName.mockReturnValue('Invalid name');

      renderWithProviders({ onUpdate: mockOnUpdate, onClose: mockOnClose });

      const nameInput = screen.getByTestId('textfield-name');
      await user.type(nameInput, 'invalid');

      await waitFor(() => {
        const submitButton = screen.getByTestId('footer-button-0');
        expect(submitButton).toBeDisabled();
      });
    });

    it('enables submit button when form is valid', async () => {
      const user = userEvent.setup();

      renderWithProviders({ onUpdate: mockOnUpdate, onClose: mockOnClose });

      const nameInput = screen.getByTestId('textfield-name');
      const descriptionInput = screen.getByTestId('textarea-description');
      const workflow1Option = screen.getByTestId('option-workflow1');

      await user.type(nameInput, 'Valid Name');
      await user.type(descriptionInput, 'Valid Description');
      fireEvent.click(workflow1Option);

      await waitFor(() => {
        const submitButton = screen.getByTestId('footer-button-0');
        expect(submitButton).not.toBeDisabled();
      });
    });
  });

  describe('Form Submission', () => {
    it('calls onUpdate with correct data when form is submitted', async () => {
      renderWithProviders({ onUpdate: mockOnUpdate, onClose: mockOnClose });

      const nameInput = screen.getByTestId('textfield-name');
      const descriptionInput = screen.getByTestId('textarea-description');
      const workflow1Option = screen.getByTestId('option-workflow1');
      const submitButton = screen.getByTestId('footer-button-0');

      // Use fireEvent.change for more direct control
      fireEvent.change(nameInput, { target: { value: 'TestServer' } });
      fireEvent.change(descriptionInput, { target: { value: 'Test Description' } });
      fireEvent.click(workflow1Option);

      // Add a small delay to ensure typing completes
      await new Promise((resolve) => setTimeout(resolve, 100));

      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockOnUpdate).toHaveBeenCalledWith({
          name: 'TestServer',
          description: 'Test Description',
          tools: [{ name: 'Workflow1' }],
        });
      });
    });

    it('shows loading state during submission', async () => {
      const user = userEvent.setup();
      let resolvePromise: () => void;
      const pendingPromise = new Promise<void>((resolve) => {
        resolvePromise = resolve;
      });
      mockOnUpdate.mockReturnValue(pendingPromise);

      renderWithProviders({ onUpdate: mockOnUpdate, onClose: mockOnClose });

      const nameInput = screen.getByTestId('textfield-name');
      const descriptionInput = screen.getByTestId('textarea-description');
      const workflow1Option = screen.getByTestId('option-workflow1');
      const submitButton = screen.getByTestId('footer-button-0');

      await user.clear(nameInput);
      await user.type(nameInput, 'TestServer');
      await user.clear(descriptionInput);
      await user.type(descriptionInput, 'Test Description');
      fireEvent.click(workflow1Option);

      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(submitButton).toHaveTextContent('Creating...');
        expect(submitButton).toBeDisabled();
      });

      resolvePromise();
    });

    it('closes panel after successful submission', async () => {
      const user = userEvent.setup();

      renderWithProviders({ onUpdate: mockOnUpdate, onClose: mockOnClose });

      const nameInput = screen.getByTestId('textfield-name');
      const descriptionInput = screen.getByTestId('textarea-description');
      const workflow1Option = screen.getByTestId('option-workflow1');
      const submitButton = screen.getByTestId('footer-button-0');

      await user.clear(nameInput);
      await user.type(nameInput, 'TestServer');
      await user.clear(descriptionInput);
      await user.type(descriptionInput, 'Test Description');
      fireEvent.click(workflow1Option);

      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockClosePanel).toHaveBeenCalled();
      });
    });
  });

  describe('Close Functionality', () => {
    it('calls onClose when close button is clicked', () => {
      renderWithProviders({ onUpdate: mockOnUpdate, onClose: mockOnClose });

      const closeButton = screen.getByLabelText('Close MCP server creation panel');
      fireEvent.click(closeButton);

      expect(mockOnClose).toHaveBeenCalled();
    });

    it('calls onClose when cancel button is clicked', () => {
      renderWithProviders({ onUpdate: mockOnUpdate, onClose: mockOnClose });

      const cancelButton = screen.getByTestId('footer-button-1');
      fireEvent.click(cancelButton);

      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  describe('Workflow Selection Validation', () => {
    it('shows error when no workflows are selected', async () => {
      renderWithProviders({ onUpdate: mockOnUpdate, onClose: mockOnClose });

      const workflow1Option = screen.getByTestId('option-workflow1');

      // Select then deselect to trigger validation
      fireEvent.click(workflow1Option);
      fireEvent.click(workflow1Option);

      await waitFor(() => {
        expect(screen.getByText('Select at least one workflow to continue.')).toBeInTheDocument();
      });
    });

    it('clears workflow error when workflow is selected', async () => {
      renderWithProviders({ onUpdate: mockOnUpdate, onClose: mockOnClose });

      const workflow1Option = screen.getByTestId('option-workflow1');

      // Select then deselect to trigger validation
      fireEvent.click(workflow1Option);
      fireEvent.click(workflow1Option);

      await waitFor(() => {
        expect(screen.getByText('Select at least one workflow to continue.')).toBeInTheDocument();
      });

      // Select again to clear error
      fireEvent.click(workflow1Option);

      await waitFor(() => {
        expect(screen.queryByText('Select at least one workflow to continue.')).not.toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('has proper drawer role', () => {
      renderWithProviders({ onUpdate: mockOnUpdate, onClose: mockOnClose });

      // The Drawer component should render as a dialog
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('has proper aria-label for close button', () => {
      renderWithProviders({ onUpdate: mockOnUpdate, onClose: mockOnClose });

      const closeButton = screen.getByLabelText('Close MCP server creation panel');
      expect(closeButton).toBeInTheDocument();
    });

    it('marks required fields appropriately', () => {
      renderWithProviders({ onUpdate: mockOnUpdate, onClose: mockOnClose });

      const nameInput = screen.getByTestId('textfield-name');
      const descriptionInput = screen.getByTestId('textarea-description');

      expect(nameInput).toHaveAttribute('required');
      expect(descriptionInput).toHaveAttribute('required');
    });
  });

  describe('Error Handling', () => {
    it('handles update failure gracefully', async () => {
      const user = userEvent.setup();
      mockOnUpdate.mockRejectedValue(new Error('Update failed'));

      renderWithProviders({ onUpdate: mockOnUpdate, onClose: mockOnClose });

      const nameInput = screen.getByTestId('textfield-name');
      const descriptionInput = screen.getByTestId('textarea-description');
      const workflow1Option = screen.getByTestId('option-workflow1');
      const submitButton = screen.getByTestId('footer-button-0');

      await user.clear(nameInput);
      await user.type(nameInput, 'TestServer');
      await user.clear(descriptionInput);
      await user.type(descriptionInput, 'Test Description');
      fireEvent.click(workflow1Option);

      fireEvent.click(submitButton);

      // Should not throw error and should reset loading state
      await waitFor(() => {
        expect(submitButton).not.toHaveTextContent('Creating...');
      });
    });

    it('handles missing workflow data', () => {
      mockUseMcpEligibleWorkflows.mockReturnValue({
        data: undefined,
        isLoading: false,
      });

      expect(() => {
        renderWithProviders({ onUpdate: mockOnUpdate, onClose: mockOnClose });
      }).not.toThrow();
    });
  });

  describe('Integration', () => {
    it('calls useMcpEligibleWorkflows with correct parameters', () => {
      renderWithProviders({ onUpdate: mockOnUpdate, onClose: mockOnClose });

      expect(mockUseMcpEligibleWorkflows).toHaveBeenCalledWith('test-subscription', 'test-resource-group', 'test-logic-app');
    });

    it('integrates with Redux store correctly', () => {
      const customStore = configureStore({
        reducer: {
          resource: () => ({
            subscriptionId: 'custom-subscription',
            resourceGroup: 'custom-resource-group',
            logicAppName: 'custom-logic-app',
          }),
        },
      });

      render(
        <QueryClientProvider client={queryClient}>
          <Provider store={customStore}>
            <IntlProvider locale="en">
              <CreateServer onUpdate={mockOnUpdate} onClose={mockOnClose} />
            </IntlProvider>
          </Provider>
        </QueryClientProvider>
      );

      expect(mockUseMcpEligibleWorkflows).toHaveBeenCalledWith('custom-subscription', 'custom-resource-group', 'custom-logic-app');
    });
  });
});
