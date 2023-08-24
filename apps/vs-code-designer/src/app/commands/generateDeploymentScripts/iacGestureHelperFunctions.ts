/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localize } from '../../../localize';
import type { IAzureScriptWizard } from './azureScriptWizard';
import * as fs from 'fs-extra';
import * as path from 'path';
import * as vscode from 'vscode';

export class FileManagement {
  /**
   * Gets the root workspace path from an array of folder paths.
   * @param folderPaths - The array of folder paths.
   * @returns The root workspace path.
   */
  static getRootWorkspacePath(folderPaths: string[]): string {
    let rootPath = folderPaths[0];

    for (let i = 1; i < folderPaths.length; i++) {
      let j = 0;
      while (j < rootPath.length && j < folderPaths[i].length && rootPath.charAt(j) === folderPaths[i].charAt(j)) {
        j++;
      }
      rootPath = rootPath.substring(0, j);
    }
    return rootPath;
  }

  /**
   * Adds a path to the code workspace.
   * @param context - The script context.
   * @param folderPath - The folder path to add.
   */
  static addPathToCodeWorkspace(context: IAzureScriptWizard, folderPath: string): void {
    const workspaceFilePath = context.workspaceFilePath || vscode.workspace.workspaceFile?.fsPath;
    if (workspaceFilePath) {
      const workspaceFileContent = fs.readFileSync(workspaceFilePath, 'utf-8');
      const updatedContent = this.updateCodeWorkspaceContent(workspaceFileContent, folderPath);
      fs.writeFileSync(workspaceFilePath, updatedContent);
    }
  }

  /**
   * Updates the content of the code workspace.
   * @param content - The current content of the code workspace.
   * @param folderPath - The folder path to add.
   * @returns The updated content of the code workspace.
   */
  static updateCodeWorkspaceContent(content: string, folderPath: string): string {
    const workspaceConfig = JSON.parse(content);
    workspaceConfig.folders.unshift({ name: 'Deployment', path: folderPath });
    return JSON.stringify(workspaceConfig, null, 2);
  }

  /**
   * Checks if a folder is part of the current workspace.
   * @param folderUri - The folder URI to check.
   * @returns True if the folder is part of the workspace, false otherwise.
   */
  static isFolderInWorkspace(folderUri: vscode.Uri): boolean {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders) return false;

    for (const workspaceFolder of workspaceFolders) {
      if (workspaceFolder.uri.fsPath === folderUri.fsPath) {
        return true;
      }
    }
    return false;
  }

  /**
   * Checks if a workspace file is opened.
   * @returns True if a workspace file is opened, false otherwise.
   */
  static isWorkspaceFileOpened(): boolean {
    return vscode.workspace.workspaceFile !== undefined;
  }

  /**
   * Checks if a folder is part of the workspace and prompts the user if it is not.
   * @param context - The script context.
   * @param folder - The folder URI.
   * @returns The workspace file path if the folder is part of the workspace, null otherwise.
   */
  static async checkFolderInWorkspace(context: IAzureScriptWizard, folder: vscode.Uri): Promise<string | null> {
    if (this.isFolderInWorkspace(folder)) {
      if (this.isWorkspaceFileOpened()) {
        context.isValidWorkspace = true;
        return null;
      } else {
        vscode.window.showInformationMessage(
          localize(
            'folderOpenedNotPartOfWorkspace',
            'The folder is not as part of a valid workspace, a valid workspace will generate in a new window shortly'
          )
        );
        const workspaceFolders = vscode.workspace.workspaceFolders;
        context.isValidWorkspace = false;
        if (workspaceFolders) {
          const folderPaths = workspaceFolders.map((wf) => wf.uri.fsPath);
          const rootWorkspacePath = FileManagement.getRootWorkspacePath(folderPaths);
          const parentDir = path.dirname(rootWorkspacePath);
          context.workspaceName = await context.ui.showInputBox({
            placeHolder: localize('setWorkspaceName', 'Workspace name'),
            prompt: localize('workspaceNamePrompt', 'Provide a workspace name'),
          });
          if (context.workspaceName === undefined) {
            throw new Error('Workspace name is still empty after prompting the user.');
          }
          const workspaceFilePath = path.join(parentDir, `${context.workspaceName}.code-workspace`);
          context.projectPath = parentDir;
          const workspaceContent = {
            folders: folderPaths.map((p) => ({ path: p })),
            settings: {},
          };
          fs.writeFileSync(workspaceFilePath, JSON.stringify(workspaceContent, null, 2));
          return workspaceFilePath;
        }
      }
    } else {
      vscode.window.showWarningMessage(
        localize('folderNotOpenedInWorkspace', 'The folder is not opened in the current VS Code workspace. Proceeding anyway...')
      );
      return null;
    }
  }
}

export class UserInput {
  /**
   * Prompts the user to select a source control path.
   * @param context - The script context.
   * @returns The selected source control path.
   */
  static async promptForSourceControlPath(context: IAzureScriptWizard): Promise<string> {
    const workspaceFolders = vscode.workspace.workspaceFolders?.map((folder) => folder.uri.fsPath);
    let rootWorkspacePath = '';

    if (!context.isValidWorkspace) {
      rootWorkspacePath = context.projectPath;
    } else {
      rootWorkspacePath = workspaceFolders ? FileManagement.getRootWorkspacePath(workspaceFolders) : '';
    }

    if (!rootWorkspacePath) {
      throw new Error('Failed to find the root workspace directory.');
    }

    const defaultPath = path.join(rootWorkspacePath, 'Deployment');
    if (!fs.existsSync(defaultPath)) {
      fs.mkdirSync(defaultPath);
    }
    FileManagement.addPathToCodeWorkspace(context, defaultPath);

    const selectedFolder = await vscode.window.showQuickPick(
      [
        { label: localize('defaultDeploymentFolder', 'Default: Deployment'), description: defaultPath },
        { label: localize('chooseDifferentFolder', 'Choose a different folder...'), description: '' },
      ],
      {
        placeHolder: localize('selectSourceControlPath', 'Select a source control path'),
      }
    );

    if (selectedFolder?.label === localize('chooseDifferentFolder', 'Choose a different folder...')) {
      const userSelectedFolder = await vscode.window.showOpenDialog({
        canSelectMany: false,
        canSelectFolders: true,
        canSelectFiles: false,
      });

      if (userSelectedFolder && userSelectedFolder.length > 0) {
        const selectedPath = userSelectedFolder[0].fsPath;
        FileManagement.addPathToCodeWorkspace(context, selectedPath);
        return selectedPath;
      }
    }
    return defaultPath;
  }
}
