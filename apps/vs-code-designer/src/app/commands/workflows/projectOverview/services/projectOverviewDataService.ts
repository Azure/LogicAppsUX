/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { getRequestTriggerName, HTTP_METHODS } from '@microsoft/logic-apps-shared';
import {
  ProjectOverviewCallbackAvailability,
  ProjectOverviewErrorAction,
  ProjectOverviewErrorScope,
  ProjectOverviewLatestRunAvailability,
  ProjectOverviewRuntimeState,
  ProjectOverviewWorkflowKind,
  ProjectOverviewWorkflowRunMode,
  ProjectOverviewWorkflowRuntimeState,
  ProjectOverviewWorkflowSourceState,
  type ProjectOverviewCallback,
  type ProjectOverviewLatestRunState,
  type ProjectOverviewProjectError,
  type ProjectOverviewProjectId,
  type ProjectOverviewRunId,
  type ProjectOverviewSnapshot,
  type ProjectOverviewWorkflow,
  type ProjectOverviewWorkflowError,
  type ProjectOverviewWorkflowId,
} from '@microsoft/vscode-extension-logic-apps';
import type { IActionContext } from '@microsoft/vscode-azext-utils';
import { randomUUID } from 'crypto';
import { readFileSync, readdirSync } from 'fs';
import * as path from 'path';
import { managementApiPrefix, workflowFileName } from '../../../../../constants';
import { getLocalSettingsJson } from '../../../../utils/appSettings/localSettings';
import { getWorkflowsInLocalProject, getWorkflowsPathInLocalProject } from '../../../../utils/codeless/common';
import { projectRuntimeRegistry, type ProjectRuntimeRegistration } from '../../../../utils/funcCoreTools/projectRuntimeRegistry';
import { sendRequest } from '../../../../utils/requestUtils';
import { getCodefulWorkflowNamesFromProject, getFallbackCodefulTriggerName } from '../../overview/utils/codefulHelpers';
import { hasHttpRequestTrigger } from '../../../../utils/codeful';
import {
  canonicalizeWorkflowName,
  canonicalizeWorkflowPath,
  mapWithConcurrency,
  ProjectOverviewTimeoutError,
  throwIfAborted,
  withTimeout,
} from '../utils/projectOverviewHelpers';
import {
  getProjectLifecycle,
  getProjectRuntimeState,
  getWorkflowRuntimeState,
  type RuntimeWorkflowRegistration,
} from '../utils/projectRuntimeReadiness';

const apiVersion = '2019-10-01-edge-preview';

export type ProjectOverviewProjectKind = 'codeless' | 'codeful';

interface SourceWorkflow {
  identity: string;
  sourcePath: string;
  name: string;
  kind: ProjectOverviewWorkflowKind;
  runMode: ProjectOverviewWorkflowRunMode;
  historySupported: boolean;
  statelessHistoryEnabled: boolean;
  sourceState: ProjectOverviewWorkflowSourceState;
  requestTriggerName?: string;
  error?: Error;
}

interface WorkflowIdentityResolution {
  projectPath: string;
  sourceIdentity: string;
  sourcePath: string;
  workflowName: string;
  kind: ProjectOverviewWorkflowKind;
  snapshotGeneration: number;
}

interface RunIdentityResolution extends WorkflowIdentityResolution {
  runtimeRunId: string;
  runtimeGeneration: number;
  runtimePort: number;
}

export interface ProjectOverviewDataServiceOptions {
  concurrency?: number;
  workflowTimeoutMs?: number;
}

export interface ProjectOverviewDataServiceDependencies {
  getRuntimeRegistration(projectPath: string): ProjectRuntimeRegistration | undefined;
  getWorkflowsPath(projectPath: string): Promise<{ path: string; name: string }[]>;
  getWorkflows(projectPath: string): Promise<Record<string, any>>;
  getCodefulWorkflowNames(projectPath: string): string[];
  getCodefulSource(projectPath: string): string;
  getSettings(context: IActionContext, projectPath: string): Promise<Record<string, string>>;
  request(context: IActionContext, url: string, method: HTTP_METHODS): Promise<string>;
  createOpaqueId(): string;
}

