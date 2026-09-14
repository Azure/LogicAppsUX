/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import {
  ProjectOverviewCallbackAvailability,
  ProjectOverviewLatestRunAvailability,
  ProjectOverviewLifecycle,
  ProjectOverviewRuntimeState,
  ProjectOverviewWorkflowKind,
  ProjectOverviewWorkflowRunMode,
  ProjectOverviewWorkflowRuntimeState,
  ProjectOverviewWorkflowSourceState,
} from '@microsoft/vscode-extension-logic-apps';
import type { IActionContext } from '@microsoft/vscode-azext-utils';
import { describe, expect, it, vi } from 'vitest';
import type { ProjectRuntimeRegistration } from '../../../../../utils/funcCoreTools/projectRuntimeRegistry';
import {
  ProjectOverviewDataService,
  type ProjectOverviewDataServiceDependencies,
  type ProjectOverviewProjectKind,
} from '../projectOverviewDataService';

const projectPath = 'D:\\workspace\\logicapp';
const context = {} as IActionContext;

function runtimeRegistration(overrides: Partial<ProjectRuntimeRegistration> = {}): ProjectRuntimeRegistration {
  return {
    projectId: 'project',
    projectUri: 'file:///project',
    workspaceFolderUri: 'file:///workspace',
    generation: 3,
    lifecycle: 'running',
    port: 7071,
    cancellationRequested: false,
    startedAt: 1,
    updatedAt: 1,
    ...overrides,
  };
}

function workflowContent(kind = 'Stateful', triggerType = 'Request'): any {
  return {
    kind,
    definition: {
      triggers: {
        manual: {
          type: triggerType,
          kind: triggerType === 'Request' ? 'Http' : undefined,
        },
      },
      actions: {},
    },
  };
}

function createService(
  kind: ProjectOverviewProjectKind,
  overrides: Partial<ProjectOverviewDataServiceDependencies> = {},
  options: { concurrency?: number; workflowTimeoutMs?: number } = {}
): { service: ProjectOverviewDataService; dependencies: ProjectOverviewDataServiceDependencies } {
  let nextId = 0;
  const dependencies: ProjectOverviewDataServiceDependencies = {
    getRuntimeRegistration: vi.fn().mockReturnValue(runtimeRegistration()),
    getWorkflowsPath: vi.fn().mockResolvedValue([]),
    getWorkflows: vi.fn().mockResolvedValue({}),
    getCodefulWorkflowNames: vi.fn().mockReturnValue([]),
    getCodefulSource: vi.fn().mockReturnValue(''),
    getSettings: vi.fn().mockResolvedValue({}),
    request: vi.fn(async (_context, url) => {
      if (url.includes('/workflows?')) {
        return JSON.stringify({ value: [] });
      }
      if (url.includes('/runs?')) {
        return JSON.stringify({ value: [] });
      }
      return JSON.stringify({ value: 'http://localhost/callback' });
    }),
    createOpaqueId: vi.fn(() => `opaque-${++nextId}`),
    ...overrides,
  };
  return {
    service: new ProjectOverviewDataService(context, projectPath, kind, options, dependencies),
    dependencies,
  };
}

