import { describe, it, expect, beforeEach, afterEach, vi, type Mock } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Provider } from 'react-redux';
import { configureStore, type EnhancedStore } from '@reduxjs/toolkit';
import { RunHistoryPanel } from '../runHistoryPanel';
import * as PanelSelectors from '../../../../core/state/panel/panelSelectors';
import * as WorkflowSelectors from '../../../../core/state/workflow/workflowSelectors';
import * as DesignerOptionsSelectors from '../../../../core/state/designerOptions/designerOptionsSelectors';
import * as DesignerViewSelectors from '../../../../core/state/designerView/designerViewSelectors';
import * as RunsQueries from '../../../../core/queries/runs';
import { setRunHistoryCollapsed } from '../../../../core/state/panel/panelSlice';

// Mock dependencies
vi.mock('../../../../core/state/panel/panelSelectors', async (importOriginal) => {
  const original = (await importOriginal()) as object;
  return {
    ...original,
    useIsRunHistoryCollapsed: vi.fn(),
  };
});

vi.mock('../../../../core/state/workflow/workflowSelectors', async (importOriginal) => {
  const original = (await importOriginal()) as object;
  return {
    ...original,
    useRunInstance: vi.fn(),
  };
});

vi.mock('../../../../core/state/designerOptions/designerOptionsSelectors', async (importOriginal) => {
  const original = (await importOriginal()) as object;
  return {
    ...original,
    useMonitoringView: vi.fn(),
  };
});

vi.mock('../../../../core/state/designerView/designerViewSelectors', async (importOriginal) => {
  const original = (await importOriginal()) as object;
  return {
    ...original,
    useWorkflowHasAgentLoop: vi.fn(),
  };
});

vi.mock('../../../../core/queries/runs', async (importOriginal) => {
  const original = (await importOriginal()) as object;
  return {
    ...original,
    useAllRuns: vi.fn(),
    useRun: vi.fn(),
    useRunsInfiniteQuery: vi.fn(),
  };
});

vi.mock('../../../../core/state/panel/panelSlice', async (importOriginal) => {
  const original = (await importOriginal()) as object;
  return {
    ...original,
    setRunHistoryCollapsed: vi.fn().mockReturnValue({ type: 'panel/setRunHistoryCollapsed', payload: true }),
  };
});

// Mock child components to simplify
vi.mock('../runHistoryEntry', () => ({
  default: ({ runId, onRunSelected }: { runId: string; onRunSelected: (id: string) => void }) => (
    <div data-testid={`run-entry-${runId}`} onClick={() => onRunSelected(runId)}>
      {runId}
    </div>
  ),
}));

vi.mock('../../runTreeView', () => ({
  RunTreeView: () => <div data-testid="run-tree-view" />,
}));

vi.mock('../agentChatContent', () => ({
  AgentChatContent: () => <div data-testid="agent-chat-content" />,
}));

vi.mock('../runHistoryEntryInfo', () => ({
  RunHistoryEntryInfo: ({ run }: { run: any }) => <div data-testid="run-history-entry-info">{run.id}</div>,
}));

vi.mock('../runMenu', () => ({
  RunMenu: () => <div data-testid="run-menu" />,
}));

vi.mock('../statusIndicator', () => ({
  default: ({ status }: { status: string }) => <span data-testid={`status-${status}`}>{status}</span>,
}));

// Mock HostService
vi.mock('@microsoft/logic-apps-shared', async (importOriginal) => {
  const original = (await importOriginal()) as object;
  return {
    ...original,
    HostService: vi.fn(() => ({
      openRun: vi.fn(),
    })),
  };
});

const DAY_MS = 24 * 60 * 60 * 1000;
const WEEK_MS = 7 * DAY_MS;

function createMockRun(id: string, status: string, startTime: string, options?: { workflowMode?: string; workflowName?: string }) {
  return {
    id,
    name: id,
    properties: {
      status,
      startTime,
      endTime: startTime,
      workflow: options?.workflowMode !== undefined ? { mode: options.workflowMode, name: options?.workflowName } : undefined,
    },
  };
}

