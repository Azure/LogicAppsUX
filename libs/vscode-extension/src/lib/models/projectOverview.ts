import type { ExtensionCommand } from './extensioncommand';

type OpaqueProjectOverviewId<T extends string> = string & {
  readonly __projectOverviewId: T;
};

export type ProjectOverviewProjectId = OpaqueProjectOverviewId<'project'>;
export type ProjectOverviewWorkflowId = OpaqueProjectOverviewId<'workflow'>;
export type ProjectOverviewRunId = OpaqueProjectOverviewId<'run'>;

export const ProjectOverviewLifecycle = {
  Starting: 'starting',
  Ready: 'ready',
  Partial: 'partial',
  Error: 'error',
  RuntimeStopped: 'runtimeStopped',
} as const;
export type ProjectOverviewLifecycle = (typeof ProjectOverviewLifecycle)[keyof typeof ProjectOverviewLifecycle];

export const ProjectOverviewRuntimeState = {
  Starting: 'starting',
  Running: 'running',
  Stopped: 'stopped',
  Unavailable: 'unavailable',
  Error: 'error',
} as const;
export type ProjectOverviewRuntimeState = (typeof ProjectOverviewRuntimeState)[keyof typeof ProjectOverviewRuntimeState];

export const ProjectOverviewWorkflowSourceState = {
  Available: 'available',
  Invalid: 'invalid',
  Unavailable: 'unavailable',
} as const;
export type ProjectOverviewWorkflowSourceState =
  (typeof ProjectOverviewWorkflowSourceState)[keyof typeof ProjectOverviewWorkflowSourceState];

export const ProjectOverviewWorkflowRuntimeState = {
  Registering: 'registering',
  Available: 'available',
  NotRegistered: 'notRegistered',
  Unhealthy: 'unhealthy',
  RuntimeUnavailable: 'runtimeUnavailable',
} as const;
export type ProjectOverviewWorkflowRuntimeState =
  (typeof ProjectOverviewWorkflowRuntimeState)[keyof typeof ProjectOverviewWorkflowRuntimeState];

export const ProjectOverviewWorkflowKind = {
  Codeless: 'codeless',
  Codeful: 'codeful',
} as const;
export type ProjectOverviewWorkflowKind = (typeof ProjectOverviewWorkflowKind)[keyof typeof ProjectOverviewWorkflowKind];

export const ProjectOverviewWorkflowRunMode = {
  Stateful: 'stateful',
  Stateless: 'stateless',
  Unknown: 'unknown',
} as const;
export type ProjectOverviewWorkflowRunMode = (typeof ProjectOverviewWorkflowRunMode)[keyof typeof ProjectOverviewWorkflowRunMode];

export const ProjectOverviewCallbackAvailability = {
  Available: 'available',
  NotRequestTrigger: 'notRequestTrigger',
  RuntimeUnavailable: 'runtimeUnavailable',
  Unavailable: 'unavailable',
  QueryFailed: 'queryFailed',
} as const;
export type ProjectOverviewCallbackAvailability =
  (typeof ProjectOverviewCallbackAvailability)[keyof typeof ProjectOverviewCallbackAvailability];

export type ProjectOverviewCallback =
  | {
      availability: typeof ProjectOverviewCallbackAvailability.Available;
      url: string;
    }
  | {
      availability: Exclude<ProjectOverviewCallbackAvailability, typeof ProjectOverviewCallbackAvailability.Available>;
    };

export const ProjectOverviewLatestRunAvailability = {
  Available: 'available',
  NoRuns: 'noRuns',
  StatelessHistoryUnavailable: 'statelessHistoryUnavailable',
  RuntimeUnavailable: 'runtimeUnavailable',
  QueryFailed: 'queryFailed',
} as const;
export type ProjectOverviewLatestRunAvailability =
  (typeof ProjectOverviewLatestRunAvailability)[keyof typeof ProjectOverviewLatestRunAvailability];

export interface ProjectOverviewLatestRun {
  runId: ProjectOverviewRunId;
  status: string;
  startTime: string;
  endTime?: string;
}

export type ProjectOverviewLatestRunState =
  | {
      availability: typeof ProjectOverviewLatestRunAvailability.Available;
      run: ProjectOverviewLatestRun;
    }
  | {
      availability: Exclude<ProjectOverviewLatestRunAvailability, typeof ProjectOverviewLatestRunAvailability.Available>;
    };

export const ProjectOverviewErrorScope = {
  Project: 'project',
  Workflow: 'workflow',
} as const;
export type ProjectOverviewErrorScope = (typeof ProjectOverviewErrorScope)[keyof typeof ProjectOverviewErrorScope];

