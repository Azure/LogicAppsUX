/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { workflowFileName } from '../../constants';
import { localize } from '../../localize';
import type { RemoteWorkflowTreeItem } from '../tree/remoteWorkflowsTree/RemoteWorkflowTreeItem';
import { isPathEqual, isSubpath } from './fs';
import { isLogicAppProject, promptOpenProjectOrWorkspace, tryGetLogicAppProjectRoot } from './verifyIsProject';
import { isNullOrUndefined, isString } from '@microsoft/logic-apps-shared';
import { nonNullValue, UserCancelledError } from '@microsoft/vscode-azext-utils';
import type { IActionContext, IAzureQuickPickItem } from '@microsoft/vscode-azext-utils';
import globby from 'globby';
import * as path from 'path';
import * as vscode from 'vscode';
import { FileManagement } from '../commands/generateDeploymentScripts/iacGestureHelperFunctions';
import { ext } from '../../extensionVariables';
import * as fse from 'fs-extra';
import { isCustomCodeFunctionsProject } from './customCodeUtils';

/**
 * Checks if there is a logic app project in the workspace.
 * @returns {Promise<boolean>} True if there is a logic app project in the workspace.
 */
export async function hasLogicAppInWorkspace(): Promise<boolean> {
  if (!vscode.workspace.workspaceFolders || vscode.workspace.workspaceFolders.length === 0) {
    return false;
  }

  for (const folder of vscode.workspace.workspaceFolders) {
    const projectRoots = await getWorkspaceFolderLogicApps(folder);
    if (projectRoots.length > 0) {
      return true;
    }
  }

  return false;
}

/**
 * Gets the workspace file path.
 * @returns A promise that resolves to a string of the .code-workspace file path.
 */
export async function getWorkspaceFilePath(): Promise<string | undefined> {
  if (!vscode.workspace.workspaceFile) {
    return undefined;
  }
  const hasLogicApp = await hasLogicAppInWorkspace();
  return hasLogicApp ? vscode.workspace.workspaceFile.fsPath : undefined;
}

/**
 * Gets the workspace file within the current directory or parent directory.
 * @returns  A promise that resolves to a string of the .code-workspace file path.
 */
export async function getWorkspaceFilePathInParent(): Promise<string | undefined> {
  if (!vscode.workspace.workspaceFolders || vscode.workspace.workspaceFolders.length === 0) {
    return undefined;
  }

  const projectPaths = await getWorkspaceLogicAppRoots();
  for (const projectPath of projectPaths) {
    const workspaceFilePath = await findParentWorkspaceFile(projectPath);
    if (workspaceFilePath) {
      return workspaceFilePath;
    }
  }

  return undefined;
}

/**
 * Walks up at most two directory levels from the given project root, looking for a .code-workspace
 * file that references the project root (directly or via a parent folder).
 * Two levels accounts for the supported nesting: workspace-file → workspace-folder → logic-app-project.
 */
async function findParentWorkspaceFile(projectRoot: string): Promise<string | undefined> {
  const maxLevels = 2;
  let currentDir = path.dirname(projectRoot);

  for (let level = 0; level < maxLevels; level++) {
    const workspaceFiles = await globby('*.code-workspace', { cwd: currentDir });
    for (const wsFile of workspaceFiles) {
      const workspaceFilePath = path.join(currentDir, wsFile);
      const workspaceFileContent = await vscode.workspace.fs.readFile(vscode.Uri.file(workspaceFilePath));
      const workspaceFileJson = JSON.parse(workspaceFileContent.toString());

      if (workspaceFileJson.folders) {
        const referencesProject = workspaceFileJson.folders.some((folder: { path: string }) => {
          const resolvedFolderPath = path.resolve(currentDir, folder.path);
          return isPathEqual(resolvedFolderPath, projectRoot) || isSubpath(resolvedFolderPath, projectRoot);
        });
        if (referencesProject) {
          return workspaceFilePath;
        }
      }
    }
    currentDir = path.dirname(currentDir);
  }

  return undefined;
}

