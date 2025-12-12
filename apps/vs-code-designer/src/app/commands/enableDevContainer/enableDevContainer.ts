/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localize } from '../../../localize';
import { ext } from '../../../extensionVariables';
import {
  assetsFolderName,
  containerTemplatesFolderName,
  devContainerFileName,
  devContainerFolderName,
  tasksFileName,
  vscodeFolderName,
  workspaceTemplatesFolderName,
} from '../../../constants';
import type { IActionContext } from '@microsoft/vscode-azext-utils';
import * as vscode from 'vscode';
import * as fse from 'fs-extra';
import * as path from 'path';

/**
 * Enables devcontainer support for an existing Logic App workspace
 * @param context - The action context
 * @param workspaceFilePath - Optional workspace file path for testing (uses vscode.workspace.workspaceFile if not provided)
 */
export async function enableDevContainer(context: IActionContext, workspaceFilePath?: string): Promise<void> {
  context.telemetry.properties.lastStep = 'enableDevContainer';

  // Get workspace file path from parameter or vscode.workspace
  const workspaceFile = workspaceFilePath || vscode.workspace.workspaceFile?.fsPath;

  // Verify we have a workspace
  if (!workspaceFile) {
    const message = localize('noWorkspace', 'No workspace is currently open. Please open a Logic App workspace first.');
    vscode.window.showErrorMessage(message);
    context.telemetry.properties.result = 'Failed';
    return;
  }

  const workspaceRootFolder = path.dirname(workspaceFile);
  const devcontainerPath = path.join(workspaceRootFolder, devContainerFolderName);

  // Check if devcontainer already exists
  if (await fse.pathExists(devcontainerPath)) {
    const message = localize('devContainerExists', 'This workspace already has a .devcontainer folder.');
    const overwrite = localize('overwrite', 'Overwrite');
    const cancel = localize('cancel', 'Cancel');
    const result = await vscode.window.showWarningMessage(message, { modal: true }, overwrite, cancel);

    if (result !== overwrite) {
      context.telemetry.properties.result = 'Canceled';
      return;
    }
    context.telemetry.properties.overwrite = 'true';
  }

  try {
    // Create .devcontainer folder
    await fse.ensureDir(devcontainerPath);
    context.telemetry.properties.step = 'devcontainerFolderCreated';

    // Copy devcontainer.json from templates
    const devcontainerTemplatePath = path.join(__dirname, assetsFolderName, containerTemplatesFolderName, devContainerFileName);
    const devcontainerDestPath = path.join(devcontainerPath, devContainerFileName);

    if (!(await fse.pathExists(devcontainerTemplatePath))) {
      throw new Error(localize('templateNotFound', 'Devcontainer template not found at: {0}', devcontainerTemplatePath));
    }

    await fse.copyFile(devcontainerTemplatePath, devcontainerDestPath);
    context.telemetry.properties.step = 'devcontainerJsonCopied';

    // Convert tasks.json files in all Logic Apps to devcontainer-compatible versions
    await convertWorkspaceTasksToDevContainer(context, workspaceRootFolder);

    // Add .devcontainer folder to workspace file
    await addDevContainerToWorkspace(workspaceFile, devContainerFolderName);
    context.telemetry.properties.step = 'devcontainerAddedToWorkspace';

    context.telemetry.properties.result = 'Succeeded';

    const message = localize(
      'devContainerEnabled',
      'Devcontainer support has been enabled for this workspace. The .devcontainer folder has been created and tasks.json files have been updated to use devcontainer-compatible paths.'
    );
    const reloadWindow = localize('reloadWindow', 'Reload Window');
    const openInContainer = localize('openInContainer', 'Reopen in Container');

    const result = await vscode.window.showInformationMessage(message, reloadWindow, openInContainer);

    if (result === reloadWindow) {
      await vscode.commands.executeCommand('workbench.action.reloadWindow');
    } else if (result === openInContainer) {
      await vscode.commands.executeCommand('remote-containers.reopenInContainer');
    }
  } catch (error) {
    context.telemetry.properties.result = 'Failed';
    context.telemetry.properties.error = error.message;
    ext.outputChannel.appendLine(`Error enabling devcontainer: ${error.message}`);
    throw error;
  }
}

