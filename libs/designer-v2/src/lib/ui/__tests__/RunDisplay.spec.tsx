import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Provider } from 'react-redux';
import { configureStore, type EnhancedStore } from '@reduxjs/toolkit';
import { RunDisplay } from '../RunDisplay';
import * as PanelSelectors from '../../core/state/panel/panelSelectors';
import * as WorkflowSelectors from '../../core/state/workflow/workflowSelectors';
import * as RunsQueries from '../../core/queries/runs';
import { setRunHistoryCollapsed } from '../../core/state/panel/panelSlice';

// Mock dependencies
vi.mock('../../core/state/panel/panelSelectors', async (importOriginal) => {
  const original = (await importOriginal()) as object;
  return {
    ...original,
    useIsRunHistoryCollapsed: vi.fn(),
  };
});

vi.mock('../../core/state/workflow/workflowSelectors', async (importOriginal) => {
  const original = (await importOriginal()) as object;
  return {
    ...original,
    useRunInstance: vi.fn(),
  };
});

vi.mock('../../core/queries/runs', async (importOriginal) => {
  const original = (await importOriginal()) as object;
  return {
    ...original,
    useRun: vi.fn(),
  };
});

vi.mock('../../core/state/panel/panelSlice', async (importOriginal) => {
  const original = (await importOriginal()) as object;
  return {
    ...original,
    setRunHistoryCollapsed: vi.fn().mockReturnValue({ type: 'panel/setRunHistoryCollapsed', payload: false }),
  };
});

// Mock RunHistoryEntryInfo to simplify testing
vi.mock('../panel', () => ({
  RunHistoryEntryInfo: ({ run }: { run: any }) => (
    <div data-testid="run-history-entry-info">
      <span>Run ID: {run.id}</span>
      <span>Status: {run.properties?.status}</span>
    </div>
  ),
}));

