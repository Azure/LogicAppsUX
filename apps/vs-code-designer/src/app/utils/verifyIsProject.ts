/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import {
  extensionBundleId,
  hostFileName,
  extensionCommand,
  workflowFileName,
  codefulWorkflowFileName,
  localSettingsFileName,
  customExtensionContext,
} from '../../constants';
import { localize } from '../../localize';
import { getWorkspaceSetting, updateWorkspaceSetting } from './vsCodeConfig/settings';
import { isNullOrUndefined, isString } from '@microsoft/logic-apps-shared';
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
  if (!(await fse.pathExists(hostFilePath))) {
    return false;
  }

  const subpaths: string[] = await fse.readdir(folderPath);

  // Helper function to validate a workflow JSON file
  async function isValidCodefulWorkflowFolder(workflowCsPath: string): Promise<boolean> {
    if (!(await fse.pathExists(workflowCsPath))) {
      return false;
    }
    const filesInSubpath = await fse.readdir(path.dirname(workflowCsPath));
    if (filesInSubpath.includes(codefulWorkflowFileName)) {
      return true;
    }
    return false;
  }

  // Helper function to validate a workflow JSON file
  async function isValidCodelessWorkflowFolder(workflowJsonPath: string): Promise<boolean> {
    if (!(await fse.pathExists(workflowJsonPath))) {
      return false;
    }
    try {
      const filesInSubpath = await fse.readdir(path.dirname(workflowJsonPath));
      let isJsonWorkflow = false;
      if (filesInSubpath.includes(workflowFileName)) {
        const workflowJsonData = await fse.readFile(workflowJsonPath, 'utf-8');
        const workflowJson = JSON.parse(workflowJsonData);
        const schema = workflowJson?.definition?.$schema;
        isJsonWorkflow = schema && schema.includes('Microsoft.Logic') && schema.includes('workflowdefinition.json');
      }
      const workflowCsPaths = subpaths.map((subpath) => path.join(folderPath, subpath, codefulWorkflowFileName));
      const validWorkflowCsPaths = await Promise.all(
        workflowCsPaths.map(async (workflowCsPath) => {
          if (await fse.pathExists(workflowCsPath)) {
            return true;
          }
          return false;
        })
      );

      if (validWorkflowCsPaths.some(Boolean) || isJsonWorkflow) {
        return true;
      }
    } catch {
      return false;
    }

    return false;
  }

  const validWorkflowChecks = await Promise.all(
    subpaths.map(async (subpath) => {
      const workflowJsonPath = path.join(folderPath, subpath, workflowFileName);

      return isValidCodelessWorkflowFolder(workflowJsonPath);
    })
  );

  const validCodefulWorkflowChecks = await Promise.all(
    subpaths.map(async (subpath) => {
      const workflowCsPath = path.join(folderPath, subpath, codefulWorkflowFileName);

      return isValidCodefulWorkflowFolder(workflowCsPath);
    })
  );

  const hasValidCodefulWorkflow = validCodefulWorkflowChecks.some((valid) => valid);
  const hasValidCodelessWorkflow = validWorkflowChecks.some((valid) => valid);
  const isCodefulAgent = await hasCodefulAgent(folderPath);

  if (isCodefulAgent) {
    vscode.commands.executeCommand('setContext', customExtensionContext.isAgentCodeful, true);
  }

  // Only return false if none of the possible validation mechanisms are present
  if (!(hasValidCodelessWorkflow || hasValidCodefulWorkflow || isCodefulAgent)) {
    return false;
  }

  try {
    const hostJsonData = await fse.readFile(hostFilePath, 'utf-8');
    const hostJson = JSON.parse(hostJsonData);
    return hostJson?.extensionBundle?.id === extensionBundleId || hasValidCodefulWorkflow || isCodefulAgent;
  } catch {
    return false;
  }
}

const hasCodefulAgent = async (folderPath: string) => {
  const localSettingsFilePath = path.join(folderPath, localSettingsFileName);
  if (!(await fse.pathExists(localSettingsFilePath))) {
    return false;
  }

  const localSettingsData = await fse.readFile(localSettingsFilePath, 'utf-8');
  const localSettings = JSON.parse(localSettingsData);
  return localSettings.Values?.CODEFUL_AGENT;
};

