/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { ProjectOverviewLifecycle, ProjectOverviewRuntimeState } from '@microsoft/vscode-extension-logic-apps';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as vscode from 'vscode';
import type { ProjectRuntimeRegistration } from '../../../../utils/funcCoreTools/projectRuntimeRegistry';
import {
  openProjectOverview,
  openProjectOverviewForDebugInvocation,
  resetProjectOverviewStateForTests,
  type OpenProjectOverviewDependencies,
} from '../openProjectOverview';

vi.mock('vscode', () => ({
  Uri: { file: (fsPath: string) => ({ fsPath }) },
  ProgressLocation: { Notification: 15 },
  window: { withProgress: vi.fn() },
}));

vi.mock('../../../../../localize', () => ({
  localize: (_key: string, value: string) => value,
}));

vi.mock('../../../../utils/funcCoreTools/projectRuntimeRegistry', () => ({
  getCanonicalProjectId: (value: string) => value.toLowerCase(),
  projectRuntimeRegistry: { get: vi.fn() },
}));

const projectPath = 'D:\\Workspace\\LogicApp';
const context = { telemetry: { properties: {}, measurements: {} } } as any;

function registration(lifecycle: ProjectRuntimeRegistration['lifecycle'], generation = 1): ProjectRuntimeRegistration {
  return {
    projectId: projectPath.toLowerCase(),
    projectUri: projectPath,
    workspaceFolderUri: 'D:\\Workspace',
    generation,
    lifecycle,
    port: 7071,
    cancellationRequested: false,
    startedAt: 1,
    updatedAt: 1,
  };
}

function snapshot(generation: number, lifecycle = ProjectOverviewLifecycle.Ready) {
  return {
    projectId: 'project-id',
    projectName: 'LogicApp',
    lifecycle,
    runtime: { state: ProjectOverviewRuntimeState.Running, generation: 1 },
    generation,
    generatedAt: new Date(0).toISOString(),
    isRefreshing: false,
    workflows: [],
    errors: [],
  } as any;
}

function createHarness() {
  const service = {
    projectId: 'project-id',
    refresh: vi.fn().mockResolvedValue(snapshot(1)),
  } as any;
  let retry: (() => Promise<void>) | undefined;
  let dispose: (() => void) | undefined;
  const panel = {
    isDisposed: false,
    create: vi.fn(),
    showSnapshot: vi.fn(),
    showRuntimeStarting: vi.fn(),
    reveal: vi.fn(),
    discoverSnapshot: vi.fn(async () => await service.refresh()),
    currentSnapshot: undefined,
    projectId: 'project-id',
  } as any;
  const dependencies: OpenProjectOverviewDependencies = {
    isProject: vi.fn().mockResolvedValue(true),
    isCodeful: vi.fn().mockResolvedValue(false),
    getWorkspaceFolder: vi.fn().mockReturnValue({ uri: { fsPath: 'D:\\Workspace' } }),
    getRuntime: vi.fn().mockReturnValue(registration('running')),
    getActiveDebugInvocationId: vi.fn().mockReturnValue(undefined),
    isDebugInvocationCurrent: vi.fn().mockReturnValue(true),
    launchDebugger: vi.fn(),
    createDataService: vi.fn().mockReturnValue(service),
    createPanel: vi.fn((_context, _projectPath, _service, retryCallback, disposeCallback) => {
      retry = retryCallback;
      dispose = disposeCallback;
      return panel;
    }),
    wait: vi.fn().mockResolvedValue(undefined),
    now: vi.fn().mockReturnValue(1),
    withProgress: vi.fn(async (_options, task) => await task()),
  };
  return { service, panel, dependencies, getRetry: () => retry!, dispose: () => dispose?.() };
}

