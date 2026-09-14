/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import {
  ExtensionCommand,
  ProjectOverviewCallbackAvailability,
  ProjectOverviewLatestRunAvailability,
  ProjectOverviewLifecycle,
  ProjectOverviewRuntimeState,
  ProjectOverviewWorkflowKind,
} from '@microsoft/vscode-extension-logic-apps';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LocalProjectOverviewPanel, type LocalProjectOverviewPanelDependencies } from '../localProjectOverviewPanel';

vi.mock('vscode', () => ({
  Uri: { file: (fsPath: string) => ({ fsPath }) },
  ViewColumn: { Active: -1 },
  window: { createWebviewPanel: vi.fn() },
  env: { clipboard: { writeText: vi.fn() } },
}));

vi.mock('../../../../../../extensionVariables', () => ({
  ext: {
    context: { extensionPath: 'D:\\extension', subscriptions: [] },
    outputChannel: { appendLog: vi.fn() },
  },
}));

vi.mock('../../../../../utils/codeless/getWebViewHTML', () => ({ getWebViewHTML: vi.fn() }));
vi.mock('../../../monitoringView/openMonitoringView', () => ({ openMonitoringView: vi.fn() }));
vi.mock('../../../overview/openOverview', () => ({ openOverview: vi.fn() }));

function snapshot(generation = 1, runtimeGeneration = 4, runtimeState: ProjectOverviewRuntimeState = ProjectOverviewRuntimeState.Running) {
  return {
    projectId: 'project-id',
    projectName: 'LogicApp',
    lifecycle:
      runtimeState === ProjectOverviewRuntimeState.Stopped ? ProjectOverviewLifecycle.RuntimeStopped : ProjectOverviewLifecycle.Ready,
    runtime: { state: runtimeState, generation: runtimeGeneration },
    generation,
    generatedAt: new Date(0).toISOString(),
    isRefreshing: false,
    workflows: [
      {
        workflowId: 'workflow-id',
        name: 'Orders',
        kind: ProjectOverviewWorkflowKind.Codeless,
        runMode: 'stateful',
        sourceState: 'available',
        runtimeState: 'available',
        callback: { availability: ProjectOverviewCallbackAvailability.Available, url: 'https://callback' },
        latestRun: {
          availability: ProjectOverviewLatestRunAvailability.Available,
          run: { runId: 'run-id', status: 'Succeeded', startTime: new Date(0).toISOString() },
        },
        errors: [],
      },
    ],
    errors: [],
  } as any;
}