const defaultDependencies: ProjectOverviewDataServiceDependencies = {
  getRuntimeRegistration: (projectPath) => projectRuntimeRegistry.get(projectPath),
  getWorkflowsPath: getWorkflowsPathInLocalProject,
  getWorkflows: getWorkflowsInLocalProject,
  getCodefulWorkflowNames: getCodefulWorkflowNamesFromProject,
  getCodefulSource: (projectPath) =>
    readdirSync(projectPath)
      .filter((file) => file.endsWith('.cs'))
      .sort()
      .map((file) => readFileSync(path.join(projectPath, file), 'utf8'))
      .join('\n'),
  getSettings: async (context, projectPath) => (await getLocalSettingsJson(context, projectPath)).Values ?? {},
  request: async (context, url, method) => await sendRequest(context, { url, method }),
  createOpaqueId: randomUUID,
};

function workflowError(code: string, message: string): ProjectOverviewWorkflowError {
  return {
    code,
    message,
    scope: ProjectOverviewErrorScope.Workflow,
    retryable: true,
    action: ProjectOverviewErrorAction.Refresh,
  };
}

function projectError(code: string, message: string): ProjectOverviewProjectError {
  return {
    code,
    message,
    scope: ProjectOverviewErrorScope.Project,
    retryable: true,
    action: ProjectOverviewErrorAction.Refresh,
  };
}

function parseRuntimeWorkflows(response: string): RuntimeWorkflowRegistration[] {
  const parsed = JSON.parse(response);
  const workflows = Array.isArray(parsed) ? parsed : parsed?.value;
  if (!Array.isArray(workflows)) {
    return [];
  }
  return workflows
    .filter((workflow) => typeof workflow?.name === 'string')
    .map((workflow) => ({
      name: workflow.name,
      kind: workflow.kind,
      healthState: workflow.health?.state ?? workflow.properties?.health?.state,
      triggers: workflow.triggers ?? workflow.properties?.triggers,
    }));
}

function getRequestTriggerFromRuntime(runtimeWorkflow: RuntimeWorkflowRegistration | undefined): string | undefined {
  for (const [name, trigger] of Object.entries(runtimeWorkflow?.triggers ?? {})) {
    const type = trigger.properties?.type ?? trigger.type;
    const kind = trigger.properties?.kind ?? trigger.kind;
    if (type?.toLowerCase() === 'request' && (!kind || kind.toLowerCase() === 'http')) {
      return name;
    }
  }
  return undefined;
}

function getRunMode(kind: unknown): ProjectOverviewWorkflowRunMode {
  return typeof kind === 'string' && kind.toLowerCase() === 'stateless'
    ? ProjectOverviewWorkflowRunMode.Stateless
    : typeof kind === 'string' && (kind.toLowerCase() === 'stateful' || kind.toLowerCase() === 'agent')
      ? ProjectOverviewWorkflowRunMode.Stateful
      : ProjectOverviewWorkflowRunMode.Unknown;
}

export class ProjectOverviewDataService {
  public readonly projectId: ProjectOverviewProjectId;
  private readonly concurrency: number;
  private readonly workflowTimeoutMs: number;
  private readonly workflowResolutions = new Map<ProjectOverviewWorkflowId, WorkflowIdentityResolution>();
  private readonly workflowIdsByIdentity = new Map<string, ProjectOverviewWorkflowId>();
  private readonly runResolutions = new Map<ProjectOverviewRunId, RunIdentityResolution>();
  private inFlight?: Promise<ProjectOverviewSnapshot>;
  private abortController?: AbortController;
  private nextGeneration = 0;

  public constructor(
    private readonly context: IActionContext,
    private readonly projectPath: string,
    private readonly projectKind: ProjectOverviewProjectKind,
    options: ProjectOverviewDataServiceOptions = {},
    private readonly dependencies: ProjectOverviewDataServiceDependencies = defaultDependencies
  ) {
    this.projectId = dependencies.createOpaqueId() as ProjectOverviewProjectId;
    this.concurrency = options.concurrency ?? 4;
    this.workflowTimeoutMs = options.workflowTimeoutMs ?? 10_000;
  }

