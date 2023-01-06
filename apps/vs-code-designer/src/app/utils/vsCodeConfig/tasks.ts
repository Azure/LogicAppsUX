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

/**
 * Gets tasks property of tasks.json file.
 * @param {WorkspaceFolder} folder - Workspace folder.
 * @returns {ITask[]} Tasks configuration.
 */
export function getTasks(folder: WorkspaceFolder): ITask[] {
  return getTasksConfig(folder).get<ITask[]>(tasksKey) || [];
}

/**
 * Gets inputs property of tasks.json file.
 * @param {WorkspaceFolder} folder - Workspace folder.
 * @returns {ITaskInputs[]} Inputs configuration.
 */
export function getInputs(folder: WorkspaceFolder): ITaskInputs[] {
  return getTasksConfig(folder).get<ITaskInputs[]>(inputsKey) || [];
}

/**
 * Gets version property of tasks.json file.
 * @param {WorkspaceFolder} folder - Workspace folder.
 * @returns {string | undefined} Tasks.json version.
 */
export function getTasksVersion(folder: WorkspaceFolder): string | undefined {
  return getTasksConfig(folder).get<string>(versionKey);
}

/**
 * Updates tasks property in tasks.json file.
 * @param {WorkspaceFolder} folder - Workspace folder.
 * @param {ITask[]} tasks - Tasks configuration to update to.
 */
export function updateTasks(folder: WorkspaceFolder, tasks: ITask[]): void {
  getTasksConfig(folder).update(tasksKey, tasks);
}

/**
 * Updates inputs property in tasks.json file.
 * @param {WorkspaceFolder} folder - Workspace folder.
 * @param {ITaskInputs[]} inputs - Inputs configuration to update.
 */
export function updateInputs(folder: WorkspaceFolder, inputs: ITaskInputs[]): void {
  getTasksConfig(folder).update(inputsKey, inputs);
}

/**
 * Updates version property in tasks.json file.
 * @param {WorkspaceFolder} folder - Workspace folder.
 * @param {string} version - Version to update to.
 */
export function updateTasksVersion(folder: WorkspaceFolder, version: string): void {
  getTasksConfig(folder).update(versionKey, version);
}

/**
 * Gets tasks workspace configuration.
 * @param {WorkspaceFolder} folder - Workspace folder.
 * @returns {WorkspaceConfiguration} Workspace configuration.
 */
function getTasksConfig(folder: WorkspaceFolder): WorkspaceConfiguration {
  return workspace.getConfiguration(tasksKey, folder.uri);
}