/**
 * Gets workspace folder from path of any file in the workspace folder.
 * @param {string} childPath - The path of the file in the workspace folder.
 * @returns {vscode.WorkspaceFolder | undefined} - The workspace folder.
 */
export function getContainingWorkspaceFolder(childPath: string): vscode.WorkspaceFolder | undefined {
  const folders = vscode.workspace.workspaceFolders || [];
  return folders.find((folder: vscode.WorkspaceFolder): boolean => {
    return isPathEqual(folder.uri.fsPath, childPath) || isSubpath(folder.uri.fsPath, childPath);
  });
}

/**
 * Gets the logic app roots from all workspace folders.
 * @returns {Promise<string[]>} A promise that resolves to an array of logic app roots.
 */
export async function getWorkspaceLogicAppRoots(): Promise<string[]> {
  if (!vscode.workspace.workspaceFolders || vscode.workspace.workspaceFolders.length === 0) {
    return [];
  }

  const logicAppRootTasks = vscode.workspace.workspaceFolders.map(async (folder) => {
    const projectRoots = await getWorkspaceFolderLogicApps(folder);
    return projectRoots ? projectRoots : [];
  });

  const logicAppRoots = (await Promise.all(logicAppRootTasks)).flat();
  return logicAppRoots;
}

/**
 * Gets a Logic App project root from the workspace. If multiple projects exist, prompts the user to select one.
 * @param {IActionContext} context - The action context.
 * @param {boolean} suppressPrompt - If true, returns the first project found without prompting.
 * @returns {Promise<string | undefined>} The selected Logic App project root path, or undefined if none found.
 */
export async function getLogicAppProjectRoot(context: IActionContext, suppressPrompt = false): Promise<string | undefined> {
  const projectPaths = await getWorkspaceLogicAppRoots();
  if (projectPaths.length === 0) {
    return undefined;
  }

  if (projectPaths.length === 1 || suppressPrompt) {
    return projectPaths[0];
  }

  const placeHolder = localize('selectProjectFolder', 'Select the folder containing your logic app project');
  const folderPicks: IAzureQuickPickItem<string>[] = projectPaths.map((projectRoot) => ({
    label: path.basename(projectRoot),
    description: projectRoot,
    data: projectRoot,
  }));

  const selectedItem = await context.ui.showQuickPick(folderPicks, { placeHolder });
  return selectedItem?.data;
}

export async function getWorkflowLogicAppProjectRoot(context: IActionContext, workflowFilePath: string): Promise<string> {
  const workspaceFolder = nonNullValue(getContainingWorkspaceFolder(workflowFilePath), 'workspaceFolder');
  const projectPath: string | undefined = await tryGetLogicAppProjectRoot(context, workspaceFolder);
  if (!projectPath) {
    throw new Error(localize('noProjectFoundForWorkflow', 'No Logic App project found in the workspace for workflow file: {0}', workflowFilePath));
  }

  return projectPath;
}

/**
 * Gets logic app projects from given workspace folder and subFolders one level down.
 * @param {vscode.WorkspaceFolder | string | undefined} workspaceFolder - The workspace folder to check.
 * @returns {Promise<string[]>} A promise that resolves to an array of logic app project roots.
 */
export async function getWorkspaceFolderLogicApps(workspaceFolder: vscode.WorkspaceFolder | string | undefined): Promise<string[]> {
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

  const subpaths: string[] = await fse.readdir(folderPath);
  const logicAppProjectRootTasks = subpaths.map(async (s) => {
    const subpath = path.join(folderPath, s);
    if (await isLogicAppProject(subpath)) {
      return subpath;
    }
  });

  const logicAppProjectRoots = (await Promise.all(logicAppProjectRootTasks)).filter((p) => p !== undefined);
  return logicAppProjectRoots;
}