  public refresh(signal?: AbortSignal): Promise<ProjectOverviewSnapshot> {
    if (this.inFlight) {
      return this.inFlight;
    }
    this.abortController = new AbortController();
    const onAbort = () => this.abortController?.abort();
    signal?.addEventListener('abort', onAbort, { once: true });
    const generation = ++this.nextGeneration;
    this.inFlight = this.buildSnapshot(generation, this.abortController.signal).finally(() => {
      signal?.removeEventListener('abort', onAbort);
      this.inFlight = undefined;
      this.abortController = undefined;
    });
    return this.inFlight;
  }

  public cancel(): void {
    this.abortController?.abort();
  }

  public getRuntimeRegistration(): ProjectRuntimeRegistration | undefined {
    return this.dependencies.getRuntimeRegistration(this.projectPath);
  }

  public resolveWorkflow(workflowId: ProjectOverviewWorkflowId, snapshotGeneration?: number): WorkflowIdentityResolution | undefined {
    const resolution = this.workflowResolutions.get(workflowId);
    if (snapshotGeneration !== undefined && resolution?.snapshotGeneration !== snapshotGeneration) {
      return undefined;
    }
    return resolution ? { ...resolution } : undefined;
  }

  public resolveRun(runId: ProjectOverviewRunId, snapshotGeneration?: number): RunIdentityResolution | undefined {
    const resolution = this.runResolutions.get(runId);
    if (snapshotGeneration !== undefined && resolution?.snapshotGeneration !== snapshotGeneration) {
      return undefined;
    }
    return resolution ? { ...resolution } : undefined;
  }

  public async cancelRun(workflowId: ProjectOverviewWorkflowId, runId: ProjectOverviewRunId, snapshotGeneration: number): Promise<boolean> {
    const workflowResolution = this.resolveWorkflow(workflowId, snapshotGeneration);
    const runResolution = this.resolveRun(runId, snapshotGeneration);
    if (
      !workflowResolution ||
      !runResolution ||
      canonicalizeWorkflowPath(workflowResolution.projectPath) !== canonicalizeWorkflowPath(this.projectPath) ||
      canonicalizeWorkflowPath(runResolution.projectPath) !== canonicalizeWorkflowPath(this.projectPath) ||
      workflowResolution.sourceIdentity !== runResolution.sourceIdentity ||
      workflowResolution.sourcePath !== runResolution.sourcePath ||
      workflowResolution.workflowName !== runResolution.workflowName ||
      workflowResolution.kind !== runResolution.kind
    ) {
      return false;
    }

    const registration = this.dependencies.getRuntimeRegistration(this.projectPath);
    if (
      registration?.lifecycle !== 'running' ||
      registration.generation !== runResolution.runtimeGeneration ||
      registration.port !== runResolution.runtimePort
    ) {
      return false;
    }

    const runtimeRunPath = this.getRuntimeRunPath(runResolution.runtimeRunId, runResolution.workflowName);
    if (!runtimeRunPath) {
      return false;
    }

    const baseUrl = `http://localhost:${registration.port}${managementApiPrefix}`;
    await this.dependencies.request(this.context, `${baseUrl}/${runtimeRunPath}/cancel?api-version=${apiVersion}`, HTTP_METHODS.POST);
    return true;
  }

