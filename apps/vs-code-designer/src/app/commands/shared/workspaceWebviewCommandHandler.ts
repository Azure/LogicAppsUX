/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { callWithTelemetryAndErrorHandling, type IActionContext } from '@microsoft/vscode-azext-utils';
import { ExtensionCommand } from '@microsoft/vscode-extension-logic-apps';
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { ext } from '../../../extensionVariables';
import { cacheWebviewPanel, removeWebviewPanelFromCache, tryGetWebviewPanel } from '../../utils/codeless/common';
import { getWebViewHTML } from '../../utils/codeless/getWebViewHTML';
import { assetsFolderName } from '../../../constants';
import { localize } from '../../../localize';

interface WorkspaceWebviewCommandConfig {
  panelName: string;
  panelGroupKey: string;
  projectName: string;
  createCommand: ExtensionCommand;
  createHandler: (context: IActionContext, data: any, ...args: any[]) => Promise<void>;
  dialogOptions?: {
    workspace?: vscode.OpenDialogOptions;
    package?: vscode.OpenDialogOptions;
  };
  extraHandlers?: Record<string, (message: any) => Promise<void>>;
  extraInitializeData?: Record<string, any>;
  onResolve?: (result: any) => void;
}

export async function createWorkspaceWebviewCommandHandler(config: WorkspaceWebviewCommandConfig): Promise<void> {
  const {
    panelName,
    panelGroupKey,
    projectName,
    createCommand,
    createHandler,
    dialogOptions,
    extraHandlers = {},
    extraInitializeData = {},
    onResolve,
  } = config;

  const apiVersion = '2021-03-01';
  const existingPanel = tryGetWebviewPanel(panelGroupKey, panelName);

  if (existingPanel) {
    if (!existingPanel.active) {
      existingPanel.reveal(vscode.ViewColumn.Active);
    }
    return;
  }

  const options: vscode.WebviewOptions & vscode.WebviewPanelOptions = {
    enableScripts: true,
    retainContextWhenHidden: true,
  };

  const panel = vscode.window.createWebviewPanel('CreateWorkspace', panelName, vscode.ViewColumn.Active, options);

  panel.iconPath = {
    light: vscode.Uri.file(path.join(ext.context.extensionPath, assetsFolderName, 'light', 'export.svg')),
    dark: vscode.Uri.file(path.join(ext.context.extensionPath, assetsFolderName, 'dark', 'export.svg')),
  };

  panel.webview.html = await getWebViewHTML('vs-code-react', panel);

  // Standard message handlers
  const messageHandlers = {
    [ExtensionCommand.initialize]: async () => {
      panel.webview.postMessage({
        command: ExtensionCommand.initialize_frame,
        data: {
          apiVersion,
          project: projectName,
          hostVersion: ext.extensionVersion,
          separator: path.sep,
          ...extraInitializeData,
        },
      });
    },

    [createCommand]: async (message: any) => {
      await callWithTelemetryAndErrorHandling(panelName.replace(/\s+/g, ''), async (activateContext: IActionContext) => {
        await createHandler(activateContext, message.data);
      });
      if (onResolve) {
        onResolve(true);
      }
      panel.dispose();
    },

    [ExtensionCommand.select_folder]: async () => {
      const workspaceOptions = dialogOptions?.workspace || getDefaultWorkspaceDialogOptions();
      const fileUri = await vscode.window.showOpenDialog(workspaceOptions);
      if (fileUri?.[0]) {
        panel.webview.postMessage({
          command: ExtensionCommand.update_workspace_path,
          data: {
            targetDirectory: {
              fsPath: fileUri[0].fsPath,
              path: fileUri[0].path,
            },
          },
        });
      }
    },

    [ExtensionCommand.update_package_path]: async () => {
      const packageOptions = dialogOptions?.package || getDefaultPackageDialogOptions();
      const fileUri = await vscode.window.showOpenDialog(packageOptions);
      if (fileUri?.[0]) {
        panel.webview.postMessage({
          command: ExtensionCommand.update_package_path,
          data: {
            targetDirectory: {
              fsPath: fileUri[0].fsPath,
              path: fileUri[0].path,
            },
          },
        });
      }
    },

    [ExtensionCommand.validatePath]: async (message: any) => {
      const validationResult = await validatePath(message.data, projectName);
      panel.webview.postMessage(validationResult);
    },

    // Merge in any extra handlers
    ...extraHandlers,
  };

  panel.webview.onDidReceiveMessage(async (message) => {
    const handler = messageHandlers[message.command];
    if (handler) {
      await handler(message);
    }
  }, ext.context.subscriptions);

  panel.onDidDispose(
    () => {
      removeWebviewPanelFromCache(panelGroupKey, panelName);
      if (onResolve) {
        onResolve(false);
      }
    },
    null,
    ext.context.subscriptions
  );

  cacheWebviewPanel(panelGroupKey, panelName, panel);
}

// Shared validation logic
async function validatePath(data: any, projectName: string) {
  const { path: pathToValidate, type } = data || {};
  let exists = false;

  try {
    if (pathToValidate && typeof pathToValidate === 'string') {
      exists = fs.existsSync(pathToValidate);
      if (exists) {
        const stats = fs.statSync(pathToValidate);
        if (!type) {
          exists = stats.isDirectory();
        } else if (type === ExtensionCommand.workspace_folder) {
          exists = stats.isDirectory();
        } else if (type === ExtensionCommand.workspace_file) {
          exists = stats.isFile();
        } else if (type === ExtensionCommand.package_file) {
          exists = stats.isFile();
        }
      }
    }
  } catch {
    exists = false;
  }

  // Return appropriate response based on type
  if (type === ExtensionCommand.workspace_folder || type === ExtensionCommand.workspace_file) {
    return {
      command: ExtensionCommand.workspace_existence_result,
      data: {
        project: projectName,
        workspacePath: pathToValidate,
        exists,
        type,
      },
    };
  }

  if (type === ExtensionCommand.package_file) {
    return {
      command: ExtensionCommand.package_existence_result,
      data: {
        project: projectName,
        path: pathToValidate,
        isValid: exists,
      },
    };
  }

  return {
    command: ExtensionCommand.validatePath,
    data: {
      project: projectName,
      path: pathToValidate,
      isValid: exists,
    },
  };
}

// Default dialog options
function getDefaultWorkspaceDialogOptions(): vscode.OpenDialogOptions {
  return {
    canSelectMany: false,
    openLabel: localize('selectWorkspaceParentFolder', 'Select workspace parent folder'),
    canSelectFiles: false,
    canSelectFolders: true,
  };
}

function getDefaultPackageDialogOptions(): vscode.OpenDialogOptions {
  return {
    canSelectMany: false,
    defaultUri: vscode.Uri.file(path.join(os.homedir(), 'Downloads')),
    openLabel: localize('selectPackageFile', 'Select package file'),
    filters: { Packages: ['zip'] },
  };
}
