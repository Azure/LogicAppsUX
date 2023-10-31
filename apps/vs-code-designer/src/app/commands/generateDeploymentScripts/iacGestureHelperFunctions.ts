// Update the import path as needed
import { ext } from '../../../extensionVariables';
import { localize } from '../../../localize';
import * as vscode from 'vscode';

export class FileManagement {
  /**
   * Adds a folder to the workspace.
   * @param folderPath - The path of the folder to be added.
   */
  public static addFolderToWorkspace(folderPath: string): void {
    try {
      ext.outputChannel.appendLog(localize('addingFolderToWorkspace', `Adding folder to workspace: ${folderPath}`));

      const uri = vscode.Uri.file(folderPath);
      const existingFolders = vscode.workspace.workspaceFolders || [];
      const isAlreadyInWorkspace = existingFolders.some((folder) => folder.uri.fsPath === folderPath);

      if (!isAlreadyInWorkspace) {
        const result = vscode.workspace.updateWorkspaceFolders(0, null, { uri });
        if (result) {
          ext.outputChannel.appendLog(localize('folderAddedSuccessfully', `Folder added successfully: ${folderPath}`));
        } else {
          ext.outputChannel.appendLog(
            localize('failedToAddFolder', `Failed to add folder to workspace (updateWorkspaceFolders returned false): ${folderPath}`)
          );
        }
      } else {
        ext.outputChannel.appendLog(localize('folderAlreadyInWorkspace', `Folder is already in the workspace: ${folderPath}`));
      }
    } catch (error) {
      ext.outputChannel.appendLog(localize('errorAddingFolder', `Error in addFolderToWorkspace: ${error}`));
      vscode.window.showErrorMessage(localize('errorMessageAddingFolder', 'Failed to add folder to workspace: ') + error.message);
    }
  }

  /**
   * Converts a directory to a valid multi root workspace.
   * @param targetDirectory - The directory to be converted.
   */
  public static convertToValidWorkspace(targetDirectory: string): void {
    try {
      ext.outputChannel.appendLog(
        localize('convertingDirectoryToWorkspace', `Converting directory to valid workspace: ${targetDirectory}`)
      );

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
      } else {
        ext.outputChannel.appendLog(
          localize('workspaceFoldersUpdated', `Workspace folders updated successfully with new directory: ${targetDirectory}`)
        );
      }
    } catch (error) {
      ext.outputChannel.appendLog(localize('errorConvertingToWorkspace', `Error in convertToValidWorkspace: ${error}`));
      vscode.window.showErrorMessage(
        localize('errorMessageConvertingToWorkspace', 'Failed to convert to valid workspace: ') + error.message
      );
    }
  }
}
