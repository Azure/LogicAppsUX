/**
 * @vitest-environment jsdom
 */
import { Customizer, createTheme, setIconOptions } from '@fluentui/react';
import { FluentProvider, webLightTheme } from '@fluentui/react-components';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import userEvent from '@testing-library/user-event';
import { IntlProvider } from 'react-intl';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { RunHistory, type RunHistoryProps } from '../runhistory';
import type { RunDisplayItem } from '../types';

const succeededRun: RunDisplayItem = {
  duration: '1s',
  id: '/workflows/run/versions/succeeded',
  identifier: 'succeeded-run',
  startTime: '2022-02-04T17:58:19.6012324Z',
  status: 'Succeeded',
};

const runningRun: RunDisplayItem = {
  duration: '2s',
  id: '/workflows/run/versions/running',
  identifier: 'running-run',
  startTime: '2022-02-04T17:59:19.6012324Z',
  status: 'Running',
};

const mixedCaseRunningRun: RunDisplayItem = {
  duration: '3s',
  id: '/workflows/run/versions/mixed-case-running',
  identifier: 'mixed-case-running-run',
  startTime: '2022-02-04T18:00:19.6012324Z',
  status: 'rUnNiNg',
};

describe('lib/overview/runhistory', () => {
  let minimal: RunHistoryProps;

  const renderComponent = (props: RunHistoryProps) =>
    render(
      <Customizer settings={{ theme: createTheme() }}>
        <FluentProvider theme={webLightTheme}>
          <IntlProvider locale="en" messages={{}}>
            <RunHistory {...props} />
          </IntlProvider>
        </FluentProvider>
      </Customizer>
    );

  beforeAll(() => {
    setIconOptions({
      disableWarnings: true,
    });
  });

  beforeEach(() => {
    minimal = {
      items: [],
      onOpenRun: vi.fn(),
    };
  });

  afterEach(cleanup);

  it('renders the run identifier as a link that opens the run', () => {
    renderComponent({ ...minimal, items: [succeededRun] });

    const identifierLink = screen.getByText(succeededRun.identifier);
    expect(identifierLink.closest('.ms-Link')).toBeInTheDocument();
    fireEvent.click(identifierLink);

    expect(minimal.onOpenRun).toHaveBeenCalledWith(succeededRun);
  });

  it('renders an icon-only Open action for every run with contextual labels and tooltips', async () => {
    const user = userEvent.setup();
    renderComponent({ ...minimal, items: [succeededRun, runningRun] });

    const succeededOpen = screen.getByRole('button', { name: `Open run ${succeededRun.identifier}` });
    const runningOpen = screen.getByRole('button', { name: `Open run ${runningRun.identifier}` });

    expect(succeededOpen).toBeInTheDocument();
    expect(runningOpen).toBeInTheDocument();
    expect(screen.getByTestId(`open-run-icon-${succeededRun.identifier}`)).toBeInTheDocument();
    expect(screen.getByTestId(`open-run-icon-${runningRun.identifier}`)).toBeInTheDocument();
    expect(succeededOpen).toHaveTextContent('');

    await user.hover(succeededOpen);
    expect(await screen.findByRole('tooltip')).toHaveTextContent(`Open run ${succeededRun.identifier}`);
  });

  it('invokes the Open action with its run', async () => {
    const user = userEvent.setup();
    renderComponent({ ...minimal, items: [succeededRun] });

    await user.click(screen.getByRole('button', { name: `Open run ${succeededRun.identifier}` }));

    expect(minimal.onOpenRun).toHaveBeenCalledWith(succeededRun);
  });

  it('renders Cancel only for Running statuses case-insensitively and invokes it with the run', async () => {
    const user = userEvent.setup();
    const onCancelRun = vi.fn();
    renderComponent({ ...minimal, items: [succeededRun, runningRun, mixedCaseRunningRun], onCancelRun });

    expect(screen.queryByRole('button', { name: `Cancel run ${succeededRun.identifier}` })).not.toBeInTheDocument();
    expect(screen.getByTestId(`cancel-run-icon-${runningRun.identifier}`)).toBeInTheDocument();
    expect(screen.getByTestId(`cancel-run-icon-${mixedCaseRunningRun.identifier}`)).toBeInTheDocument();

    const cancelRun = screen.getByRole('button', { name: `Cancel run ${mixedCaseRunningRun.identifier}` });
    await user.hover(cancelRun);
    expect(await screen.findByRole('tooltip')).toHaveTextContent(`Cancel run ${mixedCaseRunningRun.identifier}`);
    await user.unhover(cancelRun);
    await user.click(cancelRun);

    expect(onCancelRun).toHaveBeenCalledWith(mixedCaseRunningRun);
  });

  it('does not render Cancel when cancellation is unavailable', () => {
    renderComponent({ ...minimal, items: [runningRun] });

    expect(screen.queryByRole('button', { name: `Cancel run ${runningRun.identifier}` })).not.toBeInTheDocument();
  });

  it('disables every Cancel action while a cancellation is pending', async () => {
    const user = userEvent.setup();
    const onCancelRun = vi.fn();
    renderComponent({
      ...minimal,
      items: [runningRun, mixedCaseRunningRun],
      onCancelRun,
      pendingRunId: runningRun.id,
    });

    expect(screen.getByRole('button', { name: `Cancel run ${runningRun.identifier}` })).toBeDisabled();
    const secondCancelRun = screen.getByRole('button', { name: `Cancel run ${mixedCaseRunningRun.identifier}` });
    expect(secondCancelRun).toBeDisabled();
    expect(screen.getByRole('button', { name: `Open run ${runningRun.identifier}` })).toBeEnabled();

    await user.click(secondCancelRun);

    expect(onCancelRun).not.toHaveBeenCalled();
  });

  it('uses an Actions column without an ellipsis menu', () => {
    renderComponent({ ...minimal, items: [runningRun], onCancelRun: vi.fn() });

    expect(screen.getByRole('columnheader', { name: 'Actions' })).toBeInTheDocument();
    expect(screen.queryByText('…')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Show run menu' })).not.toBeInTheDocument();
  });

  it('renders the loading shimmer', () => {
    const { container } = renderComponent({ ...minimal, loading: true });

    expect(container.querySelector('.ms-Shimmer-container')).toBeInTheDocument();
  });
});