  private async buildSnapshot(generation: number, signal: AbortSignal): Promise<ProjectOverviewSnapshot> {
    const registration = this.dependencies.getRuntimeRegistration(this.projectPath);
    const errors: ProjectOverviewProjectError[] = [];
    let sourceWorkflows: SourceWorkflow[] = [];
    let fatalSourceError = false;

    try {
      sourceWorkflows = await this.discoverSourceWorkflows(signal);
    } catch (error) {
      throwIfAborted(signal);
      fatalSourceError = true;
      errors.push(projectError('sourceDiscoveryFailed', error instanceof Error ? error.message : String(error)));
    }

    let runtimeWorkflows: RuntimeWorkflowRegistration[] = [];
    let runtimeQueryAvailable = false;
    const baseUrl = registration?.lifecycle === 'running' ? `http://localhost:${registration.port}${managementApiPrefix}` : undefined;
    if (baseUrl) {
      try {
        runtimeWorkflows = parseRuntimeWorkflows(
          await withTimeout(
            this.dependencies.request(this.context, `${baseUrl}/workflows?api-version=${apiVersion}`, HTTP_METHODS.GET),
            this.workflowTimeoutMs,
            signal
          )
        );
        runtimeQueryAvailable = true;
      } catch (error) {
        throwIfAborted(signal);
        errors.push(projectError('runtimeWorkflowQueryFailed', error instanceof Error ? error.message : String(error)));
      }
    }

    const runtimeByName = new Map(runtimeWorkflows.map((workflow) => [canonicalizeWorkflowName(workflow.name), workflow]));
    let workflows = await mapWithConcurrency(
      sourceWorkflows,
      this.concurrency,
      async (source) => {
        const runtimeWorkflow = runtimeByName.get(canonicalizeWorkflowName(source.name));
        return await this.buildWorkflowRow(source, registration, runtimeWorkflow, runtimeQueryAvailable, baseUrl, generation, signal);
      },
      signal
    );
    const currentRegistration = this.dependencies.getRuntimeRegistration(this.projectPath);
    const runtimeGenerationChanged =
      currentRegistration?.generation !== registration?.generation ||
      currentRegistration?.port !== registration?.port ||
      currentRegistration?.lifecycle !== registration?.lifecycle;
    if (runtimeGenerationChanged) {
      errors.push(projectError('runtimeGenerationChanged', 'The workflow runtime changed while the project overview was refreshing.'));
      const currentRuntimeState = getProjectRuntimeState(currentRegistration);
      workflows = workflows.map((workflow) => ({
        ...workflow,
        runtimeState:
          currentRuntimeState === ProjectOverviewRuntimeState.Starting
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
      }));
    }
    const snapshotRuntimeState = getProjectRuntimeState(currentRegistration);

    return {
      projectId: this.projectId,
      projectName: path.basename(path.normalize(this.projectPath)),
      lifecycle: getProjectLifecycle(snapshotRuntimeState, workflows, fatalSourceError),
      runtime: {
        state: snapshotRuntimeState,
        generation: currentRegistration?.generation ?? 0,
      },
      generation,
      generatedAt: new Date().toISOString(),
      isRefreshing: false,
      workflows,
      errors,
    };
  }

  private async discoverSourceWorkflows(signal: AbortSignal): Promise<SourceWorkflow[]> {
    const settings = await this.dependencies.getSettings(this.context, this.projectPath);
    throwIfAborted(signal);
    return this.projectKind === 'codeful'
      ? this.discoverCodefulWorkflows(settings)
      : await this.discoverCodelessWorkflows(settings, signal);
  }

