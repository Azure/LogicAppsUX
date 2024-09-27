/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { extensionBundleId, hostFileName, extensionCommand } from '../../constants';
import { localize } from '../../localize';
import { getWorkspaceSetting, updateWorkspaceSetting } from './vsCodeConfig/settings';
import { isString } from '@microsoft/logic-apps-shared';
import type { IActionContext, IAzureQuickPickItem } from '@microsoft/vscode-azext-utils';
import * as fse from 'fs-extra';
import * as path from 'path';
import type { MessageItem, WorkspaceFolder } from 'vscode';
import { NoWorkspaceError } from './errors';
import * as vscode from 'vscode';

const projectSubpathKey = 'projectSubpath';

// Use 'host.json' and 'local.settings.json' as an indicator that this is a functions project
export async function isLogicAppProject(folderPath: string): Promise<boolean> {
  const hostFilePath = path.join(folderPath, hostFileName);
  const hasHostJson: boolean = await fse.pathExists(hostFilePath);

  if (hasHostJson) {
    const hostJsonData = fse.readFileSync(hostFilePath, 'utf-8');
    const hostJson = JSON.parse(hostJsonData);

    const hasWorkflowBundle = hostJson?.extensionBundle?.id === extensionBundleId;
    return hasHostJson && hasWorkflowBundle;
  }

  return false;
}

/**
 * Checks root folder and subFolders one level down
 * If a single logic app project is found, return that path.
 * If multiple projects are found, prompt to pick the project.
 */
export async function tryGetLogicAppProjectRoot(
  context: IActionContext,
  workspaceFolder: WorkspaceFolder | string,
  suppressPrompt = false
): Promise<string | undefined> {
  let subpath: string | undefined = getWorkspaceSetting(projectSubpathKey, workspaceFolder);
  const folderPath = isString(workspaceFolder) ? workspaceFolder : workspaceFolder.uri.fsPath;
  if (!subpath) {
    if (!(await fse.pathExists(folderPath))) {
      return undefined;
    }
    if (await isLogicAppProject(folderPath)) {
      return folderPath;
    }
    const subpaths: string[] = await fse.readdir(folderPath);
    const matchingSubpaths: string[] = [];
    await Promise.all(
      subpaths.map(async (s) => {
        if (await isLogicAppProject(path.join(folderPath, s))) {
          matchingSubpaths.push(s);
        }
      })
    );

    if (matchingSubpaths.length === 1) {
      subpath = matchingSubpaths[0];
    } else if (matchingSubpaths.length !== 0 && !suppressPrompt) {
      subpath = await promptForProjectSubpath(context, folderPath, matchingSubpaths);
    } else {
      return undefined;
    }
  }

  return path.join(folderPath, subpath);
}

async function promptForProjectSubpath(context: IActionContext, workspacePath: string, matchingSubpaths: string[]): Promise<string> {
  const message: string = localize(
    'detectedMultipleProject',
    'Detected multiple function projects in the same workspace folder. You must either set the default or use a multi-root workspace.'
  );
  const learnMoreLink = 'https://aka.ms/AA4nmfy';
  const setDefault: MessageItem = { title: localize('setDefault', 'Set default') };
  // No need to check result - cancel will throw a UserCancelledError
  await context.ui.showWarningMessage(message, { learnMoreLink }, setDefault);

  const picks: IAzureQuickPickItem<string>[] = matchingSubpaths.map((p) => {
    return { label: p, description: workspacePath, data: p };
  });
  const placeHolder: string = localize('selectProject', 'Select the default project subpath');
  const subpath: string = (await context.ui.showQuickPick(picks, { placeHolder })).data;
  await updateWorkspaceSetting(projectSubpathKey, subpath, workspacePath);

  return subpath;
}

/**
 * Checks if the path is already a logic app project. If not, it will prompt to create a new project.
 * @param {IActionContext} fsPath - Command context.
 * @param {string} fsPath - Workflow file path.
 * @returns {Promise<string | undefined>} Returns project path if exists, otherwise returns undefined.
 */
export async function verifyAndPromptToCreateProject(context: IActionContext, fsPath: string): Promise<string | undefined> {
  const projectPath: string | undefined = await tryGetLogicAppProjectRoot(context, fsPath);
  if (!projectPath) {
    const message: string = localize('notLogicApp', 'The selected folder is not a logic app project.');
    await promptOpenProject(context, message);
  }
  return projectPath;
}

/**
 * Prompts the user to open a project.
 *
 * @param {IActionContext} context - The action context.
 * @param {string} message - The message to display in the warning dialog.
 * @returns A promise that resolves when the user selects an option.
 * @throws {NoWorkspaceError} - If the user cancels the operation.
 */
export const promptOpenProject = async (context: IActionContext, message: string): Promise<void> => {
  const newProject: vscode.MessageItem = { title: localize('createNewProject', 'Create new project') };
  const openExistingProject: vscode.MessageItem = { title: localize('openExistingProject', 'Open existing project') };
  const result: vscode.MessageItem = await context.ui.showWarningMessage(message, { modal: true }, newProject, openExistingProject);

  if (result === newProject) {
    vscode.commands.executeCommand(extensionCommand.createNewProject);
    context.telemetry.properties.noWorkspaceResult = 'createNewProject';
  } else {
    const uri: vscode.Uri[] = await context.ui.showOpenDialog({
      canSelectFiles: false,
      canSelectFolders: true,
      canSelectMany: false,
      openLabel: localize('open', 'Open'),
    });
    vscode.commands.executeCommand(extensionCommand.vscodeOpenFolder, uri[0]);
    context.telemetry.properties.noWorkspaceResult = 'openExistingProject';
  }
  context.errorHandling.suppressDisplay = true;
  throw new NoWorkspaceError();
};
