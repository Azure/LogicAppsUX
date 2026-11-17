import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { IntlProvider } from 'react-intl';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SharedLoopsPager } from '../SharedLoopsPager';
import { setRunIndex, setToolRunIndex } from '../../../../core/state/workflow/workflowSlice';

const state = vi.hoisted(() => ({
  dispatch: vi.fn(),
  nodeMetadata: {} as { runIndex?: number; toolRunIndex?: number },
  failed: { isError: false, isFetching: false, data: undefined as number[] | undefined },
}));

vi.mock('react-redux', async (importOriginal) => ({
  ...(await importOriginal<typeof import('react-redux')>()),
  useDispatch: () => state.dispatch,
}));
vi.mock('../../../../core', () => ({ useScopeFailedRepetitions: () => state.failed }));
vi.mock('../../../../core/state/workflow/workflowSelectors', () => ({
  useRunInstance: () => ({ id: 'run-1' }),
  useActionMetadata: () => ({ type: 'Foreach' }),
  useNodeMetadata: () => state.nodeMetadata,
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
    state.nodeMetadata = { runIndex: 1, toolRunIndex: 0 };
    state.failed = { isError: false, isFetching: false, data: undefined };
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
    fireEvent.click(action('next-failed'));
    expect(state.dispatch).toHaveBeenLastCalledWith(setToolRunIndex({ page: 2, nodeId: 'For each' }));
    expect(state.dispatch).not.toHaveBeenCalledWith(expect.objectContaining({ type: setRunIndex.type }));
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
