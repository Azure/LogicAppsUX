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
  ProjectOverviewWorkflowRuntimeState,
  type ProjectOverviewActionPayload,
  type ProjectOverviewMessageToExtension,
  type ProjectOverviewProjectId,
  type ProjectOverviewSnapshot,
  type ProjectOverviewWorkflowActionPayload,
} from '@microsoft/vscode-extension-logic-apps';
import type { IActionContext } from '@microsoft/vscode-azext-utils';
import * as path from 'path';
import * as vscode from 'vscode';
import { assetsFolderName } from '../../../../../constants';
import { ext } from '../../../../../extensionVariables';
import { localize } from '../../../../../localize';
import { getWebViewHTML } from '../../../../utils/codeless/getWebViewHTML';
import { getRunningFuncTaskForWorkspace, stopFuncTaskForWorkspace } from '../../../../utils/funcCoreTools/funcHostTask';
import {
  getCanonicalProjectId,
  projectRuntimeRegistry,
  type ProjectRuntimeHandle,
} from '../../../../utils/funcCoreTools/projectRuntimeRegistry';
import { getContainingWorkspaceFolder } from '../../../../utils/workspace';
import { openMonitoringView } from '../../monitoringView/openMonitoringView';
import { openOverview } from '../../overview/openOverview';
import type { ProjectOverviewDataService } from '../services/projectOverviewDataService';
import { getProjectRuntimeState } from '../utils/projectRuntimeReadiness';

const refreshIntervalMs = 5000;

export interface LocalProjectOverviewPanelDependencies {
  createPanel(
    viewType: string,
    title: string,
    showOptions: vscode.ViewColumn,
    options: vscode.WebviewPanelOptions & vscode.WebviewOptions
  ): vscode.WebviewPanel;
  getWebviewHtml(panel: vscode.WebviewPanel): Promise<string>;
  writeClipboard(value: string): Thenable<void>;
  openWorkflow(
    context: IActionContext,
    workflowUri: vscode.Uri,
    projectId: ProjectOverviewProjectId,
    revealProject: () => void
  ): Promise<void>;
  openRun(context: IActionContext, workflowUri: vscode.Uri, runId: string, workflowPath: string): Promise<void>;
  stopRuntime(projectPath: string, runtimeGeneration: number): Promise<boolean>;
  showError(message: string): Thenable<unknown>;
  setTimer(callback: () => void, delay: number): NodeJS.Timeout;
  clearTimer(timer: NodeJS.Timeout): void;
}

const defaultDependencies: LocalProjectOverviewPanelDependencies = {
  createPanel: (viewType, title, showOptions, options) => vscode.window.createWebviewPanel(viewType, title, showOptions, options),
  getWebviewHtml: async (panel) => await getWebViewHTML('vs-code-react', panel),
  writeClipboard: async (value) => await vscode.env.clipboard.writeText(value),
  openWorkflow: async (context, workflowUri, projectId, revealProject) =>
    await openOverview(context, workflowUri, { projectId, openProjectOverview: revealProject }),
  openRun: async (context, workflowUri, runId, workflowPath) => await openMonitoringView(context, workflowUri, runId, workflowPath),
  stopRuntime: async (projectPath, runtimeGeneration) => {
    const workspaceFolder = getContainingWorkspaceFolder(projectPath);
    const registration = projectRuntimeRegistry.get(projectPath);
    if (
      !workspaceFolder ||
      !registration ||
      registration.projectId !== getCanonicalProjectId(projectPath) ||
      registration.workspaceFolderUri !== getCanonicalProjectId(workspaceFolder.uri) ||
      registration.generation !== runtimeGeneration ||
      registration.lifecycle !== 'running'
    ) {
      return false;
    }

    const runningTask = getRunningFuncTaskForWorkspace(workspaceFolder);
    const handle: ProjectRuntimeHandle = { projectId: registration.projectId, generation: registration.generation };
    if (
      !runningTask?.taskExecution ||
      registration.taskProcessId !== runningTask.processId ||
      !projectRuntimeRegistry.isTaskExecutionCurrent(handle, runningTask.taskExecution, runningTask.processId)
    ) {
      return false;
    }

    if (!projectRuntimeRegistry.markStopping(handle)) {
      return false;
    }
    try {
      const stopped = await stopFuncTaskForWorkspace(workspaceFolder, {
        expectedProcessId: runningTask.processId,
        expectedTaskExecution: runningTask.taskExecution,
      });
      if (!stopped) {
        projectRuntimeRegistry.markRunning(handle, runningTask.processId);
        return false;
      }
      projectRuntimeRegistry.terminate(handle);
      return true;
    } catch (error) {
      projectRuntimeRegistry.markRunning(handle, runningTask.processId);
      throw error;
    }
  },
  showError: async (message) => await vscode.window.showErrorMessage(message, localize('OK', 'OK')),
  setTimer: (callback, delay) => setTimeout(callback, delay),
  clearTimer: (timer) => clearTimeout(timer),
};