function createHarness() {
  let receiveMessage: ((message: any) => Promise<void>) | undefined;
  let changeVisibility: ((event: any) => Promise<void>) | undefined;
  let disposePanel: (() => void) | undefined;
  const postMessage = vi.fn().mockResolvedValue(true);
  const webviewPanel = {
    active: false,
    visible: true,
    reveal: vi.fn(),
    webview: {
      html: '',
      postMessage,
      onDidReceiveMessage: vi.fn((callback) => {
        receiveMessage = callback;
        return { dispose: vi.fn() };
      }),
    },
    onDidChangeViewState: vi.fn((callback) => {
      changeVisibility = callback;
      return { dispose: vi.fn() };
    }),
    onDidDispose: vi.fn((callback) => {
      disposePanel = callback;
      return { dispose: vi.fn() };
    }),
  } as any;
  const service = {
    projectId: 'project-id',
    refresh: vi.fn().mockResolvedValue(snapshot(2)),
    getRuntimeRegistration: vi.fn().mockReturnValue({ generation: 4, lifecycle: 'running' }),
    cancel: vi.fn(),
    resolveWorkflow: vi.fn((workflowId, generation) =>
      workflowId === 'workflow-id' && generation === 1
        ? {
            projectPath: 'D:\\Workspace\\LogicApp',
            sourceIdentity: 'orders-source',
            sourcePath: 'D:\\Workspace\\LogicApp\\Orders\\workflow.json',
            workflowName: 'Orders',
            kind: ProjectOverviewWorkflowKind.Codeless,
            snapshotGeneration: 1,
          }
        : undefined
    ),
    resolveRun: vi.fn((runId, generation) =>
      runId === 'run-id' && generation === 1
        ? {
            projectPath: 'D:\\Workspace\\LogicApp',
            sourceIdentity: 'orders-source',
            sourcePath: 'D:\\Workspace\\LogicApp\\Orders\\workflow.json',
            workflowName: 'Orders',
            kind: ProjectOverviewWorkflowKind.Codeless,
            snapshotGeneration: 1,
            runtimeRunId: 'workflows/Orders/runs/run-1',
          }
        : undefined
    ),
  } as any;
  const timers: Array<() => void> = [];
  const dependencies: LocalProjectOverviewPanelDependencies = {
    createPanel: vi.fn().mockReturnValue(webviewPanel),
    getWebviewHtml: vi.fn().mockResolvedValue('<html />'),
    writeClipboard: vi.fn().mockResolvedValue(undefined),
    openWorkflow: vi.fn().mockResolvedValue(undefined),
    openRun: vi.fn().mockResolvedValue(undefined),
    stopRuntime: vi.fn().mockResolvedValue(true),
    showError: vi.fn().mockResolvedValue(undefined),
    setTimer: vi.fn((callback) => {
      timers.push(callback);
      return timers.length as any;
    }),
    clearTimer: vi.fn(),
  };
  const retry = vi.fn().mockResolvedValue(undefined);
  const onDispose = vi.fn();
  const panel = new LocalProjectOverviewPanel({} as any, 'D:\\Workspace\\LogicApp', service, retry, onDispose, dependencies);
  return {
    panel,
    service,
    dependencies,
    webviewPanel,
    postMessage,
    retry,
    onDispose,
    message: async (value: any) => await receiveMessage?.(value),
    visibility: async (visible: boolean) => await changeVisibility?.({ webviewPanel: { visible } }),
    dispose: () => disposePanel?.(),
    timers,
  };
}

