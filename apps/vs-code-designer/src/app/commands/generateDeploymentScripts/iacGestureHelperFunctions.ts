/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { ext } from '../../../extensionVariables';
import * as vscode from 'vscode';

export class FileManagement {
  /**
   * Adds a folder to the workspace.
   * @param folderPath - The path of the folder to be added.
   */
  public static addFolderToWorkspace(folderPath: string): void {
    try {
      ext.outputChannel.appendLog(`Adding folder to workspace: ${folderPath}`);

      const uri = vscode.Uri.file(folderPath);
      const existingFolders = vscode.workspace.workspaceFolders || [];
      const isAlreadyInWorkspace = existingFolders.some((folder) => folder.uri.fsPath === folderPath);

      if (!isAlreadyInWorkspace) {
        const result = vscode.workspace.updateWorkspaceFolders(0, null, { uri });
        if (result) {
          ext.outputChannel.appendLog(`Folder added successfully: ${folderPath}`);
        } else {
          ext.outputChannel.appendLog(`Failed to add folder to workspace (updateWorkspaceFolders returned false): ${folderPath}`);
        }
      } else {
        ext.outputChannel.appendLog(`Folder is already in the workspace: ${folderPath}`);
      }
    } catch (error) {
      ext.outputChannel.appendLog(`Error in addFolderToWorkspace: ${error}`);
      vscode.window.showErrorMessage('Failed to add folder to workspace: ' + error.message);
    }
  }

  /**
   * Converts a directory to a valid multi root workspace.
   * @param targetDirectory - The directory to be converted.
   */

  public static convertToValidWorkspace(targetDirectory: string): void {
    try {
      ext.outputChannel.appendLog(`Converting directory to valid workspace: ${targetDirectory}`);
      const workspaceFolders = vscode.workspace.workspaceFolders;
      const folderPaths = workspaceFolders?.map((folder) => folder.uri.fsPath) || [];

      if (folderPaths.includes(targetDirectory)) {
        ext.outputChannel.appendLog(`Directory is already a workspace folder: ${targetDirectory}`);
        return;
      }

      folderPaths.unshift(targetDirectory);
      const added = vscode.workspace.updateWorkspaceFolders(0, null, ...folderPaths.map((path) => ({ uri: vscode.Uri.file(path) })));

      if (!added) {
        throw new Error(workspaceFolders ? 'Failed to add folder to workspace' : 'Failed to create workspace');
      } else {
        ext.outputChannel.appendLog(`Workspace folders updated successfully with new directory: ${targetDirectory}`);
      }
    } catch (error) {
      ext.outputChannel.appendLog(`Error in convertToValidWorkspace: ${error}`);
      vscode.window.showErrorMessage('Failed to convert to valid workspace: ' + error.message);
    }
  }
}
