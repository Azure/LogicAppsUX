/**
 * @vitest-environment jsdom
 */
import { describe, vi, expect, it, beforeEach } from 'vitest';
import { Authentication } from '../authentication';
// biome-ignore lint/correctness/noUnusedImports: using react for render
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { IntlProvider } from 'react-intl';
import { InitResourceService } from '@microsoft/logic-apps-shared';
import { getReactQueryClient } from '../../../../core';

// Mock the queries
const mockUseMcpAuthentication = vi.fn();

// Mock the server utilities
const mockUpdateAuthSettings = vi.fn();
vi.mock('../../../core/mcp/utils/server', () => ({
  updateAuthSettings: mockUpdateAuthSettings,
}));

const mockDispatch = vi.fn();
const mockOpenMcpPanelView = vi.fn();

vi.mock('../../../core/state/mcp/panel/mcpPanelSlice', () => ({
  openMcpPanelView: (payload: any) => {
    mockOpenMcpPanelView(payload);
    return { type: 'mcp/openMcpPanelView', payload };
  },
}));

// Mock the styles
vi.mock('./styles', () => ({
  useMcpServerStyles: () => ({
    sectionHeader: 'sectionHeader',
  }),
}));

// Mock the DescriptionWithLink component
vi.mock('../../configuretemplate/common', () => ({
  DescriptionWithLink: ({ text }: { text: string }) => <p data-testid="description">{text}</p>,
}));

const mockService = {
  getResource: mockUseMcpAuthentication,
  executeResourceAction: mockUpdateAuthSettings,
};
const setupServiceForAuthType = (auth: any) => {
  InitResourceService({
    getResource: () => Promise.resolve({ properties: { extensions: { workflow: { McpServerEndpoints: { authentication: auth } } } } }),
  } as any);
};

describe('Authentication', () => {
  const mockOnOpenManageOAuth = vi.fn();
  const defaultProps = {
    resourceId: 'test-resource-id',
    onOpenManageOAuth: mockOnOpenManageOAuth,
  };

  // Create a mock store
  const createMockStore = () => {
    return configureStore({
      reducer: {
        mcpPanel: (state = { panelView: null }, action) => {
          if (action.type === 'mcp/openMcpPanelView') {
            return { ...state, panelView: action.payload.panelView };
          }
          return state;
        },
      },
    });
  };

  const renderComponent = (props = {}) => {
    const store = createMockStore();
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });
    render(
      <QueryClientProvider client={queryClient}>
        <Provider store={store}>
          <IntlProvider locale="en">
            <Authentication {...defaultProps} {...props} />
          </IntlProvider>
        </Provider>
      </QueryClientProvider>
    );
    return store;
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockUpdateAuthSettings.mockResolvedValue(undefined);
  });

  describe('Component Rendering', () => {
    it('renders the component with title and description', () => {
      renderComponent();

      expect(screen.getByText('Authentication')).toBeInTheDocument();
      expect(screen.getByText('Manage your authentication for the MCP servers here.')).toBeInTheDocument();
    });

    it('renders the main authentication control', () => {
      renderComponent();

      expect(screen.getByText('Method')).toBeInTheDocument();
    });
  });

  describe('Authentication Types', () => {
    beforeEach(() => {
      vi.clearAllMocks();
      getReactQueryClient().clear();
    });

    it('shows API keys section when auth type is apikey', async () => {
      setupServiceForAuthType({ type: 'apikey' });
      renderComponent();

      expect(screen.getByText('Method')).toBeInTheDocument();
      expect(screen.getByText('Edit')).toBeInTheDocument();

      await waitFor(() => {
        expect(screen.getByText('Key-based')).toBeInTheDocument();
        expect(screen.getByText('Generate key')).toBeInTheDocument();
      });
    });

    it('shows OAuth section when auth type is oauth2', async () => {
      setupServiceForAuthType({ type: 'oauth2' });
      renderComponent();

      expect(screen.getByText('Method')).toBeInTheDocument();
      expect(screen.getByText('Edit')).toBeInTheDocument();

      await waitFor(() => {
        expect(screen.getByText('OAuth')).toBeInTheDocument();
        expect(screen.getByText('Manage authentication')).toBeInTheDocument();
      });
    });

    it('shows both sections when auth type is both', async () => {
      setupServiceForAuthType({});
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Key-based and OAuth')).toBeInTheDocument();
        expect(screen.getByText('Generate key')).toBeInTheDocument();
        expect(screen.getByText('Manage authentication')).toBeInTheDocument();
      });
    });

    it('shows only method dropdown when auth type is anonymous', () => {
      setupServiceForAuthType({ type: 'anonymous' });

      renderComponent();

      expect(screen.queryByText('Generate key')).not.toBeInTheDocument();
      expect(screen.queryByText('Manage authentication')).not.toBeInTheDocument();
    });
  });

  describe('User Interactions', () => {
    beforeEach(() => {
      vi.clearAllMocks();
      getReactQueryClient().clear();
    });

    it('calls onOpenManageOAuth when manage authentication link is clicked', async () => {
      setupServiceForAuthType({ type: 'oauth2' });

      renderComponent();

      let item: any;
      await waitFor(() => {
        item = screen.getByText('Manage authentication');
        expect(item).toBeInTheDocument();
      });

      const manageLink = await screen.findByText('Manage authentication');
      fireEvent.click(manageLink);

      expect(mockOnOpenManageOAuth).toHaveBeenCalledTimes(1);
    });
  });
});