/**
 * Gets all custom code functions projects in the workspace.
 */
export async function getWorkspaceCustomCodeProjectRoots(): Promise<string[]> {
  if (!vscode.workspace.workspaceFolders || vscode.workspace.workspaceFolders.length === 0) {
    return [];
  }

  const customCodeRootTasks = vscode.workspace.workspaceFolders.map(async (folder) => {
    const customCodeRoots = await getWorkspaceFolderCustomCodeProjectRoots(folder);
    return customCodeRoots ? customCodeRoots : [];
  });

  return (await Promise.all(customCodeRootTasks)).flat();
}

/**
 * Gets custom code projects from given workspace folder and subFolders one level down.
 * @param {vscode.WorkspaceFolder | string | undefined} workspaceFolder - The workspace folder to check.
 * @returns {Promise<string[]>} A promise that resolves to an array of custom code project roots.
 */
async function getWorkspaceFolderCustomCodeProjectRoots(workspaceFolder: vscode.WorkspaceFolder | string | undefined): Promise<string[] | undefined> {
  if (isNullOrUndefined(workspaceFolder)) {
    return [];
  }

  const folderPath = isString(workspaceFolder) ? workspaceFolder : workspaceFolder.uri.fsPath;
  if (!(await fse.pathExists(folderPath))) {
    return [];
  }

  if (await isCustomCodeFunctionsProject(folderPath)) {
    return [folderPath];
  }

  const subpaths: string[] = await fse.readdir(folderPath);
  const customCodeProjectRootTasks = subpaths.map(async (s) => {
    const subpath = path.join(folderPath, s);
    if (await isCustomCodeFunctionsProject(subpath)) {
      return subpath;
    }
  });

  const customCodeProjectRoots = (await Promise.all(customCodeProjectRootTasks)).filter((p) => p !== undefined);
  return customCodeProjectRoots;
}

/**
 * Gets workspace folder of project.
 * @param {IActionContext} context - Command context.
 * @param {string} message - The message to display to the user if workspace is not open.
 * @param {string} skipPromptOnMultipleFolders - The boolean to skip prompt to select logic app folder if there are multiple.
 * @returns {Promise<WorkspaceFolder | string | undefined>} Returns either the new project workspace, the already open workspace or the selected workspace.
 */
export async function getWorkspaceFolder(
  context: IActionContext,
  message?: string,
  skipPromptOnMultipleFolders?: boolean
): Promise<vscode.WorkspaceFolder | undefined> {
  const promptMessage: string = message ?? localize('noWorkspaceWarning', 'You must have a workspace open to perform this action.');

  if (!vscode.workspace.workspaceFolders || vscode.workspace.workspaceFolders.length === 0) {
    await promptOpenProjectOrWorkspace(context, promptMessage);
  }

  if (vscode.workspace.workspaceFolders.length === 1) {
    const workspaceFolder = vscode.workspace.workspaceFolders[0];
    if (vscode.workspace.workspaceFile) {
      return workspaceFolder;
    }

    const workspaceFolderPath = workspaceFolder.uri.fsPath;
    if (await isLogicAppProject(workspaceFolderPath)) {
      return workspaceFolder;
    }
    const folderContents = await fse.readdir(workspaceFolderPath, { withFileTypes: true });
    const subFolders = folderContents.filter((dirent) => dirent.isDirectory()).map((dirent) => path.join(workspaceFolderPath, dirent.name));

    return await getLogicAppWorkspaceFolder(context, subFolders, skipPromptOnMultipleFolders);
  }

  return await getLogicAppWorkspaceFolder(context, null, skipPromptOnMultipleFolders);
}

