import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { configureStore, createSlice } from '@reduxjs/toolkit';
import { ExtensionCommand } from '@microsoft/vscode-extension-logic-apps';
import { OverviewApp } from '../app';
import { Provider } from 'react-redux';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  HttpClient: vi.fn(),
  StandardRunService: vi.fn(),
  fetchAgentUrl: vi.fn().mockResolvedValue({ agentUrl: 'http://agent', chatUrl: 'http://chat', hostName: 'http://runtime' }),
  cancelRun: vi.fn(),
  fetchNextPage: vi.fn(),
  getMoreRuns: vi.fn(),
  getRun: vi.fn(),
  getRuns: vi.fn(),
  httpClient: vi.fn(),
  isRuntimeUp: vi.fn().mockResolvedValue(true),
  mutationError: undefined as unknown,
  mutationFn: undefined as (() => Promise<unknown>) | undefined,
  mutationLoading: false,
  mutationMutate: vi.fn(),
  mutationReset: vi.fn(),
  overviewProps: [] as any[],
  postMessage: vi.fn(),
  refetch: vi.fn().mockResolvedValue(undefined),
  runsError: undefined as unknown,
  runTrigger: vi.fn(),
  startTrigger: vi.fn(),
  standardRunService: vi.fn(),
  useInfiniteQuery: vi.fn(),
  useMutation: vi.fn(),
  useQuery: vi.fn(),
}));

vi.mock('../../../webviewCommunication', async () => {
  const React = await import('react');
  return {
    VSCodeContext: React.createContext({ postMessage: mocks.postMessage }),
  };
});

vi.mock('../overviewStyles', () => ({
  useOverviewStyles: () => ({
    overviewContainer: 'overview-container',
    workflowSelector: 'workflow-selector',
  }),
}));

vi.mock('../../../intl', () => ({
  overviewMessages: {},
  useIntlMessages: () => ({
    DEBUG_PROJECT_ERROR: 'Debug project before viewing runs.',
    SELECT_WORKFLOW: 'Select workflow',
    WORKFLOW: 'Workflow',
  }),
}));

vi.mock('@fluentui/react-components', () => ({
  Dropdown: ({ children, onOptionSelect, selectedOptions, value }: any) => (
    <select
      aria-label="Workflow"
      onChange={(event) => onOptionSelect?.(undefined, { optionValue: event.currentTarget.value })}
      value={value ?? selectedOptions?.[0] ?? ''}
    >
      {children}
    </select>
  ),
  Field: ({ children, label }: any) => (
    <label>
      <span>{label}</span>
      {children}
    </label>
  ),
  Option: ({ children, value }: any) => <option value={value}>{children}</option>,
  useId: (prefix: string) => `${prefix}-id`,
}));

vi.mock('@microsoft/designer-ui', () => ({
  Overview: (props: any) => {
    mocks.overviewProps.push(props);
    return (
      <div
        data-error={props.errorMessage ?? ''}
        data-loading={String(props.loading)}
        data-run-trigger-pending={String(props.isRunTriggerPending)}
        data-runtime-running={String(props.isWorkflowRuntimeRunning)}
        data-pending-run-id={props.pendingRunId ?? ''}
        data-testid="overview"
        data-workflow-name={props.workflowProperties.name}
      >
        <button
          disabled={Boolean(props.pendingRunId)}
          onClick={() =>
            props.onCancelRun({
              id: '/workflows/workflow-a/runs/run-id',
              identifier: 'run-id',
              startTime: '',
              duration: '',
              status: 'Running',
            })
          }
        >
          Cancel run
        </button>
        <button
          disabled={Boolean(props.pendingRunId)}
          onClick={() =>
            props.onCancelRun({
              id: '/workflows/workflow-a/runs/second-run-id',
              identifier: 'second-run-id',
              startTime: '',
              duration: '',
              status: 'Running',
            })
          }
        >
          Cancel second run
        </button>
        <button onClick={() => props.onOpenRun({ id: 'run-id', identifier: 'run-id', startTime: '', duration: '', status: 'Succeeded' })}>
          Open run
        </button>
        <button disabled={!props.canRunTrigger || props.isRunTriggerPending} onClick={() => props.onRunTrigger()}>
          Run trigger
        </button>
        <button disabled={props.isRefreshing} onClick={() => props.onLoadRuns()}>
          Refresh
        </button>
        <button onClick={() => props.onCopyCallbackUrl()}>Copy callback</button>
        {props.onOpenProjectOverview ? <button onClick={() => props.onOpenProjectOverview()}>All project workflows</button> : null}
        <button
          onClick={() =>
            props.onCreateUnitTestFromRun({
              id: 'run-id',
              identifier: 'run-id',
              startTime: '',
              duration: '',
              status: 'Succeeded',
            })
          }
        >
          Create unit test
        </button>
      </div>
    );
  },
  isRunError: (error: any) => !!error?.error?.message,
  mapToRunItem: (run: any) => ({
    duration: run.duration ?? '',
    id: run.id,
    identifier: run.name ?? run.id,
    startTime: run.startTime ?? '',
    status: run.status ?? 'Succeeded',
  }),
}));

