/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { beforeEach, describe, expect, it } from 'vitest';
import * as vscode from 'vscode';
import { ProjectRuntimeRegistry, getCanonicalProjectId } from '../projectRuntimeRegistry';

describe('ProjectRuntimeRegistry', () => {
  let registry: ProjectRuntimeRegistry;

  beforeEach(() => {
    registry = new ProjectRuntimeRegistry();
  });

  it('uses the full canonical project URI rather than the project name', () => {
    const first = getCanonicalProjectId('D:\\workspace-one\\same-name\\');
    const second = getCanonicalProjectId('D:\\workspace-two\\same-name');

    expect(first).not.toBe(second);
    expect(getCanonicalProjectId('D:\\workspace-one\\same-name\\.')).toBe(first);
  });

  it('increments the generation when a project runtime restarts', () => {
    const workspaceUri = vscode.Uri.file('D:\\workspace');
    const first = registry.beginRuntimeStart('D:\\workspace\\logicapp', workspaceUri, 7071);
    registry.markRunning(first, 100);
    registry.terminate(first);
    const second = registry.beginRuntimeStart('D:\\workspace\\logicapp', workspaceUri, 7072);

    expect(second.generation).toBe(first.generation + 1);
    expect(registry.getByHandle(second)).toMatchObject({ lifecycle: 'starting', port: 7072 });
  });

  it('tracks generated debug and task invocation identities', () => {
    const projectPath = 'D:\\workspace\\logicapp';
    const debugInvocationId = registry.createDebugInvocationId(projectPath);
    const handle = registry.beginRuntimeStart(projectPath, vscode.Uri.file('D:\\workspace'), 7071, debugInvocationId);

    registry.bindTaskExecution(handle, {}, 100);

    expect(registry.getByHandle(handle)).toMatchObject({
      debugInvocationId,
      taskInvocationId: expect.stringContaining('#task-'),
      taskProcessId: 100,
    });
    expect(registry.isDebugInvocationCurrent(projectPath, debugInvocationId, handle.generation)).toBe(true);
  });

  it('supersedes older debug invocations and rejects stale generations', () => {
    const projectPath = 'D:\\workspace\\logicapp';
    const firstInvocation = registry.createDebugInvocationId(projectPath);
    const first = registry.beginRuntimeStart(projectPath, vscode.Uri.file('D:\\workspace'), 7071, firstInvocation);
    const secondInvocation = registry.createDebugInvocationId(projectPath);

    expect(registry.isDebugInvocationCurrent(projectPath, firstInvocation, first.generation)).toBe(false);
    expect(registry.isDebugInvocationCurrent(projectPath, secondInvocation, first.generation)).toBe(true);

    const second = registry.beginRuntimeStart(projectPath, vscode.Uri.file('D:\\workspace'), 7072, secondInvocation);
    expect(registry.isDebugInvocationCurrent(projectPath, secondInvocation, first.generation)).toBe(false);
    expect(registry.isDebugInvocationCurrent(projectPath, secondInvocation, second.generation)).toBe(true);
  });

  it('ends only the matching canonical project debug invocation', () => {
    const firstProject = 'D:\\workspace\\project-a';
    const secondProject = 'D:\\workspace\\project-b';
    const firstInvocation = registry.createDebugInvocationId(firstProject);
    const secondInvocation = registry.createDebugInvocationId(secondProject);

    expect(registry.endDebugInvocation(firstProject.toLowerCase(), firstInvocation)).toBe(true);
    expect(registry.getActiveDebugInvocationId(firstProject)).toBeUndefined();
    expect(registry.getActiveDebugInvocationId(secondProject)).toBe(secondInvocation);
  });

  it('does not allow stale termination to clear a newer generation', () => {
    const workspaceUri = vscode.Uri.file('D:\\workspace');
    const oldExecution = {};
    const first = registry.beginRuntimeStart('D:\\workspace\\logicapp', workspaceUri, 7071);
    registry.bindTaskExecution(first, oldExecution, 100);
    registry.markRunning(first);
    const second = registry.beginRuntimeStart('D:\\workspace\\logicapp', workspaceUri, 7072);
    registry.markRunning(second, 200);

    expect(registry.terminateTaskExecution(oldExecution)).toBeUndefined();
    expect(registry.getByHandle(second)).toMatchObject({ lifecycle: 'running', port: 7072, taskProcessId: 200 });
  });

  it('verifies the current project generation owns a task execution', () => {
    const workspaceUri = vscode.Uri.file('D:\\workspace');
    const execution = {};
    const first = registry.beginRuntimeStart('D:\\workspace\\logicapp', workspaceUri, 7071);
    registry.bindTaskExecution(first, execution, 100);
    registry.markRunning(first, 100);

    expect(registry.isTaskExecutionCurrent(first, execution, 100)).toBe(true);
    expect(registry.isTaskExecutionCurrent(first, {}, 100)).toBe(false);
    expect(registry.isTaskExecutionCurrent(first, execution, 200)).toBe(false);

    registry.beginRuntimeStart('D:\\workspace\\logicapp', workspaceUri, 7072);
    expect(registry.isTaskExecutionCurrent(first, execution, 100)).toBe(false);
  });

  it('keeps projects separated within one workspace folder', () => {
    const workspaceUri = vscode.Uri.file('D:\\workspace');
    const first = registry.beginRuntimeStart('D:\\workspace\\project-a', workspaceUri, 7071);
    const second = registry.beginRuntimeStart('D:\\workspace\\nested\\project-b', workspaceUri, 7072);
    registry.markRunning(first, 100);
    registry.markRunning(second, 200);

    expect(registry.get('D:\\workspace\\project-a')).toMatchObject({ projectId: first.projectId, port: 7071 });
    expect(registry.get('D:\\workspace\\nested\\project-b')).toMatchObject({ projectId: second.projectId, port: 7072 });
  });

  it('keeps projects in separate workspace folders separated', () => {
    const first = registry.beginRuntimeStart('D:\\workspace-one\\logicapp', vscode.Uri.file('D:\\workspace-one'), 7071);
    const second = registry.beginRuntimeStart('D:\\workspace-two\\logicapp', vscode.Uri.file('D:\\workspace-two'), 7072);

    expect(first.projectId).not.toBe(second.projectId);
    expect(registry.getByHandle(first)?.workspaceFolderUri).not.toBe(registry.getByHandle(second)?.workspaceFolderUri);
  });

  it('claims the newest unbound project generation for a workspace task start', () => {
    const workspaceUri = vscode.Uri.file('D:\\workspace');
    const first = registry.beginRuntimeStart('D:\\workspace\\project-a', workspaceUri, 7071);
    const second = registry.beginRuntimeStart('D:\\workspace\\project-b', workspaceUri, 7072);
    const execution = {};

    const claimed = registry.claimTaskStart(workspaceUri, execution, 200);

    expect(claimed).toEqual(second);
    expect(registry.getByHandle(second)).toMatchObject({ taskProcessId: 200 });
    expect(registry.getByHandle(first)?.taskProcessId).toBeUndefined();
    expect(registry.terminateTaskExecution(execution)).toMatchObject({ projectId: second.projectId, lifecycle: 'stopped' });
  });

  it('rejects every stale handle update after a newer generation starts', () => {
    const workspaceUri = vscode.Uri.file('D:\\workspace');
    const stale = registry.beginRuntimeStart('D:\\workspace\\logicapp', workspaceUri, 7071);
    const current = registry.beginRuntimeStart('D:\\workspace\\logicapp', workspaceUri, 7072);

    expect(registry.bindTaskExecution(stale, {}, 100)).toBe(false);
    expect(registry.markRunning(stale, 100)).toBe(false);
    expect(registry.markStopping(stale)).toBe(false);
    expect(registry.cancel(stale)).toBe(false);
    expect(registry.fail(stale)).toBe(false);
    expect(registry.getByHandle(current)).toMatchObject({ lifecycle: 'starting', port: 7072 });
  });

  it('makes cancelled queries and updates no-ops', () => {
    const handle = registry.beginRuntimeStart('D:\\workspace\\logicapp', vscode.Uri.file('D:\\workspace'), 7071);
    const token = { isCancellationRequested: true } as vscode.CancellationToken;

    expect(registry.getByHandle(handle, token)).toBeUndefined();
    expect(registry.markRunning(handle, 100, token)).toBe(false);
    expect(registry.getByHandle(handle)).toMatchObject({ lifecycle: 'starting' });
  });
});
