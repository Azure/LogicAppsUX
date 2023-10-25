/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localize } from '../../localize';
import type { RemoteWorkflowTreeItem } from '../tree/remoteWorkflowsTree/RemoteWorkflowTreeItem';
import { NoWorkspaceError } from './errors';
import { isPathEqual, isSubpath } from './fs';
import { isNullOrUndefined, isString } from '@microsoft/utils-logic-apps';
import { UserCancelledError } from '@microsoft/vscode-azext-utils';
import type { IActionContext, IAzureQuickPickItem } from '@microsoft/vscode-azext-utils';
//TODO: revisit this import again (globby)
import globby from 'globby';
import * as path from 'path';
import * as vscode from 'vscode';

/**
 * Gets workspace folder from the workflow file path.
 * @param {string} fsPath - Workflow file path.
 * @returns {vscode.WorkspaceFolder | undefined} Workflow folder.
 */
export function getContainingWorkspace(fsPath: string): vscode.WorkspaceFolder | undefined {
  const openFolders = vscode.workspace.workspaceFolders || [];
  return openFolders.find((folder: vscode.WorkspaceFolder): boolean => {
    return isPathEqual(folder.uri.fsPath, fsPath) || isSubpath(folder.uri.fsPath, fsPath);
  });
}

/**
 * Gets workspace folder of project.
 * @param {IActionContext} context - Command context.
 * @returns {Promise<WorkspaceFolder>} Returns either the new project workspace, the already open workspace or the selected workspace.
 */
export async function getWorkspaceFolder(context: IActionContext): Promise<vscode.WorkspaceFolder> {
  let folder: vscode.WorkspaceFolder | undefined;

  if (!vscode.workspace.workspaceFolders || vscode.workspace.workspaceFolders.length === 0) {
    const message: string = localize('noWorkspaceWarning', 'You must have a project open to create a workflow.');
    const newProject: vscode.MessageItem = { title: localize('createNewProject', 'Create new project') };
    const openExistingProject: vscode.MessageItem = { title: localize('openExistingProject', 'Open existing project') };
    const result: vscode.MessageItem = await context.ui.showWarningMessage(message, { modal: true }, newProject, openExistingProject);

    if (result === newProject) {
      vscode.commands.executeCommand('azureLogicAppsStandard.createNewProject');
      context.telemetry.properties.noWorkspaceResult = 'createNewProject';
    } else {
      const uri: vscode.Uri[] = await context.ui.showOpenDialog({
        canSelectFiles: false,
        canSelectFolders: true,
        canSelectMany: false,
        openLabel: localize('open', 'Open'),
      });
      vscode.commands.executeCommand('vscode.openFolder', uri[0]);
      context.telemetry.properties.noWorkspaceResult = 'openExistingProject';
    }

    context.errorHandling.suppressDisplay = true;
    throw new NoWorkspaceError();
  } else if (vscode.workspace.workspaceFolders.length === 1) {
    folder = vscode.workspace.workspaceFolders[0];
  } else {
    const placeHolder: string = localize('selectProjectFolder', 'Select the folder containing your logic app project');
    folder = await vscode.window.showWorkspaceFolderPick({ placeHolder });
    if (!folder) {
      throw new UserCancelledError();
    }
  }

  return folder;
}

/**
 * Gets workflow node structure of JSON file if needed.
 * @param {vscode.Uri | undefined} node - Workflow node.
 * @returns {vscode.Uri | undefined} Workflow node.
 */
export const getWorkflowNode = (node: vscode.Uri | RemoteWorkflowTreeItem | undefined): vscode.Uri | RemoteWorkflowTreeItem | undefined => {
  if (isNullOrUndefined(node)) {
    const activeFile = vscode?.window?.activeTextEditor?.document;
    if (activeFile?.fileName.endsWith('workflow.json')) {
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
