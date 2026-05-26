import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, type Mock, vi } from 'vitest';
import * as RunsQueries from '../../../../core/queries/runs';
import { RunHistoryPanelInstance } from '../runHistoryPanelInstance';

vi.mock('@fluentui/react-components', async () => {
  const React = await import('react');

  return {
    Button: ({ children, onClick, disabled, 'aria-label': ariaLabel }: any) => (
      <button aria-label={ariaLabel} disabled={disabled} onClick={onClick} type="button">
        {children}
      </button>
    ),
    Drawer: ({ children }: any) => <div data-testid="drawer">{children}</div>,
    DrawerBody: ({ children }: any) => <div>{children}</div>,
    DrawerHeader: ({ children }: any) => <div>{children}</div>,
    Field: ({ children, validationMessage }: any) => (
      <div>
        {children}
        {validationMessage ? <div role="alert">{validationMessage}</div> : null}
      </div>
    ),
    MessageBar: ({ children }: any) => <div role="alert">{children}</div>,
    MessageBarBody: ({ children }: any) => <div>{children}</div>,
    MessageBarTitle: ({ children }: any) => <strong>{children}</strong>,
    SearchBox: ({ placeholder, onChange }: any) => (
      <input placeholder={placeholder} onChange={(event) => onChange?.(event, { value: event.currentTarget.value })} />
    ),
    Spinner: () => <div role="status">Loading</div>,
    Tag: ({ children, onDismiss, value }: any) => (
      <span>
        {children}
        <button aria-label="remove" onClick={(event) => onDismiss?.(event, { value })} type="button">
          remove
        </button>
      </span>
    ),
    TagGroup: ({ children, onDismiss }: any) => (
      <div>
        {React.Children.map(children, (child) => (React.isValidElement(child) ? React.cloneElement(child, { onDismiss } as any) : child))}
      </div>
    ),
    Text: ({ children }: any) => <span>{children}</span>,
    makeStyles: () => () => ({ noRunsText: 'no-runs-text' }),
    tokens: {},
  };
});

vi.mock('@microsoft/logic-apps-shared', () => ({
  parseErrorMessage: (error: Error) => error.message,
}));

vi.mock('../../../../core/queries/runs', () => ({
  useAllRuns: vi.fn(),
  useRunsInfiniteQuery: vi.fn(),
}));

vi.mock('../runHistoryEntry', () => ({
  default: ({
    runId,
    onRunSelected,
    addFilterCallback,
  }: {
    runId: string;
    onRunSelected: (runId: string) => void;
    addFilterCallback: (filter: { key: 'status' | 'workflowVersion'; value: string }) => void;
  }) => (
    <div data-testid={`run-entry-${runId}`}>
      <button onClick={() => onRunSelected(runId)} type="button">
        select {runId}
      </button>
      <button onClick={() => addFilterCallback({ key: 'status', value: 'Succeeded' })} type="button">
        filter status {runId}
      </button>
      <button onClick={() => addFilterCallback({ key: 'workflowVersion', value: 'v1' })} type="button">
        filter version {runId}
      </button>
    </div>
  ),
}));

const validRunId = '12345678901234567890123456789CU12';
const secondRunId = '98765432109876543210987654321CU34';

const createRun = (id: string, status: string, workflowVersion: string) => ({
  id,
  name: id,
  properties: {
    status,
    workflow: {
      name: workflowVersion,
    },
  },
});

describe('RunHistoryPanelInstance', () => {
  let refetch: Mock;
  let fetchNextPage: Mock;

  const succeededRun = createRun(validRunId, 'Succeeded', 'v1');
  const failedRun = createRun(secondRunId, 'Failed', 'v2');
  const defaultRuns = [succeededRun, failedRun];

  const setRunsQuery = (overrides: Record<string, unknown> = {}) => {
    refetch = vi.fn();
    fetchNextPage = vi.fn();
    (RunsQueries.useRunsInfiniteQuery as Mock).mockReturnValue({
      error: null,
      fetchNextPage,
      hasNextPage: false,
      isFetching: false,
      isFetchingNextPage: false,
      isLoading: false,
      refetch,
      ...overrides,
    });
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (RunsQueries.useAllRuns as Mock).mockReturnValue(defaultRuns);
    setRunsQuery();
  });

  it('refetches runs on initial render', async () => {
    render(<RunHistoryPanelInstance />);

    expect(RunsQueries.useRunsInfiniteQuery).toHaveBeenCalledWith(true);
    await waitFor(() => expect(refetch).toHaveBeenCalledTimes(1));
  });

  it('shows empty and error states', () => {
    (RunsQueries.useAllRuns as Mock).mockReturnValue([]);
    const { rerender } = render(<RunHistoryPanelInstance />);

    expect(screen.getByText('No runs found')).toBeInTheDocument();

    setRunsQuery({ error: new Error('runs failed') });
    rerender(<RunHistoryPanelInstance />);

    expect(screen.getByText('Failed to load runs')).toBeInTheDocument();
    expect(screen.getByText('runs failed')).toBeInTheDocument();
  });

  it('filters by valid run id and reports invalid run ids', () => {
    render(<RunHistoryPanelInstance />);

    fireEvent.change(screen.getByPlaceholderText('Search'), { target: { value: validRunId } });

    expect(screen.getByTestId(`run-entry-${validRunId}`)).toBeInTheDocument();
    expect(screen.queryByTestId(`run-entry-${secondRunId}`)).not.toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText('Search'), { target: { value: 'not-a-run-id' } });

    expect(screen.getByText('Enter a valid run identifier')).toBeInTheDocument();
    expect(screen.getByTestId(`run-entry-${validRunId}`)).toBeInTheDocument();
    expect(screen.getByTestId(`run-entry-${secondRunId}`)).toBeInTheDocument();
  });

  it('removes status and workflow version filter tags', () => {
    render(<RunHistoryPanelInstance />);

    fireEvent.click(screen.getByText(`filter status ${validRunId}`));

    expect(screen.getByText('Status: Succeeded')).toBeInTheDocument();
    expect(screen.getByTestId(`run-entry-${validRunId}`)).toBeInTheDocument();
    expect(screen.queryByTestId(`run-entry-${secondRunId}`)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'remove' }));

    expect(screen.getByTestId(`run-entry-${secondRunId}`)).toBeInTheDocument();

    fireEvent.click(screen.getByText(`filter version ${validRunId}`));

    expect(screen.getByText('Version: v1')).toBeInTheDocument();
    expect(screen.queryByTestId(`run-entry-${secondRunId}`)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'remove' }));

    expect(screen.getByTestId(`run-entry-${secondRunId}`)).toBeInTheDocument();
  });

  it('loads more runs when a next page is available', () => {
    setRunsQuery({ hasNextPage: true });
    render(<RunHistoryPanelInstance />);

    fireEvent.click(screen.getByRole('button', { name: 'Load more' }));

    expect(fetchNextPage).toHaveBeenCalledTimes(1);
  });

  it('calls the run selection callback from an entry', () => {
    const onRunSelected = vi.fn();
    render(<RunHistoryPanelInstance onRunSelected={onRunSelected} />);

    fireEvent.click(screen.getByRole('button', { name: `select ${validRunId}` }));

    expect(onRunSelected).toHaveBeenCalledWith(validRunId);
  });

  it('shows the loading spinner while fetching the next page', () => {
    setRunsQuery({ isFetchingNextPage: true });
    render(<RunHistoryPanelInstance />);

    expect(screen.getByRole('status')).toHaveTextContent('Loading');
  });
});
