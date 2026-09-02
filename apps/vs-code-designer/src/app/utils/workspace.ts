/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { workflowFileName } from '../../constants';
import { localize } from '../../localize';
import type { RemoteWorkflowTreeItem } from '../tree/remoteWorkflowsTree/RemoteWorkflowTreeItem';
import { isPathEqual, isSubpath } from './fs';
import { isNullOrUndefined, isString } from '@microsoft/logic-apps-shared';
import type { IActionContext, IAzureQuickPickItem } from '@microsoft/vscode-azext-utils';
import globby from 'globby';
import * as path from 'path';
import * as vscode from 'vscode';
import * as fse from 'fs-extra';
import { isCustomCodeFunctionsProject } from './customCodeUtils';
import { isCodefulLogicApp } from './codeful';
import { isCodelessLogicApp } from './codeless';
import { ext } from '../../extensionVariables';

/**
 * Gets the resource URI from the given path.
 * NOTE(aeldridge): This is needed to keep scheme and authority intact when converting a file system path to a URI.
 */
export function resolveUri(fsPath?: string): vscode.Uri | undefined {
  if (!fsPath) {
    return undefined;
  }

  const workspaceFolder = getParentWorkspaceFolder(fsPath);
  if (!workspaceFolder) {
    return vscode.Uri.file(fsPath);
  }

  const relativeProjectPath = path.relative(workspaceFolder.uri.fsPath, fsPath);
  return relativeProjectPath ? vscode.Uri.joinPath(workspaceFolder.uri, ...relativeProjectPath.split(path.sep)) : workspaceFolder.uri;
}

/**
 * Checks if there is a logic app project in the workspace.
 * @returns {Promise<boolean>} True if there is a logic app project in the workspace.
 */
export async function hasLogicAppInWorkspace(): Promise<boolean> {
  if (!vscode.workspace.workspaceFolders || vscode.workspace.workspaceFolders.length === 0) {
    return false;
  }

  for (const folder of vscode.workspace.workspaceFolders) {
    const projectRoots = await getWorkspaceFolderLogicAppRoots(folder);
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

  const projectPaths = await getLogicAppRoots();
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
      try {
        const workspaceFileContent = await vscode.workspace.fs.readFile(vscode.Uri.file(workspaceFilePath));
        const workspaceFileJson = JSON.parse(workspaceFileContent.toString());
        if (!Array.isArray(workspaceFileJson.folders)) {
          continue;
        }

        const referencesProject = workspaceFileJson.folders.some((folder: unknown) => {
          if (!folder || typeof folder !== 'object' || !('path' in folder) || typeof folder.path !== 'string') {
            return false;
          }

          const resolvedFolderPath = path.resolve(currentDir, folder.path);
          return isPathEqual(resolvedFolderPath, projectRoot) || isSubpath(resolvedFolderPath, projectRoot);
        });
        if (referencesProject) {
          return workspaceFilePath;
        }
      } catch (error) {
        ext.outputChannel.appendLog(
          localize(
            'inspectWorkspaceFileError',
            'Unable to inspect workspace file "{0}": "{1}".',
            workspaceFilePath,
            error instanceof Error ? error.message : String(error)
          )
        );
      }
    }
    currentDir = path.dirname(currentDir);
  }

  return undefined;
}

/**
 * Gets the logic app project root that contains the given path.
 * @param {string} childPath - A path to a file or folder within a logic app project.
 * @returns {Promise<string | undefined>} The logic app project root, or undefined if the path is not within a logic app.
 */
export async function getParentLogicAppRoot(childPath: string): Promise<string | undefined> {
  const workspaceFolder = getParentWorkspaceFolder(childPath);
  if (!workspaceFolder) {
    return undefined;
  }

  const workspaceRoot = workspaceFolder.uri.fsPath;
  let currentPath = childPath;

  while (isPathEqual(workspaceRoot, currentPath) || isSubpath(workspaceRoot, currentPath)) {
    if (await isLogicApp(currentPath)) {
      return currentPath;
    }
    currentPath = path.dirname(currentPath);
  }

  return undefined;
}

/**
 * Gets workspace folder from path of any file in the workspace folder.
 * @param {string} childPath - The path of the file in the workspace folder.
 * @returns {vscode.WorkspaceFolder | undefined} - The workspace folder.
 */
export function getParentWorkspaceFolder(childPath: string): vscode.WorkspaceFolder | undefined {
  const folders = vscode.workspace.workspaceFolders || [];
  return folders.find((folder: vscode.WorkspaceFolder): boolean => {
    return isPathEqual(folder.uri.fsPath, childPath) || isSubpath(folder.uri.fsPath, childPath);
  });
}