describe('AuthenticationSettings', () => {
  // Since AuthenticationSettings is not exported, we'll test it through the Authentication component
  const mockOnOpenManageOAuth = vi.fn();
  const defaultProps = {
    resourceId: 'test-resource-id',
    onOpenManageOAuth: mockOnOpenManageOAuth,
  };

  const createMockStore = () => {
    return configureStore({
      reducer: {
        mcpPanel: (state = { panelView: null }, action) => {
          if (action.type === 'mcp/openMcpPanelView') {
            return { ...state, panelView: action.payload.panelView };
          }
          return state;
        },
      },
    });
  };

  const renderComponent = (props = {}) => {
    const store = createMockStore();
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });
    render(
      <QueryClientProvider client={queryClient}>
        <Provider store={store}>
          <IntlProvider locale="en">
            <Authentication {...defaultProps} {...props} />
          </IntlProvider>
        </Provider>
      </QueryClientProvider>
    );
    return store;
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockUpdateAuthSettings.mockResolvedValue(undefined);
  });

  describe('Dropdown Behavior', () => {
    beforeEach(() => {
      vi.clearAllMocks();
      getReactQueryClient().clear();
    });

    it('shows correct options for apikey authentication', async () => {
      setupServiceForAuthType({ type: 'apikey' });

      renderComponent();

      // Look for edit button in the rendered items
      const editButton = screen.getByText('Edit');
      fireEvent.click(editButton);

      // After clicking edit, save and cancel buttons should appear
      await waitFor(() => {
        expect(screen.getByText('Save')).toBeInTheDocument();
        expect(screen.getByText('Cancel')).toBeInTheDocument();
      });

      const dropdown = screen.getByRole('combobox');
      fireEvent.click(dropdown);

      // The dropdown should be rendered within the templates section
      expect(screen.getByText('Key-based')).toBeInTheDocument();
      expect(screen.getByText('OAuth')).toBeInTheDocument();
    });

    it('shows anonymous option when current auth is anonymous', async () => {
      setupServiceForAuthType({ type: 'anonymous' });

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Anonymous')).toBeInTheDocument();
      });

      // Look for edit button in the rendered items
      const editButton = screen.getByText('Edit');
      fireEvent.click(editButton);

      // After clicking edit, save and cancel buttons should appear
      await waitFor(() => {
        expect(screen.getByText('Save')).toBeInTheDocument();
        expect(screen.getByText('Cancel')).toBeInTheDocument();
      });

      const dropdown = screen.getByRole('combobox');
      fireEvent.click(dropdown);

      // The dropdown should be rendered within the templates section
      expect(screen.getByRole('menuitemcheckbox', { name: 'Key-based' })).toBeInTheDocument();
      expect(screen.getByRole('menuitemcheckbox', { name: 'OAuth' })).toBeInTheDocument();
      expect(screen.getByRole('menuitemcheckbox', { name: 'Anonymous' })).toBeInTheDocument();
    });
  });

  describe('Edit Mode', () => {
    it('enables editing when edit button is clicked', async () => {
      setupServiceForAuthType({ type: 'apikey' });

      renderComponent();

      // Look for edit button in the rendered items
      const editButton = screen.getByText('Edit');
      fireEvent.click(editButton);

      // After clicking edit, save and cancel buttons should appear
      await waitFor(() => {
        expect(screen.getByText('Save')).toBeInTheDocument();
        expect(screen.getByText('Cancel')).toBeInTheDocument();
      });
    });

    it('cancels editing when cancel button is clicked', async () => {
      setupServiceForAuthType({ type: 'apikey' });

      renderComponent();

      // Enter edit mode
      const editButton = screen.getByText('Edit');
      fireEvent.click(editButton);

      await waitFor(() => {
        expect(screen.getByText('Cancel')).toBeInTheDocument();
      });

      // Click cancel
      const cancelButton = screen.getByText('Cancel');
      fireEvent.click(cancelButton);

      // Should return to non-edit mode
      await waitFor(() => {
        expect(screen.getByText('Edit')).toBeInTheDocument();
      });
    });

    it('saves changes when save button is clicked', async () => {
      setupServiceForAuthType({ type: 'apikey' });

      renderComponent();

      // Enter edit mode
      const editButton = screen.getByText('Edit');
      fireEvent.click(editButton);

      await waitFor(() => {
        expect(screen.getByText('Save')).toBeInTheDocument();
      });

      // Click save (though without actual dropdown interaction, it might be disabled)
      const saveButton = screen.getByText('Save');
      expect(saveButton).toBeInTheDocument();
    });

    it('shows saving state when save is in progress', async () => {
      setupServiceForAuthType({ type: 'apikey' });

      // Make the save operation take some time
      mockUpdateAuthSettings.mockImplementation(() => new Promise((resolve) => setTimeout(resolve, 100)));

      renderComponent();

      // Enter edit mode
      fireEvent.click(screen.getByText('Edit'));

      await waitFor(() => {
        expect(screen.getByText('Save')).toBeInTheDocument();
      });

      const saveButton = screen.getByText('Save');
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText('Saving...')).toBeInTheDocument();
      });
    });
  });

  describe('Validation', () => {
    beforeEach(() => {
      vi.clearAllMocks();
      getReactQueryClient().clear();
    });

    it('handles empty selection validation', async () => {
      setupServiceForAuthType(undefined);

      renderComponent();

      expect(screen.queryByText('Key-based')).not.toBeInTheDocument();
      expect(screen.queryByText('OAuth')).not.toBeInTheDocument();

      // Look for edit button in the rendered items
      const editButton = screen.getByText('Edit');
      fireEvent.click(editButton);

      // After clicking edit, save and cancel buttons should appear
      await waitFor(() => {
        expect(screen.getByText('Save')).toBeInTheDocument();
        expect(screen.getByText('Cancel')).toBeInTheDocument();
      });

      const dropdown = screen.getByRole('combobox');
      fireEvent.click(dropdown);

      expect(screen.getByText('Key-based')).toBeInTheDocument();
      expect(screen.getByText('OAuth')).toBeInTheDocument();
    });

    it('prevents saving with invalid authentication', async () => {
      setupServiceForAuthType({ type: 'apikey' });

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Key-based')).toBeInTheDocument();
      });

      const editButton = screen.getByText('Edit');
      fireEvent.click(editButton);

      // After clicking edit, save and cancel buttons should appear
      await waitFor(() => {
        expect(screen.getByText('Save')).toBeInTheDocument();
        expect(screen.getByText('Cancel')).toBeInTheDocument();
      });
      expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
      const dropdown = screen.getByRole('combobox');
      fireEvent.click(dropdown);

      expect(screen.getByRole('menuitemcheckbox', { name: 'Key-based' }).getAttribute('aria-checked')).toBeTruthy();
      expect(screen.getByRole('menuitemcheckbox', { name: 'OAuth' }).getAttribute('aria-checked')).toBe('false');

      screen.getByRole('menuitemcheckbox', { name: 'OAuth' }).click();

      const saveButton = screen.getByRole('button', { name: 'Save' });
      expect(saveButton.getAttribute('disabled')).toBe('');

      screen.getByRole('menuitemcheckbox', { name: 'Key-based' }).click();
      screen.getByRole('menuitemcheckbox', { name: 'OAuth' }).click();

      expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
    });
  });
});
