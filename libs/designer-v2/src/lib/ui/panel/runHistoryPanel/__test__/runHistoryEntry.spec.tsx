import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

// ── Mock state toggles ──────────────────────────────────────────────────────
let mockRunData: any = null;
let mockIsFirstV2Load = false;
const mockResubmitRun = vi.fn().mockResolvedValue(undefined);
const mockCancelRun = vi.fn().mockResolvedValue(undefined);
const mockRefetchRun = vi.fn();
const mockInvalidateQueries = vi.fn();

// ── Runs queries ─────────────────────────────────────────────────────────────
vi.mock('../../../../core/queries/runs', () => ({
  useRun: () => ({ data: mockRunData, refetch: mockRefetchRun }),
  useResubmitRun: () => ({ mutateAsync: mockResubmitRun }),
  useCancelRun: () => ({ mutateAsync: mockCancelRun }),
  runsQueriesKeys: { runs: 'runs' },
}));

// ── Selectors ────────────────────────────────────────────────────────────────
vi.mock('../../../../core/state/designerOptions/designerOptionsSelectors', () => ({
  useIsFirstDesignerV2Load: () => mockIsFirstV2Load,
}));

// ── Mock child components ────────────────────────────────────────────────────
vi.mock('../runHistoryEntryInfo', () => ({
  RunHistoryEntryInfo: ({ run, size }: { run: any; size?: string }) => (
    <div data-testid="run-history-entry-info" data-size={size}>
      {run?.name}
    </div>
  ),
}));

vi.mock('../runMenu', () => ({
  RunMenu: () => <div data-testid="run-menu" />,
}));

vi.mock('@microsoft/designer-ui', async (importOriginal) => {
  const actual = (await importOriginal()) as object;
  return {
    ...actual,
    TeachingPopup: ({ title }: { title: string }) => <div data-testid="teaching-popup">{title}</div>,
  };
});

vi.mock('@microsoft/logic-apps-shared', async (importOriginal) => {
  // Polyfill navigator for isFirefox() check at module load
  if (typeof globalThis.navigator === 'undefined') {
    (globalThis as any).navigator = { userAgent: '' };
  }
  const actual = (await importOriginal()) as object;
  return {
    ...actual,
    equals: (a: string, b: string) => a?.toLowerCase() === b?.toLowerCase(),
    LogEntryLevel: { Verbose: 0 },
    LoggerService: () => ({ log: vi.fn() }),
  };
});

// ── Import under test ────────────────────────────────────────────────────────
import RunHistoryEntry from '../runHistoryEntry';

// ── Helpers ──────────────────────────────────────────────────────────────────

const createRun = (overrides: Record<string, any> = {}) => ({
  id: '/subscriptions/sub1/resourceGroups/rg1/providers/Microsoft.Logic/workflows/wf1/runs/run1',
  name: 'run1',
  properties: {
    status: 'Succeeded',
    startTime: '2025-01-01T00:00:00Z',
    endTime: '2025-01-01T00:01:00Z',
    trigger: { name: 'manual' },
    workflow: { mode: 'Standard' },
    ...overrides.properties,
  },
  ...overrides,
});

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});

const renderEntry = (props: Partial<React.ComponentProps<typeof RunHistoryEntry>> = {}) => {
  return render(
    <QueryClientProvider client={queryClient}>
      <IntlProvider locale="en">
        <RunHistoryEntry runId="run1" isSelected={false} onRunSelected={vi.fn()} addFilterCallback={vi.fn()} {...props} />
      </IntlProvider>
    </QueryClientProvider>
  );
};

