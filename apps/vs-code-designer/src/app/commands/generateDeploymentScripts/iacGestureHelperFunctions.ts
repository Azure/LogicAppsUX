/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { getLocalSettingsJson } from '../../utils/appSettings/localSettings';
import type { IAzureScriptWizard } from './azureScriptWizard';
import * as fs from 'fs-extra';
import * as path from 'path';
import * as vscode from 'vscode';

export class FileManagement {
  /**
   * Checks if a folder is present in the workspace.
   * @param folder - The folder to check.
   * @returns True if the folder is in the workspace, false otherwise.
   */
  static isFolderInWorkspace(folder: vscode.Uri): boolean {
    return vscode.workspace.workspaceFolders?.some((workspaceFolder) => folder.fsPath.startsWith(workspaceFolder.uri.fsPath)) || false;
  }

  /**
   * Converts a folder to a workspace.
   * @param folder - The folder to convert.
   * @returns A promise that resolves when the folder is converted to a workspace.
   */
  static async convertToWorkspace(folder: vscode.Uri): Promise<void> {
    const parentFolder = path.dirname(folder.fsPath);
    const workspaceConfig: vscode.WorkspaceFolder[] = [
      {
        uri: vscode.Uri.file(parentFolder),
        name: path.basename(parentFolder),
        index: 0,
      },
    ];
    await vscode.workspace.updateWorkspaceFolders(0, vscode.workspace.workspaceFolders?.length, ...workspaceConfig);
  }

  /**
   * Creates a subfolder for the selected Logic App in the Deployment folder.
   * @param root - The root folder where the Deployment folder is located.
   * @param logicAppName - The name of the Logic App.
   * @returns The path to the Logic App folder.
   */
  static createFolderForLogicApp(root: string, logicAppName: string): string {
    const logicAppFolderPath = path.join(root, 'Deployment', logicAppName);
    fs.ensureDirSync(logicAppFolderPath); // fs-extra's ensureDirSync creates a directory if it does not exist
    return logicAppFolderPath;
  }

  /**
   * Returns the root workspace path.
   * @param folderPaths - An array of workspace folder paths.
   * @returns The root workspace path.
   */
  static getRootWorkspacePath(folderPaths: string[]): string {
    let rootPath = folderPaths[0];
    for (let i = 1; i < folderPaths.length; i++) {
      if (!folderPaths[i].startsWith(rootPath)) {
        let j = rootPath.length;
        while (j > 0 && !folderPaths[i].startsWith(rootPath.substring(0, j))) {
          j--;
        }
        rootPath = rootPath.substring(0, j);
      }
    }
    return rootPath;
  }
}

export class UserInput {
  /**
   * Prompts the user for a setting value from the local settings file.
   * @param scriptContext - The script context.
   * @param folder - The folder where the local settings file is located.
   * @param key - The key of the setting to retrieve.
   * @returns A promise that resolves to the value entered by the user.
   */
  static async promptForSetting(scriptContext: IAzureScriptWizard, folder: vscode.Uri, key: string): Promise<string> {
    return await getSettingFromLocalSettings(scriptContext, folder, key);
  }

  /**
   * Prompts the user for the source control path.
   * @returns A promise that resolves to the source control path entered by the user.
   */
  static async promptForSourceControlPath(): Promise<string> {
    const workspaceFolders = vscode.workspace.workspaceFolders?.map((folder) => folder.uri.fsPath);
    const rootWorkspacePath = workspaceFolders ? FileManagement.getRootWorkspacePath(workspaceFolders) : '';

    if (!rootWorkspacePath) {
      throw new Error('Failed to find the root workspace directory.');
    }

    const defaultPath = path.join(rootWorkspacePath, 'Deployment');
    if (!fs.existsSync(defaultPath)) {
      fs.mkdirSync(defaultPath);
    }

    const selectedFolder = await vscode.window.showQuickPick(
      [
        { label: 'Default: Deployment', description: defaultPath },
        { label: 'Choose a different folder...', description: '' },
      ],
      {
        placeHolder: 'Select a source control path',
      }
    );

    if (selectedFolder?.label === 'Choose a different folder...') {
      const userSelectedFolder = await vscode.window.showOpenDialog({
        canSelectMany: false,
        canSelectFolders: true,
        canSelectFiles: false,
      });

      if (userSelectedFolder && userSelectedFolder.length > 0) {
        return userSelectedFolder[0].fsPath;
      }
    }

    return defaultPath;
  }
}

async function getSettingFromLocalSettings(scriptContext: IAzureScriptWizard, folder: vscode.Uri, key: string): Promise<string> {
  const localSettingsPath = path.join(folder.fsPath, 'local.settings.json');
  const localSettings = await getLocalSettingsJson(scriptContext, localSettingsPath);
  return localSettings.Values?.[key] || '';
}

// Placeholder for your folder monitoring function
export function monitorFolderForChanges(_folderPath: string, _callback: (changedFolderPath: string) => void) {
  // TODO: Implement folder monitoring function
  // This function should monitor the specified folder for changes, and execute the provided callback whenever a change is detected.
}
