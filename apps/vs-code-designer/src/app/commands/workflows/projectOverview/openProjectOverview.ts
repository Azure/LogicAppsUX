/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import {
  ProjectOverviewErrorAction,
  ProjectOverviewErrorScope,
  ProjectOverviewLifecycle,
  ProjectOverviewRuntimeState,
  type ProjectOverviewSnapshot,
} from '@microsoft/vscode-extension-logic-apps';
import type { IActionContext } from '@microsoft/vscode-azext-utils';
import * as path from 'path';
import * as vscode from 'vscode';
import { localize } from '../../../../localize';
import { hasCodefulSdkReference } from '../../../utils/codeful';
import { delay } from '../../../utils/delay';
import {
  getCanonicalProjectId,
  projectRuntimeRegistry,
  type ProjectRuntimeRegistration,
} from '../../../utils/funcCoreTools/projectRuntimeRegistry';
import { isLogicAppProject } from '../../../utils/verifyIsProject';
import { launchProjectDebugger } from '../../../utils/vsCodeConfig/launch';
import { getContainingWorkspaceFolder } from '../../../utils/workspace';
import { LocalProjectOverviewPanel } from './panels/localProjectOverviewPanel';
import { ProjectOverviewDataService, type ProjectOverviewProjectKind } from './services/projectOverviewDataService';

const readinessTimeoutMs = 4 * 60 * 1000;
const readinessPollMs = 500;

export interface OpenProjectOverviewDependencies {
  isProject(projectPath: string): Promise<boolean>;
  isCodeful(projectPath: string): Promise<boolean>;
  getWorkspaceFolder(projectPath: string): vscode.WorkspaceFolder | undefined;
  getRuntime(projectPath: string): ProjectRuntimeRegistration | undefined;
  getActiveDebugInvocationId(projectPath: string): string | undefined;
  isDebugInvocationCurrent(projectPath: string, debugInvocationId: string, generation?: number): boolean;
  launchDebugger(context: IActionContext, projectPath: string): Promise<void>;
  createDataService(context: IActionContext, projectPath: string, kind: ProjectOverviewProjectKind): ProjectOverviewDataService;
  createPanel(
    context: IActionContext,
    projectPath: string,
    service: ProjectOverviewDataService,
    retry: () => Promise<void>,
    onDispose: () => void
  ): LocalProjectOverviewPanel;
  wait(milliseconds: number): Promise<void>;
  now(): number;
  withProgress<T>(options: vscode.ProgressOptions, task: () => Thenable<T>): Thenable<T>;
}

const defaultDependencies: OpenProjectOverviewDependencies = {
  isProject: isLogicAppProject,
  isCodeful: hasCodefulSdkReference,
  getWorkspaceFolder: getContainingWorkspaceFolder,
  getRuntime: (projectPath) => projectRuntimeRegistry.get(projectPath),
  getActiveDebugInvocationId: (projectPath) => projectRuntimeRegistry.getActiveDebugInvocationId(projectPath),
  isDebugInvocationCurrent: (projectPath, debugInvocationId, generation) =>
    projectRuntimeRegistry.isDebugInvocationCurrent(projectPath, debugInvocationId, generation),
  launchDebugger: launchProjectDebugger,
  createDataService: (context, projectPath, kind) => new ProjectOverviewDataService(context, projectPath, kind),
  createPanel: (context, projectPath, service, retry, onDispose) =>
    new LocalProjectOverviewPanel(context, projectPath, service, retry, onDispose),
  wait: delay,
  now: Date.now,
  withProgress: async (options, task) => await vscode.window.withProgress(options, task),
};

const panels = new Map<string, LocalProjectOverviewPanel>();
const startupAttempts = new Map<string, { generation: number; promise: Promise<ProjectOverviewSnapshot> }>();
const panelStartupAttempts = new Map<string, Promise<void>>();
const panelCloseRevisions = new Map<string, number>();
const debugOverviewAttempts = new Map<string, Promise<void>>();
const handledDebugOverviewInvocations = new Set<string>();