async function getLogicAppWorkspaceFolder(
  context: IActionContext,
  subFolders: string[],
  skipPromptOnMultipleFolders?: boolean
): Promise<vscode.WorkspaceFolder> {
  const logicAppProjectRoots: string[] = [];
  for (const folder of subFolders ?? vscode.workspace.workspaceFolders) {
    const projectRoot = await tryGetLogicAppProjectRoot(context, folder, true);
    if (projectRoot) {
      logicAppProjectRoots.push(projectRoot);
    }
  }
  if (logicAppProjectRoots.length === 0) {
    return undefined;
  }

  if (logicAppProjectRoots.length === 1 || skipPromptOnMultipleFolders) {
    return getContainingWorkspaceFolder(logicAppProjectRoots[0]);
  }

  const placeHolder: string = localize('selectProjectFolder', 'Select the folder containing your logic app project');
  const folderPicks: IAzureQuickPickItem<vscode.WorkspaceFolder>[] = logicAppProjectRoots.map((projectRoot) => {
    const workspaceFolder = vscode.workspace.workspaceFolders?.find((folder) => folder.uri.fsPath === projectRoot);
    return {
      label: path.basename(projectRoot),
      description: projectRoot,
      data: workspaceFolder ?? getContainingWorkspaceFolder(projectRoot),
    };
  });

  const selectedItem = await context.ui.showQuickPick(folderPicks, { placeHolder });
  const selectedFolder: vscode.WorkspaceFolder = selectedItem?.data;
  if (!selectedFolder) {
    throw new UserCancelledError();
  }

  return selectedFolder;
}

/**
 * Gets workflow node structure of JSON file if needed.
 * @param {vscode.Uri | undefined} node - Workflow node.
 * @returns {vscode.Uri | undefined} Workflow node.
 */
export function getWorkflowNode(node: vscode.Uri | RemoteWorkflowTreeItem | undefined): vscode.Uri | RemoteWorkflowTreeItem | undefined {
  if (isNullOrUndefined(node)) {
    const activeFile = vscode?.window?.activeTextEditor?.document;
    if (activeFile?.fileName.endsWith(workflowFileName)) {
      return activeFile.uri;
    }
  }

  return node;
}

/**
 * Opens a dialog and gets item from workspace.
 * @param {IActionContext} context - Command context.
 * @param {string} placeHolder - Placeholder for input.
 * @param {vscode.OpenDialogOptions} options - Options configuration for the dialog.
 * @param {Function} getSubPath - Function to get subpath inside workspace folder.
 * @returns {Promise<string>} Workspace folder path.
 */
export async function selectWorkspaceItem(
  context: IActionContext,
  placeHolder: string,
  options: vscode.OpenDialogOptions,
  getSubPath?: (f: vscode.WorkspaceFolder) => string | undefined | Promise<string | undefined>
): Promise<string> {
  let folder: IAzureQuickPickItem<string | undefined> | undefined;
  if (vscode.workspace.workspaceFolders) {
    const folderPicks: IAzureQuickPickItem<string | undefined>[] = await Promise.all(
      vscode.workspace.workspaceFolders.map(async (f: vscode.WorkspaceFolder) => {
        let subpath: string | undefined;
        if (getSubPath) {
          subpath = await getSubPath(f);
        }

        const fsPath: string = subpath ? path.join(f.uri.fsPath, subpath) : f.uri.fsPath;
        return { label: path.basename(fsPath), description: fsPath, data: fsPath };
      })
    );

    folderPicks.push({ label: localize('browse', '$(file-directory) Browse...'), description: '', data: undefined });
    folder = await context.ui.showQuickPick(folderPicks, { placeHolder });
  }

  return folder && folder.data ? folder.data : (await context.ui.showOpenDialog(options))[0].fsPath;
}

/**
 * Gets workspace folder path from dialog.
 * @param {IActionContext} context - Command context.
 * @param {string} placeHolder - Placeholder for input.
 * @param {Function} getSubPath - Function to get subpath inside workspace folder.
 * @returns {Promise<string>} Workspace folder path.
 */