  private async discoverCodelessWorkflows(settings: Record<string, string>, signal: AbortSignal): Promise<SourceWorkflow[]> {
    const [workflowPaths, workflows] = await Promise.all([
      this.dependencies.getWorkflowsPath(this.projectPath),
      this.dependencies.getWorkflows(this.projectPath),
    ]);
    throwIfAborted(signal);

    const sources = new Map<string, { path: string; name: string; content?: any }>();
    for (const workflowPath of workflowPaths) {
      const identity = canonicalizeWorkflowPath(workflowPath.path);
      sources.set(identity, { ...workflowPath, content: workflows[workflowPath.name] });
    }
    for (const [name, content] of Object.entries(workflows)) {
      const workflowPath = path.join(this.projectPath, name, workflowFileName);
      const identity = canonicalizeWorkflowPath(workflowPath);
      sources.set(identity, { path: workflowPath, name, content: sources.get(identity)?.content ?? content });
    }

    return [...sources.entries()]
      .sort(([, left], [, right]) => left.name.localeCompare(right.name))
      .map(([identity, source]) => {
        try {
          const content = source.content ?? JSON.parse(readFileSync(source.path, 'utf8'));
          const runMode = getRunMode(content.kind);
          const historySetting = settings[`Workflows.${source.name}.OperationOptions`]?.toLowerCase();
          return {
            identity,
            sourcePath: source.path,
            name: source.name,
            kind: ProjectOverviewWorkflowKind.Codeless,
            runMode,
            historySupported: runMode !== ProjectOverviewWorkflowRunMode.Stateless || historySetting === 'withstatelessrunhistory',
            statelessHistoryEnabled: historySetting === 'withstatelessrunhistory',
            sourceState: ProjectOverviewWorkflowSourceState.Available,
            requestTriggerName: getRequestTriggerName(content.definition),
          };
        } catch (error) {
          return {
            identity,
            sourcePath: source.path,
            name: source.name,
            kind: ProjectOverviewWorkflowKind.Codeless,
            runMode: ProjectOverviewWorkflowRunMode.Unknown,
            historySupported: false,
            statelessHistoryEnabled: false,
            sourceState: ProjectOverviewWorkflowSourceState.Invalid,
            error: error instanceof Error ? error : new Error(String(error)),
          };
        }
      });
  }

  private discoverCodefulWorkflows(settings: Record<string, string>): SourceWorkflow[] {
    const source = this.dependencies.getCodefulSource(this.projectPath);
    const requestTriggerName = getFallbackCodefulTriggerName(source, hasHttpRequestTrigger(source));
    return this.dependencies
      .getCodefulWorkflowNames(this.projectPath)
      .filter(
        (name, index, names) =>
          names.findIndex((candidate) => canonicalizeWorkflowName(candidate) === canonicalizeWorkflowName(name)) === index
      )
      .sort((left, right) => left.localeCompare(right))
      .map((name) => ({
        identity: `${canonicalizeWorkflowPath(this.projectPath)}#${canonicalizeWorkflowName(name)}`,
        sourcePath: this.getCodefulSourcePath(name),
        name,
        kind: ProjectOverviewWorkflowKind.Codeful,
        runMode: ProjectOverviewWorkflowRunMode.Stateful,
        historySupported: settings[`Workflows.${name}.OperationOptions`]?.toLowerCase() !== 'disable',
        statelessHistoryEnabled: settings[`Workflows.${name}.OperationOptions`]?.toLowerCase() === 'withstatelessrunhistory',
        sourceState: ProjectOverviewWorkflowSourceState.Available,
        requestTriggerName,
      }));
  }

