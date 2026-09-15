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
  type ProjectOverviewMessageToExtension,
  type ProjectOverviewMessageToWebview,
  type ProjectOverviewProjectId,
  type ProjectOverviewRunId,
  type ProjectOverviewSnapshot,
  type ProjectOverviewWorkflowId,
} from '../../../index';
import { describe, expect, it } from 'vitest';

describe('project overview public protocol', () => {
  it('exports the lifecycle and availability vocabulary from the package root', () => {
    expect(ProjectOverviewLifecycle).toEqual({
      Starting: 'starting',
      Ready: 'ready',
      Partial: 'partial',
      Error: 'error',
      RuntimeStopped: 'runtimeStopped',
    });
    expect(ProjectOverviewRuntimeState.Running).toBe('running');
    expect(ProjectOverviewWorkflowSourceState.Invalid).toBe('invalid');
    expect(ProjectOverviewWorkflowRuntimeState.NotRegistered).toBe('notRegistered');
    expect(ProjectOverviewWorkflowKind.Codeful).toBe('codeful');
    expect(ProjectOverviewWorkflowRunMode.Stateless).toBe('stateless');
    expect(ProjectOverviewCallbackAvailability.QueryFailed).toBe('queryFailed');
    expect(ProjectOverviewLatestRunAvailability.StatelessHistoryUnavailable).toBe('statelessHistoryUnavailable');
  });

  it('keeps host and webview commands aligned with the typed public message unions', () => {
    const projectId = 'project-id' as ProjectOverviewProjectId;
    const workflowId = 'workflow-id' as ProjectOverviewWorkflowId;
    const runId = 'run-id' as ProjectOverviewRunId;
    const snapshot: ProjectOverviewSnapshot = {
      projectId,
      projectName: 'LogicApp',
      lifecycle: ProjectOverviewLifecycle.Ready,
      runtime: { state: ProjectOverviewRuntimeState.Running, generation: 2 },
      generation: 4,
      generatedAt: '2026-09-14T00:00:00.000Z',
      isRefreshing: false,
      workflows: [],
      errors: [],
    };
    const toWebview: ProjectOverviewMessageToWebview = {
      command: ExtensionCommand.initializeProjectOverview,
      data: { snapshot, visible: true },
    };
    const toExtension: ProjectOverviewMessageToExtension = {
      command: ExtensionCommand.stopProjectOverviewRuntime,
      data: { projectId, snapshotGeneration: 4 },
    };

    expect(toWebview.command).toBe('initializeProjectOverview');
    expect(toExtension).toEqual({
      command: 'stopProjectOverviewRuntime',
      data: { projectId, snapshotGeneration: 4 },
    });
    const workflowAction: ProjectOverviewMessageToExtension = {
      command: ExtensionCommand.openWorkflowOverview,
      data: { projectId, snapshotGeneration: 4, workflowId },
    };
    expect(workflowAction.command).toBe('openWorkflowOverview');
    const cancelRunAction: ProjectOverviewMessageToExtension = {
      command: ExtensionCommand.cancelProjectOverviewRun,
      data: { projectId, snapshotGeneration: 4, workflowId, runId },
    };
    expect(cancelRunAction).toEqual({
      command: 'cancelProjectOverviewRun',
      data: { projectId, snapshotGeneration: 4, workflowId, runId },
    });
    expect(ExtensionCommand).toMatchObject({
      updateProjectOverview: 'updateProjectOverview',
      refreshProjectOverview: 'refreshProjectOverview',
      retryProjectOverview: 'retryProjectOverview',
      startProjectOverviewRuntime: 'startProjectOverviewRuntime',
      stopProjectOverviewRuntime: 'stopProjectOverviewRuntime',
      cancelProjectOverviewRun: 'cancelProjectOverviewRun',
      openLatestProjectOverviewRun: 'openLatestProjectOverviewRun',
      copyProjectOverviewCallback: 'copyProjectOverviewCallback',
      copyWorkflowOverviewCallback: 'copyWorkflowOverviewCallback',
      projectOverviewVisibilityChanged: 'projectOverviewVisibilityChanged',
    });
  });
});
