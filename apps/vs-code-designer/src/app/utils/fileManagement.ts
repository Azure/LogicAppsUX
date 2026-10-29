/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { ext } from '../../extensionVariables';
import { localize } from '../../localize';
import * as vscode from 'vscode';
import { isPathEqual } from './fs';

export class FileManagement {
  /**
   * Ensures the given path is added as a workspace folder if it is not already included.
   * @param {string} fsPath - The path to the workspace folder.
   */
  public static ensureWorkspaceFolder(fsPath: string) {
    const workspaceFolders = vscode.workspace.workspaceFolders || [];
    const isAlreadyInWorkspace = workspaceFolders.some((folder) => isPathEqual(folder.uri.fsPath, fsPath));
  
    if (!isAlreadyInWorkspace) {
      ext.outputChannel.appendLog(localize('addingWorkspaceFolder', 'Adding workspace folder: {0}', fsPath));
      FileManagement.addFolderToWorkspace(fsPath);
    }
  }

  /**
   * Adds a folder to the workspace.
   * @param folderPath - The path of the folder to be added.
   */
  public static addFolderToWorkspace(folderPath: string): void {
    ext.outputChannel.appendLog(localize('addingFolderToWorkspace', `Adding folder to workspace: ${folderPath}`));

    const uri = vscode.Uri.file(folderPath);
    const existingFolders = vscode.workspace.workspaceFolders || [];
    const isAlreadyInWorkspace = existingFolders.some((folder) => folder.uri.fsPath === folderPath);

    if (isAlreadyInWorkspace) {
      ext.outputChannel.appendLog(localize('folderAlreadyInWorkspace', `Folder is already in the workspace: ${folderPath}`));
    } else {
      const insertIndex = existingFolders.length;

      const result = vscode.workspace.updateWorkspaceFolders(insertIndex, 0, { uri });

      if (result) {
        ext.outputChannel.appendLog(localize('folderAddedSuccessfully', `Folder added successfully: ${folderPath}`));
      } else {
        ext.outputChannel.appendLog(
          localize('failedToAddFolder', `Failed to add folder to workspace (updateWorkspaceFolders returned false): ${folderPath}`)
        );
      }
    }
  }

  /**
   * Converts a directory to a valid multi root workspace.
   * @param targetDirectory - The directory to be converted.
   */
  public static convertToValidWorkspace(targetDirectory: string): void {
    ext.outputChannel.appendLog(localize('convertingDirectoryToWorkspace', `Converting directory to valid workspace: ${targetDirectory}`));

    const workspaceFolders = vscode.workspace.workspaceFolders;
    const folderPaths = workspaceFolders?.map((folder) => folder.uri.fsPath) || [];

    if (folderPaths.includes(targetDirectory)) {
      ext.outputChannel.appendLog(
        localize('directoryAlreadyWorkspaceFolder', `Directory is already a workspace folder: ${targetDirectory}`)
      );
      return;
    }

    folderPaths.unshift(targetDirectory);
    const added = vscode.workspace.updateWorkspaceFolders(0, null, ...folderPaths.map((path) => ({ uri: vscode.Uri.file(path) })));

    if (!added) {
      throw new Error(
        workspaceFolders
          ? localize('failedToAddFolderToWorkspace', 'Failed to add folder to workspace')
          : localize('failedToCreateWorkspace', 'Failed to create workspace')
      );
    }
    ext.outputChannel.appendLog(
      localize('workspaceFoldersUpdated', `Workspace folders updated successfully with new directory: ${targetDirectory}`)
    );
  }
}
