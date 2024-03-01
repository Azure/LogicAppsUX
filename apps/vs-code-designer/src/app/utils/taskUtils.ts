/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as packageJson from '../../package.json';
import { isPathEqual } from './fs';
import * as AdmZip from 'adm-zip';
import type { Task, WorkspaceFolder } from 'vscode';
import { tasks as codeTasks, window } from 'vscode';

/**
 * Gets task's file system path.
 * @param {vscode.Task} task - Function task.
 * @returns {string | undefined} Returns task's file system path if task is an object, otherwise returns undefined.
 */
export function getFsPathFromTask(task: Task): string | undefined {
  if (typeof task.scope === 'object') {
    const workspaceFolder: Partial<WorkspaceFolder> = task.scope;
    return workspaceFolder.uri?.fsPath;
  } else {
    return undefined;
  }
}

/**
 * Checks if tasks scope are equal.
 * @param {vscode.Task} task1 - Function task.
 * @param {vscode.Task} task2 - Function task.
 * @returns {boolean} Returns true if both tasks have same scope or path, otherwise returns false.
 */
export function isTaskScopeEqual(task1: Task, task2: Task): boolean {
  if (task1.scope === task2.scope) {
    // handles the case where the scopes are not associated with a path
    return true;
  } else {
    const task1Path: string | undefined = getFsPathFromTask(task1);
    const task2Path: string | undefined = getFsPathFromTask(task2);
    return !!task1Path && !!task2Path && isPathEqual(task1Path, task2Path);
  }
}

/**
 * Checks if tasks are equal.
 * @param {vscode.Task} task1 - Function task.
 * @param {vscode.Task} task2 - Function task.
 * @returns {boolean} Returns true if both tasks are equal, otherwise returns false.
 */
export function isTaskEqual(task1: Task, task2: Task): boolean {
  return (
    isTaskScopeEqual(task1, task2) &&
    task1.name === task2.name &&
    task1.source === task2.source &&
    task1.definition.type === task2.definition.type
  );
}

/**
 * Handles condition where we don't need to start the task because it's already running.
 * @param {vscode.Task} task - Function task.
 */
export async function executeIfNotActive(task: Task): Promise<void> {
  if (!codeTasks.taskExecutions.find((t) => isTaskEqual(t.task, task))) {
    await codeTasks.executeTask(task);
  }
}

/**
 * Unzips the contents of a Logic App project into a target directory.
 * This function uses the AdmZip library to handle the unzipping operation.
 *
 * @param {Buffer} zipContent - The buffer containing the compressed Logic App project.
 * @param {string} targetDirectory - The path of the directory where the unzipped files will be stored.
 * @returns {Promise<void>} - A Promise that resolves when the unzipping process is complete, or rejects with an error.
 *
 * @throws Will throw an error if the unzipping process fails.
 */
export async function unzipLogicAppArtifacts(zipContent: Buffer | Buffer[], targetDirectory: string): Promise<void> {
  try {
    // Check if the zipContent is an array of buffers
    if (Array.isArray(zipContent)) {
      // Concatenate the buffers into a single buffer
      zipContent = Buffer.concat(zipContent);
    }

    // Initialize a new AdmZip object with the provided zip content
    const zip = new AdmZip(zipContent);

    // Extract all the files from the zip content to the target directory
    // The second parameter set to 'true' indicates that it will overwrite existing files in the target directory
    zip.extractAllTo(targetDirectory, true);
  } catch (error) {
    const errorString = JSON.stringify(error, Object.getOwnPropertyNames(error));
    window.showErrorMessage(`Failed to unzip logic app due to: ${errorString}`);
    throw new Error(`Unzipping logic app failed with the following details: ${errorString}`);
  }
}

/**
 * Displays a preview warning for any command that is marked as a preview feature in package.json.
 * @param commandIdentifier - The identifier of the command to check for preview status.
 */
export function showPreviewWarning(commandIdentifier: string): void {
  // Search for the command in the package.json "contributes.commands" array
  const targetCommand = packageJson.contributes.commands.find((command) => command.command === commandIdentifier);
  // If the command is found and it is marked as a preview, show a warning using its title
  if (targetCommand?.preview) {
    const commandTitle = targetCommand.title;
    window.showInformationMessage(`The "${commandTitle}" command is a preview feature and might be subject to change.`);
  }
}
