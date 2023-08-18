/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as fs from 'fs-extra';
import * as path from 'path';
import * as vscode from 'vscode';

export class FileManagement {
  static isFolderInWorkspace(folder: vscode.Uri): boolean {
    return vscode.workspace.workspaceFolders?.some((workspaceFolder) => folder.fsPath.startsWith(workspaceFolder.uri.fsPath)) || false;
  }

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

    this.addPathToCodeWorkspace(defaultPath);

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
        const selectedPath = userSelectedFolder[0].fsPath;
        this.addPathToCodeWorkspace(selectedPath);
        return selectedPath;
      }
    }

    return defaultPath;
  }

  static addPathToCodeWorkspace(path: string): void {
    const workspaceFilePath = vscode.workspace.workspaceFile?.fsPath;
    if (workspaceFilePath) {
      const workspaceFileContent = fs.readFileSync(workspaceFilePath, 'utf-8');
      const updatedContent = this.updateCodeWorkspaceContent(workspaceFileContent, path);
      fs.writeFileSync(workspaceFilePath, updatedContent);
    }
  }

  static updateCodeWorkspaceContent(content: string, path: string): string {
    const workspaceConfig = JSON.parse(content);
    if (!workspaceConfig.folders) {
      workspaceConfig.folders = [];
    }
    const hasDeploymentFolder = workspaceConfig.folders.some((folder) => folder.name === 'Deployment');

    if (!hasDeploymentFolder) {
      workspaceConfig.folders.unshift({ name: 'Deployment', path });
    }
    return JSON.stringify(workspaceConfig, null, 2);
  }

  static async promptForLogicAppName(): Promise<string> {
    const logicAppName = await vscode.window.showInputBox({
      prompt: 'Enter the logic app name:',
      placeHolder: 'Logic App Name',
    });

    return logicAppName || '';
  }

  static async promptForStorageAccountName(): Promise<string> {
    const storageAccountName = await vscode.window.showInputBox({
      prompt: 'Enter the storage account name:',
      placeHolder: 'Storage Account Name',
    });

    return storageAccountName || '';
  }

  static async promptForPlanServiceName(): Promise<string> {
    const planServiceName = await vscode.window.showInputBox({
      prompt: 'Enter the plan service name:',
      placeHolder: 'Plan Service Name',
    });

    return planServiceName || '';
  }
}
