import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { IntlProvider } from 'react-intl';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SharedLoopsPager } from '../SharedLoopsPager';
import { setRunIndex, setToolRunIndex } from '../../../../core/state/workflow/workflowSlice';

const state = vi.hoisted(() => ({
  dispatch: vi.fn(),
  actionType: 'Foreach',
  runInstanceId: 'run-1' as string | undefined,
  nodeMetadata: {} as { runIndex?: number; toolRunIndex?: number },
  parentRunIndexes: {} as Record<string, number>,
  failed: {
    isError: false,
    isFetching: false,
    isPreviousData: false,
    data: undefined as number[] | undefined,
  },
}));

vi.mock('react-redux', async (importOriginal) => ({
  ...(await importOriginal<typeof import('react-redux')>()),
  useDispatch: () => state.dispatch,
}));
vi.mock('../../../../core', () => ({ useScopeFailedRepetitions: () => state.failed }));
vi.mock('../../../../core/state/workflow/workflowSelectors', () => ({
  useRunInstance: () => ({ id: state.runInstanceId }),
  useActionMetadata: () => ({ type: state.actionType }),
  useNodeMetadata: () => state.nodeMetadata,
  useParentRunIndexes: () => state.parentRunIndexes,
}));

const renderPager = (props: Partial<Parameters<typeof SharedLoopsPager>[0]> = {}) =>
  render(
    <IntlProvider locale="en" defaultLocale="en">
      <SharedLoopsPager
        metadata={{ runData: { iterationCount: 5 }, toolRunData: { iterationCount: 3 } }}
        scopeId="For each"
        collapsed={false}
        {...props}
      />
    </IntlProvider>
  );

const action = (name: string) => document.querySelector(`[data-pager-action="${name}"]`) as HTMLElement;

describe('SharedLoopsPager', () => {
  beforeEach(() => {
    state.dispatch.mockReset();
    state.actionType = 'Foreach';
    state.runInstanceId = 'run-1';
    state.nodeMetadata = { runIndex: 1, toolRunIndex: 0 };
    state.parentRunIndexes = {};
    state.failed = { isError: false, isFetching: false, isPreviousData: false, data: undefined };
  });
  afterEach(cleanup);

  it('renders the shared pager with the legacy automation id and run index', () => {
    const { container } = renderPager();
    expect(container.querySelector('[data-automation-id="msla-pager-v2-for_each"]')).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Iterations' })).toBeInTheDocument();
    expect(screen.getByLabelText('Iteration number, 1 to 5')).toHaveValue('2');
    expect(action('previous-failed')).toBeNull();
  });

  it('dispatches the scope run index and moves focus for paging and failed jumps', () => {
    const focusElement = vi.fn();
    state.failed.data = [0, 3];
    renderPager({ focusElement });
    fireEvent.click(action('next'));
    expect(state.dispatch).toHaveBeenLastCalledWith(setRunIndex({ page: 2, nodeId: 'For each' }));
    fireEvent.click(action('next-failed'));
    expect(state.dispatch).toHaveBeenLastCalledWith(setRunIndex({ page: 3, nodeId: 'For each' }));
    expect(focusElement).toHaveBeenLastCalledWith(3, 'For each');
  });

  it('keeps tool runs on the tool index, including failed jumps', () => {
    state.failed.data = [2];
    renderPager({ useToolRun: true });
    expect(screen.getByLabelText('Iteration number, 1 to 3')).toHaveValue('1');
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
    fireEvent.click(action('next-failed'));
    expect(state.dispatch).toHaveBeenLastCalledWith(setToolRunIndex({ page: 2, nodeId: 'For each' }));
    expect(state.dispatch).not.toHaveBeenCalledWith(expect.objectContaining({ type: setRunIndex.type }));
  });

  it.each(['Foreach', 'Until'])('jumps directly to a non-nearest failed %s iteration using the scope index', (type) => {
    const focusElement = vi.fn();
    state.actionType = type;
    state.failed.data = [3, 2, 4];
    renderPager({ focusElement });
    const select = screen.getByRole('combobox', { name: 'Jump to failed iteration' });
    fireEvent.change(select, { target: { value: '4' } });
    expect(state.dispatch).toHaveBeenCalledExactlyOnceWith(setRunIndex({ page: 4, nodeId: 'For each' }));
    expect(focusElement).toHaveBeenCalledExactlyOnceWith(4, 'For each');
  });

  it('compacts Foreach failure actions in the constrained card row only', () => {
    state.failed.data = [0, 3, 4];
    const focusElement = vi.fn();
    renderPager({ inLoopCardRow: true, focusElement });
    fireEvent.click(screen.getByRole('button', { name: 'Jump to failed iteration' }));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Failed iteration 5' }));
    expect(state.dispatch).toHaveBeenCalledExactlyOnceWith(setRunIndex({ page: 4, nodeId: 'For each' }));
    expect(focusElement).toHaveBeenCalledExactlyOnceWith(4, 'For each');
  });

  it('keeps the direct select for Until even if given the constrained row option', () => {
    state.actionType = 'Until';
    state.failed.data = [0, 3, 4];
    renderPager({ inLoopCardRow: true });
    expect(screen.getByRole('combobox', { name: 'Jump to failed iteration' })).toBeInTheDocument();
  });

  it.each(['Agent', 'Scope'])('does not offer a direct picker for %s even with failure data', (type) => {
    state.actionType = type;
    state.failed.data = [3, 4];
    renderPager();
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
    expect(action('next')).toBeInTheDocument();
  });

  it.each([undefined, [], [1], [-1, 9, 2.5]])('keeps numeric paging when failure candidates %j are not actionable', (data) => {
    state.failed.data = data;
    renderPager();
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
    expect(screen.getByRole('textbox')).toHaveValue('2');
  });

  it('does not expose a picker or failed jumps from retained data for a previous query identity', () => {
    state.failed = { ...state.failed, data: [4], isPreviousData: true };
    renderPager();
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
    expect(action('next-failed')).toBeNull();
  });

  it('hides failed-destination selection while showing legacy failed jumps under repeating parents', () => {
    state.parentRunIndexes = { parentA: 1 };
    state.failed.data = [4, 3];
    renderPager({ inLoopCardRow: true });
    expect(screen.queryByRole('combobox', { name: 'Jump to failed iteration' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Jump to failed iteration' })).toBeNull();
    expect(action('next-failed')).toBeInTheDocument();
  });

  it('hides failed-destination selection when there is no current run id', () => {
    state.runInstanceId = undefined;
    state.failed.data = [4, 3];
    renderPager();
    expect(screen.queryByRole('combobox', { name: 'Jump to failed iteration' })).toBeNull();
    expect(action('next-failed')).toBeInTheDocument();
  });

  it.each([
    ['collapsed', { collapsed: true }, {}],
    ['no iterations', { metadata: { runData: {} } }, {}],
    ['fetching', {}, { isFetching: true }],
    ['errored', {}, { isError: true }],
  ])('renders nothing when %s', (_name, props, failed) => {
    Object.assign(state.failed, failed);
    const { container } = renderPager(props);
    expect(container).toBeEmptyDOMElement();
  });
});
