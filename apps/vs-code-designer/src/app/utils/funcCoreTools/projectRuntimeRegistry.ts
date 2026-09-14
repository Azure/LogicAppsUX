/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as path from 'path';
import * as vscode from 'vscode';

export type ProjectRuntimeLifecycleState = 'starting' | 'running' | 'stopping' | 'stopped' | 'failed' | 'cancelled';

export interface ProjectRuntimeIdentity {
  projectId: string;
  projectUri: string;
  workspaceFolderUri: string;
}

export interface ProjectRuntimeRegistration extends ProjectRuntimeIdentity {
  generation: number;
  lifecycle: ProjectRuntimeLifecycleState;
  port: number;
  debugInvocationId?: string;
  taskInvocationId?: string;
  taskProcessId?: number;
  cancellationRequested: boolean;
  startedAt: number;
  updatedAt: number;
  terminatedAt?: number;
}

export interface ProjectRuntimeHandle {
  projectId: string;
  generation: number;
}

interface MutableProjectRuntimeRegistration extends ProjectRuntimeRegistration {
  taskExecution?: object;
}

function isCancelled(token?: vscode.CancellationToken): boolean {
  return token?.isCancellationRequested === true;
}

function normalizeLocalPath(fsPath: string): string {
  const normalizedPath = path.normalize(path.resolve(fsPath));
  const root = path.parse(normalizedPath).root;
  const withoutTrailingSeparator = normalizedPath.length > root.length ? normalizedPath.replace(/[\\/]+$/, '') : normalizedPath;
  return process.platform === 'win32' ? withoutTrailingSeparator.toLowerCase() : withoutTrailingSeparator;
}

export function getCanonicalProjectUri(projectPathOrUri: string | vscode.Uri): vscode.Uri {
  const fsPath = typeof projectPathOrUri === 'string' ? projectPathOrUri : projectPathOrUri.fsPath;
  return vscode.Uri.file(normalizeLocalPath(fsPath));
}

export function getCanonicalProjectId(projectPathOrUri: string | vscode.Uri): string {
  return getCanonicalProjectUri(projectPathOrUri).toString(true);
}

function cloneRegistration(registration: MutableProjectRuntimeRegistration): ProjectRuntimeRegistration {
  const snapshot = { ...registration };
  delete snapshot.taskExecution;
  return snapshot;
}

export class ProjectRuntimeRegistry {
  private readonly registrations = new Map<string, MutableProjectRuntimeRegistration>();
  private readonly activeDebugInvocations = new Map<string, string>();
  private taskExecutionHandles = new WeakMap<object, ProjectRuntimeHandle>();
  private nextDebugInvocation = 0;
  private nextTaskInvocation = 0;

  public createDebugInvocationId(projectPathOrUri: string | vscode.Uri): string {
    this.nextDebugInvocation += 1;
    const projectId = getCanonicalProjectId(projectPathOrUri);
    const debugInvocationId = `${projectId}#debug-${this.nextDebugInvocation}`;
    this.activeDebugInvocations.set(projectId, debugInvocationId);
    return debugInvocationId;
  }

  public getActiveDebugInvocationId(projectPathOrUri: string | vscode.Uri): string | undefined {
    return this.activeDebugInvocations.get(getCanonicalProjectId(projectPathOrUri));
  }

  public isDebugInvocationCurrent(projectPathOrUri: string | vscode.Uri, debugInvocationId: string, generation?: number): boolean {
    const projectId = getCanonicalProjectId(projectPathOrUri);
    if (this.activeDebugInvocations.get(projectId) !== debugInvocationId) {
      return false;
    }
    const registration = this.registrations.get(projectId);
    return generation === undefined || registration?.generation === generation;
  }

  public endDebugInvocation(projectPathOrUri: string | vscode.Uri, debugInvocationId: string): boolean {
    const projectId = getCanonicalProjectId(projectPathOrUri);
    if (this.activeDebugInvocations.get(projectId) !== debugInvocationId) {
      return false;
    }
    this.activeDebugInvocations.delete(projectId);
    return true;
  }