describe('RunDisplay', () => {
  let queryClient: QueryClient;
  let mockStore: EnhancedStore;
  let mockDispatch: Mock;

  const mockRunData = {
    id: 'test-run-123',
    name: 'test-run',
    properties: {
      status: 'Succeeded',
      startTime: '2024-01-15T10:00:00Z',
      endTime: '2024-01-15T10:05:00Z',
    },
  };

  const mockRunInstance = {
    id: 'test-run-123',
    name: 'test-run',
  };

  const createMockStore = () => {
    return configureStore({
      reducer: {
        panel: (state = { runHistoryCollapsed: false }) => state,
        workflow: (state = { runInstance: null }) => state,
      },
      preloadedState: {
        panel: { runHistoryCollapsed: false },
        workflow: { runInstance: null },
      },
    });
  };

  beforeEach(() => {
    vi.clearAllMocks();

    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });

    mockStore = createMockStore();
    mockDispatch = vi.fn();
    vi.spyOn(mockStore, 'dispatch').mockImplementation(mockDispatch);

    // Default mock returns
    (PanelSelectors.useIsRunHistoryCollapsed as Mock).mockReturnValue(false);
    (WorkflowSelectors.useRunInstance as Mock).mockReturnValue(null);
    (RunsQueries.useRun as Mock).mockReturnValue({ data: null });
  });

  const renderWithProviders = () => {
    return render(
      <Provider store={mockStore}>
        <QueryClientProvider client={queryClient}>
          <IntlProvider locale="en" defaultLocale="en">
            <RunDisplay />
          </IntlProvider>
        </QueryClientProvider>
      </Provider>
    );
  };

  describe('Rendering', () => {
    it('should return null when no runData and not collapsed', () => {
      (PanelSelectors.useIsRunHistoryCollapsed as Mock).mockReturnValue(false);
      (RunsQueries.useRun as Mock).mockReturnValue({ data: null });

      const { container } = renderWithProviders();

      expect(container.firstChild).toBeNull();
    });

    it('should render expand button when run history is collapsed', () => {
      (PanelSelectors.useIsRunHistoryCollapsed as Mock).mockReturnValue(true);
      (RunsQueries.useRun as Mock).mockReturnValue({ data: null });

      renderWithProviders();

      const expandButton = screen.getByRole('button');
      expect(expandButton).toBeInTheDocument();
    });

    it('should render run history entry info when runData is available', () => {
      (PanelSelectors.useIsRunHistoryCollapsed as Mock).mockReturnValue(false);
      (WorkflowSelectors.useRunInstance as Mock).mockReturnValue(mockRunInstance);
      (RunsQueries.useRun as Mock).mockReturnValue({ data: mockRunData });

      renderWithProviders();

      expect(screen.getByTestId('run-history-entry-info')).toBeInTheDocument();
      expect(screen.getByText('Run ID: test-run-123')).toBeInTheDocument();
      expect(screen.getByText('Status: Succeeded')).toBeInTheDocument();
    });

    it('should render both expand button and run info when collapsed with runData', () => {
      (PanelSelectors.useIsRunHistoryCollapsed as Mock).mockReturnValue(true);
      (WorkflowSelectors.useRunInstance as Mock).mockReturnValue(mockRunInstance);
      (RunsQueries.useRun as Mock).mockReturnValue({ data: mockRunData });

      renderWithProviders();

      expect(screen.getByRole('button')).toBeInTheDocument();
      expect(screen.getByTestId('run-history-entry-info')).toBeInTheDocument();
    });
  });

  describe('Expand Button Interaction', () => {
    it('should dispatch setRunHistoryCollapsed(false) when expand button is clicked', () => {
      (PanelSelectors.useIsRunHistoryCollapsed as Mock).mockReturnValue(true);
      (RunsQueries.useRun as Mock).mockReturnValue({ data: null });

      renderWithProviders();

      const expandButton = screen.getByRole('button');
      fireEvent.click(expandButton);

      expect(setRunHistoryCollapsed).toHaveBeenCalledWith(false);
      expect(mockDispatch).toHaveBeenCalled();
    });
  });

  describe('Hook Usage', () => {
    it('should call useRunInstance hook', () => {
      renderWithProviders();

      expect(WorkflowSelectors.useRunInstance).toHaveBeenCalled();
    });

    it('should call useRun with the selected run id', () => {
      (WorkflowSelectors.useRunInstance as Mock).mockReturnValue(mockRunInstance);

      renderWithProviders();

      expect(RunsQueries.useRun).toHaveBeenCalledWith('test-run-123');
    });

    it('should call useRun with undefined when no run instance', () => {
      (WorkflowSelectors.useRunInstance as Mock).mockReturnValue(null);

      renderWithProviders();

      expect(RunsQueries.useRun).toHaveBeenCalledWith(undefined);
    });

    it('should call useIsRunHistoryCollapsed hook', () => {
      renderWithProviders();

      expect(PanelSelectors.useIsRunHistoryCollapsed).toHaveBeenCalled();
    });
  });

  describe('Conditional Rendering States', () => {
    it('should not render expand button when not collapsed', () => {
      (PanelSelectors.useIsRunHistoryCollapsed as Mock).mockReturnValue(false);
      (WorkflowSelectors.useRunInstance as Mock).mockReturnValue(mockRunInstance);
      (RunsQueries.useRun as Mock).mockReturnValue({ data: mockRunData });

      renderWithProviders();

      // Should have the run info but no expand button
      expect(screen.getByTestId('run-history-entry-info')).toBeInTheDocument();
      expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });

    it('should render component when collapsed even without run data', () => {
      (PanelSelectors.useIsRunHistoryCollapsed as Mock).mockReturnValue(true);
      (RunsQueries.useRun as Mock).mockReturnValue({ data: null });

      const { container } = renderWithProviders();

      // Should not return null, should render the expand button
      expect(container.firstChild).not.toBeNull();
      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('should not render Card when no runData', () => {
      (PanelSelectors.useIsRunHistoryCollapsed as Mock).mockReturnValue(true);
      (RunsQueries.useRun as Mock).mockReturnValue({ data: null });

      renderWithProviders();

      expect(screen.queryByTestId('run-history-entry-info')).not.toBeInTheDocument();
    });
  });

  describe('Different Run Statuses', () => {
    it('should render with Running status', () => {
      const runningRunData = {
        ...mockRunData,
        properties: { ...mockRunData.properties, status: 'Running' },
      };
      (PanelSelectors.useIsRunHistoryCollapsed as Mock).mockReturnValue(false);
      (WorkflowSelectors.useRunInstance as Mock).mockReturnValue(mockRunInstance);
      (RunsQueries.useRun as Mock).mockReturnValue({ data: runningRunData });

      renderWithProviders();

      expect(screen.getByText('Status: Running')).toBeInTheDocument();
    });

    it('should render with Failed status', () => {
      const failedRunData = {
        ...mockRunData,
        properties: { ...mockRunData.properties, status: 'Failed' },
      };
      (PanelSelectors.useIsRunHistoryCollapsed as Mock).mockReturnValue(false);
      (WorkflowSelectors.useRunInstance as Mock).mockReturnValue(mockRunInstance);
      (RunsQueries.useRun as Mock).mockReturnValue({ data: failedRunData });

      renderWithProviders();

      expect(screen.getByText('Status: Failed')).toBeInTheDocument();
    });

    it('should render with Waiting status', () => {
      const waitingRunData = {
        ...mockRunData,
        properties: { ...mockRunData.properties, status: 'Waiting' },
      };
      (PanelSelectors.useIsRunHistoryCollapsed as Mock).mockReturnValue(false);
      (WorkflowSelectors.useRunInstance as Mock).mockReturnValue(mockRunInstance);
      (RunsQueries.useRun as Mock).mockReturnValue({ data: waitingRunData });

      renderWithProviders();

      expect(screen.getByText('Status: Waiting')).toBeInTheDocument();
    });
  });
});
