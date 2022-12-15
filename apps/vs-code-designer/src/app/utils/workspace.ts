/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localize } from '../../localize';
import type { RemoteWorkflowTreeItem } from '../tree/remoteWorkflowsTree/RemoteWorkflowTreeItem';
import { isPathEqual, isSubpath } from './fs';
import { isNullOrUndefined } from '@microsoft/utils-logic-apps';
import type { IActionContext, IAzureQuickPickItem } from '@microsoft/vscode-azext-utils';
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