  private async buildWorkflowRow(
    source: SourceWorkflow,
    registration: ProjectRuntimeRegistration | undefined,
    runtimeWorkflow: RuntimeWorkflowRegistration | undefined,
    runtimeQueryAvailable: boolean,
    baseUrl: string | undefined,
    snapshotGeneration: number,
    signal: AbortSignal
  ): Promise<ProjectOverviewWorkflow> {
    const workflowId = this.getOrCreateWorkflowId(source, snapshotGeneration);
    const runtimeState = getWorkflowRuntimeState(registration, runtimeWorkflow, runtimeQueryAvailable);
    const runtimeRunMode = getRunMode(runtimeWorkflow?.kind);
    const runMode = runtimeRunMode === ProjectOverviewWorkflowRunMode.Unknown ? source.runMode : runtimeRunMode;
    const historySupported =
      runMode === ProjectOverviewWorkflowRunMode.Stateless ? source.statelessHistoryEnabled : source.historySupported;
    const errors: ProjectOverviewWorkflowError[] = [];
    if (source.error) {
      errors.push(workflowError('invalidWorkflowSource', source.error.message));
    }

    const requestTriggerName = runtimeWorkflow ? getRequestTriggerFromRuntime(runtimeWorkflow) : source.requestTriggerName;
    let callback: ProjectOverviewCallback = {
      availability: requestTriggerName
        ? ProjectOverviewCallbackAvailability.RuntimeUnavailable
        : ProjectOverviewCallbackAvailability.NotRequestTrigger,
    };
    let latestRun: ProjectOverviewLatestRunState = {
      availability:
        runMode === ProjectOverviewWorkflowRunMode.Stateless && !historySupported
          ? ProjectOverviewLatestRunAvailability.StatelessHistoryUnavailable
          : ProjectOverviewLatestRunAvailability.RuntimeUnavailable,
    };

    if (runtimeState === 'available' && baseUrl && source.sourceState === ProjectOverviewWorkflowSourceState.Available) {
      try {
        ({ callback, latestRun } = await withTimeout(
          this.getRuntimeDetails(
            { ...source, runMode, historySupported },
            workflowId,
            requestTriggerName,
            baseUrl,
            snapshotGeneration,
            registration.generation,
            registration.port
          ),
          this.workflowTimeoutMs,
          signal
        ));
      } catch (error) {
        throwIfAborted(signal);
        const code = error instanceof ProjectOverviewTimeoutError ? 'workflowQueryTimeout' : 'workflowQueryFailed';
        errors.push(workflowError(code, error instanceof Error ? error.message : String(error)));
        callback = {
          availability: requestTriggerName
            ? ProjectOverviewCallbackAvailability.QueryFailed
            : ProjectOverviewCallbackAvailability.NotRequestTrigger,
        };
        if (historySupported) {
          latestRun = { availability: ProjectOverviewLatestRunAvailability.QueryFailed };
        }
      }
      if (callback.availability === ProjectOverviewCallbackAvailability.QueryFailed) {
        errors.push(workflowError('callbackQueryFailed', `Failed to retrieve the callback URL for workflow "${source.name}".`));
      }
      if (latestRun.availability === ProjectOverviewLatestRunAvailability.QueryFailed) {
        errors.push(workflowError('runHistoryQueryFailed', `Failed to retrieve run history for workflow "${source.name}".`));
      }
    }

    return {
      workflowId,
      name: source.name,
      kind: source.kind,
      runMode,
      sourceState: source.sourceState,
      runtimeState,
      callback,
      latestRun,
      errors,
    };
  }

  private async getRuntimeDetails(
    source: SourceWorkflow,
    workflowId: ProjectOverviewWorkflowId,
    requestTriggerName: string | undefined,
    baseUrl: string,
    snapshotGeneration: number,
    runtimeGeneration: number,
    runtimePort: number
  ): Promise<{ callback: ProjectOverviewCallback; latestRun: ProjectOverviewLatestRunState }> {
    const encodedWorkflowName = encodeURIComponent(source.name);
    const callbackPromise: Promise<ProjectOverviewCallback> = requestTriggerName
      ? this.dependencies
          .request(
            this.context,
            `${baseUrl}/workflows/${encodedWorkflowName}/triggers/${encodeURIComponent(requestTriggerName)}/listCallbackUrl?api-version=${apiVersion}`,
            HTTP_METHODS.POST
          )
          .then((response) => {
            const value = JSON.parse(response)?.value;
            return typeof value === 'string' && value.length > 0
              ? { availability: ProjectOverviewCallbackAvailability.Available, url: value }
              : { availability: ProjectOverviewCallbackAvailability.Unavailable };
          })
          .catch(() => ({ availability: ProjectOverviewCallbackAvailability.QueryFailed }))
      : Promise.resolve({ availability: ProjectOverviewCallbackAvailability.NotRequestTrigger });

    const latestRunPromise: Promise<ProjectOverviewLatestRunState> = source.historySupported
      ? this.dependencies
          .request(this.context, `${baseUrl}/workflows/${encodedWorkflowName}/runs?api-version=${apiVersion}&$top=1`, HTTP_METHODS.GET)
          .then((response) => this.parseLatestRun(response, source, workflowId, snapshotGeneration, runtimeGeneration, runtimePort))
          .catch(() => ({ availability: ProjectOverviewLatestRunAvailability.QueryFailed }))
      : Promise.resolve({ availability: ProjectOverviewLatestRunAvailability.StatelessHistoryUnavailable });

    const [callback, latestRun] = await Promise.all([callbackPromise, latestRunPromise]);
    return { callback, latestRun };
  }