describe('LocalProjectOverviewPanel', () => {
  beforeEach(() => vi.clearAllMocks());

  it('creates once, initializes the typed frame, and reveals on reuse', async () => {
    const harness = createHarness();
    await harness.panel.create(snapshot());
    await harness.message({ command: ExtensionCommand.initialize });
    await harness.panel.create(snapshot());

    expect(harness.dependencies.createPanel).toHaveBeenCalledTimes(1);
    expect(harness.postMessage).toHaveBeenCalledWith({
      command: ExtensionCommand.initializeProjectOverview,
      data: { snapshot: snapshot(), visible: true },
    });
    expect(harness.webviewPanel.reveal).toHaveBeenCalledTimes(1);
  });

  it('serializes and coalesces manual refreshes', async () => {
    const harness = createHarness();
    let release: ((value: any) => void) | undefined;
    harness.service.refresh.mockReturnValueOnce(new Promise((resolve) => (release = resolve)));
    await harness.panel.create(snapshot());

    const action = {
      command: ExtensionCommand.refreshProjectOverview,
      data: { projectId: 'project-id', snapshotGeneration: 1 },
    };
    const first = harness.message(action);
    const second = harness.message(action);
    release?.(snapshot(2));
    await Promise.all([first, second]);

    expect(harness.service.refresh).toHaveBeenCalledTimes(1);
    expect(harness.postMessage).toHaveBeenCalledWith({
      command: ExtensionCommand.updateProjectOverview,
      data: { snapshot: expect.objectContaining({ generation: 2 }) },
    });
  });

  it('pauses polling while hidden, resumes when visible, and stops on disposal', async () => {
    const harness = createHarness();
    await harness.panel.create(snapshot());
    await harness.message({ command: ExtensionCommand.initialize });
    expect(harness.dependencies.setTimer).toHaveBeenCalledTimes(1);
    expect(harness.dependencies.setTimer).toHaveBeenLastCalledWith(expect.any(Function), 5000);

    await harness.visibility(false);
    expect(harness.dependencies.clearTimer).toHaveBeenCalledTimes(1);
    await harness.visibility(true);
    expect(harness.dependencies.setTimer).toHaveBeenCalledTimes(2);

    harness.dispose();
    expect(harness.service.cancel).toHaveBeenCalledTimes(1);
    expect(harness.onDispose).toHaveBeenCalledTimes(1);
  });

  it('serializes the five-second polling callback with an in-flight manual refresh', async () => {
    const harness = createHarness();
    let release: ((value: any) => void) | undefined;
    harness.service.refresh.mockReturnValueOnce(new Promise((resolve) => (release = resolve)));
    await harness.panel.create(snapshot());
    await harness.message({ command: ExtensionCommand.initialize });

    const manual = harness.message({
      command: ExtensionCommand.refreshProjectOverview,
      data: { projectId: 'project-id', snapshotGeneration: 1 },
    });
    const poll = harness.timers[0]();
    release?.(snapshot(2));
    await Promise.all([manual, poll]);

    expect(harness.service.refresh).toHaveBeenCalledTimes(1);
    expect(harness.dependencies.setTimer).toHaveBeenLastCalledWith(expect.any(Function), 5000);
  });

  it('copies and navigates only trusted current workflow and run identities', async () => {
    const harness = createHarness();
    await harness.panel.create(snapshot());
    const action = { projectId: 'project-id', snapshotGeneration: 1, workflowId: 'workflow-id' };

    await harness.message({ command: ExtensionCommand.copyProjectOverviewCallback, data: action });
    await harness.message({ command: ExtensionCommand.openWorkflowOverview, data: action });
    await harness.message({
      command: ExtensionCommand.openLatestProjectOverviewRun,
      data: { ...action, runId: 'run-id' },
    });

    expect(harness.dependencies.writeClipboard).toHaveBeenCalledWith('https://callback');
    expect(harness.dependencies.openWorkflow).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ fsPath: 'D:\\Workspace\\LogicApp\\Orders\\workflow.json' }),
      'project-id',
      expect.any(Function)
    );
    expect(harness.dependencies.openRun).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ fsPath: 'D:\\Workspace\\LogicApp\\Orders\\workflow.json' }),
      'workflows/Orders/runs/run-1',
      'D:\\Workspace\\LogicApp\\Orders\\workflow.json'
    );

    await harness.message({
      command: ExtensionCommand.copyProjectOverviewCallback,
      data: { ...action, snapshotGeneration: 0 },
    });
    await harness.message({
      command: ExtensionCommand.openWorkflowOverview,
      data: { ...action, workflowId: 'D:\\forged\\workflow.json' },
    });
    await harness.message({
      command: ExtensionCommand.openLatestProjectOverviewRun,
      data: { ...action, runId: 'forged-run' },
    });
    await harness.message({
      command: ExtensionCommand.openWorkflowOverview,
      data: { ...action, projectId: 'forged-project' },
    });
    expect(harness.dependencies.writeClipboard).toHaveBeenCalledTimes(1);
    expect(harness.dependencies.openWorkflow).toHaveBeenCalledTimes(1);
    expect(harness.dependencies.openRun).toHaveBeenCalledTimes(1);
  });

  it('navigates trusted codeful workflows and runs using their source file instead of a workflow.json path', async () => {
    const harness = createHarness();
    const sourcePath = 'D:\\Workspace\\LogicApp\\Workflows.cs';
    harness.service.resolveWorkflow.mockReturnValue({
      projectPath: 'D:\\Workspace\\LogicApp',
      sourceIdentity: 'codeful-project#orders',
      sourcePath,
      workflowName: 'Orders',
      kind: ProjectOverviewWorkflowKind.Codeful,
      snapshotGeneration: 1,
    });
    harness.service.resolveRun.mockReturnValue({
      projectPath: 'D:\\Workspace\\LogicApp',
      sourceIdentity: 'codeful-project#orders',
      sourcePath,
      workflowName: 'Orders',
      kind: ProjectOverviewWorkflowKind.Codeful,
      snapshotGeneration: 1,
      runtimeRunId: 'workflows/Orders/runs/run-1',
    });
    await harness.panel.create(snapshot());
    const action = { projectId: 'project-id', snapshotGeneration: 1, workflowId: 'workflow-id' };

    await harness.message({ command: ExtensionCommand.openWorkflowOverview, data: action });
    await harness.message({
      command: ExtensionCommand.openLatestProjectOverviewRun,
      data: { ...action, runId: 'run-id' },
    });

    expect(harness.dependencies.openWorkflow).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ fsPath: sourcePath }),
      'project-id',
      expect.any(Function)
    );
    expect(harness.dependencies.openRun).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ fsPath: sourcePath }),
      'workflows/Orders/runs/run-1',
      sourcePath
    );
  });

  it('routes retry only for the current project snapshot', async () => {
    const harness = createHarness();
    await harness.panel.create(snapshot());

    await harness.message({
      command: ExtensionCommand.retryProjectOverview,
      data: { projectId: 'project-id', snapshotGeneration: 1 },
    });
    await harness.message({
      command: ExtensionCommand.retryProjectOverview,
      data: { projectId: 'other-project', snapshotGeneration: 1 },
    });

    expect(harness.retry).toHaveBeenCalledTimes(1);
    expect(harness.retry).toHaveBeenCalledWith();
  });

  it('starts a stopped runtime only for the current trusted snapshot', async () => {
    const harness = createHarness();
    harness.service.getRuntimeRegistration.mockReturnValue({ generation: 4, lifecycle: 'stopped' });
    await harness.panel.create(snapshot(1, 4, ProjectOverviewRuntimeState.Stopped));

    await harness.message({
      command: ExtensionCommand.startProjectOverviewRuntime,
      data: { projectId: 'project-id', snapshotGeneration: 1 },
    });
    await harness.message({
      command: ExtensionCommand.startProjectOverviewRuntime,
      data: { projectId: 'other-project', snapshotGeneration: 1 },
    });
    await harness.message({
      command: ExtensionCommand.startProjectOverviewRuntime,
      data: { projectId: 'project-id', snapshotGeneration: 0 },
    });

    expect(harness.retry).toHaveBeenCalledTimes(1);
    expect(harness.retry).toHaveBeenCalledWith(false);
  });

  it.each(['running', 'starting'] as const)('ignores start-runtime while the runtime is %s', async (lifecycle) => {
    const harness = createHarness();
    harness.service.getRuntimeRegistration.mockReturnValue({ generation: 4, lifecycle });
    await harness.panel.create(snapshot());

    await harness.message({
      command: ExtensionCommand.startProjectOverviewRuntime,
      data: { projectId: 'project-id', snapshotGeneration: 1 },
    });

    expect(harness.retry).not.toHaveBeenCalled();
  });

  it('ignores start-runtime after disposal', async () => {
    const harness = createHarness();
    harness.service.getRuntimeRegistration.mockReturnValue(undefined);
    await harness.panel.create(snapshot(1, 0, ProjectOverviewRuntimeState.Unavailable));
    harness.dispose();

    await harness.message({
      command: ExtensionCommand.startProjectOverviewRuntime,
      data: { projectId: 'project-id', snapshotGeneration: 1 },
    });

    expect(harness.retry).not.toHaveBeenCalled();
  });

  it('coalesces duplicate start actions by publishing a new starting generation promptly', async () => {
    const harness = createHarness();
    harness.service.getRuntimeRegistration
      .mockReturnValueOnce({ generation: 4, lifecycle: 'stopped' })
      .mockReturnValue({ generation: 5, lifecycle: 'starting' });
    harness.retry.mockImplementation(async () => await harness.panel.showRuntimeStarting());
    await harness.panel.create(snapshot(1, 4, ProjectOverviewRuntimeState.Stopped));

    const action = {
      command: ExtensionCommand.startProjectOverviewRuntime,
      data: { projectId: 'project-id', snapshotGeneration: 1 },
    };
    await Promise.all([harness.message(action), harness.message(action)]);

    expect(harness.postMessage).toHaveBeenCalledWith({
      command: ExtensionCommand.updateProjectOverview,
      data: {
        snapshot: expect.objectContaining({
          lifecycle: ProjectOverviewLifecycle.Starting,
          runtime: { state: ProjectOverviewRuntimeState.Starting, generation: 5 },
          generation: 2,
        }),
      },
    });
    expect(harness.retry).toHaveBeenCalledTimes(1);
    expect(harness.retry).toHaveBeenCalledWith(false);
  });

  it('stops the running runtime and publishes a stopped snapshot promptly', async () => {
    const harness = createHarness();
    harness.service.refresh.mockResolvedValue(snapshot(2, 4, ProjectOverviewRuntimeState.Stopped));
    await harness.panel.create(snapshot());

    await harness.message({
      command: ExtensionCommand.stopProjectOverviewRuntime,
      data: { projectId: 'project-id', snapshotGeneration: 1 },
    });

    expect(harness.dependencies.stopRuntime).toHaveBeenCalledWith('D:\\Workspace\\LogicApp', 4);
    expect(harness.service.refresh).toHaveBeenCalledTimes(1);
    expect(harness.postMessage).toHaveBeenCalledWith({
      command: ExtensionCommand.updateProjectOverview,
      data: {
        snapshot: expect.objectContaining({
          lifecycle: ProjectOverviewLifecycle.RuntimeStopped,
          runtime: { state: ProjectOverviewRuntimeState.Stopped, generation: 4 },
          generation: 2,
        }),
      },
    });
    expect(harness.dependencies.setTimer).not.toHaveBeenCalled();
  });

  it('coalesces duplicate stop actions into one in-flight task stop', async () => {
    const harness = createHarness();
    let release: ((value: boolean) => void) | undefined;
    vi.mocked(harness.dependencies.stopRuntime).mockReturnValueOnce(new Promise((resolve) => (release = resolve)));
    harness.service.refresh.mockResolvedValue(snapshot(2, 4, ProjectOverviewRuntimeState.Stopped));
    await harness.panel.create(snapshot());
    const action = {
      command: ExtensionCommand.stopProjectOverviewRuntime,
      data: { projectId: 'project-id', snapshotGeneration: 1 },
    };

    const first = harness.message(action);
    const second = harness.message(action);
    release?.(true);
    await Promise.all([first, second]);

    expect(harness.dependencies.stopRuntime).toHaveBeenCalledTimes(1);
    expect(harness.service.refresh).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['wrong project', { projectId: 'other-project', snapshotGeneration: 1 }],
    ['stale snapshot', { projectId: 'project-id', snapshotGeneration: 0 }],
  ])('ignores a stop action for a %s', async (_name, data) => {
    const harness = createHarness();
    await harness.panel.create(snapshot());

    await harness.message({ command: ExtensionCommand.stopProjectOverviewRuntime, data });

    expect(harness.dependencies.stopRuntime).not.toHaveBeenCalled();
  });

  it.each(['starting', 'stopped', 'failed'] as const)('ignores stop-runtime while the runtime is %s', async (lifecycle) => {
    const harness = createHarness();
    harness.service.getRuntimeRegistration.mockReturnValue({ generation: 4, lifecycle });
    await harness.panel.create(
      snapshot(
        1,
        4,
        lifecycle === 'starting'
          ? ProjectOverviewRuntimeState.Starting
          : lifecycle === 'failed'
            ? ProjectOverviewRuntimeState.Error
            : ProjectOverviewRuntimeState.Stopped
      )
    );

    await harness.message({
      command: ExtensionCommand.stopProjectOverviewRuntime,
      data: { projectId: 'project-id', snapshotGeneration: 1 },
    });

    expect(harness.dependencies.stopRuntime).not.toHaveBeenCalled();
  });

  it('ignores stop-runtime after disposal', async () => {
    const harness = createHarness();
    await harness.panel.create(snapshot());
    harness.dispose();

    await harness.message({
      command: ExtensionCommand.stopProjectOverviewRuntime,
      data: { projectId: 'project-id', snapshotGeneration: 1 },
    });

    expect(harness.dependencies.stopRuntime).not.toHaveBeenCalled();
  });

  it('does not refresh when the tracked task no longer belongs to the project runtime', async () => {
    const harness = createHarness();
    vi.mocked(harness.dependencies.stopRuntime).mockResolvedValue(false);
    await harness.panel.create(snapshot());

    await harness.message({
      command: ExtensionCommand.stopProjectOverviewRuntime,
      data: { projectId: 'project-id', snapshotGeneration: 1 },
    });

    expect(harness.dependencies.stopRuntime).toHaveBeenCalledTimes(1);
    expect(harness.service.refresh).not.toHaveBeenCalled();
  });

  it('logs, surfaces, and refreshes after a stop failure', async () => {
    const harness = createHarness();
    vi.mocked(harness.dependencies.stopRuntime).mockRejectedValue(new Error('terminate failed'));
    await harness.panel.create(snapshot());

    await harness.message({
      command: ExtensionCommand.stopProjectOverviewRuntime,
      data: { projectId: 'project-id', snapshotGeneration: 1 },
    });

    expect(harness.dependencies.showError).toHaveBeenCalledWith('Failed to stop the project runtime: terminate failed');
    expect(harness.service.refresh).toHaveBeenCalledTimes(1);
  });

  it('ignores refresh results that arrive after disposal', async () => {
    const harness = createHarness();
    let release: ((value: any) => void) | undefined;
    harness.service.refresh.mockReturnValueOnce(new Promise((resolve) => (release = resolve)));
    await harness.panel.create(snapshot());

    const refresh = harness.message({
      command: ExtensionCommand.refreshProjectOverview,
      data: { projectId: 'project-id', snapshotGeneration: 1 },
    });
    harness.dispose();
    release?.(snapshot(2));
    await refresh;

    expect(harness.postMessage).not.toHaveBeenCalledWith({
      command: ExtensionCommand.updateProjectOverview,
      data: { snapshot: expect.objectContaining({ generation: 2 }) },
    });
  });

  it('invalidates callback data and old actions when the runtime generation changes', async () => {
    const harness = createHarness();
    let release: ((value: any) => void) | undefined;
    harness.service.getRuntimeRegistration.mockReturnValue({ generation: 5, lifecycle: 'starting' });
    harness.service.refresh.mockReturnValueOnce(new Promise((resolve) => (release = resolve)));
    await harness.panel.create(snapshot());

    const refresh = harness.message({
      command: ExtensionCommand.refreshProjectOverview,
      data: { projectId: 'project-id', snapshotGeneration: 1 },
    });
    await harness.message({
      command: ExtensionCommand.copyProjectOverviewCallback,
      data: { projectId: 'project-id', snapshotGeneration: 1, workflowId: 'workflow-id' },
    });

    expect(harness.postMessage).toHaveBeenCalledWith({
      command: ExtensionCommand.updateProjectOverview,
      data: {
        snapshot: expect.objectContaining({
          generation: 2,
          isRefreshing: true,
          runtime: { state: ProjectOverviewRuntimeState.Starting, generation: 5 },
          workflows: [expect.objectContaining({ callback: { availability: ProjectOverviewCallbackAvailability.RuntimeUnavailable } })],
        }),
      },
    });
    expect(harness.dependencies.writeClipboard).not.toHaveBeenCalled();

    release?.({ ...snapshot(2, 5), runtime: { state: ProjectOverviewRuntimeState.Running, generation: 5 } });
    await refresh;
  });
});