/**
 * Converts all tasks.json files in the workspace to use devcontainer-compatible paths
 * @param context - The action context
 * @param workspaceRootFolder - The root folder of the workspace
 */
async function convertWorkspaceTasksToDevContainer(context: IActionContext, workspaceRootFolder: string): Promise<void> {
  context.telemetry.properties.lastStep = 'convertWorkspaceTasksToDevContainer';

  // Read the workspace file to find all Logic Apps
  const workspaceFiles = await fse.readdir(workspaceRootFolder);
  const workspaceFileName = workspaceFiles.find((f) => f.endsWith('.code-workspace'));
  if (!workspaceFileName) {
    return;
  }

  const workspaceFilePath = path.join(workspaceRootFolder, workspaceFileName);
  const workspaceContent = await fse.readJSON(workspaceFilePath);
  const folders = workspaceContent.folders || [];

  let tasksConverted = 0;
  let tasksSkipped = 0;
  let tasksErrors = 0;

  for (const folder of folders) {
    const logicAppPath = path.isAbsolute(folder.path) ? folder.path : path.join(workspaceRootFolder, folder.path);

    const tasksJsonPath = path.join(logicAppPath, vscodeFolderName, tasksFileName);

    if (await fse.pathExists(tasksJsonPath)) {
      try {
        await convertTasksJsonToDevContainer(context, tasksJsonPath);
        tasksConverted++;
        ext.outputChannel.appendLine(`Converted tasks.json for: ${folder.name}`);
      } catch (error) {
        tasksErrors++;
        ext.outputChannel.appendLine(`Error converting tasks.json for ${folder.name}: ${error.message}`);
        context.telemetry.properties[`tasksError_${folder.name}`] = error.message;
      }
    } else {
      tasksSkipped++;
      ext.outputChannel.appendLine(`No tasks.json found for: ${folder.name}`);
    }
  }

  context.telemetry.properties.tasksConverted = String(tasksConverted);
  context.telemetry.properties.tasksSkipped = String(tasksSkipped);
  context.telemetry.properties.tasksErrors = String(tasksErrors);
}

/**
 * Converts a tasks.json file to use devcontainer-compatible paths
 * @param context - The action context
 * @param tasksJsonPath - Path to the tasks.json file
 */
async function convertTasksJsonToDevContainer(context: IActionContext, tasksJsonPath: string): Promise<void> {
  const tasksContent = await fse.readJSON(tasksJsonPath);

  // Get the devcontainer-compatible template
  const devContainerTasksTemplatePath = path.join(__dirname, assetsFolderName, workspaceTemplatesFolderName, 'DevContainerTasksJsonFile');

  if (!(await fse.pathExists(devContainerTasksTemplatePath))) {
    throw new Error(localize('templateNotFound', 'DevContainer tasks template not found at: {0}', devContainerTasksTemplatePath));
  }

  const devContainerTasksTemplate = await fse.readJSON(devContainerTasksTemplatePath);

  // Replace the tasks with devcontainer-compatible versions
  // Keep the version, but update tasks and inputs
  tasksContent.tasks = devContainerTasksTemplate.tasks;
  tasksContent.inputs = devContainerTasksTemplate.inputs;

  // Write the updated tasks.json
  await fse.writeJSON(tasksJsonPath, tasksContent, { spaces: 2 });
}

/**
 * Adds the .devcontainer folder to the workspace file
 * @param workspaceFilePath - Path to the .code-workspace file
 * @param devContainerFolderName - Name of the devcontainer folder
 */
async function addDevContainerToWorkspace(workspaceFilePath: string, devContainerFolderName: string): Promise<void> {
  const workspaceContent = await fse.readJSON(workspaceFilePath);

  // Ensure folders array exists
  if (!workspaceContent.folders) {
    workspaceContent.folders = [];
  }

  // Check if .devcontainer is already in the workspace
  const devContainerExists = workspaceContent.folders.some(
    (folder: any) => folder.path === devContainerFolderName || folder.path === `./${devContainerFolderName}`
  );

  // Add .devcontainer folder if it doesn't exist
  if (!devContainerExists) {
    workspaceContent.folders.push({
      path: devContainerFolderName,
      name: devContainerFolderName,
    });

    // Write updated workspace file
    await fse.writeJSON(workspaceFilePath, workspaceContent, { spaces: 2 });
  }
}