  private parseLatestRun(
    response: string,
    source: SourceWorkflow,
    workflowId: ProjectOverviewWorkflowId,
    snapshotGeneration: number,
    runtimeGeneration: number,
    runtimePort: number
  ): ProjectOverviewLatestRunState {
    const parsed = JSON.parse(response);
    const runs = Array.isArray(parsed) ? parsed : parsed?.value;
    if (!Array.isArray(runs) || runs.length === 0) {
      return { availability: ProjectOverviewLatestRunAvailability.NoRuns };
    }
    const latest = [...runs].sort(
      (left, right) => Date.parse(right?.properties?.startTime ?? '') - Date.parse(left?.properties?.startTime ?? '')
    )[0];
    const runtimeRunId = latest?.id ?? latest?.name;
    if (typeof runtimeRunId !== 'string' || typeof latest?.properties?.startTime !== 'string') {
      return { availability: ProjectOverviewLatestRunAvailability.QueryFailed };
    }
    const runId = this.dependencies.createOpaqueId() as ProjectOverviewRunId;
    this.runResolutions.set(runId, {
      ...this.workflowResolutions.get(workflowId)!,
      runtimeRunId,
      snapshotGeneration,
      runtimeGeneration,
      runtimePort,
    });
    return {
      availability: ProjectOverviewLatestRunAvailability.Available,
      run: {
        runId,
        status: latest.properties.status ?? 'Unknown',
        startTime: latest.properties.startTime,
        endTime: latest.properties.endTime,
      },
    };
  }

  private getOrCreateWorkflowId(source: SourceWorkflow, snapshotGeneration: number): ProjectOverviewWorkflowId {
    let workflowId = this.workflowIdsByIdentity.get(source.identity);
    if (!workflowId) {
      workflowId = this.dependencies.createOpaqueId() as ProjectOverviewWorkflowId;
      this.workflowIdsByIdentity.set(source.identity, workflowId);
    }
    this.workflowResolutions.set(workflowId, {
      projectPath: this.projectPath,
      sourceIdentity: source.identity,
      sourcePath: source.sourcePath,
      workflowName: source.name,
      kind: source.kind,
      snapshotGeneration,
    });
    return workflowId;
  }

  private getCodefulSourcePath(workflowName: string): string {
    const workflowPattern = new RegExp(
      `(?:CreateConversationalAgent|CreateAgentWorkflow|CreateStatefulWorkflow)\\s*\\(\\s*["']${workflowName.replace(
        /[.*+?^${}()|[\]\\]/g,
        '\\$&'
      )}["']`
    );
    const sourceFiles = readdirSync(this.projectPath)
      .filter((file) => file.endsWith('.cs'))
      .sort();
    const matchingFile = sourceFiles.find((file) => workflowPattern.test(readFileSync(path.join(this.projectPath, file), 'utf8')));
    const sourceFile = matchingFile ?? sourceFiles[0];
    return sourceFile ? path.join(this.projectPath, sourceFile) : '';
  }

  private getRuntimeRunPath(runtimeRunId: string, workflowName: string): string | undefined {
    const match = /^\/?workflows\/([^/?#\\]+)\/runs\/([^/?#\\]+)$/i.exec(runtimeRunId);
    if (!match) {
      return undefined;
    }
    try {
      const resolvedWorkflowName = decodeURIComponent(match[1]);
      const resolvedRunName = decodeURIComponent(match[2]);
      if (
        canonicalizeWorkflowName(resolvedWorkflowName) !== canonicalizeWorkflowName(workflowName) ||
        !resolvedRunName ||
        resolvedRunName === '.' ||
        resolvedRunName === '..'
      ) {
        return undefined;
      }
      return `workflows/${encodeURIComponent(resolvedWorkflowName)}/runs/${encodeURIComponent(resolvedRunName)}`;
    } catch {
      return undefined;
    }
  }
}