export class LocalProjectOverviewPanel {
  private panel?: vscode.WebviewPanel;
  private snapshot?: ProjectOverviewSnapshot;
  private visible = true;
  private disposed = false;
  private refreshTimer?: NodeJS.Timeout;
  private refreshInFlight?: Promise<void>;
  private stopInFlight?: Promise<void>;

  public constructor(
    private readonly context: IActionContext,
    private readonly projectPath: string,
    private readonly dataService: ProjectOverviewDataService,
    private readonly retryStartup: (forceRestart?: boolean) => Promise<void>,
    private readonly onDispose: () => void,
    private readonly dependencies: LocalProjectOverviewPanelDependencies = defaultDependencies
  ) {}

  public get projectId(): ProjectOverviewProjectId {
    return this.dataService.projectId;
  }

  public get currentSnapshot(): ProjectOverviewSnapshot | undefined {
    return this.snapshot;
  }

  public get isDisposed(): boolean {
    return this.disposed;
  }

  public async discoverSnapshot(): Promise<ProjectOverviewSnapshot> {
    return await this.dataService.refresh();
  }

  public async create(snapshot: ProjectOverviewSnapshot): Promise<void> {
    if (this.disposed) {
      return;
    }
    this.snapshot = snapshot;
    if (this.panel) {
      this.reveal();
      await this.sendInitialize();
      this.scheduleRefresh();
      return;
    }

    this.panel = this.dependencies.createPanel(
      'localProjectOverview',
      `${path.basename(this.projectPath)} - Project overview`,
      vscode.ViewColumn.Active,
      { enableScripts: true, retainContextWhenHidden: true }
    );
    this.panel.iconPath = {
      light: vscode.Uri.file(path.join(ext.context.extensionPath, assetsFolderName, 'light', 'Codeless.svg')),
      dark: vscode.Uri.file(path.join(ext.context.extensionPath, assetsFolderName, 'dark', 'Codeless.svg')),
    };
    this.panel.webview.html = await this.dependencies.getWebviewHtml(this.panel);
    this.panel.webview.onDidReceiveMessage(
      async (message) => await this.handleWebviewMessage(message),
      undefined,
      ext.context.subscriptions
    );
    this.panel.onDidChangeViewState(
      async ({ webviewPanel }) => await this.setVisible(webviewPanel.visible),
      undefined,
      ext.context.subscriptions
    );
    this.panel.onDidDispose(() => this.dispose(), undefined, ext.context.subscriptions);
    ext.context.subscriptions.push(this.panel);
  }

  public reveal(): void {
    if (this.panel && !this.panel.active) {
      this.panel.reveal(vscode.ViewColumn.Active);
    }
  }

  public async refresh(): Promise<void> {
    if (this.disposed) {
      return;
    }
    if (this.refreshInFlight) {
      return await this.refreshInFlight;
    }

    const refresh = async (): Promise<void> => {
      let previousSnapshot = this.snapshot;
      const registration = this.dataService.getRuntimeRegistration();
      if (previousSnapshot && registration?.generation !== previousSnapshot.runtime.generation) {
        previousSnapshot = {
          ...previousSnapshot,
          runtime: {
            state: getProjectRuntimeState(registration),
            generation: registration?.generation ?? 0,
          },
          generation: previousSnapshot.generation + 1,
          workflows: previousSnapshot.workflows.map((workflow) => ({
            ...workflow,
            runtimeState:
              registration?.lifecycle === 'starting'
                ? ProjectOverviewWorkflowRuntimeState.Registering
                : ProjectOverviewWorkflowRuntimeState.RuntimeUnavailable,
            callback:
              workflow.callback.availability === ProjectOverviewCallbackAvailability.NotRequestTrigger
                ? workflow.callback
                : { availability: ProjectOverviewCallbackAvailability.RuntimeUnavailable },
            latestRun:
              workflow.latestRun.availability === ProjectOverviewLatestRunAvailability.StatelessHistoryUnavailable
                ? workflow.latestRun
                : { availability: ProjectOverviewLatestRunAvailability.RuntimeUnavailable },
          })),
        };
        this.snapshot = previousSnapshot;
      }
      if (previousSnapshot) {
        await this.postUpdate({ ...previousSnapshot, isRefreshing: true });
      }
      try {
        const snapshot = await this.dataService.refresh();
        if (this.disposed || (this.snapshot && snapshot.generation < this.snapshot.generation)) {
          return;
        }
        this.snapshot = snapshot;
        await this.postUpdate(snapshot);
      } catch (error) {
        if (!this.disposed && !(error instanceof Error && error.name === 'AbortError')) {
          ext.outputChannel.appendLog(`Failed to refresh project overview: ${error instanceof Error ? error.message : String(error)}`);
        }
      }
    };

    this.clearRefreshTimer();
    this.refreshInFlight = refresh().finally(() => {
      this.refreshInFlight = undefined;
      this.scheduleRefresh();
    });
    return await this.refreshInFlight;
  }