  public beginRuntimeStart(
    projectPathOrUri: string | vscode.Uri,
    workspaceFolderUri: vscode.Uri,
    port: number,
    debugInvocationId?: string
  ): ProjectRuntimeHandle {
    const projectUri = getCanonicalProjectUri(projectPathOrUri);
    const projectId = projectUri.toString(true);
    const previous = this.registrations.get(projectId);
    const now = Date.now();
    const registration: MutableProjectRuntimeRegistration = {
      projectId,
      projectUri: projectUri.toString(true),
      workspaceFolderUri: getCanonicalProjectUri(workspaceFolderUri).toString(true),
      generation: (previous?.generation ?? 0) + 1,
      lifecycle: 'starting',
      port,
      debugInvocationId,
      cancellationRequested: false,
      startedAt: now,
      updatedAt: now,
    };
    this.registrations.set(projectId, registration);
    if (debugInvocationId) {
      this.activeDebugInvocations.set(projectId, debugInvocationId);
    }
    return { projectId, generation: registration.generation };
  }

  public get(projectPathOrUri: string | vscode.Uri, token?: vscode.CancellationToken): ProjectRuntimeRegistration | undefined {
    if (isCancelled(token)) {
      return undefined;
    }
    const registration = this.registrations.get(getCanonicalProjectId(projectPathOrUri));
    return registration ? cloneRegistration(registration) : undefined;
  }

  public getByHandle(handle: ProjectRuntimeHandle, token?: vscode.CancellationToken): ProjectRuntimeRegistration | undefined {
    if (isCancelled(token)) {
      return undefined;
    }
    const registration = this.getCurrent(handle);
    return registration ? cloneRegistration(registration) : undefined;
  }

  public getMostRecentActive(token?: vscode.CancellationToken): ProjectRuntimeRegistration | undefined {
    if (isCancelled(token)) {
      return undefined;
    }
    let newest: MutableProjectRuntimeRegistration | undefined;
    for (const registration of this.registrations.values()) {
      if (
        (registration.lifecycle === 'starting' || registration.lifecycle === 'running') &&
        (!newest || registration.updatedAt > newest.updatedAt)
      ) {
        newest = registration;
      }
    }
    return newest ? cloneRegistration(newest) : undefined;
  }

  public bindTaskExecution(
    handle: ProjectRuntimeHandle,
    taskExecution: object,
    processId?: number,
    token?: vscode.CancellationToken
  ): boolean {
    if (isCancelled(token)) {
      return false;
    }
    const registration = this.getCurrent(handle);
    if (!registration || registration.lifecycle !== 'starting') {
      return false;
    }
    registration.taskExecution = taskExecution;
    registration.taskProcessId = processId ?? registration.taskProcessId;
    registration.taskInvocationId ??= `${registration.projectId}#task-${++this.nextTaskInvocation}`;
    registration.updatedAt = Date.now();
    this.taskExecutionHandles.set(taskExecution, handle);
    return true;
  }

  public claimTaskStart(workspaceFolderUri: vscode.Uri, taskExecution: object, processId: number): ProjectRuntimeHandle | undefined {
    const workspaceId = getCanonicalProjectId(workspaceFolderUri);
    let candidate: MutableProjectRuntimeRegistration | undefined;
    for (const registration of this.registrations.values()) {
      if (
        registration.workspaceFolderUri === workspaceId &&
        registration.lifecycle === 'starting' &&
        !registration.taskExecution &&
        (!candidate || registration.updatedAt >= candidate.updatedAt)
      ) {
        candidate = registration;
      }
    }
    if (!candidate) {
      return undefined;
    }
    const handle = { projectId: candidate.projectId, generation: candidate.generation };
    this.bindTaskExecution(handle, taskExecution, processId);
    return handle;
  }

  public markRunning(handle: ProjectRuntimeHandle, processId?: number, token?: vscode.CancellationToken): boolean {
    return this.updateCurrent(
      handle,
      (registration) => {
        registration.lifecycle = 'running';
        registration.taskProcessId = processId ?? registration.taskProcessId;
      },
      token
    );
  }

