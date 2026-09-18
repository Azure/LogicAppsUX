/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import {
  ProjectOverviewLifecycle,
  ProjectOverviewRuntimeState,
  ProjectOverviewWorkflowRuntimeState,
  ProjectOverviewWorkflowSourceState,
} from '@microsoft/vscode-extension-logic-apps';
import { describe, expect, it } from 'vitest';
import type { ProjectRuntimeRegistration } from '../../../../../utils/funcCoreTools/projectRuntimeRegistry';
import { getProjectLifecycle, getProjectRuntimeState, getWorkflowRuntimeState } from '../projectRuntimeReadiness';

function registration(lifecycle: ProjectRuntimeRegistration['lifecycle']): ProjectRuntimeRegistration {
  return {
    projectId: 'project',
    projectUri: 'file:///project',
    workspaceFolderUri: 'file:///workspace',
    generation: 1,
    lifecycle,
    port: 7071,
    cancellationRequested: false,
    startedAt: 1,
    updatedAt: 1,
  };
}

describe('project runtime readiness', () => {
  it('keeps host readiness separate from workflow registration', () => {
    const running = registration('running');

    expect(getProjectRuntimeState(running)).toBe(ProjectOverviewRuntimeState.Running);
    expect(getWorkflowRuntimeState(running, undefined, true)).toBe(ProjectOverviewWorkflowRuntimeState.NotRegistered);
  });

  it('distinguishes registering, healthy, unhealthy, and runtime unavailable workflows', () => {
    expect(getWorkflowRuntimeState(registration('starting'), undefined, false)).toBe(ProjectOverviewWorkflowRuntimeState.Registering);
    expect(getWorkflowRuntimeState(registration('running'), { name: 'a', healthState: 'Healthy' }, true)).toBe(
      ProjectOverviewWorkflowRuntimeState.Available
    );
    expect(getWorkflowRuntimeState(registration('running'), { name: 'a', healthState: 'Unhealthy' }, true)).toBe(
      ProjectOverviewWorkflowRuntimeState.Unhealthy
    );
    expect(getWorkflowRuntimeState(registration('running'), undefined, false)).toBe(ProjectOverviewWorkflowRuntimeState.RuntimeUnavailable);
  });

  it('orders fatal source, startup, stopped, ready, and partial lifecycle decisions', () => {
    const healthyWorkflow = {
      sourceState: ProjectOverviewWorkflowSourceState.Available,
      runtimeState: ProjectOverviewWorkflowRuntimeState.Available,
      errors: [],
    } as any;

    expect(getProjectLifecycle(ProjectOverviewRuntimeState.Running, [healthyWorkflow], true)).toBe(ProjectOverviewLifecycle.Error);
    expect(getProjectLifecycle(ProjectOverviewRuntimeState.Starting, [healthyWorkflow], false)).toBe(ProjectOverviewLifecycle.Starting);
    expect(getProjectLifecycle(ProjectOverviewRuntimeState.Stopped, [healthyWorkflow], false)).toBe(
      ProjectOverviewLifecycle.RuntimeStopped
    );
    expect(getProjectLifecycle(ProjectOverviewRuntimeState.Running, [healthyWorkflow], false)).toBe(ProjectOverviewLifecycle.Ready);
    expect(
      getProjectLifecycle(
        ProjectOverviewRuntimeState.Running,
        [{ ...healthyWorkflow, runtimeState: ProjectOverviewWorkflowRuntimeState.Unhealthy }],
        false
      )
    ).toBe(ProjectOverviewLifecycle.Partial);
  });
});