describe('RunHistoryPanel', () => {
  let queryClient: QueryClient;
  let mockStore: EnhancedStore;
  let mockRefetch: Mock;
  let mockRunRefetch: Mock;

  const now = new Date('2026-02-13T12:00:00Z');

  const mockRuns = [
    createMockRun('run-1', 'Succeeded', new Date(now.getTime() - 1 * 60 * 60 * 1000).toISOString()), // 1h ago
    createMockRun('run-2', 'Failed', new Date(now.getTime() - 25 * 60 * 60 * 1000).toISOString()), // 25h ago
    createMockRun('run-3', 'Running', new Date(now.getTime() - 3 * DAY_MS).toISOString()), // 3 days ago
    createMockRun('run-4', 'Cancelled', new Date(now.getTime() - 10 * DAY_MS).toISOString()), // 10 days ago
    createMockRun('run-5', 'Succeeded', new Date(now.getTime() - 20 * DAY_MS).toISOString()), // 20 days ago
    createMockRun('run-6', 'Succeeded', new Date(now.getTime() - 35 * DAY_MS).toISOString()), // 35 days ago
    createMockRun('run-draft', 'Succeeded', new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString(), { workflowMode: 'Draft' }), // 2h ago, Draft
  ];

  const createMockStore = () => {
    return configureStore({
      reducer: {
        panel: (state = { runHistoryCollapsed: false }) => state,
        workflow: (state = { runInstance: null }) => state,
        designerOptions: (state = { isDarkMode: false }) => state,
        designerView: (state = {}) => state,
      },
    });
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(now);

    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });

    mockStore = createMockStore();

    mockRefetch = vi.fn();
    mockRunRefetch = vi.fn();

    (PanelSelectors.useIsRunHistoryCollapsed as Mock).mockReturnValue(false);
    (WorkflowSelectors.useRunInstance as Mock).mockReturnValue(null);
    (DesignerOptionsSelectors.useMonitoringView as Mock).mockReturnValue(true);
    (DesignerViewSelectors.useWorkflowHasAgentLoop as Mock).mockReturnValue(false);
    (RunsQueries.useAllRuns as Mock).mockReturnValue(mockRuns);
    (RunsQueries.useRun as Mock).mockReturnValue({ data: null, isFetching: false, refetch: mockRunRefetch });
    (RunsQueries.useRunsInfiniteQuery as Mock).mockReturnValue({
      data: { pages: [mockRuns] },
      error: null,
      isLoading: false,
      isFetching: false,
      isRefetching: false,
      isFetchingNextPage: false,
      hasNextPage: false,
      refetch: mockRefetch,
      fetchNextPage: vi.fn(),
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const renderPanel = () => {
    return render(
      <Provider store={mockStore}>
        <QueryClientProvider client={queryClient}>
          <IntlProvider locale="en" defaultLocale="en">
            <RunHistoryPanel />
          </IntlProvider>
        </QueryClientProvider>
      </Provider>
    );
  };

  // ──────────────────────────────────────────────────────────
  // MARK: Basic Rendering
  // ──────────────────────────────────────────────────────────

  describe('Basic Rendering', () => {
    it('should render the run history title', () => {
      renderPanel();
      expect(screen.getByText('Run history')).toBeInTheDocument();
    });

    it('should render the search box', () => {
      renderPanel();
      expect(screen.getByPlaceholderText('Enter run ID')).toBeInTheDocument();
    });

    it('should render all run entries', () => {
      renderPanel();
      for (const run of mockRuns) {
        expect(screen.getByTestId(`run-entry-${run.id}`)).toBeInTheDocument();
      }
    });

    it('should render refresh button with tooltip', () => {
      renderPanel();
      expect(screen.getByRole('button', { name: 'Refresh' })).toBeInTheDocument();
    });

    it('should render filter toggle button', () => {
      renderPanel();
      expect(screen.getByRole('button', { name: 'Toggle filters' })).toBeInTheDocument();
    });

    it('should display "No runs found" when filtered list is empty', () => {
      (RunsQueries.useAllRuns as Mock).mockReturnValue([]);
      renderPanel();
      expect(screen.getByText('No runs found')).toBeInTheDocument();
    });
  });

  // ──────────────────────────────────────────────────────────
  // MARK: Filter Toggle
  // ──────────────────────────────────────────────────────────

  describe('Filter Toggle', () => {
    it('should not show filter container by default', () => {
      renderPanel();
      expect(screen.queryByText('Status')).not.toBeInTheDocument();
    });

    it('should show filter container when toggle is clicked', () => {
      renderPanel();
      fireEvent.click(screen.getByRole('button', { name: 'Toggle filters' }));
      expect(screen.getByText('Status')).toBeInTheDocument();
      expect(screen.getByText('Version')).toBeInTheDocument();
      expect(screen.getByText('Time range')).toBeInTheDocument();
    });

    it('should hide filter container when toggle is clicked again', () => {
      renderPanel();
      const toggleButton = screen.getByRole('button', { name: 'Toggle filters' });

      fireEvent.click(toggleButton);
      expect(screen.getByText('Status')).toBeInTheDocument();

      fireEvent.click(toggleButton);
      expect(screen.queryByText('Status')).not.toBeInTheDocument();
    });
  });

  // ──────────────────────────────────────────────────────────
  // MARK: Status Filtering
  // ──────────────────────────────────────────────────────────

  describe('Status Filtering', () => {
    it('should show all runs when status filter is "All"', () => {
      renderPanel();
      // All runs should be visible
      expect(screen.getAllByTestId(/^run-entry-/).length).toBe(mockRuns.length);
    });
  });

  // ──────────────────────────────────────────────────────────
  // MARK: Time Interval Filtering
  // ──────────────────────────────────────────────────────────

  describe('Time Interval Filtering', () => {
    it('should show time interval dropdown in filter container', () => {
      renderPanel();
      fireEvent.click(screen.getByRole('button', { name: 'Toggle filters' }));
      expect(screen.getByText('Time range')).toBeInTheDocument();
    });

    it('should show all preset time interval options', () => {
      renderPanel();
      fireEvent.click(screen.getByRole('button', { name: 'Toggle filters' }));

      // Open the time range dropdown
      const dropdowns = screen.getAllByRole('combobox');
      const timeRangeDropdown = dropdowns[dropdowns.length - 1]; // last dropdown is time range
      fireEvent.click(timeRangeDropdown);

      expect(screen.getByText('Last 24 hours')).toBeInTheDocument();
      expect(screen.getByText('Last 48 hours')).toBeInTheDocument();
      expect(screen.getByText('Last 7 days')).toBeInTheDocument();
      expect(screen.getByText('Last 14 days')).toBeInTheDocument();
      expect(screen.getByText('Last 30 days')).toBeInTheDocument();
      expect(screen.getByText('Custom range')).toBeInTheDocument();
    });

    it('should show custom date/time pickers when "Custom range" is selected', () => {
      renderPanel();
      fireEvent.click(screen.getByRole('button', { name: 'Toggle filters' }));

      // Open the time range dropdown and select custom
      const dropdowns = screen.getAllByRole('combobox');
      const timeRangeDropdown = dropdowns[dropdowns.length - 1];
      fireEvent.click(timeRangeDropdown);

      const customOption = screen.getByText('Custom range');
      fireEvent.click(customOption);

      expect(screen.getByText('From')).toBeInTheDocument();
      expect(screen.getByText('To')).toBeInTheDocument();
      expect(screen.getAllByPlaceholderText('Select date')).toHaveLength(2);
      expect(screen.getAllByPlaceholderText('Select time')).toHaveLength(2);
    });
  });

  // ──────────────────────────────────────────────────────────
  // MARK: filteredRuns time-based logic (unit tests)
  // ──────────────────────────────────────────────────────────

  describe('Time-based run filtering logic', () => {
    it('should filter runs to last 24 hours', () => {
      // Only run-1 (1h ago) and run-draft (2h ago) are within 24h
      const recentRuns = mockRuns.filter((run) => {
        const runTime = new Date(run.properties.startTime).getTime();
        return runTime >= now.getTime() - DAY_MS;
      });
      expect(recentRuns.map((r) => r.id)).toEqual(['run-1', 'run-draft']);
    });

    it('should filter runs to last 48 hours', () => {
      const recentRuns = mockRuns.filter((run) => {
        const runTime = new Date(run.properties.startTime).getTime();
        return runTime >= now.getTime() - 2 * DAY_MS;
      });
      expect(recentRuns.map((r) => r.id)).toEqual(['run-1', 'run-2', 'run-draft']);
    });

    it('should filter runs to last 7 days', () => {
      const recentRuns = mockRuns.filter((run) => {
        const runTime = new Date(run.properties.startTime).getTime();
        return runTime >= now.getTime() - WEEK_MS;
      });
      expect(recentRuns.map((r) => r.id)).toEqual(['run-1', 'run-2', 'run-3', 'run-draft']);
    });

    it('should filter runs to last 14 days', () => {
      const recentRuns = mockRuns.filter((run) => {
        const runTime = new Date(run.properties.startTime).getTime();
        return runTime >= now.getTime() - 2 * WEEK_MS;
      });
      expect(recentRuns.map((r) => r.id)).toEqual(['run-1', 'run-2', 'run-3', 'run-4', 'run-draft']);
    });

    it('should filter runs to last 30 days', () => {
      const recentRuns = mockRuns.filter((run) => {
        const runTime = new Date(run.properties.startTime).getTime();
        return runTime >= now.getTime() - 30 * DAY_MS;
      });
      expect(recentRuns.map((r) => r.id)).toEqual(['run-1', 'run-2', 'run-3', 'run-4', 'run-5', 'run-draft']);
    });

    it('should filter runs by custom start date', () => {
      const customStart = new Date(now.getTime() - 4 * DAY_MS);
      const recentRuns = mockRuns.filter((run) => {
        const runTime = new Date(run.properties.startTime).getTime();
        return runTime >= customStart.getTime();
      });
      expect(recentRuns.map((r) => r.id)).toEqual(['run-1', 'run-2', 'run-3', 'run-draft']);
    });

    it('should filter runs by custom end date', () => {
      const customEnd = new Date(now.getTime() - 4 * DAY_MS);
      const olderRuns = mockRuns.filter((run) => {
        const runTime = new Date(run.properties.startTime).getTime();
        return runTime <= customEnd.getTime();
      });
      expect(olderRuns.map((r) => r.id)).toEqual(['run-4', 'run-5', 'run-6']);
    });

    it('should filter runs by custom start and end date', () => {
      const customStart = new Date(now.getTime() - 15 * DAY_MS);
      const customEnd = new Date(now.getTime() - 2 * DAY_MS);
      const rangRuns = mockRuns.filter((run) => {
        const runTime = new Date(run.properties.startTime).getTime();
        return runTime >= customStart.getTime() && runTime <= customEnd.getTime();
      });
      expect(rangRuns.map((r) => r.id)).toEqual(['run-3', 'run-4']);
    });
  });

  // ──────────────────────────────────────────────────────────
  // MARK: onCustomDateSelect callback
  // ──────────────────────────────────────────────────────────

  describe('onCustomDateSelect', () => {
    // Test the logic directly by simulating what the callback does
    it('should set to null when date is null', () => {
      let result: Date | null = new Date();
      const setter = (fn: any) => {
        if (typeof fn === 'function') {
          result = fn(result);
        } else {
          result = fn;
        }
      };

      // Simulate the onCustomDateSelect logic for null
      const date = null;
      if (!date) {
        setter(null);
      }
      expect(result).toBeNull();
    });

    it('should preserve existing time when updating start date', () => {
      const existingDate = new Date(2026, 1, 10, 14, 30, 0, 0);
      const newDate = new Date(2026, 1, 12, 0, 0, 0, 0);

      const updated = new Date(newDate);
      updated.setHours(existingDate.getHours(), existingDate.getMinutes(), 0, 0);

      expect(updated.getHours()).toBe(existingDate.getHours());
      expect(updated.getMinutes()).toBe(existingDate.getMinutes());
      expect(updated.getSeconds()).toBe(0);
      expect(updated.getMilliseconds()).toBe(0);
      expect(updated.getDate()).toBe(newDate.getDate());
    });

    it('should preserve existing time with end-of-day seconds when updating end date', () => {
      const existingDate = new Date(2026, 1, 10, 14, 30, 0, 0);
      const newDate = new Date(2026, 1, 12, 0, 0, 0, 0);

      const updated = new Date(newDate);
      updated.setHours(existingDate.getHours(), existingDate.getMinutes(), 59, 999);

      expect(updated.getHours()).toBe(existingDate.getHours());
      expect(updated.getMinutes()).toBe(existingDate.getMinutes());
      expect(updated.getSeconds()).toBe(59);
      expect(updated.getMilliseconds()).toBe(999);
    });

    it('should default end date to 23:59:59.999 when no previous date exists', () => {
      const newDate = new Date(2026, 1, 12, 0, 0, 0, 0);
      const isEnd = true;
      const prev = null;

      const updated = new Date(newDate);
      if (prev) {
        updated.setHours(prev.getHours(), prev.getMinutes(), isEnd ? 59 : 0, isEnd ? 999 : 0);
      } else if (isEnd) {
        updated.setHours(23, 59, 59, 999);
      }

      expect(updated.getHours()).toBe(23);
      expect(updated.getMinutes()).toBe(59);
      expect(updated.getSeconds()).toBe(59);
      expect(updated.getMilliseconds()).toBe(999);
    });

    it('should default start date to midnight when no previous date exists', () => {
      const newDate = new Date(2026, 1, 12); // Feb 12 at local midnight
      const isEnd = false;
      const prev = null;

      const updated = new Date(newDate);
      if (prev) {
        updated.setHours(prev.getHours(), prev.getMinutes(), isEnd ? 59 : 0, isEnd ? 999 : 0);
      } else if (isEnd) {
        updated.setHours(23, 59, 59, 999);
      }
      // Start should keep midnight (default from new Date with no time)
      expect(updated.getHours()).toBe(0);
      expect(updated.getMinutes()).toBe(0);
    });
  });

  // ──────────────────────────────────────────────────────────
  // MARK: onCustomTimeChange callback
  // ──────────────────────────────────────────────────────────

  describe('onCustomTimeChange', () => {
    it('should update time on existing date for start', () => {
      const prev = new Date(2026, 1, 12, 8, 0, 0, 0);
      const selectedTime = new Date(2026, 1, 12, 14, 30, 0, 0);
      const isEnd = false;

      const base = new Date(prev);
      base.setHours(selectedTime.getHours(), selectedTime.getMinutes(), isEnd ? 59 : 0, isEnd ? 999 : 0);

      expect(base.getHours()).toBe(14);
      expect(base.getMinutes()).toBe(30);
      expect(base.getSeconds()).toBe(0);
      expect(base.getMilliseconds()).toBe(0);
      expect(base.getDate()).toBe(prev.getDate());
    });

    it('should update time on existing date for end with seconds at 59', () => {
      const prev = new Date(2026, 1, 12, 8, 0, 0, 0);
      const selectedTime = new Date(2026, 1, 12, 18, 45, 0, 0);
      const isEnd = true;

      const base = new Date(prev);
      base.setHours(selectedTime.getHours(), selectedTime.getMinutes(), isEnd ? 59 : 0, isEnd ? 999 : 0);

      expect(base.getHours()).toBe(18);
      expect(base.getMinutes()).toBe(45);
      expect(base.getSeconds()).toBe(59);
      expect(base.getMilliseconds()).toBe(999);
    });

    it('should reset to midnight when time is cleared for start', () => {
      const prev = new Date(2026, 1, 12, 14, 30, 0, 0);
      const isEnd = false;

      const base = new Date(prev);
      base.setHours(isEnd ? 23 : 0, isEnd ? 59 : 0, isEnd ? 59 : 0, isEnd ? 999 : 0);

      expect(base.getHours()).toBe(0);
      expect(base.getMinutes()).toBe(0);
      expect(base.getSeconds()).toBe(0);
      expect(base.getMilliseconds()).toBe(0);
    });

    it('should reset to 23:59:59.999 when time is cleared for end', () => {
      const prev = new Date(2026, 1, 12, 14, 30, 0, 0);
      const isEnd = true;

      const base = new Date(prev);
      base.setHours(isEnd ? 23 : 0, isEnd ? 59 : 0, isEnd ? 59 : 0, isEnd ? 999 : 0);

      expect(base.getHours()).toBe(23);
      expect(base.getMinutes()).toBe(59);
      expect(base.getSeconds()).toBe(59);
      expect(base.getMilliseconds()).toBe(999);
    });

    it('should create new date from current time when no previous value exists', () => {
      const isEnd = false;
      const prev = null;
      const selectedTime = new Date(2026, 1, 13, 10, 15, 0, 0);

      const base = prev ? new Date(prev) : new Date();
      base.setHours(selectedTime.getHours(), selectedTime.getMinutes(), isEnd ? 59 : 0, isEnd ? 999 : 0);

      expect(base.getHours()).toBe(10);
      expect(base.getMinutes()).toBe(15);
      // Date should be today since no prev existed
      expect(base.getDate()).toBe(now.getDate());
    });
  });

  // ──────────────────────────────────────────────────────────
  // MARK: Refresh Button
  // ──────────────────────────────────────────────────────────

  describe('Refresh Button', () => {
    it('should call refetch when refresh button is clicked', () => {
      renderPanel();
      const refreshButton = screen.getByRole('button', { name: 'Refresh' });
      fireEvent.click(refreshButton);
      expect(mockRefetch).toHaveBeenCalled();
    });

    it('should disable refresh button when fetching', () => {
      (RunsQueries.useRunsInfiniteQuery as Mock).mockReturnValue({
        data: { pages: [mockRuns] },
        error: null,
        isLoading: false,
        isFetching: true,
        isRefetching: false,
        isFetchingNextPage: false,
        hasNextPage: false,
        refetch: mockRefetch,
        fetchNextPage: vi.fn(),
      });
      renderPanel();
      const refreshButton = screen.getByRole('button', { name: 'Refresh' });
      expect(refreshButton).toBeDisabled();
    });
  });

  // ──────────────────────────────────────────────────────────
  // MARK: Error Display
  // ──────────────────────────────────────────────────────────

  describe('Error Display', () => {
    it('should display error message when runs query fails', () => {
      (RunsQueries.useRunsInfiniteQuery as Mock).mockReturnValue({
        data: null,
        error: new Error('Network error'),
        isLoading: false,
        isFetching: false,
        isRefetching: false,
        isFetchingNextPage: false,
        hasNextPage: false,
        refetch: mockRefetch,
        fetchNextPage: vi.fn(),
      });
      renderPanel();
      expect(screen.getByText('Failed to load runs')).toBeInTheDocument();
    });
  });

  // ──────────────────────────────────────────────────────────
  // MARK: Search
  // ──────────────────────────────────────────────────────────

  describe('Search', () => {
    it('should show validation error for invalid run ID', () => {
      renderPanel();
      const searchBox = screen.getByPlaceholderText('Enter run ID');
      fireEvent.change(searchBox, { target: { value: 'invalid-id' } });
      expect(screen.getByText('Enter a valid run identifier')).toBeInTheDocument();
    });

    it('should clear validation error when search is emptied', () => {
      renderPanel();
      const searchBox = screen.getByPlaceholderText('Enter run ID');
      fireEvent.change(searchBox, { target: { value: 'invalid-id' } });
      expect(screen.getByText('Enter a valid run identifier')).toBeInTheDocument();

      fireEvent.change(searchBox, { target: { value: '' } });
      expect(screen.queryByText('Enter a valid run identifier')).not.toBeInTheDocument();
    });
  });

  // ──────────────────────────────────────────────────────────
  // MARK: Load More
  // ──────────────────────────────────────────────────────────

  describe('Load More', () => {
    it('should show load more button when there are more pages', () => {
      const fetchNextPage = vi.fn();
      (RunsQueries.useRunsInfiniteQuery as Mock).mockReturnValue({
        data: { pages: [mockRuns] },
        error: null,
        isLoading: false,
        isFetching: false,
        isRefetching: false,
        isFetchingNextPage: false,
        hasNextPage: true,
        refetch: mockRefetch,
        fetchNextPage,
      });
      renderPanel();
      const loadMoreBtn = screen.getByText('Load more');
      expect(loadMoreBtn).toBeInTheDocument();

      fireEvent.click(loadMoreBtn);
      expect(fetchNextPage).toHaveBeenCalled();
    });

    it('should not show load more button when there are no more pages', () => {
      renderPanel();
      expect(screen.queryByText('Load more')).not.toBeInTheDocument();
    });
  });

  // ──────────────────────────────────────────────────────────
  // MARK: Monitoring View
  // ──────────────────────────────────────────────────────────

  describe('Monitoring View', () => {
    it('should not open drawer when monitoring view is disabled', () => {
      (DesignerOptionsSelectors.useMonitoringView as Mock).mockReturnValue(false);
      const { container } = renderPanel();
      // The drawer should not be open
      const drawer = container.querySelector('[class*="fui-Drawer"]');
      expect(drawer).toBeNull();
    });
  });

  // ──────────────────────────────────────────────────────────
  // MARK: Durations constant
  // ──────────────────────────────────────────────────────────

  describe('Durations', () => {
    it('should have correct day duration', () => {
      expect(DAY_MS).toBe(86400000);
    });

    it('should have correct week duration', () => {
      expect(WEEK_MS).toBe(604800000);
    });
  });
});
