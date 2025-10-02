import { localize } from '../../../localize';
import { callWithTelemetryAndErrorHandling } from '@microsoft/vscode-azext-utils';
import type { IActionContext } from '@microsoft/vscode-azext-utils';
import { ExtensionCommand, ProjectName } from '@microsoft/vscode-extension-logic-apps';
import * as vscode from 'vscode';
import * as path from 'path';
import * as os from 'os';
import { ext } from '../../../extensionVariables';
import { cacheWebviewPanel, removeWebviewPanelFromCache, tryGetWebviewPanel } from '../../utils/codeless/common';
import * as fs from 'fs';
import { getWebViewHTML } from '../../utils/codeless/getWebViewHTML';
import { createLogicAppWorkspaceFromPackage } from '../createNewCodeProject/CodeProjectBase/CreateLogicAppWorkspace';

const packageDialogOptions: vscode.OpenDialogOptions = {
  canSelectMany: false,
  defaultUri: vscode.Uri.file(path.join(os.homedir(), 'Downloads')),
  openLabel: localize('selectPackageFile', 'Select package file'),
  filters: { Packages: ['zip'] },
};

const workspaceParentDialogOptions: vscode.OpenDialogOptions = {
  canSelectMany: false,
  openLabel: localize('selectWorkspaceParentFolder', 'Select workspace parent folder'),
  canSelectFiles: false,
  canSelectFolders: true,
};

export async function cloudToLocal(): Promise<void> {
  const panelName: string = localize('createWorkspaceFromPackage', 'Create Workspace From Package');
  const panelGroupKey = ext.webViewKey.createWorkspace;
  const apiVersion = '2021-03-01';
  const existingPanel: vscode.WebviewPanel | undefined = tryGetWebviewPanel(panelGroupKey, panelName);

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

  const panel: vscode.WebviewPanel = vscode.window.createWebviewPanel('CreateWorkspace', `${panelName}`, vscode.ViewColumn.Active, options);
  panel.iconPath = {
    light: vscode.Uri.file(path.join(ext.context.extensionPath, 'assets', 'light', 'export.svg')),
    dark: vscode.Uri.file(path.join(ext.context.extensionPath, 'assets', 'dark', 'export.svg')),
  };
  panel.webview.html = await getWebViewHTML('vs-code-react', panel);

  let interval: NodeJS.Timeout;

  panel.webview.onDidReceiveMessage(async (message) => {
    switch (message.command) {
      case ExtensionCommand.initialize: {
        panel.webview.postMessage({
          command: ExtensionCommand.initialize_frame,
          data: {
            apiVersion,
            project: ProjectName.createWorkspaceFromPackage,
            hostVersion: ext.extensionVersion,
          },
        });
        break;
      }
      case ExtensionCommand.createWorkspaceFromPackage: {
        await callWithTelemetryAndErrorHandling('CreateWorkspaceFromPackage', async (activateContext: IActionContext) => {
          await createLogicAppWorkspaceFromPackage(activateContext, message.data);
        });
        // Close the webview panel after successful creation
        panel.dispose();
        break;
      }
      case ExtensionCommand.update_package_path: {
        vscode.window.showOpenDialog(packageDialogOptions).then((fileUri) => {
          if (fileUri && fileUri[0]) {
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
        });
        break;
      }
      case ExtensionCommand.select_folder: {
        vscode.window.showOpenDialog(workspaceParentDialogOptions).then((fileUri) => {
          if (fileUri && fileUri[0]) {
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
        });
        break;
      }
      case ExtensionCommand.validatePath: {
        const { path: pathToValidate, type } = message.data || {};
        let exists = false;
        try {
          if (pathToValidate && typeof pathToValidate === 'string') {
            exists = fs.existsSync(pathToValidate);
            if (exists) {
              const stats = fs.statSync(pathToValidate);
              if (!type) {
                // For regular path validation, check if it's a directory
                exists = stats.isDirectory();
              } else if (type === ExtensionCommand.workspace_folder) {
                // For workspace folder, check if it's a directory
                exists = stats.isDirectory();
              } else if (type === ExtensionCommand.workspace_file) {
                // For workspace file, check if it's a file (not a directory)
                exists = stats.isFile();
              }
            }
          }
        } catch (_error) {
          exists = false;
        }

        if (type === ExtensionCommand.workspace_folder || type === ExtensionCommand.workspace_file) {
          // Send specific workspace existence result
          panel.webview.postMessage({
            command: 'workspaceExistenceResult',
            data: {
              project: ProjectName.createWorkspace,
              workspacePath: pathToValidate,
              exists: exists,
              type: type,
            },
          });
        } else if (type === ExtensionCommand.package_file) {
          // Send specific workspace existence result
          panel.webview.postMessage({
            command: 'packageExistenceResult',
            data: {
              project: ProjectName.createWorkspaceFromPackage,
              path: pathToValidate,
              isValid: exists,
            },
          });
        } else {
          // Send regular path validation result
          panel.webview.postMessage({
            command: ExtensionCommand.validatePath,
            data: {
              project: ProjectName.createWorkspace,
              path: pathToValidate,
              isValid: exists,
            },
          });
        }
        break;
      }
      // case ExtensionCommand.logTelemetry: {
      //   const eventName = message.key;
      //   ext.telemetryReporter.sendTelemetryEvent(eventName, { value: message.value });
      //   ext.logTelemetry(context, eventName, message.value);
      //   break;
      // }
      default:
        break;
    }
  }, ext.context.subscriptions);

  panel.onDidDispose(
    () => {
      removeWebviewPanelFromCache(panelGroupKey, panelName);
      clearInterval(interval);
    },
    null,
    ext.context.subscriptions
  );
  cacheWebviewPanel(panelGroupKey, panelName, panel);
}
