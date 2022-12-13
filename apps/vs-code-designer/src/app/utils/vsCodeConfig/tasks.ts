/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import type { ITask, ITaskInputs } from '@microsoft/vscode-extension';
import type { WorkspaceConfiguration, WorkspaceFolder } from 'vscode';
import { workspace } from 'vscode';

const tasksKey = 'tasks';
const inputsKey = 'inputs';
const versionKey = 'version';

export function getTasks(folder: WorkspaceFolder): ITask[] {
  return getTasksConfig(folder).get<ITask[]>(tasksKey) || [];
}

export function getInputs(folder: WorkspaceFolder): ITaskInputs[] {
  return getTasksConfig(folder).get<ITaskInputs[]>(inputsKey) || [];
}

export function updateTasks(folder: WorkspaceFolder, tasks: ITask[]): void {
  getTasksConfig(folder).update(tasksKey, tasks);
}

export function updateInputs(folder: WorkspaceFolder, inputs: ITaskInputs[]): void {
  getTasksConfig(folder).update(inputsKey, inputs);
}

export function getTasksVersion(folder: WorkspaceFolder): string | undefined {
  return getTasksConfig(folder).get<string>(versionKey);
}

export function updateTasksVersion(folder: WorkspaceFolder, version: string): void {
  getTasksConfig(folder).update(versionKey, version);
}

function getTasksConfig(folder: WorkspaceFolder): WorkspaceConfiguration {
  return workspace.getConfiguration(tasksKey, folder.uri);
}
