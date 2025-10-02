import { extensionCommand } from '../../constants';
import { localize } from '../../localize';
import { addLocalFuncTelemetry } from '../utils/funcCoreTools/funcVersion';
import { callWithTelemetryAndErrorHandling, DialogResponses } from '@microsoft/vscode-azext-utils';
import type { IActionContext } from '@microsoft/vscode-azext-utils';
import { ExtensionCommand, ProjectName, type IFunctionWizardContext } from '@microsoft/vscode-extension-logic-apps';
import * as vscode from 'vscode';
import * as fs from 'fs';
import { window } from 'vscode';
import { getWorkspaceFile, getWorkspaceFileInParentDirectory, getWorkspaceFolder2, getWorkspaceRoot } from '../utils/workspace';
import { isLogicAppProjectInRoot } from '../utils/verifyIsProject';
import { createWorkspaceFile } from './createNewCodeProject/CodeProjectBase/CreateLogicAppProjects';
import { ext } from '../../extensionVariables';
import { cacheWebviewPanel, removeWebviewPanelFromCache, tryGetWebviewPanel } from '../utils/codeless/common';
import path from 'path';
import { getWebViewHTML } from '../utils/codeless/getWebViewHTML';

const workspaceParentDialogOptions: vscode.OpenDialogOptions = {
  canSelectMany: false,
  openLabel: localize('selectWorkspaceParentFolder', 'Select workspace parent folder'),
  canSelectFiles: false,
  canSelectFolders: true,
};

export async function convertToWorkspace(context: IActionContext): Promise<boolean> {
  const workspaceFolder = await getWorkspaceFolder2();
  if (await isLogicAppProjectInRoot(workspaceFolder)) {
    addLocalFuncTelemetry(context);

    const wizardContext = context as Partial<IFunctionWizardContext> & IActionContext;
    context.telemetry.properties.isWorkspace = 'false';
    wizardContext.workspaceFilePath = (await getWorkspaceFile(wizardContext)) ?? (await getWorkspaceFileInParentDirectory(wizardContext));
    // save uri variable for open project folder command
    wizardContext.workspacePath = await getWorkspaceRoot(wizardContext);
    if (wizardContext.workspaceFilePath && !wizardContext.workspacePath) {
      const openWorkspaceMessage = localize(
        'openContainingWorkspace',
        `You must open your workspace to use the full functionality in the Azure Logic Apps (Standard) extension. You can find the workspace with your logic app project at the following location: ${wizardContext.workspaceFilePath}. Do you want to open this workspace now?`
      );
      const shouldOpenWorkspace = await vscode.window.showInformationMessage(
        openWorkspaceMessage,
        { modal: true },
        DialogResponses.yes,
        DialogResponses.no
      );
      if (shouldOpenWorkspace === DialogResponses.yes) {
        await vscode.commands.executeCommand(extensionCommand.vscodeOpenFolder, vscode.Uri.file(wizardContext.workspacePath));
        context.telemetry.properties.openContainingWorkspace = 'true';
        return true;
      }
      context.telemetry.properties.openContainingWorkspace = 'false';
      return false;
    }

    if (!wizardContext.workspaceFilePath && !wizardContext.workspacePath) {
      const createWorkspaceMessage = localize(
        'createContainingWorkspace',
        'Your logic app projects must exist inside a workspace to use the full functionality in the Azure Logic Apps (Standard) extension. Visual Studio Code will copy your projects to a new workspace. Do you want to create the workspace now?'
      );
      const shouldCreateWorkspace = await vscode.window.showInformationMessage(
        createWorkspaceMessage,
        { modal: true },
        DialogResponses.yes,
        DialogResponses.no
      );
      if (shouldCreateWorkspace === DialogResponses.yes) {
        // need to create a webview to get the workspace name and etc

        const panelName: string = localize('createWorkspaceStructure', 'Create Workspace Structure');
        const panelGroupKey = ext.webViewKey.createWorkspaceStructure;
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

        const panel: vscode.WebviewPanel = vscode.window.createWebviewPanel(
          'CreateWorkspaceStructure',
          `${panelName}`,
          vscode.ViewColumn.Active,
          options
        );
        panel.iconPath = {
          light: vscode.Uri.file(path.join(ext.context.extensionPath, 'assets', 'light', 'export.svg')),
          dark: vscode.Uri.file(path.join(ext.context.extensionPath, 'assets', 'dark', 'export.svg')),
        };
        panel.webview.html = await getWebViewHTML('vs-code-react', panel);

        let interval: NodeJS.Timeout;
        return new Promise<boolean>((resolve) => {
          panel.webview.onDidReceiveMessage(async (message) => {
            switch (message.command) {
              case ExtensionCommand.initialize: {
                panel.webview.postMessage({
                  command: ExtensionCommand.initialize_frame,
                  data: {
                    apiVersion,
                    project: ProjectName.createWorkspaceStructure,
                    hostVersion: ext.extensionVersion,
                  },
                });
                break;
              }
              case ExtensionCommand.createWorkspaceStructure: {
                await callWithTelemetryAndErrorHandling('CreateWorkspaceStructure', async (activateContext: IActionContext) => {
                  await createWorkspaceFile(activateContext, message.data);
                });
                context.telemetry.properties.createContainingWorkspace = 'true';
                window.showInformationMessage(localize('finishedConvertingWorkspace', 'Finished converting to workspace.'));
                // Close the webview panel after successful creation
                panel.dispose();
                resolve(true); // Only resolve after workspace creation is done
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
                      project: ProjectName.createWorkspaceStructure,
                      workspacePath: pathToValidate,
                      exists: exists,
                      type: type,
                    },
                  });
                } else {
                  // Send regular path validation result
                  panel.webview.postMessage({
                    command: ExtensionCommand.validatePath,
                    data: {
                      project: ProjectName.createWorkspaceStructure,
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
              resolve(false); // If panel is closed before workspace creation, resolve as false
            },
            null,
            ext.context.subscriptions
          );
          cacheWebviewPanel(panelGroupKey, panelName, panel);
        });
      }
      context.telemetry.properties.createContainingWorkspace = 'false';
      return false;
    }

    context.telemetry.properties.isWorkspace = 'true';
    return true;
  }
}
