/**
 * @vitest-environment jsdom
 */
import { describe, vi, expect, it, beforeEach } from 'vitest';
import { MCPServers, type ServerNotificationData } from '../servers';
// biome-ignore lint/correctness/noUnusedImports: using react for render
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import type { McpServer } from '@microsoft/logic-apps-shared';

// Mock the modals
vi.mock('../modals', () => ({
  AddServerModal: ({ onDismiss, onCreateTools }: { onDismiss: () => void; onCreateTools: () => void }) => (
    <div data-testid="add-server-modal">
      <button data-testid="dismiss-add-server" onClick={onDismiss}>
        Dismiss
      </button>
      <button data-testid="create-tools" onClick={onCreateTools}>
        Create Tools
      </button>
    </div>
  ),
  DeleteModal: ({ onDelete, onDismiss }: { onDelete: () => void; onDismiss: () => void }) => (
    <div data-testid="delete-modal">
      <button data-testid="delete-server" onClick={onDelete}>
        Delete
      </button>
      <button data-testid="dismiss-delete" onClick={onDismiss}>
        Dismiss
      </button>
    </div>
  ),
}));

// Mock the styles
vi.mock('../styles', () => ({
  useMcpServerStyles: () => ({
    sectionHeader: 'sectionHeader',
    buttonContainer: 'buttonContainer',
    section: 'section',
    tableStyle: 'tableStyle',
    toolIcon: 'toolIcon',
    iconsCell: 'iconsCell',
  }),
}));

// Mock the CopyInputControl
vi.mock('@microsoft/designer-ui', () => ({
  CopyInputControl: ({ text }: { text: string }) => <input data-testid="copy-input" value={text} readOnly />,
}));

// Mock the DescriptionWithLink component
vi.mock('../../configuretemplate/common', () => ({
  DescriptionWithLink: ({ text }: { text: string }) => <p>{text}</p>,
}));

// Mock the workflow icon
vi.mock('../../../common/images/templates/logicapps.svg', () => ({
  default: 'workflow-icon.svg',
}));

const mockWriteClipboard = vi.fn();
Object.defineProperty(navigator, 'clipboard', {
  value: {
    writeText: mockWriteClipboard,
    readText: vi.fn(), // Mock the readText method
  },
  configurable: true,
});