  public async showSnapshot(snapshot: ProjectOverviewSnapshot): Promise<void> {
    if (this.disposed || (this.snapshot && snapshot.generation < this.snapshot.generation)) {
      return;
    }
    this.snapshot = snapshot;
    if (this.panel) {
      await this.postUpdate(snapshot);
      this.scheduleRefresh();
    } else {
      await this.create(snapshot);
    }
  }

  public async showRuntimeStarting(): Promise<void> {
    if (this.disposed || !this.snapshot) {
      return;
    }
    const registration = this.dataService.getRuntimeRegistration();
    const startingSnapshot: ProjectOverviewSnapshot = {
      ...this.snapshot,
      lifecycle: ProjectOverviewLifecycle.Starting,
      runtime: {
        state: ProjectOverviewRuntimeState.Starting,
        generation: registration?.generation ?? this.snapshot.runtime.generation,
      },
      generation: this.snapshot.generation + 1,
      generatedAt: new Date().toISOString(),
      isRefreshing: false,
      workflows: this.snapshot.workflows.map((workflow) => ({
        ...workflow,
        runtimeState: ProjectOverviewWorkflowRuntimeState.Registering,
        callback:
          workflow.callback.availability === ProjectOverviewCallbackAvailability.NotRequestTrigger
            ? workflow.callback
            : { availability: ProjectOverviewCallbackAvailability.RuntimeUnavailable },
        latestRun:
          workflow.latestRun.availability === ProjectOverviewLatestRunAvailability.StatelessHistoryUnavailable
            ? workflow.latestRun
            : { availability: ProjectOverviewLatestRunAvailability.RuntimeUnavailable },
      })),
      errors: this.snapshot.errors.filter((error) => error.code !== 'runtimeStartupFailed'),
    };
    this.snapshot = startingSnapshot;
    await this.postUpdate(startingSnapshot);
  }

  private async handleWebviewMessage(
    message: ProjectOverviewMessageToExtension | { command: typeof ExtensionCommand.initialize }
  ): Promise<void> {
    switch (message.command) {
      case ExtensionCommand.initialize: {
        await this.sendInitialize();
        this.scheduleRefresh();
        break;
      }
      case ExtensionCommand.refreshProjectOverview:
        if (this.isCurrentAction(message.data)) {
          await this.refresh();
        }
        break;
      case ExtensionCommand.retryProjectOverview:
        if (this.isCurrentAction(message.data)) {
          await this.retryStartup();
        }
        break;
      case ExtensionCommand.startProjectOverviewRuntime:
        if (this.shouldStartRuntime(message.data)) {
          await this.retryStartup(false);
        }
        break;
      case ExtensionCommand.stopProjectOverviewRuntime:
        await this.stopRuntime(message.data);
        break;
      case ExtensionCommand.projectOverviewVisibilityChanged:
        if (message.data.projectId === this.projectId) {
          await this.setVisible(message.data.visible);
        }
        break;
      case ExtensionCommand.copyProjectOverviewCallback:
        await this.copyCallback(message.data);
        break;
      case ExtensionCommand.openWorkflowOverview:
        await this.openWorkflow(message.data);
        break;
      case ExtensionCommand.openLatestProjectOverviewRun:
        await this.openLatestRun(message.data);
        break;
      default:
        break;
    }
  }

  private async copyCallback(data: ProjectOverviewWorkflowActionPayload): Promise<void> {
    if (!this.isCurrentAction(data) || !this.dataService.resolveWorkflow(data.workflowId, data.snapshotGeneration)) {
      return;
    }
    const workflow = this.snapshot?.workflows.find((candidate) => candidate.workflowId === data.workflowId);
    if (workflow?.callback.availability === ProjectOverviewCallbackAvailability.Available) {
      await this.dependencies.writeClipboard(workflow.callback.url);
    }
  }