export async function openProjectOverview(
  context: IActionContext,
  node: vscode.Uri | undefined,
  _nodes?: readonly vscode.Uri[],
  dependencies: OpenProjectOverviewDependencies = defaultDependencies
): Promise<void> {
  const projectPath = node?.fsPath;
  if (!projectPath || !(await dependencies.isProject(projectPath))) {
    throw new Error(
      localize(
        'projectOverviewInvalidRoot',
        'The selected folder is not a Logic Apps Standard project root. Select the project folder that directly contains the workflows.'
      )
    );
  }
  if (!dependencies.getWorkspaceFolder(projectPath)) {
    throw new Error(
      localize('projectOverviewOutsideWorkspace', 'The selected Logic Apps project must be inside an open workspace folder.')
    );
  }

  const projectKey = getCanonicalProjectId(projectPath);
  const existingPanel = panels.get(projectKey);
  if (existingPanel && !existingPanel.isDisposed) {
    existingPanel.reveal();
    return;
  }

  const kind: ProjectOverviewProjectKind = (await dependencies.isCodeful(projectPath)) ? 'codeful' : 'codeless';
  const service = dependencies.createDataService(context, projectPath, kind);
  const panel = createTrackedPanel(context, projectPath, projectKey, service, dependencies);
  panels.set(projectKey, panel);
  await panel.create(await service.refresh());

  const registration = dependencies.getRuntime(projectPath);
  if (registration?.lifecycle === 'running') {
    return;
  }

  await startAndOpenProject(context, projectPath, panel, dependencies, false);
}

export function openProjectOverviewForDebugInvocation(
  context: IActionContext,
  projectPath: string,
  debugInvocationId: string,
  dependencies: OpenProjectOverviewDependencies = defaultDependencies
): Promise<void> {
  const existingAttempt = debugOverviewAttempts.get(debugInvocationId);
  if (existingAttempt) {
    return existingAttempt;
  }
  if (handledDebugOverviewInvocations.has(debugInvocationId)) {
    return Promise.resolve();
  }

  handledDebugOverviewInvocations.add(debugInvocationId);
  const attempt = openProjectOverviewForDebugInvocationCore(context, projectPath, debugInvocationId, dependencies).finally(() => {
    if (debugOverviewAttempts.get(debugInvocationId) === attempt) {
      debugOverviewAttempts.delete(debugInvocationId);
    }
  });
  debugOverviewAttempts.set(debugInvocationId, attempt);
  return attempt;
}

async function openProjectOverviewForDebugInvocationCore(
  context: IActionContext,
  projectPath: string,
  debugInvocationId: string,
  dependencies: OpenProjectOverviewDependencies
): Promise<void> {
  const registration = dependencies.getRuntime(projectPath);
  if (
    !registration ||
    registration.debugInvocationId !== debugInvocationId ||
    !dependencies.isDebugInvocationCurrent(projectPath, debugInvocationId, registration.generation)
  ) {
    return;
  }

  const projectKey = getCanonicalProjectId(projectPath);
  const generation = registration.generation;
  const closeRevision = panelCloseRevisions.get(projectKey) ?? 0;
  const kind: ProjectOverviewProjectKind = (await dependencies.isCodeful(projectPath)) ? 'codeful' : 'codeless';
  const service = dependencies.createDataService(context, projectPath, kind);

  try {
    const snapshot = await getStableReadinessAttempt(projectPath, generation, service.refresh.bind(service), dependencies, {
      debugInvocationId,
    });
    if (
      !dependencies.isDebugInvocationCurrent(projectPath, debugInvocationId, generation) ||
      (panelCloseRevisions.get(projectKey) ?? 0) !== closeRevision
    ) {
      return;
    }

    let panel = panels.get(projectKey);
    if (panel?.isDisposed) {
      return;
    }
    if (!panel) {
      panel = createTrackedPanel(context, projectPath, projectKey, service, dependencies);
      panels.set(projectKey, panel);
    }
    await panel.showSnapshot(snapshot);
  } catch {
    // Debug startup and attach behavior must not fail because the optional project overview could not become ready.
  }
}

