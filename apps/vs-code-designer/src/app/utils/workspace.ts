/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { workflowFileName } from '../../constants';
import { localize } from '../../localize';
import type { RemoteWorkflowTreeItem } from '../tree/remoteWorkflowsTree/RemoteWorkflowTreeItem';
import { isPathEqual, isSubpath } from './fs';
import {
  isLogicAppProject,
  promptOpenProjectOrWorkspace,
  tryGetAllLogicAppProjectRoots,
  tryGetLogicAppProjectRoot,
} from './verifyIsProject';
import { isNullOrUndefined, isString } from '@microsoft/logic-apps-shared';
import { UserCancelledError, nonNullValue } from '@microsoft/vscode-azext-utils';
import type { IActionContext, IAzureQuickPickItem } from '@microsoft/vscode-azext-utils';
import globby from 'globby';
import * as path from 'path';
import * as vscode from 'vscode';
import { FileManagement } from '../commands/generateDeploymentScripts/iacGestureHelperFunctions';
import { ext } from '../../extensionVariables';
import * as fse from 'fs-extra';
import { tryGetLogicAppCustomCodeFunctionsProjects } from './customCodeUtils';

/**
 * Checks if the current workspace has a Logic App project.
 * @param {IActionContext} actionContext - The action context.
 * @returns A promise that resolves to a boolean indicating whether a Logic App project exists in the workspace.
 */
export const hasLogicAppProject = async (actionContext: IActionContext): Promise<boolean> => {
  for (const folder of vscode.workspace.workspaceFolders) {
    const projectRoot = await tryGetLogicAppProjectRoot(actionContext, folder);
    if (projectRoot) {
      return true;
    }
  }
  return false;
};

/**
 * Gets the folder path that contains the .code-workspace file.
 * @param {IActionContext} actionContext - The action context.
 * @returns A promise that resolves to a string of the folder path that contains the .code-workspace file.
 */
export const getWorkspaceRoot = async (actionContext: IActionContext): Promise<string | undefined> => {
  if (vscode.workspace.workspaceFolders !== undefined) {
    for (const folder of vscode.workspace.workspaceFolders) {
      const projectRoot = await tryGetLogicAppProjectRoot(actionContext, folder, true);
      if (projectRoot) {
        return vscode.workspace.workspaceFile ? path.dirname(vscode.workspace.workspaceFile.fsPath) : undefined;
      }
    }
  }
  return undefined;
};

/**
 * Gets the workspace file path.
 * @param {IActionContext} actionContext - The action context.
 * @returns A promise that resolves to a string of the .code-workspace file path.
 */
export const getWorkspaceFile = async (actionContext: IActionContext): Promise<string | undefined> => {
  if (vscode.workspace.workspaceFolders !== undefined) {
    for (const folder of vscode.workspace.workspaceFolders) {
      const projectRoot = await tryGetLogicAppProjectRoot(actionContext, folder, true);
      if (projectRoot) {
        return vscode.workspace.workspaceFile ? vscode.workspace.workspaceFile.fsPath : undefined;
      }
    }
  }
  return undefined;
};

/**
 * Gets the workspace file within the current directory or parent directory.
 * @param {IActionContext} actionContext - The action context.
 * @returns  A promise that resolves to a string of the .code-workspace file path.
 */