  public isTaskExecutionCurrent(handle: ProjectRuntimeHandle, taskExecution: object, processId?: number): boolean {
    const registration = this.getCurrent(handle);
    const taskHandle = this.taskExecutionHandles.get(taskExecution);
    return (
      registration !== undefined &&
      registration.terminatedAt === undefined &&
      registration.taskExecution === taskExecution &&
      taskHandle?.projectId === handle.projectId &&
      taskHandle.generation === handle.generation &&
      (processId === undefined || registration.taskProcessId === processId)
    );
  }

  public markStopping(handle: ProjectRuntimeHandle, token?: vscode.CancellationToken): boolean {
    return this.updateCurrent(
      handle,
      (registration) => {
        registration.lifecycle = 'stopping';
      },
      token
    );
  }

  public cancel(handle: ProjectRuntimeHandle, token?: vscode.CancellationToken): boolean {
    return this.terminate(handle, 'cancelled', token);
  }

  public fail(handle: ProjectRuntimeHandle, token?: vscode.CancellationToken): boolean {
    return this.terminate(handle, 'failed', token);
  }

  public terminate(
    handle: ProjectRuntimeHandle,
    lifecycle: Extract<ProjectRuntimeLifecycleState, 'stopped' | 'failed' | 'cancelled'> = 'stopped',
    token?: vscode.CancellationToken
  ): boolean {
    const terminated = this.updateCurrent(
      handle,
      (registration) => {
        registration.lifecycle = lifecycle;
        registration.cancellationRequested = lifecycle === 'cancelled';
        registration.terminatedAt = Date.now();
      },
      token
    );
    if (terminated) {
      const registration = this.registrations.get(handle.projectId);
      if (registration?.debugInvocationId) {
        this.endDebugInvocation(registration.projectId, registration.debugInvocationId);
      }
    }
    return terminated;
  }

  public terminateTaskExecution(taskExecution: object, token?: vscode.CancellationToken): ProjectRuntimeRegistration | undefined {
    if (isCancelled(token)) {
      return undefined;
    }
    const handle = this.taskExecutionHandles.get(taskExecution);
    if (!handle || !this.terminate(handle, 'stopped', token)) {
      return undefined;
    }
    return this.getByHandle(handle);
  }

  public cancelDebugInvocation(
    projectPathOrUri: string | vscode.Uri,
    debugInvocationId: string,
    token?: vscode.CancellationToken
  ): boolean {
    const projectId = getCanonicalProjectId(projectPathOrUri);
    const registration = this.registrations.get(projectId);
    if (!registration || registration.debugInvocationId !== debugInvocationId) {
      this.endDebugInvocation(projectPathOrUri, debugInvocationId);
      return false;
    }
    const cancelled = this.cancel({ projectId: registration.projectId, generation: registration.generation }, token);
    this.endDebugInvocation(projectPathOrUri, debugInvocationId);
    return cancelled;
  }

  public clear(): void {
    this.registrations.clear();
    this.activeDebugInvocations.clear();
    this.taskExecutionHandles = new WeakMap<object, ProjectRuntimeHandle>();
    this.nextDebugInvocation = 0;
    this.nextTaskInvocation = 0;
  }

  private getCurrent(handle: ProjectRuntimeHandle): MutableProjectRuntimeRegistration | undefined {
    const registration = this.registrations.get(handle.projectId);
    return registration?.generation === handle.generation ? registration : undefined;
  }

  private updateCurrent(
    handle: ProjectRuntimeHandle,
    update: (registration: MutableProjectRuntimeRegistration) => void,
    token?: vscode.CancellationToken
  ): boolean {
    if (isCancelled(token)) {
      return false;
    }
    const registration = this.getCurrent(handle);
    if (!registration || registration.terminatedAt !== undefined) {
      return false;
    }
    update(registration);
    registration.updatedAt = Date.now();
    return true;
  }
}

export const projectRuntimeRegistry = new ProjectRuntimeRegistry();