async function startAndOpenProject(
  context: IActionContext,
  projectPath: string,
  panel: LocalProjectOverviewPanel,
  dependencies: OpenProjectOverviewDependencies,
  forceRestart: boolean
): Promise<void> {
  const projectKey = getCanonicalProjectId(projectPath);
  const existingAttempt = panelStartupAttempts.get(projectKey);
  if (existingAttempt) {
    return await existingAttempt;
  }
  const attempt = startAndOpenProjectCore(context, projectPath, panel, dependencies, forceRestart).finally(() => {
    if (panelStartupAttempts.get(projectKey) === attempt) {
      panelStartupAttempts.delete(projectKey);
    }
  });
  panelStartupAttempts.set(projectKey, attempt);
  return await attempt;
}

async function startAndOpenProjectCore(
  context: IActionContext,
  projectPath: string,
  panel: LocalProjectOverviewPanel,
  dependencies: OpenProjectOverviewDependencies,
  forceRestart: boolean
): Promise<void> {
  await panel.showRuntimeStarting();
  if (panel.isDisposed) {
    return;
  }
  await dependencies.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: localize('projectOverviewStarting', 'Starting Logic Apps project runtime...'),
      cancellable: false,
    },
    async () => {
      try {
        let registration = dependencies.getRuntime(projectPath);
        const debugStartupPending = dependencies.getActiveDebugInvocationId(projectPath) !== undefined;
        if (forceRestart || (!debugStartupPending && registration?.lifecycle !== 'starting' && registration?.lifecycle !== 'running')) {
          await dependencies.launchDebugger(context, projectPath);
          registration = dependencies.getRuntime(projectPath);
        }
        if (!registration) {
          registration = await waitForRuntimeRegistration(projectPath, dependencies);
        }
        const snapshot = await getStableReadinessAttempt(
          projectPath,
          registration.generation,
          panel.discoverSnapshot.bind(panel),
          dependencies
        );
        if (!panel.isDisposed) {
          await panel.showSnapshot(snapshot);
        }
      } catch (error) {
        if (!panel.isDisposed) {
          const discovered = await panelSnapshotAfterFailure(panel, projectPath);
          await panel.showSnapshot({
            ...discovered,
            lifecycle: ProjectOverviewLifecycle.Error,
            runtime: {
              state: ProjectOverviewRuntimeState.Error,
              generation: dependencies.getRuntime(projectPath)?.generation ?? discovered.runtime.generation,
            },
            errors: [
              {
                code: 'runtimeStartupFailed',
                message: error instanceof Error ? error.message : String(error),
                scope: ProjectOverviewErrorScope.Project,
                retryable: true,
                action: ProjectOverviewErrorAction.Retry,
              },
            ],
          });
        }
      }
    }
  );
}

function getStableReadinessAttempt(
  projectPath: string,
  generation: number,
  discoverSnapshot: () => Promise<ProjectOverviewSnapshot>,
  dependencies: OpenProjectOverviewDependencies,
  identity?: { debugInvocationId: string }
): Promise<ProjectOverviewSnapshot> {
  const projectKey = getCanonicalProjectId(projectPath);
  const existing = startupAttempts.get(projectKey);
  if (existing?.generation === generation) {
    return existing.promise;
  }

  const promise = waitForStableReadiness(projectPath, generation, discoverSnapshot, dependencies, identity).finally(() => {
    if (startupAttempts.get(projectKey)?.promise === promise) {
      startupAttempts.delete(projectKey);
    }
  });
  startupAttempts.set(projectKey, { generation, promise });
  return promise;
}

