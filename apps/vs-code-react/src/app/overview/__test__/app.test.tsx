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
  fetchNextPage: vi.fn(),
  getMoreRuns: vi.fn(),
  getRun: vi.fn(),
  getRuns: vi.fn(),
  httpClient: vi.fn(),
  isRuntimeUp: vi.fn().mockResolvedValue(true),
  mutationError: undefined as unknown,
  mutationFn: undefined as (() => Promise<unknown>) | undefined,
  overviewProps: [] as any[],
  postMessage: vi.fn(),
  refetch: vi.fn().mockResolvedValue(undefined),
  runTrigger: vi.fn(),
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
        data-runtime-running={String(props.isWorkflowRuntimeRunning)}
        data-testid="overview"
        data-workflow-name={props.workflowProperties.name}
      >
        <button onClick={() => props.onOpenRun({ id: 'run-id', identifier: 'run-id', startTime: '', duration: '', status: 'Succeeded' })}>
          Open run
        </button>
        <button onClick={() => props.onRunTrigger()}>Run trigger</button>
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
    loadRun: 'LoadRun',
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
    mocks.overviewProps = [];
    mocks.getRuns.mockResolvedValue({ runs: [], nextLink: undefined });
    mocks.getMoreRuns.mockResolvedValue({ runs: [], nextLink: undefined });
    mocks.getRun.mockResolvedValue({ id: 'run-id' });
    mocks.runTrigger.mockResolvedValue(undefined);
    mocks.refetch.mockResolvedValue(undefined);
    mocks.fetchAgentUrl.mockResolvedValue({ agentUrl: 'http://agent', chatUrl: 'http://chat', hostName: 'http://runtime' });
    mocks.HttpClient.mockImplementation((options: any) => {
      mocks.httpClient(options);
      return { options, post: vi.fn() };
    });
    mocks.StandardRunService.mockImplementation((options: any) => {
      mocks.standardRunService(options);
      return {
        getMoreRuns: mocks.getMoreRuns,
        getRun: mocks.getRun,
        getRuns: mocks.getRuns,
        runTrigger: mocks.runTrigger,
      };
    });
    mocks.isRuntimeUp.mockResolvedValue(true);
    mocks.useInfiniteQuery.mockImplementation(() => ({
      data: { pages: [{ runs: [{ id: 'run-id', status: 'Succeeded' }], nextLink: undefined }] },
      error: undefined,
      fetchNextPage: mocks.fetchNextPage,
      hasNextPage: false,
      isLoading: false,
      isRefetching: false,
      refetch: mocks.refetch,
    }));
    mocks.useMutation.mockImplementation((mutationFn: () => Promise<unknown>) => {
      mocks.mutationFn = mutationFn;
      return {
        error: mocks.mutationError,
        isLoading: false,
        mutate: vi.fn(() => mutationFn()),
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
        },
        {
          callbackInfo: {
            method: 'POST',
            value: 'https://callback/workflow-b',
          },
          kind: 'Agent',
          name: 'workflow-b',
          stateType: 'Agent',
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
  });

  it('runs the selected workflow trigger and reports missing callback errors', async () => {
    renderOverviewApp();

    await mocks.mutationFn?.();

    expect(mocks.runTrigger).toHaveBeenCalledWith({
      method: 'POST',
      value: 'https://callback/workflow-a',
    });
    expect(mocks.refetch).toHaveBeenCalled();

    vi.clearAllMocks();
    renderOverviewApp({
      workflowProperties: {
        name: 'workflow-without-callback',
        stateType: 'Stateful',
      },
    });

    await expect(mocks.mutationFn?.()).rejects.toThrow(
      'Cannot run trigger: Workflow runtime is not running or callback URL is not available'
    );
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

  it('shows the runtime-down error when the workflow runtime is unavailable', async () => {
    mocks.isRuntimeUp.mockResolvedValue(false);

    renderOverviewApp();

    await waitFor(() => expect(screen.getByTestId('overview')).toHaveAttribute('data-error', 'Debug project before viewing runs.'));
    expect(screen.getByTestId('overview')).toHaveAttribute('data-runtime-running', 'false');
  });
});