export const getWorkspaceFileInParentDirectory = async (actionContext: IActionContext): Promise<string | undefined> => {
  if (vscode.workspace.workspaceFolders !== undefined) {
    for (const folder of vscode.workspace.workspaceFolders) {
      const projectRoot = await tryGetLogicAppProjectRoot(actionContext, folder, true);
      if (projectRoot) {
        if (vscode.workspace.workspaceFile) {
          return vscode.workspace.workspaceFile.fsPath;
        }
        const parentDir = path.dirname(projectRoot);
        const currentFolder = path.basename(projectRoot);
        const relativeFolderPath = `./${currentFolder}`;
        const workspaceFiles = await globby('*.code-workspace', { cwd: parentDir });
        if (workspaceFiles.length > 0) {
          const workspaceFilePath = path.join(parentDir, workspaceFiles[0]);
          const workspaceFileContent = await vscode.workspace.fs.readFile(vscode.Uri.file(workspaceFilePath));
          const workspaceFileJson = JSON.parse(workspaceFileContent.toString());

          if (
            workspaceFileJson.folders &&
            workspaceFileJson.folders.some((folder: { path: string }) => folder.path === relativeFolderPath)
          ) {
            return workspaceFilePath;
          }
        }
      }
    }
  }
  return undefined;
};

/**
 * Gets workspace folder from path of any file in the workspace folder.
 * @param {string} fsPath - The path of the file in the workspace folder.
 * @returns {vscode.WorkspaceFolder | undefined} - The workspace folder.
 */
export function getContainingWorkspace(fsPath: string): vscode.WorkspaceFolder | undefined {
  const openFolders = vscode.workspace.workspaceFolders || [];
  return openFolders.find((folder: vscode.WorkspaceFolder): boolean => {
    return isPathEqual(folder.uri.fsPath, fsPath) || isSubpath(folder.uri.fsPath, fsPath);
  });
}

/**
 * Retrieves the path of the workspace folder containing the specified workflow file.
 * @param workflowFilePath - The path of the workflow file.
 * @returns The path of the workspace folder.
 */
export const getWorkspacePath = (workflowFilePath: string): string => {
  const workspaceFolder = nonNullValue(getContainingWorkspace(workflowFilePath), 'workspaceFolder');
  return workspaceFolder.uri.fsPath;
};

/**
 * Gets the logic app roots from all workspace folders.
 * @returns {Promise<(vscode.WorkspaceFolder | string)[]>} Returns an array of logic app roots.
 */
export async function getWorkspaceLogicAppFolders(): Promise<string[]> {
  if (!vscode.workspace.workspaceFolders || vscode.workspace.workspaceFolders.length === 0) {
    return [];
  }

  const logicAppRoots: (vscode.WorkspaceFolder | string)[] = [];
  for (const folder of vscode.workspace.workspaceFolders) {
    const projectRoots = await tryGetAllLogicAppProjectRoots(folder);
    if (projectRoots && projectRoots.length > 0) {
      logicAppRoots.push(...projectRoots);
    }
  }

  return logicAppRoots.map((f) => (isString(f) ? f : f.uri.fsPath));
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

    return await selectLogicAppWorkspaceFolder(context, subFolders, skipPromptOnMultipleFolders);
  }

  return await selectLogicAppWorkspaceFolder(context, null, skipPromptOnMultipleFolders);
}

