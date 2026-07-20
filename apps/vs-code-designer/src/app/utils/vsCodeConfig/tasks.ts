/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { ext } from '../../../extensionVariables';
import { localize } from '../../../localize';
import { binariesExistSync } from '../binaries';
import { detectProjectType, detectProjectPackageType } from '../project';
import { tryGetLogicAppProjectRoot } from '../verifyIsProject';
import { generateTasksJson } from './generators';
import { DialogResponses, openUrl, type IActionContext } from '@microsoft/vscode-azext-utils';
import { ProjectPackageType, ProjectType, type ITask, type ITaskInputs } from '@microsoft/vscode-extension-logic-apps';
import * as fse from 'fs-extra';
import * as path from 'path';
import { workspace } from 'vscode';
import type { MessageItem, TaskDefinition, WorkspaceConfiguration, WorkspaceFolder } from 'vscode';
import { funcDependencyName, tasksFileName, vscodeFolderName } from '../../../constants';
import { tryGetTargetFramework } from '../dotnet/dotnet';

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

/**
 * Validates the tasks.json is compatible with binary dependency use.
 */
export async function validateTasksJson(context: IActionContext, folders: readonly WorkspaceFolder[] | undefined): Promise<void> {
  context.telemetry.properties.lastStep = 'validateTasksJson';
  if (!folders || folders.length === 0) {
    return;
  }

  for (const folder of folders) {
    const projectPath: string | undefined = await tryGetLogicAppProjectRoot(context, folder, true);
    if (!projectPath) {
      continue;
    }
    context.telemetry.properties.projectPath = projectPath;

    const tasksJsonPath: string = path.join(projectPath, vscodeFolderName, tasksFileName);

    if (!fse.existsSync(tasksJsonPath)) {
      await overwriteTasksJson(context, projectPath);
      continue;
    }

    const taskJsonData = fse.readFileSync(tasksJsonPath, 'utf-8');
    const taskJson = JSON.parse(taskJsonData);
    const tasks: TaskDefinition[] = taskJson.tasks;

    const shouldOverwriteTasks = tasks
      && Array.isArray(tasks)
      && tasks.some((task) => !task.command || !task.command.startsWith('${config:azureLogicAppsStandard'));
    
    if (shouldOverwriteTasks) {
      await overwriteTasksJson(context, projectPath);
    }
  }
}

/**
 * Overwrites the tasks.json file with the specified content.
 * @param projectPath The project path.
 **/
async function overwriteTasksJson(context: IActionContext, projectPath: string): Promise<void> {
  if (projectPath) {
    const message =
      'The Azure Logic Apps extension must update the tasks.json file for project at "{0}" to use the required and installed binary dependencies for Node JS, .NET Framework, and Azure Functions Core Tools. This update overwrites any custom-defined tasks you might have.' +
      '\n\nSelecting "Cancel" leaves the file unchanged, but shows this message when you open this project again.' +
      '\n\nContinue with the update?';

    const vscodeFolderPath: string = path.join(projectPath, vscodeFolderName);
    const tasksJsonPath: string = path.join(vscodeFolderPath, tasksFileName);
    const projectType = await detectProjectType(projectPath);
    const projectPackageType = await detectProjectPackageType(projectPath);

    const targetFramework = projectType === ProjectType.codeful || projectPackageType === ProjectPackageType.Nuget
      ? await tryGetTargetFramework(projectPath)
      : undefined;

    const tasksJsonContent = generateTasksJson({
      projectType,
      projectPackageType: projectPackageType,
      hasFuncBinaries: binariesExistSync(funcDependencyName),
      targetFramework,
    });

    if (await confirmOverwriteFile(context, tasksJsonPath, localize('overwriteTasksJson', message, projectPath))) {
      await fse.ensureDir(vscodeFolderPath);
      await fse.writeFile(tasksJsonPath, JSON.stringify(tasksJsonContent, null, 2));
    }
  }
}

/**
 * Displays warning message to select if desire to overwrite file.
 * @param {IActionContext} context - Command context.
 * @param {string} fsPath - File path.
 * @param {string} message - Message.
 * @returns {Promise<boolean>} True if user wants to overwrite file.
 */
async function confirmOverwriteFile(context: IActionContext, fsPath: string, message: string): Promise<boolean> {
  if (!(await fse.pathExists(fsPath))) {
    return true;
  }

  let result: MessageItem;
  do {
    result = await context.ui.showWarningMessage(
      message,
      { modal: true },
      DialogResponses.yes,
      DialogResponses.learnMore
    );
    if (result === DialogResponses.learnMore) {
      await openUrl('https://learn.microsoft.com/en-us/azure/logic-apps/create-single-tenant-workflows-visual-studio-code');
    } else if (result === DialogResponses.yes) {
      return true;
    } else {
      return false;
    }
  } while (result === DialogResponses.learnMore);

  return false;
}
