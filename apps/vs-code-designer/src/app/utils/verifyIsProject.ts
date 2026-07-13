/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { extensionCommand, workflowFileName, customExtensionContext } from '../../constants';
import { localize } from '../../localize';
import { getWorkspaceSetting, updateWorkspaceSetting } from './vsCodeConfig/settings';
import { isNullOrUndefined, isString } from '@microsoft/logic-apps-shared';
import type { IActionContext, IAzureQuickPickItem } from '@microsoft/vscode-azext-utils';
import * as fse from 'fs-extra';
import * as path from 'path';
import type { MessageItem, WorkspaceFolder } from 'vscode';
import { NoWorkspaceError } from './errors';
import * as vscode from 'vscode';
import { hasCodefulSdkReference } from './codeful';

const projectSubpathKey = 'projectSubpath';

/**
 * Determines whether the given folder is a Logic Apps project.
 *
 * A Logic Apps project is identified by a workflow signal — either of:
 *   - a codeless `workflow.json` one level down whose `definition.$schema` is a
 *     `Microsoft.Logic` workflow-definition schema, or
 *   - a codeful project: a .NET 8 `.csproj` at the project root that references the Logic Apps
 *     SDK (`Microsoft.Azure.Workflows.Sdk`), detected structurally via {@link hasCodefulSdkReference}.
 *     Detection is based on the project structure, not a fixed file name — the workflow C# file can be
 *     named anything, so a literal `workflow.cs` is not a reliable marker.
 *
 * The codeful `WORKFLOW_CODEFUL_ENABLED` workspace setting is intentionally NOT consulted: it lives in
 * `local.settings.json`, which is commonly gitignored under source control, and every codeful project
 * already carries the authoritative `.csproj` SDK reference — so the setting adds no detection value.
 *
 * host.json is intentionally NOT required. Source-controlled projects commonly
 * gitignore `host.json` and `local.settings.json`, so a freshly cloned project can
 * be missing (or have a corrupted) host.json yet still be a valid Logic Apps project.
 * Keying off the workflow signal lets the extension recognize such a project and
 * heal/regenerate the missing artifacts (host.json, local.settings.json,
 * workflow-designtime) before starting. host.json is also a generic Azure Functions
 * artifact, so its mere presence is not a reliable Logic Apps indicator.
 */
export async function isLogicAppProject(folderPath: string): Promise<boolean> {
  if (!(await fse.pathExists(folderPath))) {
    return false;
  }

  let subpaths: string[];
  try {
    subpaths = await fse.readdir(folderPath);
  } catch {
    return false;
  }

  // Codeless projects place workflow.json one level down, inside a per-workflow subfolder.
  const validCodelessWorkflowChecks = await Promise.all(
    subpaths.map((subpath) => isValidCodelessWorkflowFolder(path.join(folderPath, subpath, workflowFileName)))
  );
  const hasValidCodelessWorkflow = validCodelessWorkflowChecks.some(Boolean);

  // Codeful projects are .NET 8 projects that reference the Logic Apps SDK. Detect them
  // structurally from the .csproj so the workflow C# file can be named anything.
  const hasCodefulProject = await hasCodefulSdkReference(folderPath);
  if (hasCodefulProject) {
    vscode.commands.executeCommand('setContext', customExtensionContext.isCodeful, true);
  }

  return hasValidCodelessWorkflow || hasCodefulProject;
}

/**
 * Validates that a `workflow.json` file exists and declares a `Microsoft.Logic`
 * workflow-definition `$schema` — the codeless Logic Apps workflow signal.
 */
async function isValidCodelessWorkflowFolder(workflowJsonPath: string): Promise<boolean> {
  if (!(await fse.pathExists(workflowJsonPath))) {
    return false;
  }
  try {
    const workflowJsonData = await fse.readFile(workflowJsonPath, 'utf-8');
    const schema = JSON.parse(workflowJsonData)?.definition?.$schema;
    return typeof schema === 'string' && schema.includes('Microsoft.Logic') && schema.includes('workflowdefinition.json');
  } catch {
    return false;
  }
}

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

/**
 * Checks root folder and subFolders one level down
 * Gets the folder of the first logic app found.
 */
export async function getFirstLogicAppProjectRoot(workspaceFolder: WorkspaceFolder | string | undefined): Promise<string | undefined> {
  if (isNullOrUndefined(workspaceFolder)) {
    return undefined;
  }

  const folderPath = isString(workspaceFolder) ? workspaceFolder : workspaceFolder.uri.fsPath;
  if (!(await fse.pathExists(folderPath))) {
    return undefined;
  }

  if (await isLogicAppProject(folderPath)) {
    return folderPath;
  }

  const subpaths: string[] = await fse.readdir(folderPath);
  for (const subpath of subpaths) {
    const fullPath = path.join(folderPath, subpath);
    if (await isLogicAppProject(fullPath)) {
      return fullPath;
    }
  }

  return undefined;
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