vi.mock('@microsoft/logic-apps-designer', () => ({
  getTheme: () => 'light',
  useThemeObserver: vi.fn(),
}));

vi.mock('@microsoft/logic-apps-shared', () => ({
  StandardRunService: mocks.StandardRunService,
  Theme: {
    Dark: 'dark',
    Light: 'light',
  },
  equals: (left: string, right: string, ignoreCase?: boolean) =>
    ignoreCase ? left?.toLowerCase() === right?.toLowerCase() : left === right,
  isNullOrUndefined: (value: unknown) => value === null || value === undefined,
  isRuntimeUp: mocks.isRuntimeUp,
}));

vi.mock('@microsoft/vscode-extension-logic-apps', () => ({
  ExtensionCommand: {
    createUnitTestFromRun: 'createUnitTestFromRun',
    copyWorkflowOverviewCallback: 'copyWorkflowOverviewCallback',
    loadRun: 'LoadRun',
    openProjectOverview: 'openProjectOverview',
  },
  HttpClient: mocks.HttpClient,
}));

vi.mock('@tanstack/react-query', () => ({
  useInfiniteQuery: (...args: any[]) => mocks.useInfiniteQuery(...args),
  useMutation: (mutationFn: () => Promise<unknown>) => mocks.useMutation(mutationFn),
  useQuery: (...args: any[]) => mocks.useQuery(...args),
}));

vi.mock('../services/workflowService', () => ({
  fetchAgentUrl: mocks.fetchAgentUrl,
}));

const baseWorkflowState = {
  accessToken: 'access-token',
  apiVersion: '2019-10-01-edge-preview',
  azureDetails: {
    clientId: 'client-id',
    resourceGroupName: 'resource-group',
    subscriptionId: 'subscription-id',
    tenantId: 'tenant-id',
  },
  baseUrl: 'http://localhost:7071/runtime/webhooks/workflow/api/management',
  connectionData: {},
  corsNotice: undefined,
  hostVersion: '1.0.0',
  isCodeful: false,
  isLocal: true,
  kind: 'Stateful',
  workflowProperties: {
    callbackInfo: {
      method: 'POST',
      value: 'https://callback/workflow-a',
    },
    name: 'workflow-a',
    stateType: 'Stateful',
    triggerName: 'manual',
  },
};

function createStore(workflowOverrides: Record<string, any> = {}) {
  const workflowState = {
    ...baseWorkflowState,
    ...workflowOverrides,
  };
  return configureStore({
    reducer: {
      workflow: createSlice({
        name: 'workflow',
        initialState: workflowState,
        reducers: {},
      }).reducer,
    },
  });
}

function renderOverviewApp(workflowOverrides: Record<string, any> = {}) {
  return render(
    <Provider store={createStore(workflowOverrides)}>
      <OverviewApp />
    </Provider>
  );
}