/**
 * Checks root folder and subFolders one level down
 * If any logic app projects are found return true.
 */
export async function isLogicAppProjectInRoot(workspaceFolder: WorkspaceFolder | string | undefined): Promise<boolean | undefined> {
  if (isNullOrUndefined(workspaceFolder)) {
    return false;
  }
  const folderPath = isString(workspaceFolder) ? workspaceFolder : workspaceFolder.uri.fsPath;
  if (!(await fse.pathExists(folderPath))) {
    return undefined;
  }
  if (await isLogicAppProject(folderPath)) {
    return true;
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

  if (matchingSubpaths.length !== 0) {
    return true;
  }
  return false;
}

/**
 * Checks root folder and subFolders one level down
 * If any logic app projects are found return the paths.
 * @param workspaceFolder - The workspace folder to check.
 * @returns A promise that resolves to an array of logic app project roots.
 */
export async function tryGetAllLogicAppProjectRoots(workspaceFolder: WorkspaceFolder | string | undefined): Promise<string[]> {
  if (isNullOrUndefined(workspaceFolder)) {
    return [];
  }

  const folderPath = isString(workspaceFolder) ? workspaceFolder : workspaceFolder.uri.fsPath;
  if (!(await fse.pathExists(folderPath))) {
    return [];
  }

  if (await isLogicAppProject(folderPath)) {
    return [folderPath];
  }

  const logicAppProjectRoots: string[] = [];
  const subpaths: string[] = await fse.readdir(folderPath);
  await Promise.all(
    subpaths.map(async (s) => {
      const subpath = path.join(folderPath, s);
      if (await isLogicAppProject(subpath)) {
        logicAppProjectRoots.push(subpath);
      }
    })
  );

  return logicAppProjectRoots;
}

/**
 * Checks root folder and subFolders one level down
 * If a single logic app project is found, return that path.
 * If multiple projects are found, prompt to pick the project.
 * TODO - this is checking every root folder and subfolders of non-logic app projects in the workspace, can we optimize this?
 */
export async function tryGetLogicAppProjectRoot(
  context: IActionContext,
  workspaceFolder: WorkspaceFolder | string | undefined,
  suppressPrompt = false
): Promise<string | undefined> {
  if (isNullOrUndefined(workspaceFolder)) {
    return undefined;
  }
  let subpath: string | undefined = getWorkspaceSetting(projectSubpathKey, workspaceFolder);
  const folderPath = isString(workspaceFolder) ? workspaceFolder : workspaceFolder.uri.fsPath;
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

  if (matchingSubpaths.length === 1 || (matchingSubpaths.length !== 0 && suppressPrompt)) {
    subpath = matchingSubpaths[0];
  } else if (matchingSubpaths.length !== 0 && !suppressPrompt) {
    subpath = await promptForProjectSubpath(context, folderPath, matchingSubpaths);
  } else {
    return undefined;
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
    await promptOpenProjectOrWorkspace(context, message);
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
export const promptOpenProjectOrWorkspace = async (context: IActionContext, message: string): Promise<void> => {
  const createWorkspacePrompt: vscode.MessageItem = { title: localize('createWorkspace', 'Create new workspace') };
  const openExistingWorkspace: vscode.MessageItem = { title: localize('openExistingWorkspace', 'Open existing workspace') };

  const result: vscode.MessageItem = await context.ui.showWarningMessage(
    message,
    { modal: true },
    createWorkspacePrompt,
    openExistingWorkspace
  );

  if (result === createWorkspacePrompt) {
    vscode.commands.executeCommand(extensionCommand.createWorkspace);
    context.telemetry.properties.noWorkspaceResult = 'createWorkspace';
  } else if (result === openExistingWorkspace) {
    vscode.commands.executeCommand('workbench.action.openWorkspace');
    context.telemetry.properties.noWorkspaceResult = 'openExistingWorkspace';
  }
  context.errorHandling.suppressDisplay = true;
  throw new NoWorkspaceError();
};