export const ProjectOverviewErrorAction = {
  Refresh: 'refresh',
  Retry: 'retry',
} as const;
export type ProjectOverviewErrorAction = (typeof ProjectOverviewErrorAction)[keyof typeof ProjectOverviewErrorAction];

export interface ProjectOverviewError {
  code: string;
  message: string;
  scope: ProjectOverviewErrorScope;
  retryable: boolean;
  action?: ProjectOverviewErrorAction;
}

export interface ProjectOverviewProjectError extends ProjectOverviewError {
  scope: typeof ProjectOverviewErrorScope.Project;
}

export interface ProjectOverviewWorkflowError extends ProjectOverviewError {
  scope: typeof ProjectOverviewErrorScope.Workflow;
}

export interface ProjectOverviewRuntime {
  state: ProjectOverviewRuntimeState;
  generation: number;
}

export interface ProjectOverviewWorkflow {
  workflowId: ProjectOverviewWorkflowId;
  name: string;
  kind: ProjectOverviewWorkflowKind;
  runMode: ProjectOverviewWorkflowRunMode;
  sourceState: ProjectOverviewWorkflowSourceState;
  runtimeState: ProjectOverviewWorkflowRuntimeState;
  callback: ProjectOverviewCallback;
  latestRun: ProjectOverviewLatestRunState;
  errors: ProjectOverviewWorkflowError[];
}

export interface ProjectOverviewSnapshot {
  projectId: ProjectOverviewProjectId;
  projectName: string;
  lifecycle: ProjectOverviewLifecycle;
  runtime: ProjectOverviewRuntime;
  generation: number;
  generatedAt: string;
  isRefreshing: boolean;
  workflows: ProjectOverviewWorkflow[];
  errors: ProjectOverviewProjectError[];
}

export interface InitializeProjectOverviewPayload {
  snapshot: ProjectOverviewSnapshot;
  visible: boolean;
}

export interface UpdateProjectOverviewPayload {
  snapshot: ProjectOverviewSnapshot;
}

export interface ProjectOverviewActionPayload {
  projectId: ProjectOverviewProjectId;
  snapshotGeneration: number;
}

export interface ProjectOverviewWorkflowActionPayload extends ProjectOverviewActionPayload {
  workflowId: ProjectOverviewWorkflowId;
}

export interface OpenLatestProjectOverviewRunPayload extends ProjectOverviewWorkflowActionPayload {
  runId: ProjectOverviewRunId;
}

export interface OpenProjectOverviewPayload {
  projectId: ProjectOverviewProjectId;
}

export interface CopyWorkflowOverviewCallbackPayload {
  workflowName: string;
}

export interface ProjectOverviewVisibilityPayload {
  projectId: ProjectOverviewProjectId;
  visible: boolean;
}

export type ProjectOverviewMessageToWebview =
  | {
      command: typeof ExtensionCommand.initializeProjectOverview;
      data: InitializeProjectOverviewPayload;
    }
  | {
      command: typeof ExtensionCommand.updateProjectOverview;
      data: UpdateProjectOverviewPayload;
    }
  | {
      command: typeof ExtensionCommand.projectOverviewVisibilityChanged;
      data: ProjectOverviewVisibilityPayload;
    };

export type ProjectOverviewMessageToExtension =
  | {
      command: typeof ExtensionCommand.refreshProjectOverview;
      data: ProjectOverviewActionPayload;
    }
  | {
      command: typeof ExtensionCommand.retryProjectOverview;
      data: ProjectOverviewActionPayload;
    }
  | {
      command: typeof ExtensionCommand.startProjectOverviewRuntime;
      data: ProjectOverviewActionPayload;
    }
  | {
      command: typeof ExtensionCommand.stopProjectOverviewRuntime;
      data: ProjectOverviewActionPayload;
    }
  | {
      command: typeof ExtensionCommand.openWorkflowOverview;
      data: ProjectOverviewWorkflowActionPayload;
    }
  | {
      command: typeof ExtensionCommand.openProjectOverview;
      data: OpenProjectOverviewPayload;
    }
  | {
      command: typeof ExtensionCommand.openLatestProjectOverviewRun;
      data: OpenLatestProjectOverviewRunPayload;
    }
  | {
      command: typeof ExtensionCommand.copyProjectOverviewCallback;
      data: ProjectOverviewWorkflowActionPayload;
    }
  | {
      command: typeof ExtensionCommand.projectOverviewVisibilityChanged;
      data: ProjectOverviewVisibilityPayload;
    };

export type WorkflowOverviewMessageToExtension =
  | {
      command: typeof ExtensionCommand.copyWorkflowOverviewCallback;
      data: CopyWorkflowOverviewCallbackPayload;
    }
  | {
      command: typeof ExtensionCommand.openProjectOverview;
      data: OpenProjectOverviewPayload;
    };
