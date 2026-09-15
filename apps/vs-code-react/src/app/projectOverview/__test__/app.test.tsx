import { ProjectOverviewApp } from '../app';
import projectOverviewReducer from '../../../state/ProjectOverviewSlice';
import { updateProjectOverview } from '../../../state/ProjectOverviewSlice';
import { VSCodeContext } from '../../../webviewCommunication';
import { configureStore } from '@reduxjs/toolkit';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import {
  ExtensionCommand,
  ProjectOverviewCallbackAvailability,
  ProjectOverviewLatestRunAvailability,
  ProjectOverviewLifecycle,
  ProjectOverviewRuntimeState,
  ProjectOverviewWorkflowKind,
  ProjectOverviewWorkflowRunMode,
  ProjectOverviewWorkflowRuntimeState,
  ProjectOverviewWorkflowSourceState,
  type ProjectOverviewProjectId,
  type ProjectOverviewRunId,
  type ProjectOverviewSnapshot,
  type ProjectOverviewWorkflow,
  type ProjectOverviewWorkflowId,
} from '@microsoft/vscode-extension-logic-apps';
import { IntlProvider } from 'react-intl';
import { Provider } from 'react-redux';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  postMessage: vi.fn(),
}));

vi.mock('../../../webviewCommunication', async () => {
  const React = await import('react');
  return {
    VSCodeContext: React.createContext({ postMessage: mocks.postMessage }),
  };
});

vi.mock('@fluentui/react-components', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@fluentui/react-components')>();
  const React = await import('react');
  return {
    ...actual,
    Tooltip: ({ children, content }: { children: React.ReactElement; content: string }) =>
      React.cloneElement(children, { 'data-tooltip-content': content } as React.HTMLAttributes<HTMLElement>),
  };
});

const postMessage = mocks.postMessage;
const projectId = 'project-1' as ProjectOverviewProjectId;

const createWorkflow = (
  name: string,
  options: {
    callback?: string;
    run?: { id: string; startTime: string; status: string };
    latestRunAvailability?: Exclude<ProjectOverviewLatestRunAvailability, 'available'>;
  } = {}
): ProjectOverviewWorkflow => ({
  callback: options.callback
    ? { availability: ProjectOverviewCallbackAvailability.Available, url: options.callback }
    : { availability: ProjectOverviewCallbackAvailability.Unavailable },
  errors: [],
  kind: ProjectOverviewWorkflowKind.Codeless,
  latestRun: options.run
    ? {
        availability: ProjectOverviewLatestRunAvailability.Available,
        run: {
          runId: options.run.id as ProjectOverviewRunId,
          startTime: options.run.startTime,
          status: options.run.status,
        },
      }
    : { availability: options.latestRunAvailability ?? ProjectOverviewLatestRunAvailability.NoRuns },
  name,
  runMode: ProjectOverviewWorkflowRunMode.Stateful,
  runtimeState: ProjectOverviewWorkflowRuntimeState.Available,
  sourceState: ProjectOverviewWorkflowSourceState.Available,
  workflowId: `${name}-id` as ProjectOverviewWorkflowId,
});

const workflows = [
  createWorkflow('Zulu', {
    callback: 'https://example.test/zulu',
    run: { id: 'run-zulu', startTime: '2026-09-14T03:00:00.000Z', status: 'Failed' },
  }),
  createWorkflow('alpha', {
    callback: 'https://example.test/alpha',
    run: { id: 'run-alpha', startTime: '2026-09-14T01:00:00.000Z', status: 'Succeeded' },
  }),
  createWorkflow('Missing', { latestRunAvailability: ProjectOverviewLatestRunAvailability.StatelessHistoryUnavailable }),
];

const createSnapshot = (overrides: Partial<ProjectOverviewSnapshot> = {}): ProjectOverviewSnapshot => ({
  errors: [],
  generatedAt: '2026-09-14T04:00:00.000Z',
  generation: 7,
  isRefreshing: false,
  lifecycle: ProjectOverviewLifecycle.Ready,
  projectId,
  projectName: 'Contoso workflows',
  runtime: {
    generation: 3,
    state: ProjectOverviewRuntimeState.Running,
  },
  workflows,
  ...overrides,
});

