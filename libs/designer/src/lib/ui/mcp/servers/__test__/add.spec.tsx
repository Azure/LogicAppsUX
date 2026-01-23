/**
 * @vitest-environment jsdom
 */
import { describe, vi, expect, it, beforeEach } from 'vitest';
// biome-ignore lint/correctness/noUnusedImports: using react for render
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { IntlProvider } from 'react-intl';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AddServerButtons } from '../add';
import { InitResourceService } from '@microsoft/logic-apps-shared';
import { getReactQueryClient } from '../../../../core';

// Mock the queries
const mockUseMcpEligibleWorkflows = vi.fn();
vi.mock('../../../core/mcp/utils/queries', () => ({
  useMcpEligibleWorkflows: mockUseMcpEligibleWorkflows,
}));

// Mock EmptyWorkflowsModal
vi.mock('../modals', () => ({
  EmptyWorkflowsModal: ({ onDismiss }: { onDismiss: () => void }) => (
    <div data-testid="empty-workflows-modal">
      <button onClick={onDismiss}>Close</button>
    </div>
  ),
}));

const setupServiceForWorkflows = (data: any[]) => {
  InitResourceService({
    listWorkflowsInApp: () => Promise.resolve(data),
  } as any);
};

describe('AddServerButtons - Simple Tests', () => {
  let queryClient: QueryClient;
  const defaultProps = {
    onCreateTools: vi.fn(),
    onUseExisting: vi.fn(),
  };

  const renderComponent = (props = {}) => {
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
          <IntlProvider locale="en">
            <AddServerButtons {...defaultProps} {...props} />
          </IntlProvider>
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

    // Default mock response
    mockUseMcpEligibleWorkflows.mockReturnValue({
      data: [{ id: '1', name: 'Test Workflow' }],
      isLoading: false,
    });
  });

  describe('Basic Rendering', () => {
    it('renders both cards with correct titles', () => {
      renderComponent();

      expect(screen.getByText('Use existing workflow tools')).toBeInTheDocument();
      expect(screen.getByText('Create new workflow tools')).toBeInTheDocument();
    });

    it('renders with proper descriptions', () => {
      renderComponent();

      expect(screen.getByText('Select from workflows already existing in this logic app.')).toBeInTheDocument();
      expect(screen.getByText('Create tools that run connector actions so your server can perform tasks.')).toBeInTheDocument();
    });

    it('renders cards as group elements', () => {
      renderComponent();

      const cards = screen.getAllByRole('group');
      expect(cards).toHaveLength(2);
    });

    it('renders checkboxes for card selection', () => {
      renderComponent();

      const checkboxes = screen.getAllByRole('checkbox');
      expect(checkboxes).toHaveLength(2);
    });
  });

  describe('Loading States', () => {
    beforeEach(() => {
      vi.clearAllMocks();
      getReactQueryClient().clear();
    });

    it('disables existing workflows card when loading', () => {
      mockUseMcpEligibleWorkflows.mockReturnValue({
        data: [],
        isLoading: true,
      });

      renderComponent();

      const existingCard = screen.getByText('Use existing workflow tools').closest('[role="group"]');
      expect(existingCard).toHaveAttribute('aria-disabled', 'true');
    });

    it('enables cards when not loading', async () => {
      setupServiceForWorkflows([{ triggers: { Request: { type: 'Request' } }, name: 'Test' }]);

      renderComponent();

      const existingCard = screen.getByText('Use existing workflow tools').closest('[role="group"]');

      await waitFor(() => {
        expect(existingCard).not.toHaveAttribute('aria-disabled', 'true');
      });
    });
  });

  describe('Component Structure', () => {
    it('has proper accessibility labels on checkboxes', () => {
      renderComponent();

      const checkboxes = screen.getAllByRole('checkbox');
      checkboxes.forEach((checkbox) => {
        expect(checkbox).toHaveAccessibleName();
      });
    });
  });

  describe('Error Handling', () => {
    it('handles query error gracefully', () => {
      mockUseMcpEligibleWorkflows.mockReturnValue({
        data: undefined,
        isLoading: false,
        error: new Error('Query failed'),
      });

      expect(() => renderComponent()).not.toThrow();
    });

    it('handles undefined workflow data', () => {
      mockUseMcpEligibleWorkflows.mockReturnValue({
        data: undefined,
        isLoading: false,
      });

      expect(() => renderComponent()).not.toThrow();
    });

    it('handles empty workflow data', () => {
      mockUseMcpEligibleWorkflows.mockReturnValue({
        data: [],
        isLoading: false,
      });

      expect(() => renderComponent()).not.toThrow();
    });
  });
});