describe('OverviewApp', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.mutationError = undefined;
    mocks.mutationFn = undefined;
    mocks.mutationLoading = false;
    mocks.overviewProps = [];
    mocks.runsError = undefined;
    mocks.getRuns.mockResolvedValue({ runs: [], nextLink: undefined });
    mocks.cancelRun.mockResolvedValue(undefined);
    mocks.getMoreRuns.mockResolvedValue({ runs: [], nextLink: undefined });
    mocks.getRun.mockResolvedValue({ id: 'run-id' });
    mocks.runTrigger.mockResolvedValue(undefined);
    mocks.startTrigger.mockResolvedValue(undefined);
    mocks.refetch.mockResolvedValue(undefined);
    mocks.fetchAgentUrl.mockResolvedValue({ agentUrl: 'http://agent', chatUrl: 'http://chat', hostName: 'http://runtime' });
    mocks.HttpClient.mockImplementation((options: any) => {
      mocks.httpClient(options);
      return { options, post: vi.fn() };
    });
    mocks.StandardRunService.mockImplementation((options: any) => {
      mocks.standardRunService(options);
      return {
        cancelRun: mocks.cancelRun,
        getMoreRuns: mocks.getMoreRuns,
        getRun: mocks.getRun,
        getRuns: mocks.getRuns,
        runTrigger: mocks.runTrigger,
        startTrigger: mocks.startTrigger,
      };
    });
    mocks.isRuntimeUp.mockResolvedValue(true);
    mocks.useInfiniteQuery.mockImplementation(() => ({
      data: { pages: [{ runs: [{ id: 'run-id', status: 'Succeeded' }], nextLink: undefined }] },
      error: mocks.runsError,
      fetchNextPage: mocks.fetchNextPage,
      hasNextPage: false,
      isLoading: false,
      isRefetching: false,
      refetch: mocks.refetch,
    }));
    mocks.useMutation.mockImplementation((mutationFn: () => Promise<unknown>) => {
      mocks.mutationFn = mutationFn;
      mocks.mutationMutate.mockImplementation(() => {
        void mutationFn().catch(() => undefined);
      });
      return {
        error: mocks.mutationError,
        isLoading: mocks.mutationLoading,
        mutate: mocks.mutationMutate,
        reset: mocks.mutationReset,
      };
    });
    mocks.useQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
    });
  });

  it('renders the codeful workflow dropdown and uses the selected workflow for queries and services', async () => {
    renderOverviewApp({
      isCodeful: true,
      workflowPropertiesList: [
        {
          callbackInfo: {
            method: 'POST',
            value: 'https://callback/workflow-a',
          },
          kind: 'Stateful',
          name: 'workflow-a',
          stateType: 'Stateful',
          triggerName: 'firstRequest',
        },
        {
          callbackInfo: {
            method: 'POST',
            value: 'https://callback/workflow-b',
          },
          kind: 'Agent',
          name: 'workflow-b',
          stateType: 'Agent',
          triggerName: 'secondRequest',
        },
      ],
    });

    expect(screen.getByTestId('overview')).toHaveAttribute('data-workflow-name', 'workflow-a');
    expect(mocks.standardRunService).toHaveBeenLastCalledWith(expect.objectContaining({ workflowName: 'workflow-a' }));
    expect(mocks.useInfiniteQuery).toHaveBeenLastCalledWith(
      ['runsData', 'workflow-a'],
      expect.any(Function),
      expect.objectContaining({ enabled: true })
    );

    fireEvent.change(screen.getByRole('combobox', { name: 'Workflow' }), {
      target: { value: 'workflow-b' },
    });

    await waitFor(() => expect(screen.getByTestId('overview')).toHaveAttribute('data-workflow-name', 'workflow-b'));
    expect(mocks.standardRunService).toHaveBeenLastCalledWith(expect.objectContaining({ workflowName: 'workflow-b' }));
    expect(mocks.useInfiniteQuery).toHaveBeenLastCalledWith(
      ['runsData', 'workflow-b'],
      expect.any(Function),
      expect.objectContaining({ enabled: true })
    );

    const agentQueryCall = mocks.useQuery.mock.calls.at(-1);
    expect(agentQueryCall?.[0]).toEqual(['agentUrl', true, 'http://localhost:7071/runtime/webhooks/workflow/api/management', 'workflow-b']);
    expect(agentQueryCall?.[2]).toEqual(expect.objectContaining({ enabled: true }));

    await agentQueryCall?.[1]();
    expect(mocks.fetchAgentUrl).toHaveBeenCalledWith(
      'workflow-b',
      'http://localhost:7071/runtime/webhooks/workflow/api/management',
      expect.any(Object),
      'client-id',
      'tenant-id',
      {},
      'subscription-id',
      'resource-group'
    );

    await mocks.mutationFn?.();
    expect(mocks.startTrigger).toHaveBeenCalledWith('secondRequest');
  });

  it('starts the selected workflow trigger through management and never invokes its callback URL', async () => {
    mocks.refetch.mockReturnValue(new Promise(() => undefined));
    renderOverviewApp({
      workflowProperties: {
        name: 'workflow-a',
        stateType: 'Stateful',
        triggerName: 'manual',
      },
    });

    await mocks.mutationFn?.();

    expect(mocks.startTrigger).toHaveBeenCalledWith('manual');
    expect(mocks.runTrigger).not.toHaveBeenCalled();
    expect(mocks.refetch).toHaveBeenCalled();
  });

  it('reports an actionable error when trigger metadata is unavailable', async () => {
    const workflowWithoutTrigger = {
      workflowProperties: {
        callbackInfo: {
          method: 'POST',
          value: 'https://callback/workflow-without-trigger',
        },
        name: 'workflow-without-trigger',
        stateType: 'Stateful',
      },
    };
    const { unmount } = renderOverviewApp(workflowWithoutTrigger);

    let triggerError: unknown;
    try {
      await mocks.mutationFn?.();
    } catch (error) {
      triggerError = error;
    }

    expect(triggerError).toEqual(
      new Error('Cannot run trigger: Trigger metadata is unavailable. Reopen the workflow overview to reload the workflow metadata.')
    );
    expect(mocks.runTrigger).not.toHaveBeenCalled();
    expect(mocks.startTrigger).not.toHaveBeenCalled();

    unmount();
    mocks.mutationError = triggerError;
    renderOverviewApp(workflowWithoutTrigger);

    expect(screen.getByTestId('overview')).toHaveAttribute(
      'data-error',
      'Cannot run trigger: Trigger metadata is unavailable. Reopen the workflow overview to reload the workflow metadata.'
    );
  });

  it('reports an actionable error when workflow runtime management is unavailable', async () => {
    renderOverviewApp({
      baseUrl: undefined,
      workflowProperties: {
        name: 'workflow-a',
        stateType: 'Stateful',
        triggerName: 'manual',
      },
    });

    await expect(mocks.mutationFn?.()).rejects.toThrow(
      'Cannot run trigger: Workflow runtime management is unavailable. Start the workflow runtime and refresh the overview.'
    );
    expect(mocks.startTrigger).not.toHaveBeenCalled();
  });

  it('disables only Run trigger while start acknowledgment is pending', () => {
    mocks.mutationLoading = true;

    renderOverviewApp();

    expect(screen.getByTestId('overview')).toHaveAttribute('data-loading', 'false');
    expect(screen.getByTestId('overview')).toHaveAttribute('data-run-trigger-pending', 'true');
    expect(screen.getByRole('button', { name: 'Run trigger' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Refresh' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Cancel run' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Open run' })).toBeEnabled();

    fireEvent.click(screen.getByRole('button', { name: 'Run trigger' }));
    expect(mocks.mutationMutate).not.toHaveBeenCalled();
  });

  it('resets an earlier trigger error before retrying', () => {
    mocks.mutationError = new Error('Earlier trigger failure');
    renderOverviewApp();

    fireEvent.click(screen.getByRole('button', { name: 'Run trigger' }));

    expect(mocks.mutationReset).toHaveBeenCalledOnce();
    expect(mocks.mutationMutate).toHaveBeenCalledOnce();
  });

  it.each([
    ['local', { isLocal: true }],
    ['remote', { isLocal: false }],
  ])('cancels a %s Standard run with its full run ID and refetches runs', async (_scenario, workflowOverrides) => {
    renderOverviewApp(workflowOverrides);

    fireEvent.click(screen.getByText('Cancel run'));

    await waitFor(() => expect(mocks.cancelRun).toHaveBeenCalledWith('/workflows/workflow-a/runs/run-id'));
    await waitFor(() => expect(mocks.refetch).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.getByTestId('overview')).toHaveAttribute('data-pending-run-id', ''));
  });

  it('disables other cancellations and keeps cancellation single-flight while a run is pending', async () => {
    let resolveCancellation: (() => void) | undefined;
    mocks.cancelRun.mockReturnValue(
      new Promise<void>((resolve) => {
        resolveCancellation = resolve;
      })
    );
    renderOverviewApp();

    fireEvent.click(screen.getByText('Cancel run'));

    expect(mocks.cancelRun).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(screen.getByTestId('overview')).toHaveAttribute('data-pending-run-id', '/workflows/workflow-a/runs/run-id'));
    const secondCancelRun = screen.getByRole('button', { name: 'Cancel second run' });
    expect(secondCancelRun).toBeDisabled();

    fireEvent.click(secondCancelRun);

    expect(mocks.cancelRun).toHaveBeenCalledTimes(1);
    resolveCancellation?.();

    await waitFor(() => expect(mocks.refetch).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.getByTestId('overview')).toHaveAttribute('data-pending-run-id', ''));
  });

  it('surfaces thrown cancellation failures, refetches runs, and clears pending state', async () => {
    mocks.cancelRun.mockRejectedValue(new Error('Cancellation failed'));
    renderOverviewApp();

    fireEvent.click(screen.getByText('Cancel run'));

    await waitFor(() => expect(screen.getByTestId('overview')).toHaveAttribute('data-error', 'Cancellation failed'));
    expect(mocks.refetch).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('overview')).toHaveAttribute('data-pending-run-id', '');
  });

  it('treats returned Error objects as cancellation failures and still refetches runs', async () => {
    mocks.cancelRun.mockResolvedValue(new Error('Cancellation returned an error'));
    renderOverviewApp();

    fireEvent.click(screen.getByText('Cancel run'));

    await waitFor(() => expect(screen.getByTestId('overview')).toHaveAttribute('data-error', 'Cancellation returned an error'));
    expect(mocks.refetch).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('overview')).toHaveAttribute('data-pending-run-id', '');
  });

  it.each([
    ['run loading', () => (mocks.runsError = new Error('Run loading failed')), 'Run loading failed'],
    ['trigger', () => (mocks.mutationError = new Error('Trigger failed')), 'Trigger failed'],
  ])('does not hide an existing %s error with a cancellation error', async (_scenario, arrangeError, expectedError) => {
    arrangeError();
    mocks.cancelRun.mockRejectedValue(new Error('Cancellation failed'));
    renderOverviewApp();

    fireEvent.click(screen.getByText('Cancel run'));

    await waitFor(() => expect(mocks.cancelRun).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.getByTestId('overview')).toHaveAttribute('data-error', expectedError));
    expect(mocks.refetch).toHaveBeenCalledTimes(1);
  });

  it('posts open-run and create-unit-test messages to the extension host', () => {
    renderOverviewApp();

    fireEvent.click(screen.getByText('Open run'));
    fireEvent.click(screen.getByText('Create unit test'));

    expect(mocks.postMessage).toHaveBeenCalledWith({
      command: ExtensionCommand.loadRun,
      item: {
        duration: '',
        id: 'run-id',
        identifier: 'run-id',
        startTime: '',
        status: 'Succeeded',
      },
    });
    expect(mocks.postMessage).toHaveBeenCalledWith({
      command: ExtensionCommand.createUnitTestFromRun,
      runId: 'run-id',
    });
  });

  it('requests host-mediated callback URL copy for the selected workflow', () => {
    renderOverviewApp();

    fireEvent.click(screen.getByText('Copy callback'));

    expect(mocks.postMessage).toHaveBeenCalledWith({
      command: ExtensionCommand.copyWorkflowOverviewCallback,
      data: {
        workflowName: 'workflow-a',
      },
    });
  });

  it('shows a project backlink only for a valid project origin and posts the typed return message', () => {
    renderOverviewApp({
      projectOverviewOrigin: {
        projectId: 'project-id',
      },
    });

    fireEvent.click(screen.getByText('All project workflows'));

    expect(mocks.postMessage).toHaveBeenCalledWith({
      command: ExtensionCommand.openProjectOverview,
      data: {
        projectId: 'project-id',
      },
    });
  });

  it('keeps standalone workflow overview valid without a project backlink', () => {
    renderOverviewApp();

    expect(screen.queryByText('All project workflows')).not.toBeInTheDocument();
  });

  it('shows the runtime-down error when the workflow runtime is unavailable', async () => {
    mocks.isRuntimeUp.mockResolvedValue(false);

    renderOverviewApp();

    await waitFor(() => expect(screen.getByTestId('overview')).toHaveAttribute('data-error', 'Debug project before viewing runs.'));
    expect(screen.getByTestId('overview')).toHaveAttribute('data-runtime-running', 'false');
  });
});