export async function selectWorkspaceFolder(
  context: IActionContext,
  placeHolder: string,
  getSubPath?: (f: vscode.WorkspaceFolder) => string | undefined | Promise<string | undefined>
): Promise<string> {
  return await selectWorkspaceItem(
    context,
    placeHolder,
    {
      canSelectFiles: false,
      canSelectFolders: true,
      canSelectMany: false,
      defaultUri:
        vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0
          ? vscode.workspace.workspaceFolders[0].uri
          : undefined,
      openLabel: localize('select', 'Select'),
    },
    getSubPath
  );
}

/**
 * Gets if workspace has multiple projects.
 * @returns {boolean} Returns true if workspace has more than 1 root folder.
 */
export function isMultiRootWorkspace(): boolean {
  return (
    !!vscode.workspace.workspaceFolders &&
    vscode.workspace.workspaceFolders.length > 0 &&
    vscode.workspace.name !== vscode.workspace.workspaceFolders[0].name
  ); // multi-root workspaces always have something like "(Workspace)" appended to their name
}

/**
 * Alternative to `vscode.workspace.findFiles` which always returns an empty array if no workspace is open
 */
export async function findFiles(base: vscode.WorkspaceFolder | string, pattern: string): Promise<vscode.Uri[]> {
  // Per globby docs: "Note that glob patterns can only contain forward-slashes, not backward-slashes, so if you want to construct a glob pattern from path components, you need to use path.posix.join() instead of path.join()"
  const posixBase = path.posix.normalize(isString(base) ? base : base.uri.fsPath).replace(/\\/g, '/');
  const escapedBase = escapeCharacters(posixBase);
  const fullPattern = path.posix.join(escapedBase, pattern);
  return (await globby(fullPattern)).map((s) => vscode.Uri.file(s));
}

function escapeCharacters(nonPattern: string): string {
  return nonPattern.replace(/[$^*+?()[\\]]/g, '\\$&');
}

/**
 * Opens a dialog and gets file from workspace.
 * @param {IActionContext} context - Command context.
 * @param {string} placeHolder - Placeholder for input.
 * @param {Function} getSubPath - Function to get subpath inside workspace folder.
 * @returns {Promise<string>} Workspace file path.
 */
export async function selectWorkspaceFile(
  context: IActionContext,
  placeHolder: string,
  getSubPath?: (f: vscode.WorkspaceFolder) => string | undefined | Promise<string | undefined>
): Promise<string> {
  let defaultUri: vscode.Uri | undefined;
  if (vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0 && getSubPath) {
    const firstFolder: vscode.WorkspaceFolder = vscode.workspace.workspaceFolders[0];
    const subPath: string | undefined = await getSubPath(firstFolder);
    if (subPath) {
      defaultUri = vscode.Uri.file(path.join(firstFolder.uri.fsPath, subPath));
    }
  }

  return await selectWorkspaceItem(
    context,
    placeHolder,
    {
      canSelectFiles: true,
      canSelectFolders: false,
      canSelectMany: false,
      defaultUri: defaultUri,
      openLabel: localize('select', 'Select'),
    },
    getSubPath
  );
}

/**
 * Ensures a directory is added to the workspace if it is not already included.
 * @param {string} directoryPath - The path to the directory to be added.
 * @returns {Promise<void>} - A promise that resolves when the directory is added to the workspace (if needed).
 */
export async function ensureDirectoryInWorkspace(directoryPath: string): Promise<void> {
  const workspaceFolders = vscode.workspace.workspaceFolders || [];
  const isAlreadyInWorkspace = workspaceFolders.some((folder) => folder.uri.fsPath === directoryPath);

  if (!isAlreadyInWorkspace) {
    ext.outputChannel.appendLog(localize('addingDirectoryToWorkspace', 'Adding directory to workspace: {0}', directoryPath));
    await FileManagement.addFolderToWorkspace(directoryPath);
  }
}