describe('ProjectOverviewDataService', () => {
  it('discovers codeless workflows exactly once by canonical source identity and preserves invalid rows', async () => {
    const { service } = createService('codeless', {
      getRuntimeRegistration: vi.fn().mockReturnValue(undefined),
      getWorkflowsPath: vi.fn().mockResolvedValue([
        { name: 'Alpha', path: 'D:\\workspace\\logicapp\\Alpha\\workflow.json' },
        { name: 'alpha', path: 'D:\\workspace\\logicapp\\Alpha\\.\\workflow.json' },
        { name: 'Broken', path: 'D:\\workspace\\logicapp\\Broken\\workflow.json' },
      ]),
      getWorkflows: vi.fn().mockResolvedValue({ Alpha: workflowContent() }),
    });

    const snapshot = await service.refresh();

    expect(snapshot.workflows).toHaveLength(2);
    expect(snapshot.workflows.map((workflow) => workflow.name)).toEqual(['Alpha', 'Broken']);
    expect(snapshot.workflows[1]).toMatchObject({
      sourceState: ProjectOverviewWorkflowSourceState.Invalid,
      runtimeState: ProjectOverviewWorkflowRuntimeState.RuntimeUnavailable,
    });
  });

  it('discovers codeful workflows from project source without workflow.json and deduplicates names', async () => {
    const { service } = createService('codeful', {
      getCodefulSource: vi.fn().mockReturnValue('CreateHttpTrigger("manual")'),
      getCodefulWorkflowNames: vi.fn().mockReturnValue(['Orders', 'orders', 'Billing']),
      request: vi.fn(async (_context, url) => {
        if (url.includes('/workflows?')) {
          return JSON.stringify({
            value: [
              { name: 'Orders', health: { state: 'Healthy' }, triggers: { manual: { type: 'Request', kind: 'Http' } } },
              { name: 'Billing', health: { state: 'Healthy' }, triggers: { timer: { type: 'Recurrence' } } },
            ],
          });
        }
        if (url.includes('listCallbackUrl')) {
          return JSON.stringify({ value: 'http://localhost/orders' });
        }
        return JSON.stringify({ value: [] });
      }),
    });

    const snapshot = await service.refresh();

    expect(snapshot.workflows.map((workflow) => workflow.name)).toEqual(['Billing', 'Orders']);
    expect(snapshot.workflows.every((workflow) => workflow.kind === 'codeful')).toBe(true);
  });

  it('uses codeful source metadata before runtime registration and preserves exact-once identity across refreshes', async () => {
    const { service, dependencies } = createService('codeful', {
      getRuntimeRegistration: vi.fn().mockReturnValue(undefined),
      getCodefulSource: vi.fn().mockReturnValue('WorkflowTriggers.BuiltIn.CreateHttpTrigger("manual")'),
      getCodefulWorkflowNames: vi.fn().mockReturnValue(['Orders', 'orders']),
    });

    const first = await service.refresh();
    const second = await service.refresh();

    expect(first.workflows).toHaveLength(1);
    expect(first.workflows[0]).toMatchObject({
      name: 'Orders',
      kind: ProjectOverviewWorkflowKind.Codeful,
      runMode: ProjectOverviewWorkflowRunMode.Stateful,
      runtimeState: ProjectOverviewWorkflowRuntimeState.RuntimeUnavailable,
      callback: { availability: ProjectOverviewCallbackAvailability.RuntimeUnavailable },
      latestRun: { availability: ProjectOverviewLatestRunAvailability.RuntimeUnavailable },
    });
    expect(second.workflows[0].workflowId).toBe(first.workflows[0].workflowId);
    expect(second.generation).toBe(first.generation + 1);
    expect(dependencies.getWorkflowsPath).not.toHaveBeenCalled();
    expect(dependencies.getWorkflows).not.toHaveBeenCalled();
  });

  it('reconciles codeful runtime metadata over source fallback for run mode, trigger gating, and history support', async () => {
    const request = vi.fn(async (_context, url) => {
      if (url.includes('/workflows?')) {
        return JSON.stringify({
          value: [
            {
              name: 'orders',
              kind: 'Stateless',
              health: { state: 'Healthy' },
              triggers: { timer: { type: 'Recurrence' } },
            },
          ],
        });
      }
      return JSON.stringify({ value: [] });
    });
    const { service } = createService('codeful', {
      getCodefulSource: vi.fn().mockReturnValue('CreateHttpTrigger("sourceManual")'),
      getCodefulWorkflowNames: vi.fn().mockReturnValue(['Orders']),
      request,
    });

    const snapshot = await service.refresh();

    expect(snapshot.workflows).toEqual([
      expect.objectContaining({
        name: 'Orders',
        kind: ProjectOverviewWorkflowKind.Codeful,
        runMode: ProjectOverviewWorkflowRunMode.Stateless,
        runtimeState: ProjectOverviewWorkflowRuntimeState.Available,
        callback: { availability: ProjectOverviewCallbackAvailability.NotRequestTrigger },
        latestRun: { availability: ProjectOverviewLatestRunAvailability.StatelessHistoryUnavailable },
      }),
    ]);
    expect(request.mock.calls.some(([, url]) => String(url).includes('listCallbackUrl'))).toBe(false);
    expect(request.mock.calls.some(([, url]) => String(url).includes('/runs?'))).toBe(false);
  });

  it('queries codeful stateless run history only when explicitly enabled', async () => {
    const request = vi.fn(async (_context, url) => {
      if (url.includes('/workflows?')) {
        return JSON.stringify({
          value: [
            {
              name: 'Orders',
              kind: 'Stateless',
              health: { state: 'Healthy' },
              triggers: { manual: { type: 'Request', kind: 'Http' } },
            },
          ],
        });
      }
      if (url.includes('listCallbackUrl')) {
        return JSON.stringify({ value: 'http://localhost/orders' });
      }
      return JSON.stringify({
        value: [
          {
            id: 'workflows/Orders/runs/run-1',
            properties: { status: 'Succeeded', startTime: '2026-01-01T00:00:00Z' },
          },
        ],
      });
    });
    const { service } = createService('codeful', {
      getCodefulSource: vi.fn().mockReturnValue('CreateHttpTrigger("manual")'),
      getCodefulWorkflowNames: vi.fn().mockReturnValue(['Orders']),
      getSettings: vi.fn().mockResolvedValue({ 'Workflows.Orders.OperationOptions': 'WithStatelessRunHistory' }),
      request,
    });

    const workflow = (await service.refresh()).workflows[0];

    expect(workflow.runMode).toBe(ProjectOverviewWorkflowRunMode.Stateless);
    expect(workflow.callback.availability).toBe(ProjectOverviewCallbackAvailability.Available);
    expect(workflow.latestRun.availability).toBe(ProjectOverviewLatestRunAvailability.Available);
  });

  it('keeps codeful missing and unhealthy runtime rows partial without admitting runtime-only rows', async () => {
    const { service } = createService('codeful', {
      getCodefulSource: vi.fn().mockReturnValue('CreateTimerTrigger("timer")'),
      getCodefulWorkflowNames: vi.fn().mockReturnValue(['Healthy', 'Missing', 'Unhealthy']),
      request: vi.fn(async (_context, url) => {
        if (url.includes('/workflows?')) {
          return JSON.stringify({
            value: [
              { name: 'Healthy', kind: 'Stateful', health: { state: 'Healthy' }, triggers: {} },
              { name: 'Unhealthy', kind: 'Stateful', health: { state: 'Unhealthy' }, triggers: {} },
              { name: 'RuntimeOnly', kind: 'Stateful', health: { state: 'Healthy' }, triggers: {} },
            ],
          });
        }
        return JSON.stringify({ value: [] });
      }),
    });

    const snapshot = await service.refresh();

    expect(snapshot.workflows.map(({ name, runtimeState }) => [name, runtimeState])).toEqual([
      ['Healthy', ProjectOverviewWorkflowRuntimeState.Available],
      ['Missing', ProjectOverviewWorkflowRuntimeState.NotRegistered],
      ['Unhealthy', ProjectOverviewWorkflowRuntimeState.Unhealthy],
    ]);
    expect(snapshot.lifecycle).toBe(ProjectOverviewLifecycle.Partial);
  });

  it('rejects stale runtime-only workflows and keeps source registration health partial', async () => {
    const { service } = createService('codeless', {
      getWorkflowsPath: vi.fn().mockResolvedValue([
        { name: 'Healthy', path: `${projectPath}\\Healthy\\workflow.json` },
        { name: 'Missing', path: `${projectPath}\\Missing\\workflow.json` },
        { name: 'Unhealthy', path: `${projectPath}\\Unhealthy\\workflow.json` },
      ]),
      getWorkflows: vi.fn().mockResolvedValue({
        Healthy: workflowContent(),
        Missing: workflowContent('Stateful', 'Recurrence'),
        Unhealthy: workflowContent('Stateful', 'Recurrence'),
      }),
      request: vi.fn(async (_context, url) => {
        if (url.includes('/workflows?')) {
          return JSON.stringify({
            value: [
              { name: 'Healthy', health: { state: 'Healthy' }, triggers: { manual: { type: 'Request', kind: 'Http' } } },
              { name: 'Unhealthy', health: { state: 'Unhealthy' } },
              { name: 'StaleOnly', health: { state: 'Healthy' } },
            ],
          });
        }
        if (url.includes('listCallbackUrl')) {
          return JSON.stringify({ value: 'http://localhost/healthy' });
        }
        return JSON.stringify({ value: [] });
      }),
    });

    const snapshot = await service.refresh();

    expect(snapshot.workflows.map((workflow) => workflow.name)).toEqual(['Healthy', 'Missing', 'Unhealthy']);
    expect(snapshot.workflows[0].runtimeState).toBe(ProjectOverviewWorkflowRuntimeState.Available);
    expect(snapshot.workflows[1].runtimeState).toBe(ProjectOverviewWorkflowRuntimeState.NotRegistered);
    expect(snapshot.workflows[2].runtimeState).toBe(ProjectOverviewWorkflowRuntimeState.Unhealthy);
    expect(snapshot.lifecycle).toBe(ProjectOverviewLifecycle.Partial);
  });

  it('gates callbacks to HTTP Request triggers and exposes successful latest-run availability', async () => {
    const request = vi.fn(async (_context, url) => {
      if (url.includes('/workflows?')) {
        return JSON.stringify({
          value: [
            { name: 'RequestFlow', health: { state: 'Healthy' }, triggers: { manual: { type: 'Request', kind: 'Http' } } },
            { name: 'TimerFlow', health: { state: 'Healthy' }, triggers: { timer: { type: 'Recurrence' } } },
          ],
        });
      }
      if (url.includes('listCallbackUrl')) {
        return JSON.stringify({ value: 'http://localhost/request' });
      }
      return JSON.stringify({
        value: [
          {
            id: 'workflows/RequestFlow/runs/run-1',
            name: 'run-1',
            properties: { status: 'Succeeded', startTime: '2026-01-01T00:00:00Z' },
          },
        ],
      });
    });
    const { service } = createService('codeless', {
      getWorkflowsPath: vi.fn().mockResolvedValue([
        { name: 'RequestFlow', path: `${projectPath}\\RequestFlow\\workflow.json` },
        { name: 'TimerFlow', path: `${projectPath}\\TimerFlow\\workflow.json` },
      ]),
      getWorkflows: vi.fn().mockResolvedValue({
        RequestFlow: workflowContent(),
        TimerFlow: workflowContent('Stateful', 'Recurrence'),
      }),
      request,
    });

    const snapshot = await service.refresh();
    const requestFlow = snapshot.workflows.find((workflow) => workflow.name === 'RequestFlow')!;
    const timerFlow = snapshot.workflows.find((workflow) => workflow.name === 'TimerFlow')!;

    expect(requestFlow.callback).toEqual({
      availability: ProjectOverviewCallbackAvailability.Available,
      url: 'http://localhost/request',
    });
    expect(timerFlow.callback).toEqual({ availability: ProjectOverviewCallbackAvailability.NotRequestTrigger });
    expect(requestFlow.latestRun.availability).toBe(ProjectOverviewLatestRunAvailability.Available);
    expect(request.mock.calls.filter(([, url]) => String(url).includes('listCallbackUrl'))).toHaveLength(1);
    expect(service.resolveWorkflow(requestFlow.workflowId)).toMatchObject({ workflowName: 'RequestFlow' });
    if (requestFlow.latestRun.availability === ProjectOverviewLatestRunAvailability.Available) {
      const firstRunId = requestFlow.latestRun.run.runId;
      expect(service.resolveRun(requestFlow.latestRun.run.runId)).toMatchObject({
        workflowName: 'RequestFlow',
        runtimeRunId: 'workflows/RequestFlow/runs/run-1',
      });
      const refreshed = await service.refresh();
      expect(service.resolveWorkflow(requestFlow.workflowId, snapshot.generation)).toBeUndefined();
      expect(service.resolveWorkflow(requestFlow.workflowId, refreshed.generation)).toMatchObject({ workflowName: 'RequestFlow' });
      expect(service.resolveRun(firstRunId, refreshed.generation)).toBeUndefined();
    }
  });

  it('distinguishes no runs, stateless history unavailable, runtime unavailable, and query failure', async () => {
    const { service } = createService('codeless', {
      getWorkflowsPath: vi.fn().mockResolvedValue([
        { name: 'NoRuns', path: `${projectPath}\\NoRuns\\workflow.json` },
        { name: 'Stateless', path: `${projectPath}\\Stateless\\workflow.json` },
        { name: 'Failed', path: `${projectPath}\\Failed\\workflow.json` },
      ]),
      getWorkflows: vi.fn().mockResolvedValue({
        NoRuns: workflowContent(),
        Stateless: workflowContent('Stateless'),
        Failed: workflowContent(),
      }),
      request: vi.fn(async (_context, url) => {
        if (url.includes('/workflows?')) {
          return JSON.stringify({
            value: ['NoRuns', 'Stateless', 'Failed'].map((name) => ({
              name,
              health: { state: 'Healthy' },
              triggers: { timer: { type: 'Recurrence' } },
            })),
          });
        }
        if (url.includes('/Failed/runs?')) {
          throw new Error('history failed');
        }
        return JSON.stringify({ value: [] });
      }),
    });

    const snapshot = await service.refresh();
    expect(snapshot.workflows.find((workflow) => workflow.name === 'NoRuns')?.latestRun.availability).toBe(
      ProjectOverviewLatestRunAvailability.NoRuns
    );
    expect(snapshot.workflows.find((workflow) => workflow.name === 'Stateless')?.latestRun.availability).toBe(
      ProjectOverviewLatestRunAvailability.StatelessHistoryUnavailable
    );
    expect(snapshot.workflows.find((workflow) => workflow.name === 'Failed')?.latestRun.availability).toBe(
      ProjectOverviewLatestRunAvailability.QueryFailed
    );

    const stopped = createService('codeless', {
      getRuntimeRegistration: vi.fn().mockReturnValue(undefined),
      getWorkflowsPath: vi.fn().mockResolvedValue([{ name: 'Offline', path: `${projectPath}\\Offline\\workflow.json` }]),
      getWorkflows: vi.fn().mockResolvedValue({ Offline: workflowContent() }),
    });
    expect((await stopped.service.refresh()).workflows[0].latestRun.availability).toBe(
      ProjectOverviewLatestRunAvailability.RuntimeUnavailable
    );
  });

  it('returns partial row errors when one workflow times out without failing healthy rows', async () => {
    const { service } = createService(
      'codeless',
      {
        getWorkflowsPath: vi.fn().mockResolvedValue([
          { name: 'Fast', path: `${projectPath}\\Fast\\workflow.json` },
          { name: 'Slow', path: `${projectPath}\\Slow\\workflow.json` },
        ]),
        getWorkflows: vi.fn().mockResolvedValue({ Fast: workflowContent(), Slow: workflowContent() }),
        request: vi.fn(async (_context, url) => {
          if (url.includes('/workflows?')) {
            return JSON.stringify({
              value: ['Fast', 'Slow'].map((name) => ({
                name,
                health: { state: 'Healthy' },
                triggers: { manual: { type: 'Request', kind: 'Http' } },
              })),
            });
          }
          if (url.includes('/Slow/')) {
            return await new Promise<string>(() => {});
          }
          if (url.includes('/runs?')) {
            return JSON.stringify({ value: [] });
          }
          return JSON.stringify({ value: 'http://localhost/fast' });
        }),
      },
      { concurrency: 2, workflowTimeoutMs: 10 }
    );

    const snapshot = await service.refresh();
    expect(snapshot.workflows.find((workflow) => workflow.name === 'Fast')?.errors).toEqual([]);
    expect(snapshot.workflows.find((workflow) => workflow.name === 'Slow')?.errors[0].code).toBe('workflowQueryTimeout');
    expect(snapshot.lifecycle).toBe(ProjectOverviewLifecycle.Partial);
  });

  it('supports cancellation of an in-flight refresh', async () => {
    const { service } = createService(
      'codeless',
      {
        getWorkflowsPath: vi.fn().mockResolvedValue([{ name: 'Flow', path: `${projectPath}\\Flow\\workflow.json` }]),
        getWorkflows: vi.fn().mockResolvedValue({ Flow: workflowContent() }),
        request: vi.fn(async () => await new Promise<string>(() => {})),
      },
      { workflowTimeoutMs: 10_000 }
    );
    const controller = new AbortController();
    const refresh = service.refresh(controller.signal);

    controller.abort();

    await expect(refresh).rejects.toMatchObject({ name: 'AbortError' });
  });

  it('serializes concurrent refreshes and advances deterministic snapshot generations', async () => {
    let releaseRuntimeQuery: ((value: string) => void) | undefined;
    const runtimeQuery = new Promise<string>((resolve) => {
      releaseRuntimeQuery = resolve;
    });
    const request = vi.fn(async (_context, url) => {
      if (url.includes('/workflows?')) {
        return await runtimeQuery;
      }
      return JSON.stringify({ value: [] });
    });
    const { service } = createService('codeless', { request });

    const first = service.refresh();
    const coalesced = service.refresh();
    releaseRuntimeQuery?.(JSON.stringify({ value: [] }));

    const [firstSnapshot, coalescedSnapshot] = await Promise.all([first, coalesced]);
    expect(firstSnapshot.generation).toBe(1);
    expect(coalescedSnapshot.generation).toBe(1);
    expect((await service.refresh()).generation).toBe(2);
    expect(request).toHaveBeenCalledTimes(2);
    expect(firstSnapshot.runtime).toEqual({ state: ProjectOverviewRuntimeState.Running, generation: 3 });
  });

  it('invalidates row runtime data when the matching runtime generation changes during refresh', async () => {
    let registration = runtimeRegistration();
    const { service } = createService('codeless', {
      getRuntimeRegistration: vi.fn(() => registration),
      getWorkflowsPath: vi.fn().mockResolvedValue([{ name: 'Flow', path: `${projectPath}\\Flow\\workflow.json` }]),
      getWorkflows: vi.fn().mockResolvedValue({ Flow: workflowContent() }),
      request: vi.fn(async (_context, url) => {
        if (url.includes('/workflows?')) {
          return JSON.stringify({
            value: [{ name: 'Flow', health: { state: 'Healthy' }, triggers: { manual: { type: 'Request', kind: 'Http' } } }],
          });
        }
        if (url.includes('listCallbackUrl')) {
          registration = runtimeRegistration({ generation: 4, lifecycle: 'starting', port: 7072 });
          return JSON.stringify({ value: 'http://localhost/stale-callback' });
        }
        return JSON.stringify({ value: [] });
      }),
    });

    const snapshot = await service.refresh();

    expect(snapshot.runtime).toEqual({ state: ProjectOverviewRuntimeState.Starting, generation: 4 });
    expect(snapshot.workflows[0]).toMatchObject({
      runtimeState: ProjectOverviewWorkflowRuntimeState.Registering,
      callback: { availability: ProjectOverviewCallbackAvailability.RuntimeUnavailable },
      latestRun: { availability: ProjectOverviewLatestRunAvailability.RuntimeUnavailable },
    });
    expect(snapshot.errors[0].code).toBe('runtimeGenerationChanged');
  });
});