const renderApp = (snapshot?: ProjectOverviewSnapshot, visible = true) => {
  const store = configureStore({
    reducer: { projectOverview: projectOverviewReducer },
    preloadedState: {
      projectOverview: snapshot ? { initialized: true, snapshot, visible } : { initialized: false, snapshot: undefined, visible },
    },
  });

  const rendered = render(
    <IntlProvider locale="en">
      <Provider store={store}>
        <VSCodeContext.Provider value={{ postMessage } as never}>
          <ProjectOverviewApp />
        </VSCodeContext.Provider>
      </Provider>
    </IntlProvider>
  );
  return { ...rendered, store };
};

const getWorkflowOrder = () =>
  screen
    .getAllByRole('row')
    .slice(1)
    .map((row) => within(row).getByRole('rowheader').textContent?.trim());

describe('ProjectOverviewApp', () => {
  beforeEach(() => {
    postMessage.mockReset();
  });

  it('renders startup, fatal error, empty, partial, runtime-stopped, and refreshing lifecycle states', () => {
    const { rerender } = renderApp();
    expect(screen.getByRole('status')).toHaveTextContent('Loading project overview');

    const renderSnapshot = (snapshot: ProjectOverviewSnapshot) =>
      rerender(
        <IntlProvider locale="en">
          <Provider
            store={configureStore({
              reducer: { projectOverview: projectOverviewReducer },
              preloadedState: { projectOverview: { initialized: true, snapshot, visible: true } },
            })}
          >
            <VSCodeContext.Provider value={{ postMessage } as never}>
              <ProjectOverviewApp />
            </VSCodeContext.Provider>
          </Provider>
        </IntlProvider>
      );

    renderSnapshot(
      createSnapshot({
        errors: [{ action: 'retry', code: 'startup', message: 'Startup failed', retryable: true, scope: 'project' }],
        lifecycle: ProjectOverviewLifecycle.Error,
      })
    );
    expect(screen.getByRole('alert')).toHaveTextContent('Startup failed');
    expect(screen.getByRole('button', { name: 'Retry' })).toBeVisible();

    renderSnapshot(createSnapshot({ lifecycle: ProjectOverviewLifecycle.Ready, workflows: [] }));
    expect(screen.getByRole('heading', { name: 'Empty project' })).toBeVisible();

    renderSnapshot(
      createSnapshot({
        errors: [{ action: 'refresh', code: 'partial', message: 'Run history could not be loaded.', retryable: true, scope: 'project' }],
        lifecycle: ProjectOverviewLifecycle.Partial,
      })
    );
    expect(screen.getByTestId('project-overview-lifecycle-status')).toHaveTextContent('Some workflow information is unavailable.');
    expect(screen.getByText(/Run history could not be loaded/)).toBeVisible();

    renderSnapshot(createSnapshot({ lifecycle: ProjectOverviewLifecycle.RuntimeStopped }));
    expect(screen.getByTestId('project-overview-lifecycle-status')).toHaveTextContent('Runtime stopped');
    expect(screen.getAllByText('Runtime stopped')).toHaveLength(1);

    renderSnapshot(createSnapshot({ isRefreshing: true }));
    expect(screen.getByTestId('project-overview-lifecycle-status')).toHaveTextContent('Refreshing project overview');
    expect(screen.getByRole('button', { name: 'Refresh' })).toBeDisabled();
    expect(screen.getByRole('row', { name: /Zulu/ })).toBeVisible();
  });

  it('omits verbose metadata while preserving filtering, run availability distinctions, and a semantic sortable table', () => {
    renderApp(createSnapshot());

    expect(screen.getByRole('heading', { name: 'Contoso workflows' })).toBeVisible();
    expect(screen.queryByText('3 workflows')).not.toBeInTheDocument();
    expect(screen.queryByText(/Auto-refresh/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Refreshed/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Runtime: Running/)).not.toBeInTheDocument();
    expect(screen.getByRole('table')).toBeVisible();
    expect(screen.getAllByRole('columnheader')).toHaveLength(4);
    expect(screen.getAllByRole('columnheader')[0]).toHaveAttribute('aria-sort', 'ascending');
    expect(screen.getAllByText('Run history unavailable')).toHaveLength(1);
    expect(screen.queryByRole('button', { name: 'Copy callback URL for Missing' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Open latest run for Missing' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Open overview for Missing' })).toBeVisible();

    fireEvent.change(screen.getByRole('textbox', { name: 'Filter workflows' }), { target: { value: 'alp' } });
    expect(screen.getByRole('row', { name: /alpha/ })).toBeVisible();
    expect(screen.queryByRole('row', { name: /Zulu/ })).not.toBeInTheDocument();

    fireEvent.change(screen.getByRole('textbox', { name: 'Filter workflows' }), { target: { value: 'none' } });
    expect(screen.getByText('No workflows match this filter.')).toBeVisible();
  });

  it('distinguishes no runs, stateless history, runtime unavailability, and query failures', () => {
    renderApp(
      createSnapshot({
        workflows: [
          createWorkflow('No runs', { latestRunAvailability: ProjectOverviewLatestRunAvailability.NoRuns }),
          createWorkflow('Stateless', { latestRunAvailability: ProjectOverviewLatestRunAvailability.StatelessHistoryUnavailable }),
          {
            ...createWorkflow('Runtime unavailable', {
              latestRunAvailability: ProjectOverviewLatestRunAvailability.RuntimeUnavailable,
            }),
            callback: { availability: ProjectOverviewCallbackAvailability.RuntimeUnavailable },
          },
          {
            ...createWorkflow('Query failed', { latestRunAvailability: ProjectOverviewLatestRunAvailability.QueryFailed }),
            callback: { availability: ProjectOverviewCallbackAvailability.QueryFailed },
          },
        ],
      })
    );

    expect(screen.getAllByText('No runs')).toHaveLength(2);
    expect(screen.getAllByText('Run history unavailable')).toHaveLength(1);
    expect(screen.getAllByText('Runtime unavailable')).toHaveLength(3);
    expect(screen.getAllByText('Run query failed')).toHaveLength(2);
  });

  it.each([
    ['Workflow', ['alpha', 'Missing', 'Zulu'], ['Zulu', 'Missing', 'alpha']],
    ['Runtime URL', ['alpha', 'Zulu', 'Missing'], ['Zulu', 'alpha', 'Missing']],
    ['Last run', ['alpha', 'Zulu', 'Missing'], ['Zulu', 'alpha', 'Missing']],
  ])('sorts the %s column ascending and descending with missing values last', (column, ascending, descending) => {
    renderApp(createSnapshot());
    const header = screen.getAllByRole('columnheader').find((candidate) => candidate.textContent === column);
    expect(header).toBeDefined();
    if (!header) {
      return;
    }
    const button = within(header).getByRole('button');

    if (column !== 'Workflow') {
      fireEvent.click(button);
    }
    expect(getWorkflowOrder()).toEqual(ascending);
    expect(header).toHaveAttribute('aria-sort', 'ascending');

    fireEvent.click(button);
    expect(getWorkflowOrder()).toEqual(descending);
    expect(header).toHaveAttribute('aria-sort', 'descending');
  });

  it('renders semantic status pills and icon-only actions with accessible labels and tooltips', () => {
    renderApp(
      createSnapshot({
        workflows: [
          createWorkflow('Succeeded workflow', {
            run: { id: 'run-success', startTime: '2026-09-14T01:00:00.000Z', status: 'Succeeded' },
          }),
          createWorkflow('Failed workflow', {
            run: { id: 'run-failed', startTime: '2026-09-14T02:00:00.000Z', status: 'Failed' },
          }),
          createWorkflow('Running workflow', {
            run: { id: 'run-running', startTime: '2026-09-14T03:00:00.000Z', status: 'Running' },
          }),
          createWorkflow('Unknown workflow', {
            run: { id: 'run-unknown', startTime: '2026-09-14T04:00:00.000Z', status: 'Waiting' },
          }),
          createWorkflow('No runs workflow'),
        ],
      })
    );

    expect(screen.getByLabelText('Last run status for Succeeded workflow: Succeeded')).toHaveClass('project-overview-status--success');
    expect(screen.getByLabelText('Last run status for Failed workflow: Failed')).toHaveClass('project-overview-status--danger');
    expect(screen.getByLabelText('Last run status for Running workflow: Running')).toHaveClass('project-overview-status--running');
    expect(screen.getByLabelText('Last run status for Unknown workflow: Waiting')).toHaveClass('project-overview-status--neutral');
    expect(screen.getByLabelText('Last run status for No runs workflow: No runs')).toHaveClass('project-overview-status--neutral');

    const latestRunButton = screen.getByRole('button', { name: 'Open latest run for Succeeded workflow' });
    const overviewButton = screen.getByRole('button', { name: 'Open overview for Succeeded workflow' });
    const cancelButton = screen.getByRole('button', { name: 'Cancel run for Running workflow' });
    expect(latestRunButton).toHaveTextContent('');
    expect(latestRunButton.querySelector('svg')).not.toBeNull();
    expect(overviewButton).toHaveTextContent('');
    expect(overviewButton.querySelector('svg')).not.toBeNull();
    expect(cancelButton).toHaveTextContent('');
    expect(cancelButton.querySelector('svg')).not.toBeNull();
    expect(screen.queryByRole('button', { name: 'Open latest run for No runs workflow' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Cancel run for Succeeded workflow' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Cancel run for Failed workflow' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Cancel run for Unknown workflow' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Cancel run for No runs workflow' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Open overview for No runs workflow' })).toBeVisible();

    expect(latestRunButton).toHaveAttribute('data-tooltip-content', 'Open latest run for Succeeded workflow');
    expect(overviewButton).toHaveAttribute('data-tooltip-content', 'Open overview for Succeeded workflow');
    expect(cancelButton).toHaveAttribute('data-tooltip-content', 'Cancel run for Running workflow');
  });

  it('posts one exact cancellation, disables it immediately, and settles from a newer cancelled snapshot', async () => {
    const runningWorkflow = createWorkflow('Running workflow', {
      run: { id: 'opaque-running-run', startTime: '2026-09-14T03:00:00.000Z', status: 'rUnNiNg' },
    });
    const { store } = renderApp(createSnapshot({ workflows: [runningWorkflow] }));
    const cancelButton = screen.getByRole('button', { name: 'Cancel run for Running workflow' });

    fireEvent.click(cancelButton);
    fireEvent.click(cancelButton);

    expect(cancelButton).toBeDisabled();
    expect(postMessage).toHaveBeenCalledTimes(1);
    expect(postMessage).toHaveBeenCalledWith({
      command: ExtensionCommand.cancelProjectOverviewRun,
      data: {
        projectId,
        runId: 'opaque-running-run',
        snapshotGeneration: 7,
        workflowId: 'Running workflow-id',
      },
    });

    store.dispatch(
      updateProjectOverview({
        snapshot: createSnapshot({
          generation: 8,
          workflows: [
            createWorkflow('Running workflow', {
              run: { id: 'opaque-running-run', startTime: '2026-09-14T03:00:00.000Z', status: 'Cancelled' },
            }),
          ],
        }),
      })
    );

    await waitFor(() => expect(screen.queryByRole('button', { name: 'Cancel run for Running workflow' })).not.toBeInTheDocument());
    expect(screen.getByRole('button', { name: 'Open latest run for Running workflow' })).toBeVisible();

    store.dispatch(
      updateProjectOverview({
        snapshot: createSnapshot({
          generation: 9,
          workflows: [runningWorkflow],
        }),
      })
    );

    await waitFor(() => expect(screen.getByRole('button', { name: 'Cancel run for Running workflow' })).toBeEnabled());
  });

  it('renders only three sortable headers and leaves Actions unsortable', () => {
    renderApp(createSnapshot());

    const headers = screen.getAllByRole('columnheader');
    expect(headers.map((header) => header.textContent)).toEqual(['Workflow', 'Runtime URL', 'Last run', 'Actions']);
    expect(headers.slice(0, 3).every((header) => header.hasAttribute('aria-sort'))).toBe(true);
    expect(headers[3]).not.toHaveAttribute('aria-sort');
    expect(within(headers[3]).queryByRole('button')).not.toBeInTheDocument();
  });

  it('keeps equal values stable, missing values last, and the selected sort after a snapshot update', async () => {
    const firstSameStatus = createWorkflow('Zulu', {
      run: { id: 'run-zulu', startTime: '2026-09-14T03:00:00.000Z', status: 'Succeeded' },
    });
    const secondSameStatus = createWorkflow('alpha', {
      run: { id: 'run-alpha', startTime: '2026-09-14T01:00:00.000Z', status: 'Succeeded' },
    });
    const missing = createWorkflow('Missing');
    const { store } = renderApp(createSnapshot({ workflows: [firstSameStatus, secondSameStatus, missing] }));
    const lastRunHeader = screen.getAllByRole('columnheader').find((candidate) => candidate.textContent === 'Last run');
    expect(lastRunHeader).toBeDefined();
    fireEvent.click(within(lastRunHeader!).getByRole('button'));

    expect(getWorkflowOrder()).toEqual(['Zulu', 'alpha', 'Missing']);

    store.dispatch(
      updateProjectOverview({
        snapshot: createSnapshot({
          generation: 8,
          workflows: [missing, secondSameStatus, firstSameStatus],
        }),
      })
    );

    expect(lastRunHeader).toHaveAttribute('aria-sort', 'ascending');
    await waitFor(() => expect(getWorkflowOrder()).toEqual(['alpha', 'Zulu', 'Missing']));
  });

  it('posts stop, refresh, retry, callback copy, workflow navigation, latest-run navigation, and visibility messages', () => {
    const snapshot = createSnapshot();
    const { rerender } = renderApp(snapshot);

    const stopButton = screen.getByRole('button', { name: 'Stop runtime' });
    fireEvent.click(stopButton);
    expect(stopButton).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Refresh' }));
    fireEvent.click(screen.getByRole('button', { name: 'Copy callback URL for alpha' }));
    fireEvent.click(screen.getByRole('button', { name: 'Open overview for alpha' }));
    fireEvent.click(screen.getByRole('button', { name: 'Open latest run for alpha' }));

    expect(postMessage).toHaveBeenCalledWith({
      command: ExtensionCommand.stopProjectOverviewRuntime,
      data: { projectId, snapshotGeneration: 7 },
    });
    expect(postMessage).toHaveBeenCalledWith({
      command: ExtensionCommand.refreshProjectOverview,
      data: { projectId, snapshotGeneration: 7 },
    });
    expect(postMessage).toHaveBeenCalledWith({
      command: ExtensionCommand.copyProjectOverviewCallback,
      data: { projectId, snapshotGeneration: 7, workflowId: 'alpha-id' },
    });
    expect(postMessage).toHaveBeenCalledWith({
      command: ExtensionCommand.openWorkflowOverview,
      data: { projectId, snapshotGeneration: 7, workflowId: 'alpha-id' },
    });
    expect(postMessage).toHaveBeenCalledWith({
      command: ExtensionCommand.openLatestProjectOverviewRun,
      data: { projectId, runId: 'run-alpha', snapshotGeneration: 7, workflowId: 'alpha-id' },
    });

    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'hidden' });
    fireEvent(document, new Event('visibilitychange'));
    expect(postMessage).toHaveBeenCalledWith({
      command: ExtensionCommand.projectOverviewVisibilityChanged,
      data: { projectId, visible: false },
    });

    rerender(
      <IntlProvider locale="en">
        <Provider
          store={configureStore({
            reducer: { projectOverview: projectOverviewReducer },
            preloadedState: {
              projectOverview: {
                initialized: true,
                snapshot: createSnapshot({
                  errors: [{ action: 'retry', code: 'fatal', message: 'Fatal', retryable: true, scope: 'project' }],
                  lifecycle: ProjectOverviewLifecycle.Error,
                }),
                visible: true,
              },
            },
          })}
        >
          <VSCodeContext.Provider value={{ postMessage } as never}>
            <ProjectOverviewApp />
          </VSCodeContext.Provider>
        </Provider>
      </IntlProvider>
    );
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(postMessage).toHaveBeenCalledWith({
      command: ExtensionCommand.retryProjectOverview,
      data: { projectId, snapshotGeneration: 7 },
    });
  });

  it('shows exactly one compact runtime toggle for running, stopped, unavailable, error, and starting states', () => {
    const { rerender } = renderApp(createSnapshot());
    const getRuntimeToggleButtons = () =>
      screen
        .getAllByRole('button')
        .filter((button) => ['Start runtime', 'Stop runtime', 'Runtime starting'].includes(button.getAttribute('aria-label') ?? ''));

    expect(screen.queryByRole('button', { name: 'Start runtime' })).not.toBeInTheDocument();
    const stopButton = screen.getByRole('button', { name: 'Stop runtime' });
    expect(stopButton).toHaveTextContent('');
    expect(stopButton.querySelector('svg')).not.toBeNull();
    expect(stopButton).toHaveAttribute('data-tooltip-content', 'Stop runtime');
    expect(getRuntimeToggleButtons()).toHaveLength(1);

    const renderRuntimeState = (state: ProjectOverviewRuntimeState, lifecycle = ProjectOverviewLifecycle.RuntimeStopped) =>
      rerender(
        <IntlProvider locale="en">
          <Provider
            store={configureStore({
              reducer: { projectOverview: projectOverviewReducer },
              preloadedState: {
                projectOverview: {
                  initialized: true,
                  snapshot: createSnapshot({
                    lifecycle,
                    runtime: { generation: 3, state },
                  }),
                  visible: true,
                },
              },
            })}
          >
            <VSCodeContext.Provider value={{ postMessage } as never}>
              <ProjectOverviewApp />
            </VSCodeContext.Provider>
          </Provider>
        </IntlProvider>
      );

    for (const state of [ProjectOverviewRuntimeState.Stopped, ProjectOverviewRuntimeState.Unavailable, ProjectOverviewRuntimeState.Error]) {
      renderRuntimeState(state);
      const startButton = screen.getByRole('button', { name: 'Start runtime' });
      expect(startButton).toHaveTextContent('');
      expect(startButton.querySelector('svg')).not.toBeNull();
      expect(startButton).toHaveAttribute('data-tooltip-content', 'Start runtime');
      expect(getRuntimeToggleButtons()).toHaveLength(1);
    }

    fireEvent.click(screen.getByRole('button', { name: 'Start runtime' }));
    expect(postMessage).toHaveBeenCalledWith({
      command: ExtensionCommand.startProjectOverviewRuntime,
      data: { projectId, snapshotGeneration: 7 },
    });

    renderRuntimeState(ProjectOverviewRuntimeState.Starting, ProjectOverviewLifecycle.Starting);
    const startingButton = screen.getByRole('button', { name: 'Runtime starting' });
    expect(startingButton).toBeDisabled();
    expect(startingButton).toHaveTextContent('');
    expect(startingButton).toHaveAttribute('data-tooltip-content', 'Runtime starting');
    expect(getRuntimeToggleButtons()).toHaveLength(1);
  });

  it('renders compact icon-only runtime and refresh actions with distinct labels and tooltips', () => {
    renderApp(createSnapshot());

    const stopButton = screen.getByRole('button', { name: 'Stop runtime' });
    const refreshButton = screen.getByRole('button', { name: 'Refresh' });
    expect(stopButton).toHaveTextContent('');
    expect(refreshButton).toHaveTextContent('');
    expect(stopButton.querySelector('svg')).not.toBeNull();
    expect(refreshButton.querySelector('svg')).not.toBeNull();
    expect(stopButton).toHaveAttribute('data-tooltip-content', 'Stop runtime');
    expect(refreshButton).toHaveAttribute('data-tooltip-content', 'Refresh');
  });
});