describe('openProjectOverview', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetProjectOverviewStateForTests();
  });

  it('validates only the explicitly selected project root', async () => {
    const harness = createHarness();
    vi.mocked(harness.dependencies.isProject).mockResolvedValue(false);

    await expect(openProjectOverview(context, vscode.Uri.file('D:\\Workspace') as any, undefined, harness.dependencies)).rejects.toThrow(
      'not a Logic Apps Standard project root'
    );
    expect(harness.dependencies.getWorkspaceFolder).not.toHaveBeenCalled();
    expect(harness.dependencies.createPanel).not.toHaveBeenCalled();
  });

  it('does not interpret the tree wrapper selected-nodes argument as dependencies', async () => {
    const harness = createHarness();
    const node = vscode.Uri.file(projectPath) as any;

    await openProjectOverview(context, node, [node], harness.dependencies);

    expect(harness.dependencies.isProject).toHaveBeenCalledWith(projectPath);
    expect(harness.dependencies.createPanel).toHaveBeenCalledTimes(1);
  });

  it('rejects a valid project root outside the open workspace', async () => {
    const harness = createHarness();
    vi.mocked(harness.dependencies.getWorkspaceFolder).mockReturnValue(undefined);

    await expect(openProjectOverview(context, vscode.Uri.file(projectPath) as any, undefined, harness.dependencies)).rejects.toThrow(
      'must be inside an open workspace folder'
    );
    expect(harness.dependencies.createPanel).not.toHaveBeenCalled();
  });

  it('opens immediately for the matching ready runtime and supports codeful projects', async () => {
    const harness = createHarness();
    vi.mocked(harness.dependencies.isCodeful).mockResolvedValue(true);

    await openProjectOverview(context, vscode.Uri.file(projectPath) as any, undefined, harness.dependencies);

    expect(harness.dependencies.createDataService).toHaveBeenCalledWith(context, projectPath, 'codeful');
    expect(harness.dependencies.launchDebugger).not.toHaveBeenCalled();
    expect(harness.panel.create).toHaveBeenCalledWith(expect.objectContaining({ lifecycle: ProjectOverviewLifecycle.Ready }));
  });

  it('waits for a starting runtime to produce two stable snapshots before opening', async () => {
    const harness = createHarness();
    vi.mocked(harness.dependencies.getRuntime).mockReturnValueOnce(registration('starting')).mockReturnValue(registration('running'));
    harness.panel.discoverSnapshot.mockResolvedValueOnce(snapshot(1)).mockResolvedValueOnce(snapshot(2));

    await openProjectOverview(context, vscode.Uri.file(projectPath) as any, undefined, harness.dependencies);

    expect(harness.dependencies.launchDebugger).not.toHaveBeenCalled();
    expect(harness.panel.discoverSnapshot).toHaveBeenCalledTimes(2);
    expect(harness.panel.showSnapshot).toHaveBeenCalledWith(expect.objectContaining({ generation: 2 }));
  });

  it('opens a fatal panel after startup failure and retries with a new coalesced attempt', async () => {
    const harness = createHarness();
    vi.mocked(harness.dependencies.getRuntime).mockReturnValue(undefined);
    vi.mocked(harness.dependencies.launchDebugger).mockRejectedValueOnce(new Error('startup failed'));
    harness.panel.discoverSnapshot.mockResolvedValue(snapshot(1, ProjectOverviewLifecycle.Partial));

    await openProjectOverview(context, vscode.Uri.file(projectPath) as any, undefined, harness.dependencies);

    expect(harness.panel.showSnapshot).toHaveBeenCalledWith(
      expect.objectContaining({
        lifecycle: ProjectOverviewLifecycle.Error,
        errors: [expect.objectContaining({ code: 'runtimeStartupFailed', message: 'startup failed' })],
      })
    );

    vi.mocked(harness.dependencies.getRuntime).mockReturnValue(registration('running', 2));
    harness.panel.discoverSnapshot.mockResolvedValue({
      ...snapshot(3),
      runtime: { state: ProjectOverviewRuntimeState.Running, generation: 2 },
    });
    vi.mocked(harness.dependencies.launchDebugger).mockResolvedValue(undefined);
    vi.mocked(harness.dependencies.launchDebugger).mockClear();
    await Promise.all([harness.getRetry()(), harness.getRetry()()]);

    expect(harness.dependencies.launchDebugger).toHaveBeenCalledTimes(1);
    expect(harness.panel.showRuntimeStarting).toHaveBeenCalledTimes(2);
    expect(harness.panel.showSnapshot).toHaveBeenLastCalledWith(expect.objectContaining({ lifecycle: ProjectOverviewLifecycle.Ready }));
  });

  it('coalesces repeated panel startup requests and publishes starting before launch', async () => {
    const harness = createHarness();
    let releaseLaunch: (() => void) | undefined;
    vi.mocked(harness.dependencies.getRuntime).mockReturnValue(undefined);
    vi.mocked(harness.dependencies.launchDebugger).mockReturnValue(
      new Promise<void>((resolve) => {
        releaseLaunch = resolve;
      })
    );

    const opening = openProjectOverview(context, vscode.Uri.file(projectPath) as any, undefined, harness.dependencies);
    await vi.waitFor(() => expect(harness.dependencies.launchDebugger).toHaveBeenCalledTimes(1));
    const retries = [harness.getRetry()(), harness.getRetry()()];
    expect(harness.panel.showRuntimeStarting).toHaveBeenCalledBefore(vi.mocked(harness.dependencies.launchDebugger));

    vi.mocked(harness.dependencies.getRuntime).mockReturnValue(registration('running', 2));
    harness.panel.discoverSnapshot.mockResolvedValue({
      ...snapshot(3),
      runtime: { state: ProjectOverviewRuntimeState.Running, generation: 2 },
    });
    releaseLaunch?.();
    await Promise.all([opening, ...retries]);

    expect(harness.dependencies.launchDebugger).toHaveBeenCalledTimes(1);
    expect(harness.panel.showSnapshot).toHaveBeenLastCalledWith(expect.objectContaining({ lifecycle: ProjectOverviewLifecycle.Ready }));
  });

  it('reuses a canonical project panel and allows a replacement after disposal', async () => {
    const first = createHarness();
    await openProjectOverview(context, vscode.Uri.file(projectPath) as any, undefined, first.dependencies);
    await openProjectOverview(context, vscode.Uri.file(projectPath.toLowerCase()) as any, undefined, first.dependencies);

    expect(first.dependencies.createPanel).toHaveBeenCalledTimes(1);
    expect(first.panel.reveal).toHaveBeenCalledTimes(1);

    first.dispose();
    const second = createHarness();
    await openProjectOverview(context, vscode.Uri.file(projectPath) as any, undefined, second.dependencies);
    expect(second.dependencies.createPanel).toHaveBeenCalledTimes(1);
  });

  it('opens once per debug invocation after two stable ready snapshots', async () => {
    const harness = createHarness();
    const debugInvocationId = `${projectPath.toLowerCase()}#debug-1`;
    vi.mocked(harness.dependencies.getRuntime).mockReturnValue({
      ...registration('running'),
      debugInvocationId,
    });

    await Promise.all([
      openProjectOverviewForDebugInvocation(context, projectPath, debugInvocationId, harness.dependencies),
      openProjectOverviewForDebugInvocation(context, projectPath, debugInvocationId, harness.dependencies),
    ]);
    await openProjectOverviewForDebugInvocation(context, projectPath, debugInvocationId, harness.dependencies);

    expect(harness.service.refresh).toHaveBeenCalledTimes(2);
    expect(harness.dependencies.createPanel).toHaveBeenCalledTimes(1);
    expect(harness.panel.showSnapshot).toHaveBeenCalledTimes(1);
  });

  it('keeps one codeful panel across multiple debug attach invocations', async () => {
    const harness = createHarness();
    vi.mocked(harness.dependencies.isCodeful).mockResolvedValue(true);
    const firstInvocation = `${projectPath.toLowerCase()}#debug-1`;
    const secondInvocation = `${projectPath.toLowerCase()}#debug-2`;
    vi.mocked(harness.dependencies.getRuntime).mockReturnValue({
      ...registration('running', 1),
      debugInvocationId: firstInvocation,
    });

    await openProjectOverviewForDebugInvocation(context, projectPath, firstInvocation, harness.dependencies);
    vi.mocked(harness.dependencies.getRuntime).mockReturnValue({
      ...registration('running', 2),
      debugInvocationId: secondInvocation,
    });
    harness.service.refresh.mockResolvedValue({
      ...snapshot(2),
      runtime: { state: ProjectOverviewRuntimeState.Running, generation: 2 },
    });
    await openProjectOverviewForDebugInvocation(context, projectPath, secondInvocation, harness.dependencies);
    await openProjectOverviewForDebugInvocation(context, projectPath, secondInvocation, harness.dependencies);

    expect(harness.dependencies.createDataService).toHaveBeenCalledTimes(2);
    expect(harness.dependencies.createDataService).toHaveBeenNthCalledWith(1, context, projectPath, 'codeful');
    expect(harness.dependencies.createDataService).toHaveBeenNthCalledWith(2, context, projectPath, 'codeful');
    expect(harness.dependencies.createPanel).toHaveBeenCalledTimes(1);
    expect(harness.panel.showSnapshot).toHaveBeenCalledTimes(2);
  });

  it('reuses a panel manually opened while debug startup is pending', async () => {
    const harness = createHarness();
    const debugInvocationId = `${projectPath.toLowerCase()}#debug-1`;
    vi.mocked(harness.dependencies.getRuntime).mockReturnValue({
      ...registration('running'),
      debugInvocationId,
    });

    await openProjectOverview(context, vscode.Uri.file(projectPath) as any, undefined, harness.dependencies);
    await openProjectOverviewForDebugInvocation(context, projectPath, debugInvocationId, harness.dependencies);

    expect(harness.dependencies.createPanel).toHaveBeenCalledTimes(1);
    expect(harness.dependencies.launchDebugger).not.toHaveBeenCalled();
    expect(harness.panel.showSnapshot).toHaveBeenCalledTimes(1);
  });

  it('joins a pending debug invocation instead of launching a duplicate debug session', async () => {
    const harness = createHarness();
    const debugInvocationId = `${projectPath.toLowerCase()}#debug-1`;
    vi.mocked(harness.dependencies.getActiveDebugInvocationId).mockReturnValue(debugInvocationId);
    vi.mocked(harness.dependencies.getRuntime)
      .mockReturnValueOnce(undefined)
      .mockReturnValueOnce(undefined)
      .mockReturnValue({
        ...registration('running'),
        debugInvocationId,
      });

    await openProjectOverview(context, vscode.Uri.file(projectPath) as any, undefined, harness.dependencies);

    expect(harness.dependencies.launchDebugger).not.toHaveBeenCalled();
    expect(harness.dependencies.createPanel).toHaveBeenCalledTimes(1);
    expect(harness.panel.showSnapshot).toHaveBeenCalledTimes(1);
  });

  it('does not reopen after the manually opened panel is closed while readiness is pending', async () => {
    const harness = createHarness();
    const debugInvocationId = `${projectPath.toLowerCase()}#debug-1`;
    let releaseWait: (() => void) | undefined;
    const pendingWait = new Promise<void>((resolve) => {
      releaseWait = resolve;
    });
    vi.mocked(harness.dependencies.wait).mockReturnValueOnce(pendingWait).mockResolvedValue(undefined);
    vi.mocked(harness.dependencies.getRuntime).mockReturnValue({
      ...registration('running'),
      debugInvocationId,
    });

    const autoOpen = openProjectOverviewForDebugInvocation(context, projectPath, debugInvocationId, harness.dependencies);
    await vi.waitFor(() => expect(harness.service.refresh).toHaveBeenCalledTimes(1));
    await openProjectOverview(context, vscode.Uri.file(projectPath) as any, undefined, harness.dependencies);
    harness.dispose();
    releaseWait?.();
    await autoOpen;

    expect(harness.dependencies.createPanel).toHaveBeenCalledTimes(1);
    expect(harness.panel.showSnapshot).not.toHaveBeenCalled();
  });

  it('suppresses auto-open after cancellation, failed readiness, or a stale generation', async () => {
    const cancelled = createHarness();
    const debugInvocationId = `${projectPath.toLowerCase()}#debug-1`;
    vi.mocked(cancelled.dependencies.getRuntime).mockReturnValue({
      ...registration('cancelled'),
      debugInvocationId,
    });
    await openProjectOverviewForDebugInvocation(context, projectPath, debugInvocationId, cancelled.dependencies);
    expect(cancelled.dependencies.createPanel).not.toHaveBeenCalled();

    resetProjectOverviewStateForTests();
    const stale = createHarness();
    vi.mocked(stale.dependencies.getRuntime)
      .mockReturnValueOnce({ ...registration('running', 1), debugInvocationId })
      .mockReturnValue({ ...registration('running', 2), debugInvocationId });
    await openProjectOverviewForDebugInvocation(context, projectPath, debugInvocationId, stale.dependencies);
    expect(stale.dependencies.createPanel).not.toHaveBeenCalled();

    resetProjectOverviewStateForTests();
    const failed = createHarness();
    vi.mocked(failed.dependencies.getRuntime).mockReturnValue({
      ...registration('failed'),
      debugInvocationId,
    });
    await openProjectOverviewForDebugInvocation(context, projectPath, debugInvocationId, failed.dependencies);
    expect(failed.dependencies.createPanel).not.toHaveBeenCalled();
  });

  it('times out readiness without creating an auto-open panel', async () => {
    const harness = createHarness();
    const debugInvocationId = `${projectPath.toLowerCase()}#debug-1`;
    vi.mocked(harness.dependencies.getRuntime).mockReturnValue({
      ...registration('starting'),
      debugInvocationId,
    });
    let now = 0;
    vi.mocked(harness.dependencies.now).mockImplementation(() => {
      now += 60_000;
      return now;
    });

    await openProjectOverviewForDebugInvocation(context, projectPath, debugInvocationId, harness.dependencies);

    expect(harness.dependencies.createPanel).not.toHaveBeenCalled();
    expect(harness.dependencies.wait).toHaveBeenCalled();
  });

  it('keeps debug overview invocations for separate projects independent', async () => {
    const first = createHarness();
    const second = createHarness();
    const secondProjectPath = 'D:\\Workspace\\OtherLogicApp';
    const firstInvocation = `${projectPath.toLowerCase()}#debug-1`;
    const secondInvocation = `${secondProjectPath.toLowerCase()}#debug-2`;
    vi.mocked(first.dependencies.getRuntime).mockReturnValue({ ...registration('running'), debugInvocationId: firstInvocation });
    vi.mocked(second.dependencies.getRuntime).mockReturnValue({
      ...registration('running'),
      projectId: secondProjectPath.toLowerCase(),
      projectUri: secondProjectPath,
      debugInvocationId: secondInvocation,
    });

    await Promise.all([
      openProjectOverviewForDebugInvocation(context, projectPath, firstInvocation, first.dependencies),
      openProjectOverviewForDebugInvocation(context, secondProjectPath, secondInvocation, second.dependencies),
    ]);

    expect(first.dependencies.createPanel).toHaveBeenCalledTimes(1);
    expect(second.dependencies.createPanel).toHaveBeenCalledTimes(1);
  });
});