async function selectLogicAppWorkspaceFolder(
  context: IActionContext,
  subFolders: string[],
  skipPromptOnMultipleFolders?: boolean
): Promise<vscode.WorkspaceFolder> {
  const logicAppProjectRoots: string[] = [];
  for (const folder of subFolders ?? vscode.workspace.workspaceFolders) {
    const projectRoot = await tryGetLogicAppProjectRoot(context, folder);
    if (projectRoot) {
      logicAppProjectRoots.push(projectRoot);
    }
  }

  if (logicAppProjectRoots.length === 0) {
    return undefined;
  }

  if (logicAppProjectRoots.length === 1 || skipPromptOnMultipleFolders) {
    return getContainingWorkspace(logicAppProjectRoots[0]);
  }

  const placeHolder: string = localize('selectProjectFolder', 'Select the folder containing your logic app project');
  const folderPicks: IAzureQuickPickItem<vscode.WorkspaceFolder>[] = logicAppProjectRoots.map((projectRoot) => {
    const workspaceFolder = vscode.workspace.workspaceFolders?.find((folder) => folder.uri.fsPath === projectRoot);
    return {
      label: path.basename(projectRoot),
      description: projectRoot,
      data: workspaceFolder ?? getContainingWorkspace(projectRoot),
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
 * Gets user selection of either an existing logic app that isn't associated with a custom code project or new (undefined) logic app project.
 * @param {IActionContext} context - Command context.
 * @param {string} message - The message to display to the user if workspace is not open.
 * @returns {Promise<WorkspaceFolder | string | undefined>} Returns either the selected logic app or undefined for a new logic app.
 */
export async function getLogicAppWithoutCustomCode(
  context: IActionContext,
  message?: string
): Promise<vscode.WorkspaceFolder | string | undefined> {
  const promptMessage: string = message ?? localize('noWorkspaceWarning', 'You must have a workspace open to perform this action.');

  if (!vscode.workspace.workspaceFolders || vscode.workspace.workspaceFolders.length === 0) {
    await promptOpenProjectOrWorkspace(context, promptMessage);
  }

  if (vscode.workspace.workspaceFolders.length === 1) {
    const workspaceFolder = vscode.workspace.workspaceFolders[0];
    const workspaceFolderPath = workspaceFolder.uri.fsPath;
    if (!(await isLogicAppProject(workspaceFolderPath))) {
      const folderContents = await fse.readdir(workspaceFolderPath, { withFileTypes: true });
      const subFolders = folderContents
        .filter((dirent) => dirent.isDirectory())
        .map((dirent) => path.join(workspaceFolderPath, dirent.name));
      return await selectLogicAppWorkspaceFolderWithoutCustomCode(context, false, subFolders);
    }
  }

  return await selectLogicAppWorkspaceFolderWithoutCustomCode(context, true, null);
}

async function selectLogicAppWorkspaceFolderWithoutCustomCode(
  context: IActionContext,
  returnsWorkspaceFolder: boolean,
  subFolders: string[]
): Promise<vscode.WorkspaceFolder | string> {
  const logicAppsWorkspaces = [];
  for (const folder of returnsWorkspaceFolder ? vscode.workspace.workspaceFolders : subFolders) {
    const projectRoot = await tryGetLogicAppProjectRoot(context, folder);
    if (projectRoot) {
      logicAppsWorkspaces.push(projectRoot);
    }
  }

  const placeHolder: string = localize('selectProjectFolder', 'Select the folder containing your logic app project');
  const folderPicksPromises = logicAppsWorkspaces.map(async (projectRoot) => {
    const workspaceFolder = vscode.workspace.workspaceFolders?.find((folder) => folder.uri.fsPath === projectRoot);
    const logicAppCustomCodeFunctionsProjects = await tryGetLogicAppCustomCodeFunctionsProjects(projectRoot);
    if (!logicAppCustomCodeFunctionsProjects || logicAppCustomCodeFunctionsProjects.length === 0) {
      return {
        label: path.basename(projectRoot),
        description: projectRoot,
        data: returnsWorkspaceFolder ? workspaceFolder : projectRoot,
      };
    }
    return undefined;
  });

  const folderPicks = (await Promise.all(folderPicksPromises)).filter((item) => item !== undefined);

  folderPicks.push({
    label: localize('newLogicAppProject', 'Create a new Logic App project...'),
    description: '',
    data: undefined,
  });

  const selectedItem = await context.ui.showQuickPick(folderPicks, { placeHolder });
  return selectedItem?.data;
}

/**
 * Gets workflow node structure of JSON file if needed.
 * @param {vscode.Uri | undefined} node - Workflow node.
 * @returns {vscode.Uri | undefined} Workflow node.
 */
export const getWorkflowNode = (node: vscode.Uri | RemoteWorkflowTreeItem | undefined): vscode.Uri | RemoteWorkflowTreeItem | undefined => {
  if (isNullOrUndefined(node)) {
    const activeFile = vscode?.window?.activeTextEditor?.document;
    if (activeFile?.fileName.endsWith(workflowFileName)) {
      return activeFile.uri;
    }
  }

  return node;
};

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