/**
 * Gets the logic app roots from all workspace folders.
 * @returns {Promise<string[]>} A promise that resolves to an array of logic app roots.
 */
export async function getLogicAppRoots(): Promise<string[]> {
  if (!vscode.workspace.workspaceFolders || vscode.workspace.workspaceFolders.length === 0) {
    return [];
  }

  const logicAppRootTasks = vscode.workspace.workspaceFolders.map(async (folder) => {
    const projectRoots = await getWorkspaceFolderLogicAppRoots(folder);
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
export async function selectLogicAppRoot(context: IActionContext, suppressPrompt = false): Promise<string | undefined> {
  const projectPaths = await getLogicAppRoots();
  if (projectPaths.length === 0) {
    return undefined;
  }

  if (projectPaths.length === 1 || suppressPrompt) {
    return projectPaths[0];
  }

  const placeHolder = localize('selectProject', 'Select a logic app project');
  const projectPicks: IAzureQuickPickItem<string>[] = projectPaths.map((projectRoot) => ({
    label: path.basename(projectRoot),
    description: projectRoot,
    data: projectRoot,
  }));

  const selectedItem = await context.ui.showQuickPick(projectPicks, { placeHolder });
  return selectedItem?.data;
}

/**
 * Gets logic app projects from given workspace folder and subFolders one level down.
 * @param {vscode.WorkspaceFolder | string | undefined} workspaceFolder - The workspace folder to check.
 * @returns {Promise<string[]>} A promise that resolves to an array of logic app project roots.
 */
export async function getWorkspaceFolderLogicAppRoots(workspaceFolder: vscode.WorkspaceFolder | string | undefined): Promise<string[]> {
  if (isNullOrUndefined(workspaceFolder)) {
    return [];
  }

  const workspaceFolderPath = isString(workspaceFolder) ? workspaceFolder : workspaceFolder.uri.fsPath;
  if (!(await fse.pathExists(workspaceFolderPath))) {
    return [];
  }

  if (await isLogicApp(workspaceFolderPath)) {
    return [workspaceFolderPath];
  }

  try {
    const subpaths: string[] = await fse.readdir(workspaceFolderPath);
    const logicAppProjectRootTasks = subpaths.map(async (s) => {
      const subpath = path.join(workspaceFolderPath, s);
      if (await isLogicApp(subpath)) {
        return subpath;
      }
    });

    const logicAppProjectRoots = (await Promise.all(logicAppProjectRootTasks)).filter((p) => p !== undefined);
    return logicAppProjectRoots;
  } catch (error) {
    ext.outputChannel.appendLog(
      localize(
        'workspaceFolderLogicAppRootsError',
        'Error resolving workspace folder "{0}" logic app roots: "{1}".',
        workspaceFolderPath,
        error instanceof Error ? error.message : String(error)
      )
    );
    return [];
  }
}

/**
 * Gets a Logic App project root from the workspace folder. If multiple projects exist, prompts the user to select one.
 * @param {IActionContext} context - The action context.
 * @param {boolean} suppressPrompt - If true, returns the first project found without prompting.
 * @returns {Promise<string | undefined>} The selected Logic App project root path, or undefined if none found.
 */
export async function selectWorkspaceFolderLogicAppRoot(
  context: IActionContext,
  workspaceFolder: vscode.WorkspaceFolder | string,
  suppressPrompt = false
): Promise<string | undefined> {
  if (!workspaceFolder) {
    return undefined;
  }

  const workspaceFolderPath = isString(workspaceFolder) ? workspaceFolder : workspaceFolder.uri.fsPath;
  if (!(await fse.pathExists(workspaceFolderPath))) {
    return undefined;
  }

  const projectPaths = await getWorkspaceFolderLogicAppRoots(workspaceFolderPath);
  if (!projectPaths || projectPaths.length === 0) {
    return undefined;
  }

  if (projectPaths.length === 1 || suppressPrompt) {
    return projectPaths[0];
  }

  const placeHolder = localize('selectProject', 'Select a logic app project');
  const projectPicks: IAzureQuickPickItem<string>[] = projectPaths.map((projectRoot) => ({
    label: path.basename(projectRoot),
    description: projectRoot,
    data: projectRoot,
  }));

  const selectedItem = await context.ui.showQuickPick(projectPicks, { placeHolder });
  return selectedItem?.data;
}

/**
 * Determines whether the given folder is a Logic Apps project.
 *
 * A Logic Apps project is identified by a workflow signal — either of:
 *   - a codeless `workflow.json` one level down whose `definition.$schema` is a
 *     `Microsoft.Logic` workflow-definition schema, or
 *   - a codeful project: a .NET 8 `.csproj` at the project root that references the Logic Apps
 *     SDK (`Microsoft.Azure.Workflows.Sdk`).
 */
export async function isLogicApp(fsPath: string): Promise<boolean> {
  try {
    if (!(await fse.pathExists(fsPath)) || !fse.statSync(fsPath).isDirectory()) {
      return false;
    }
  } catch (error) {
    ext.outputChannel.appendLog(
      localize(
        'isLogicAppError',
        'Error checking if path "{0}" is a Logic App: "{1}".',
        fsPath,
        error instanceof Error ? error.message : String(error)
      )
    );
    return false;
  }

  return (await isCodelessLogicApp(fsPath)) || (await isCodefulLogicApp(fsPath));
}

/**
 * Gets all custom code functions projects in the workspace.
 */
export async function getCustomCodeRoots(): Promise<string[]> {
  if (!vscode.workspace.workspaceFolders || vscode.workspace.workspaceFolders.length === 0) {
    return [];
  }

  const customCodeRootTasks = vscode.workspace.workspaceFolders.map(getWorkspaceFolderCustomCodeRoots);
  return (await Promise.all(customCodeRootTasks)).flat();
}

/**
 * Gets custom code projects from given workspace folder and subFolders one level down.
 * @param {vscode.WorkspaceFolder | string | undefined} workspaceFolder - The workspace folder to check.
 * @returns {Promise<string[]>} A promise that resolves to an array of custom code project roots.
 */
async function getWorkspaceFolderCustomCodeRoots(workspaceFolder: vscode.WorkspaceFolder | string | undefined): Promise<string[]> {
  if (isNullOrUndefined(workspaceFolder)) {
    return [];
  }

  const workspaceFolderPath = isString(workspaceFolder) ? workspaceFolder : workspaceFolder.uri.fsPath;
  if (!(await fse.pathExists(workspaceFolderPath))) {
    return [];
  }

  if (await isCustomCodeFunctionsProject(workspaceFolderPath)) {
    return [workspaceFolderPath];
  }

  try {
    const subpaths: string[] = await fse.readdir(workspaceFolderPath);
    const customCodeProjectRootTasks = subpaths.map(async (s) => {
      const subpath = path.join(workspaceFolderPath, s);
      if (await isCustomCodeFunctionsProject(subpath)) {
        return subpath;
      }
    });

    const customCodeProjectRoots = (await Promise.all(customCodeProjectRootTasks)).filter((p) => p !== undefined);
    return customCodeProjectRoots;
  } catch (error) {
    ext.outputChannel.appendLog(
      localize(
        'getWorkspaceFolderCustomCodeRootsError',
        'Error getting custom code roots for workspace folder "{0}": "{1}".',
        workspaceFolderPath,
        error instanceof Error ? error.message : String(error)
      )
    );
    return [];
  }
}

/**
 * Gets a Custom Code project root from the workspace. If multiple projects exist, prompts the user to select one.
 * @param {IActionContext} context - The action context.
 * @param {boolean} suppressPrompt - If true, returns the first project found without prompting.
 * @returns {Promise<string | undefined>} The selected Custom Code project root path, or undefined if none found.
 */
export async function selectCustomCodeRoot(context: IActionContext, suppressPrompt = false): Promise<string | undefined> {
  const customCodePaths = await getCustomCodeRoots();
  if (customCodePaths.length === 0) {
    return undefined;
  }

  if (customCodePaths.length === 1 || suppressPrompt) {
    return customCodePaths[0];
  }

  const placeHolder = localize('selectProject', 'Select a custom code project');
  const projectPicks: IAzureQuickPickItem<string>[] = customCodePaths.map((customCodeRoot) => ({
    label: path.basename(customCodeRoot),
    description: customCodeRoot,
    data: customCodeRoot,
  }));

  const selectedItem = await context.ui.showQuickPick(projectPicks, { placeHolder });
  return selectedItem?.data;
}

/**
 * Gets the active workflow node.
 * @returns {vscode.Uri | undefined} The active text editor workflow node.
 */
export function getActiveWorkflowNode(): vscode.Uri | RemoteWorkflowTreeItem | undefined {
  const activeFile = vscode?.window?.activeTextEditor?.document;
  if (activeFile?.fileName.endsWith(workflowFileName)) {
    return activeFile.uri;
  }
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