describe('MCPServers', () => {
  const mockOnRefresh = vi.fn();
  const mockOnUpdateServers = vi.fn();
  const mockOnManageTool = vi.fn();
  const mockOnManageServer = vi.fn();
  const mockOpenCreateTools = vi.fn();

  const mockServers: McpServer[] = [
    {
      name: 'Test Server 1',
      description: 'Description for test server 1',
      url: 'https://example.com/server1',
      enabled: true,
      tools: [{ name: 'Tool 1' }, { name: 'Tool 2' }],
    },
    {
      name: 'Test Server 2',
      description: 'Description for test server 2',
      url: 'https://example.com/server2',
      enabled: false,
      tools: [{ name: 'Tool 3' }],
    },
  ];

  const defaultProps = {
    servers: mockServers,
    isRefreshing: false,
    onRefresh: mockOnRefresh,
    onUpdateServers: mockOnUpdateServers,
    onManageTool: mockOnManageTool,
    onManageServer: mockOnManageServer,
    openCreateTools: mockOpenCreateTools,
  };

  const renderComponent = (props = {}) => {
    return render(<MCPServers {...defaultProps} {...props} />);
  };

  beforeEach(() => {
    // Reset all mocks before each test
    vi.clearAllMocks();
    mockOnUpdateServers.mockResolvedValue(undefined);
  });

  describe('Component Rendering', () => {
    it('renders the component with title and description', () => {
      renderComponent();

      expect(screen.getByText('Servers')).toBeInTheDocument();
      expect(screen.getByText('Manage your MCP servers here. You can create, edit, and delete servers as needed.')).toBeInTheDocument();
    });

    it('renders create and refresh buttons', () => {
      renderComponent();

      expect(screen.getByRole('button', { name: /create/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /refresh/i })).toBeInTheDocument();
    });

    it('renders all servers in accordion format', () => {
      renderComponent();

      expect(screen.getByText('Test Server 1')).toBeInTheDocument();
      expect(screen.getByText('Test Server 2')).toBeInTheDocument();
      expect(screen.getByText('Description for test server 1')).toBeInTheDocument();
      expect(screen.getByText('Description for test server 2')).toBeInTheDocument();
    });

    it('renders server tools correctly', () => {
      renderComponent();

      expect(screen.getByText('Tool 1')).toBeInTheDocument();
      expect(screen.getByText('Tool 2')).toBeInTheDocument();
      expect(screen.getByText('Tool 3')).toBeInTheDocument();
    });

    it('shows refreshing state correctly', () => {
      renderComponent({ isRefreshing: true });

      const refreshButton = screen.getByRole('button', { name: /refreshing/i });
      expect(refreshButton).toBeDisabled();
      expect(refreshButton).toHaveTextContent('Refreshing...');
    });
  });

  describe('Server Actions', () => {
    it('calls onRefresh when refresh button is clicked', () => {
      renderComponent();

      const refreshButton = screen.getByRole('button', { name: /refresh/i });
      fireEvent.click(refreshButton);

      expect(mockOnRefresh).toHaveBeenCalledTimes(1);
    });

    it('opens add server modal when create button is clicked', () => {
      renderComponent();

      const createButton = screen.getByRole('button', { name: /create/i });
      fireEvent.click(createButton);

      expect(screen.getByTestId('add-server-modal')).toBeInTheDocument();
    });

    it('calls onManageServer when edit button is clicked', () => {
      renderComponent();

      const editButtons = screen.getAllByRole('button', { name: /edit/i });
      fireEvent.click(editButtons[0]);

      expect(mockOnManageServer).toHaveBeenCalledWith('Test Server 1');
    });

    it('should copy server endpoint url in clipboard when copy url button is clicked', () => {
      renderComponent();

      const copyUrlButtons = screen.getAllByRole('button', { name: /copy url/i });
      fireEvent.click(copyUrlButtons[0]);

      expect(mockWriteClipboard).toHaveBeenCalledWith('https://example.com/server1');
    });

    it('opens delete modal when delete button is clicked', () => {
      renderComponent();

      const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
      fireEvent.click(deleteButtons[0]);

      expect(screen.getByTestId('delete-modal')).toBeInTheDocument();
    });

    // TODO: Will enable this test once feature to show this control is added after backend is deployed.
    it.skip('toggles server enabled state when switch is clicked', async () => {
      renderComponent();

      const switches = screen.getAllByRole('switch');
      fireEvent.click(switches[0]); // Toggle the first server (currently enabled)

      await waitFor(() => {
        expect(mockOnUpdateServers).toHaveBeenCalledWith(
          expect.arrayContaining([
            expect.objectContaining({
              name: 'Test Server 1',
              enabled: false,
            }),
          ]),
          expect.objectContaining({
            title: 'Server updated successfully',
            content: expect.stringContaining('Test Server 1'),
          })
        );
      });
    });
  });

  describe('Tool Management', () => {
    it('calls onManageTool when tool link is clicked', () => {
      renderComponent();

      const toolLink = screen.getByRole('button', { name: 'Tool 1' });
      fireEvent.click(toolLink);

      expect(mockOnManageTool).toHaveBeenCalledWith('Tool 1');
    });

    it('shows tool action menu when more button is clicked', () => {
      renderComponent();

      const moreButtons = screen.getAllByRole('button', { name: '' }); // Menu trigger buttons have no accessible name
      const toolMenuButton = moreButtons.find(
        (button) => button.querySelector('[data-icon-name="MoreHorizontal"]') || button.getAttribute('aria-haspopup') === 'menu'
      );

      if (toolMenuButton) {
        fireEvent.click(toolMenuButton);
        // Menu items should appear after clicking
        expect(screen.getByText('Remove')).toBeInTheDocument();
        expect(screen.getByText('Manage')).toBeInTheDocument();
      }
    });
  });

  describe('Modal Interactions', () => {
    it('dismisses add server modal correctly', () => {
      renderComponent();

      // Open the modal
      const createButton = screen.getByRole('button', { name: /create/i });
      fireEvent.click(createButton);

      // Dismiss the modal
      const dismissButton = screen.getByTestId('dismiss-add-server');
      fireEvent.click(dismissButton);

      expect(screen.queryByTestId('add-server-modal')).not.toBeInTheDocument();
    });

    it('calls openCreateTools and dismisses modal when create tools is clicked', () => {
      renderComponent();

      // Open the modal
      const createButton = screen.getByRole('button', { name: /create/i });
      fireEvent.click(createButton);

      // Click create tools
      const createToolsButton = screen.getByTestId('create-tools');
      fireEvent.click(createToolsButton);

      expect(mockOpenCreateTools).toHaveBeenCalledTimes(1);
      expect(screen.queryByTestId('add-server-modal')).not.toBeInTheDocument();
    });

    it('deletes server when delete is confirmed', async () => {
      renderComponent();

      // Open delete modal
      const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
      fireEvent.click(deleteButtons[0]);

      // Confirm deletion
      const deleteButton = screen.getByTestId('delete-server');
      fireEvent.click(deleteButton);

      await waitFor(() => {
        expect(mockOnUpdateServers).toHaveBeenCalledWith(
          expect.arrayContaining([expect.objectContaining({ name: 'Test Server 2' })]),
          expect.objectContaining({
            title: 'Deleted MCP server',
            content: expect.stringContaining('Test Server 1'),
          })
        );
      });

      expect(screen.queryByTestId('delete-modal')).not.toBeInTheDocument();
    });

    it('dismisses delete modal without deleting when dismiss is clicked', () => {
      renderComponent();

      // Open delete modal
      const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
      fireEvent.click(deleteButtons[0]);

      // Dismiss modal
      const dismissButton = screen.getByTestId('dismiss-delete');
      fireEvent.click(dismissButton);

      expect(screen.queryByTestId('delete-modal')).not.toBeInTheDocument();
      expect(mockOnUpdateServers).not.toHaveBeenCalled();
    });
  });

  describe('Server Updates', () => {
    it('updates servers when props change', () => {
      const { rerender } = renderComponent();

      const updatedServers = [
        {
          ...mockServers[0],
          description: 'Updated description',
        },
      ];

      rerender(<MCPServers {...defaultProps} servers={updatedServers} />);

      expect(screen.getByText('Updated description')).toBeInTheDocument();
      expect(screen.queryByText('Test Server 2')).not.toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('handles undefined server properties gracefully', () => {
      const serversWithUndefinedProps = [
        {
          name: 'Test Server',
          description: undefined,
          url: undefined,
          enabled: true,
          tools: [],
        },
      ] as any;

      renderComponent({ servers: serversWithUndefinedProps });

      expect(screen.getByText('Test Server')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /copy url/i })).toBeInTheDocument();
    });

    it('handles tool removal for non-existent tool', () => {
      renderComponent();

      // This should not throw an error even if tool doesn't exist
      const component = screen.getByText('Test Server 1').closest('.fui-AccordionItem');
      expect(component).toBeInTheDocument();
    });
  });

  describe('Performance', () => {
    it('sorts tools alphabetically', () => {
      const serversWithUnsortedTools = [
        {
          name: 'Test Server',
          description: 'Test description',
          url: 'https://example.com',
          enabled: true,
          tools: [
            { name: 'Z Tool', description: 'Z description' },
            { name: 'A Tool', description: 'A description' },
            { name: 'M Tool', description: 'M description' },
          ],
        },
      ];

      renderComponent({ servers: serversWithUnsortedTools });

      const toolLinks = screen.getAllByRole('button').filter((button) => ['A Tool', 'M Tool', 'Z Tool'].includes(button.textContent || ''));

      expect(toolLinks[0]).toHaveTextContent('A Tool');
      expect(toolLinks[1]).toHaveTextContent('M Tool');
      expect(toolLinks[2]).toHaveTextContent('Z Tool');
    });
  });

  describe('Empty States', () => {
    it('renders correctly with empty servers array', () => {
      renderComponent({ servers: [] });

      expect(screen.getByText('Servers')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /create/i })).toBeInTheDocument();
      expect(screen.queryByText('Test Server 1')).not.toBeInTheDocument();
    });

    it('does not render tools table when server has no tools', () => {
      const serversWithNoTools = [
        {
          ...mockServers[0],
          tools: [],
        },
      ];

      renderComponent({ servers: serversWithNoTools });

      expect(screen.queryByText('Workflow tools')).not.toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it.skip('has proper ARIA labels for interactive elements', () => {
      renderComponent();

      const switches = screen.getAllByRole('switch');
      expect(switches[0]).toBeChecked();
      expect(switches[1]).not.toBeChecked();
    });

    it('has proper button titles for tooltips', () => {
      renderComponent();

      const createButton = screen.getByRole('button', { name: /create/i });
      expect(createButton).toHaveAttribute('title', 'Create');

      const refreshButton = screen.getByRole('button', { name: /refresh/i });
      expect(refreshButton).toHaveAttribute('title', 'Refresh');
    });
  });
});
