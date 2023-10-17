/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as vscode from 'vscode';

export class FileManagement {
  /**
   * Adds a folder to the workspace.
   * @param folderPath - The path of the folder to be added.
   */
  public static addFolderToWorkspace(folderPath: string): void {
    try {
      const uri = vscode.Uri.file(folderPath);
      const existingFolders = vscode.workspace.workspaceFolders || [];

      // Check if the folder is already in the workspace
      const isAlreadyInWorkspace = existingFolders.some((folder) => folder.uri.fsPath === folderPath);

      // Add the folder to the workspace if it's not already there
      if (!isAlreadyInWorkspace) {
        vscode.workspace.updateWorkspaceFolders(0, null, { uri });
      }
    } catch (error) {
      vscode.window.showErrorMessage('Failed to add folder to workspace: ' + error.message);
    }
  }

  /**
   * Converts a directory to a valid multi root workspace.
   * @param targetDirectory - The directory to be converted.
   */
  public static convertToValidWorkspace(targetDirectory: string): void {
    try {
      const workspaceFolders = vscode.workspace.workspaceFolders;
      const folderPaths = workspaceFolders?.map((folder) => folder.uri.fsPath) || [];

      // Check if the target directory is already a workspace folder
      if (folderPaths.includes(targetDirectory)) {
        return;
      }

      // Add the target directory as the root workspace folder
      folderPaths.unshift(targetDirectory);

      // Update the workspace folders with the new configuration
      const added = vscode.workspace.updateWorkspaceFolders(0, null, ...folderPaths.map((path) => ({ uri: vscode.Uri.file(path) })));
      if (!added) {
        throw new Error(workspaceFolders ? 'Failed to add folder to workspace' : 'Failed to create workspace');
      }
    } catch (error) {
      vscode.window.showErrorMessage('Failed to convert to valid workspace: ' + error.message);
    }
  }
}