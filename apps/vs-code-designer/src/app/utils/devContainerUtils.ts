/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { devContainerFolderName, devContainerFileName } from '../../constants';
import * as fse from 'fs-extra';
import * as path from 'path';
import * as vscode from 'vscode';

/**
 * Checks if the current workspace is a devcontainer project by:
 * 1. Checking if .devcontainer folder is listed in the workspace file
 * 2. Verifying that devcontainer.json exists in that folder
 * @returns true if this is a devcontainer workspace, false otherwise
 */
export async function isDevContainerWorkspace(): Promise<boolean> {
  try {
    // Check if we have a workspace file
    const workspaceFile = vscode.workspace.workspaceFile;
    if (!workspaceFile) {
      return false;
    }

    // Get the workspace folder
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders || workspaceFolders.length === 0) {
      return false;
    }

    // Read the workspace file
    const workspaceFileContent = await fse.readJSON(workspaceFile.fsPath);

    // Check if .devcontainer folder is in the workspace folders
    const folders = workspaceFileContent.folders || [];
    const hasDevContainerFolder = folders.some(
      (folder: any) => folder.path === devContainerFolderName || folder.path === `./${devContainerFolderName}`
    );

    if (!hasDevContainerFolder) {
      return false;
    }

    // Get the workspace root folder (parent of the workspace file)
    const workspaceFolder = path.dirname(workspaceFile.fsPath);

    // Verify devcontainer.json actually exists
    const devContainerJsonPath = path.join(workspaceFolder, devContainerFolderName, devContainerFileName);
    const devContainerJsonExists = await fse.pathExists(devContainerJsonPath);

    return devContainerJsonExists;
  } catch {
    // If any error occurs, assume it's not a devcontainer workspace
    return false;
  }
}