  private async openWorkflow(data: ProjectOverviewWorkflowActionPayload): Promise<void> {
    if (!this.isCurrentAction(data)) {
      return;
    }
    const resolution = this.dataService.resolveWorkflow(data.workflowId, data.snapshotGeneration);
    if (!resolution || !resolution.sourcePath) {
      return;
    }
    await this.dependencies.openWorkflow(this.context, vscode.Uri.file(resolution.sourcePath), this.projectId, () => this.reveal());
  }

  private async openLatestRun(
    data: Extract<ProjectOverviewMessageToExtension, { command: 'openLatestProjectOverviewRun' }>['data']
  ): Promise<void> {
    if (!this.isCurrentAction(data)) {
      return;
    }
    const workflowResolution = this.dataService.resolveWorkflow(data.workflowId, data.snapshotGeneration);
    const runResolution = this.dataService.resolveRun(data.runId, data.snapshotGeneration);
    if (
      !workflowResolution ||
      !runResolution ||
      workflowResolution.sourceIdentity !== runResolution.sourceIdentity ||
      workflowResolution.workflowName !== runResolution.workflowName
    ) {
      return;
    }
    await this.dependencies.openRun(
      this.context,
      vscode.Uri.file(workflowResolution.sourcePath),
      runResolution.runtimeRunId,
      workflowResolution.sourcePath
    );
  }

  private isCurrentAction(data: ProjectOverviewActionPayload): boolean {
    return data.projectId === this.projectId && data.snapshotGeneration === this.snapshot?.generation;
  }

  private shouldStartRuntime(data: ProjectOverviewActionPayload): boolean {
    if (this.disposed || !this.isCurrentAction(data)) {
      return false;
    }
    const runtimeState = getProjectRuntimeState(this.dataService.getRuntimeRegistration());
    return runtimeState === ProjectOverviewRuntimeState.Stopped || runtimeState === ProjectOverviewRuntimeState.Unavailable;
  }

  private async stopRuntime(data: ProjectOverviewActionPayload): Promise<void> {
    if (this.stopInFlight) {
      return await this.stopInFlight;
    }
    if (this.disposed || !this.isCurrentAction(data)) {
      return;
    }
    const registration = this.dataService.getRuntimeRegistration();
    if (
      registration?.lifecycle !== 'running' ||
      registration.generation !== this.snapshot?.runtime.generation ||
      getProjectRuntimeState(registration) !== ProjectOverviewRuntimeState.Running
    ) {
      return;
    }

    this.clearRefreshTimer();
    const stop = async (): Promise<void> => {
      try {
        if (!(await this.dependencies.stopRuntime(this.projectPath, registration.generation))) {
          return;
        }
        await this.refresh();
      } catch (error) {
        const message = localize(
          'projectOverviewStopRuntimeFailed',
          'Failed to stop the project runtime: {0}',
          error instanceof Error ? error.message : String(error)
        );
        ext.outputChannel.appendLog(message);
        await this.dependencies.showError(message);
        await this.refresh();
      }
    };
    this.stopInFlight = stop().finally(() => {
      this.stopInFlight = undefined;
      this.scheduleRefresh();
    });
    return await this.stopInFlight;
  }

  private async setVisible(visible: boolean): Promise<void> {
    if (this.disposed || this.visible === visible) {
      return;
    }
    this.visible = visible;
    await this.panel?.webview.postMessage({
      command: ExtensionCommand.projectOverviewVisibilityChanged,
      data: { projectId: this.projectId, visible },
    });
    if (visible) {
      this.scheduleRefresh();
    } else {
      this.clearRefreshTimer();
    }
  }

  private async sendInitialize(): Promise<void> {
    if (!this.snapshot || !this.panel || this.disposed) {
      return;
    }
    await this.panel.webview.postMessage({
      command: ExtensionCommand.initializeProjectOverview,
      data: { snapshot: this.snapshot, visible: this.visible },
    });
  }

  private async postUpdate(snapshot: ProjectOverviewSnapshot): Promise<void> {
    await this.panel?.webview.postMessage({
      command: ExtensionCommand.updateProjectOverview,
      data: { snapshot },
    });
  }

  private scheduleRefresh(): void {
    this.clearRefreshTimer();
    if (this.disposed || !this.visible || this.refreshInFlight || this.snapshot?.runtime.state !== ProjectOverviewRuntimeState.Running) {
      return;
    }
    this.refreshTimer = this.dependencies.setTimer(async () => await this.refresh(), refreshIntervalMs);
  }

  private clearRefreshTimer(): void {
    if (this.refreshTimer) {
      this.dependencies.clearTimer(this.refreshTimer);
      this.refreshTimer = undefined;
    }
  }

  private dispose(): void {
    if (this.disposed) {
      return;
    }
    this.disposed = true;
    this.clearRefreshTimer();
    this.dataService.cancel();
    this.onDispose();
  }
}