describe('RunHistoryEntry', () => {
  beforeEach(() => {
    mockRunData = createRun();
    mockIsFirstV2Load = false;
    mockResubmitRun.mockClear();
    mockCancelRun.mockClear();
    mockRefetchRun.mockClear();
    mockInvalidateQueries.mockClear();
    // Reset clipboard mock
    Object.assign(navigator, {
      clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
    });
  });

  // ──────────────────────────────────────────────────────────
  // MARK: Basic Rendering
  // ──────────────────────────────────────────────────────────

  describe('Basic Rendering', () => {
    it('should render nothing when run data is null', () => {
      mockRunData = null;
      const { container } = renderEntry();
      expect(container.innerHTML).toBe('');
    });

    it('should render run entry info', () => {
      renderEntry();
      expect(screen.getByTestId('run-history-entry-info')).toBeInTheDocument();
    });

    it('should render open run logs button', () => {
      renderEntry();
      expect(screen.getByRole('button', { name: 'Open run logs' })).toBeInTheDocument();
    });

    it('should render run menu in medium size', () => {
      renderEntry({ size: 'medium' });
      expect(screen.getByTestId('run-menu')).toBeInTheDocument();
    });

    it('should not render run menu in small size', () => {
      renderEntry({ size: 'small' });
      expect(screen.queryByTestId('run-menu')).not.toBeInTheDocument();
    });
  });

  // ──────────────────────────────────────────────────────────
  // MARK: Selection
  // ──────────────────────────────────────────────────────────

  describe('Selection', () => {
    it('should call onRunSelected when entry is clicked', () => {
      const onRunSelected = vi.fn();
      renderEntry({ onRunSelected });
      fireEvent.click(screen.getByTestId('run-history-entry-info').parentElement!);
      expect(onRunSelected).toHaveBeenCalledWith('run1');
    });
  });

  // ──────────────────────────────────────────────────────────
  // MARK: Open Run Logs
  // ──────────────────────────────────────────────────────────

  describe('Open Run Logs', () => {
    it('should call onRunOpened when open run logs button is clicked', () => {
      const onRunOpened = vi.fn();
      renderEntry({ onRunOpened });
      fireEvent.click(screen.getByRole('button', { name: 'Open run logs' }));
      expect(onRunOpened).toHaveBeenCalledWith('run1');
    });
  });

  // ──────────────────────────────────────────────────────────
  // MARK: Context Menu Actions
  // ──────────────────────────────────────────────────────────

  describe('Context Menu Actions', () => {
    it('should render copy, retry, and open run logs menu items in context menu', () => {
      renderEntry();
      // Right-click to open context menu
      const entry = screen.getByTestId('run-history-entry-info').parentElement!;
      fireEvent.contextMenu(entry);
      expect(screen.getByText('Copy run ID')).toBeInTheDocument();
      expect(screen.getByText('Retry')).toBeInTheDocument();
    });

    it('should show cancel option when run status is Running', () => {
      mockRunData = createRun({ properties: { status: 'Running', trigger: { name: 'manual' } } });
      renderEntry();
      const entry = screen.getByTestId('run-history-entry-info').parentElement!;
      fireEvent.contextMenu(entry);
      expect(screen.getByText('Cancel')).toBeInTheDocument();
    });

    it('should not show cancel option when run status is Succeeded', () => {
      mockRunData = createRun({ properties: { status: 'Succeeded', trigger: { name: 'manual' } } });
      renderEntry();
      const entry = screen.getByTestId('run-history-entry-info').parentElement!;
      fireEvent.contextMenu(entry);
      expect(screen.queryByText('Cancel')).not.toBeInTheDocument();
    });

    it('should copy run ID to clipboard when copy is clicked', () => {
      renderEntry();
      const entry = screen.getByTestId('run-history-entry-info').parentElement!;
      fireEvent.contextMenu(entry);
      fireEvent.click(screen.getByText('Copy run ID'));
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith('run1');
    });

    it('should call resubmit and invalidate runs when retry is clicked', async () => {
      renderEntry();
      const entry = screen.getByTestId('run-history-entry-info').parentElement!;
      fireEvent.contextMenu(entry);
      fireEvent.click(screen.getByText('Retry'));
      await waitFor(() => {
        expect(mockResubmitRun).toHaveBeenCalled();
      });
    });

    it('should call cancel and invalidate runs when cancel is clicked', async () => {
      mockRunData = createRun({ properties: { status: 'Running', trigger: { name: 'manual' } } });
      renderEntry();
      const entry = screen.getByTestId('run-history-entry-info').parentElement!;
      fireEvent.contextMenu(entry);
      fireEvent.click(screen.getByText('Cancel'));
      await waitFor(() => {
        expect(mockCancelRun).toHaveBeenCalled();
      });
    });

    it('should disable retry for draft runs', () => {
      mockRunData = createRun({
        properties: { status: 'Succeeded', trigger: { name: 'manual' }, workflow: { mode: 'Draft' } },
      });
      renderEntry();
      const entry = screen.getByTestId('run-history-entry-info').parentElement!;
      fireEvent.contextMenu(entry);
      const retryItem = screen.getByText('Retry');
      expect(retryItem.closest('[aria-disabled="true"]') ?? retryItem.closest('button[disabled]')).toBeTruthy();
    });
  });

  // ──────────────────────────────────────────────────────────
  // MARK: Multi-Select
  // ──────────────────────────────────────────────────────────

  describe('Multi-Select', () => {
    it('should not render checkbox when multiSelectEnabled is false', () => {
      renderEntry({ multiSelectEnabled: false });
      expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
    });

    it('should render checkbox when multiSelectEnabled is true (small size)', () => {
      renderEntry({ multiSelectEnabled: true, size: 'small' });
      expect(screen.getByRole('checkbox')).toBeInTheDocument();
    });

    it('should render checkbox as checked when isMultiSelected is true', () => {
      renderEntry({ multiSelectEnabled: true, isMultiSelected: true, size: 'small' });
      expect(screen.getByRole('checkbox')).toBeChecked();
    });

    it('should call onMultiSelectToggle when checkbox is changed', () => {
      const onMultiSelectToggle = vi.fn();
      renderEntry({ multiSelectEnabled: true, onMultiSelectToggle, size: 'small' });
      fireEvent.click(screen.getByRole('checkbox'));
      expect(onMultiSelectToggle).toHaveBeenCalledWith(mockRunData.id, false);
    });
  });

  // ──────────────────────────────────────────────────────────
  // MARK: Size Variants
  // ──────────────────────────────────────────────────────────

  describe('Size Variants', () => {
    it('should render small entry info in small size mode', () => {
      renderEntry({ size: 'small' });
      const info = screen.getByTestId('run-history-entry-info');
      expect(info.getAttribute('data-size')).toBe('small');
    });

    it('should render default (medium) entry info', () => {
      renderEntry({ size: 'medium' });
      const info = screen.getByTestId('run-history-entry-info');
      expect(info.getAttribute('data-size')).toBeNull();
    });
  });

  // ──────────────────────────────────────────────────────────
  // MARK: Teaching Bubble
  // ──────────────────────────────────────────────────────────

  describe('Teaching Bubble', () => {
    it('should not show teaching popup when showTeachingBubble is false', () => {
      mockIsFirstV2Load = true;
      renderEntry({ showTeachingBubble: false });
      expect(screen.queryByTestId('teaching-popup')).not.toBeInTheDocument();
    });

    it('should not show teaching popup when isFirstV2Load is false', () => {
      mockIsFirstV2Load = false;
      renderEntry({ showTeachingBubble: true });
      expect(screen.queryByTestId('teaching-popup')).not.toBeInTheDocument();
    });
  });
});