async function waitForStableReadiness(
  projectPath: string,
  expectedGeneration: number,
  discoverSnapshot: () => Promise<ProjectOverviewSnapshot>,
  dependencies: OpenProjectOverviewDependencies,
  identity?: { debugInvocationId: string }
): Promise<ProjectOverviewSnapshot> {
  const deadline = dependencies.now() + readinessTimeoutMs;
  let stableSnapshot: ProjectOverviewSnapshot | undefined;

  while (dependencies.now() < deadline) {
    const registration = dependencies.getRuntime(projectPath);
    if (
      identity &&
      (!dependencies.isDebugInvocationCurrent(projectPath, identity.debugInvocationId, expectedGeneration) ||
        registration?.debugInvocationId !== identity.debugInvocationId)
    ) {
      throw new Error(
        localize('projectOverviewDebugInvocationEnded', 'The Logic Apps debug invocation ended before the project became ready.')
      );
    }
    if (registration?.lifecycle === 'failed' || registration?.lifecycle === 'cancelled' || registration?.lifecycle === 'stopped') {
      throw new Error(localize('projectOverviewRuntimeStopped', 'The Logic Apps project runtime stopped before it became ready.'));
    }
    if (registration && registration.generation !== expectedGeneration) {
      throw new Error(localize('projectOverviewRuntimeSuperseded', 'A newer Logic Apps project runtime replaced this startup attempt.'));
    }

    if (registration?.lifecycle === 'running') {
      const snapshot = await discoverSnapshot();
      const isStableLifecycle =
        snapshot.runtime.state === ProjectOverviewRuntimeState.Running &&
        (snapshot.lifecycle === ProjectOverviewLifecycle.Ready || snapshot.lifecycle === ProjectOverviewLifecycle.Partial);
      if (isStableLifecycle && snapshot.runtime.generation === registration.generation) {
        if (stableSnapshot?.runtime.generation === snapshot.runtime.generation) {
          return snapshot;
        }
        stableSnapshot = snapshot;
      } else {
        stableSnapshot = undefined;
      }
    }
    await dependencies.wait(readinessPollMs);
  }

  throw new Error(localize('projectOverviewReadinessTimeout', 'Timed out waiting for the Logic Apps project runtime to become ready.'));
}

async function waitForRuntimeRegistration(
  projectPath: string,
  dependencies: OpenProjectOverviewDependencies
): Promise<ProjectRuntimeRegistration> {
  const deadline = dependencies.now() + readinessTimeoutMs;
  while (dependencies.now() < deadline) {
    const registration = dependencies.getRuntime(projectPath);
    if (registration) {
      return registration;
    }
    if (!dependencies.getActiveDebugInvocationId(projectPath)) {
      break;
    }
    await dependencies.wait(readinessPollMs);
  }
  throw new Error(localize('projectOverviewRuntimeMissing', 'The Logic Apps project runtime did not start.'));
}

function createTrackedPanel(
  context: IActionContext,
  projectPath: string,
  projectKey: string,
  service: ProjectOverviewDataService,
  dependencies: OpenProjectOverviewDependencies
): LocalProjectOverviewPanel {
  // biome-ignore lint/style/useConst: The callbacks close over the panel after assignment.
  let panel: LocalProjectOverviewPanel;
  panel = dependencies.createPanel(
    context,
    projectPath,
    service,
    async (forceRestart = true) => await startAndOpenProject(context, projectPath, panel, dependencies, forceRestart),
    () => {
      if (panels.get(projectKey) === panel) {
        panels.delete(projectKey);
      }
      panelCloseRevisions.set(projectKey, (panelCloseRevisions.get(projectKey) ?? 0) + 1);
    }
  );
  return panel;
}

async function panelSnapshotAfterFailure(panel: LocalProjectOverviewPanel, projectPath: string): Promise<ProjectOverviewSnapshot> {
  try {
    return await panel.discoverSnapshot();
  } catch {
    const previous = panel.currentSnapshot;
    return {
      projectId: panel.projectId,
      projectName: previous?.projectName ?? path.basename(projectPath),
      lifecycle: ProjectOverviewLifecycle.Error,
      runtime: previous?.runtime ?? { state: ProjectOverviewRuntimeState.Error, generation: 0 },
      generation: (previous?.generation ?? 0) + 1,
      generatedAt: new Date().toISOString(),
      isRefreshing: false,
      workflows: previous?.workflows ?? [],
      errors: [],
    };
  }
}

export function resetProjectOverviewStateForTests(): void {
  panels.clear();
  startupAttempts.clear();
  panelStartupAttempts.clear();
  panelCloseRevisions.clear();
  debugOverviewAttempts.clear();
  handledDebugOverviewInvocations.clear();
}
