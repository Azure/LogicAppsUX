/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import {
  ProjectOverviewLifecycle,
  ProjectOverviewRuntimeState,
  ProjectOverviewWorkflowRuntimeState,
  ProjectOverviewWorkflowSourceState,
  type ProjectOverviewWorkflow,
} from '@microsoft/vscode-extension-logic-apps';
import type { ProjectRuntimeRegistration } from '../../../../utils/funcCoreTools/projectRuntimeRegistry';

export interface RuntimeWorkflowRegistration {
  name: string;
  healthState?: string;
  kind?: string;
  triggers?: Record<string, RuntimeTriggerRegistration>;
}

export interface RuntimeTriggerRegistration {
  type?: string;
  kind?: string;
  properties?: {
    type?: string;
    kind?: string;
  };
}

export function getProjectRuntimeState(registration: ProjectRuntimeRegistration | undefined): ProjectOverviewRuntimeState {
  switch (registration?.lifecycle) {
    case 'starting':
      return ProjectOverviewRuntimeState.Starting;
    case 'running':
      return ProjectOverviewRuntimeState.Running;
    case 'stopping':
    case 'stopped':
    case 'cancelled':
      return ProjectOverviewRuntimeState.Stopped;
    case 'failed':
      return ProjectOverviewRuntimeState.Error;
    default:
      return ProjectOverviewRuntimeState.Unavailable;
  }
}

export function getWorkflowRuntimeState(
  registration: ProjectRuntimeRegistration | undefined,
  runtimeWorkflow: RuntimeWorkflowRegistration | undefined,
  runtimeQueryAvailable: boolean
): ProjectOverviewWorkflowRuntimeState {
  const runtimeState = getProjectRuntimeState(registration);
  if (runtimeState === ProjectOverviewRuntimeState.Starting) {
    return ProjectOverviewWorkflowRuntimeState.Registering;
  }
  if (runtimeState !== ProjectOverviewRuntimeState.Running || !runtimeQueryAvailable) {
    return ProjectOverviewWorkflowRuntimeState.RuntimeUnavailable;
  }
  if (!runtimeWorkflow) {
    return ProjectOverviewWorkflowRuntimeState.NotRegistered;
  }
  return runtimeWorkflow.healthState?.toLowerCase() === 'healthy'
    ? ProjectOverviewWorkflowRuntimeState.Available
    : ProjectOverviewWorkflowRuntimeState.Unhealthy;
}

export function getProjectLifecycle(
  runtimeState: ProjectOverviewRuntimeState,
  workflows: readonly ProjectOverviewWorkflow[],
  hasFatalSourceError: boolean
): ProjectOverviewLifecycle {
  if (hasFatalSourceError) {
    return ProjectOverviewLifecycle.Error;
  }
  if (runtimeState === ProjectOverviewRuntimeState.Starting) {
    return ProjectOverviewLifecycle.Starting;
  }
  if (runtimeState === ProjectOverviewRuntimeState.Stopped) {
    return ProjectOverviewLifecycle.RuntimeStopped;
  }
  const allReady =
    runtimeState === ProjectOverviewRuntimeState.Running &&
    workflows.every(
      (workflow) =>
        workflow.sourceState === ProjectOverviewWorkflowSourceState.Available &&
        workflow.runtimeState === ProjectOverviewWorkflowRuntimeState.Available &&
        workflow.errors.length === 0
    );
  return allReady ? ProjectOverviewLifecycle.Ready : ProjectOverviewLifecycle.Partial;
}
