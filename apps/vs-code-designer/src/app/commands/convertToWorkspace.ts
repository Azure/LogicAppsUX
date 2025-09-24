import { extensionCommand } from '../../constants';
import { localize } from '../../localize';
import { addLocalFuncTelemetry } from '../utils/funcCoreTools/funcVersion';
import { WorkspaceFolderStep } from './createWorkspace/createWorkspaceSteps/workspaceFolderStep';
import { OpenFolderStep } from './createWorkspace/createWorkspaceSteps/openFolderStep';
import { AzureWizard, callWithTelemetryAndErrorHandling, DialogResponses } from '@microsoft/vscode-azext-utils';
import type { IActionContext } from '@microsoft/vscode-azext-utils';
import { ExtensionCommand, ProjectName, type IFunctionWizardContext } from '@microsoft/vscode-extension-logic-apps';
import * as vscode from 'vscode';
import * as fs from 'fs';
import { window } from 'vscode';
import {
  getWorkspaceFile,
  getWorkspaceFileInParentDirectory,
  getWorkspaceFolder,
  getWorkspaceFolder2,
  getWorkspaceRoot,
} from '../utils/workspace';
import { WorkspaceNameStep } from './createWorkspace/createWorkspaceSteps/workspaceNameStep';
import { WorkspaceFileStep } from './createWorkspace/createWorkspaceSteps/workspaceFileStep';
import { isLogicAppProjectInRoot } from '../utils/verifyIsProject';
import { createWorkspaceFile } from './createNewCodeProject/CodeProjectBase/CreateLogicAppProjects';
import { ext } from '../../extensionVariables';
import { cacheWebviewPanel, removeWebviewPanelFromCache, tryGetWebviewPanel } from '../utils/codeless/common';
import path from 'path';
import { getWebViewHTML } from '../utils/codeless/getWebViewHTML';

export async function convertToWorkspace(context: IActionContext): Promise<boolean> {
  const convertToWorkspaceStartTime = Date.now();
  const workspaceFolder = await getWorkspaceFolder(context, undefined, true);
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
        await vscode.commands.executeCommand(extensionCommand.vscodeOpenFolder, vscode.Uri.file(wizardContext.workspaceFilePath));
        context.telemetry.properties.openContainingWorkspace = 'true';
        context.telemetry.measurements.convertToWorkspaceDuration = (Date.now() - convertToWorkspaceStartTime) / 1000;
        return true;
      }
      context.telemetry.properties.openContainingWorkspace = 'false';
      context.telemetry.measurements.convertToWorkspaceDuration = (Date.now() - convertToWorkspaceStartTime) / 1000;
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
        const workspaceWizard: AzureWizard<IFunctionWizardContext> = new AzureWizard(wizardContext, {
          title: localize('convertToWorkspace', 'Convert to workspace'),
          promptSteps: [new WorkspaceFolderStep(), new WorkspaceNameStep(), new WorkspaceFileStep()],
          executeSteps: [new OpenFolderStep()],
        });

        await workspaceWizard.prompt();
        await workspaceWizard.execute();
        context.telemetry.properties.createContainingWorkspace = 'true';
        context.telemetry.measurements.convertToWorkspaceDuration = (Date.now() - convertToWorkspaceStartTime) / 1000;
        window.showInformationMessage(localize('finishedConvertingWorkspace', 'Finished converting to workspace.'));
        return true;
      }

      context.telemetry.properties.createContainingWorkspace = 'false';
      context.telemetry.measurements.convertToWorkspaceDuration = (Date.now() - convertToWorkspaceStartTime) / 1000;
      return false;
    }

    context.telemetry.properties.isWorkspace = 'true';
    context.telemetry.measurements.convertToWorkspaceDuration = (Date.now() - convertToWorkspaceStartTime) / 1000;
    return true;
  }
}
const workspaceParentDialogOptions: vscode.OpenDialogOptions = {
  canSelectMany: false,
  openLabel: localize('selectWorkspaceParentFolder', 'Select workspace parent folder'),
  canSelectFiles: false,
  canSelectFolders: true,
};

export async function convertToWorkspace2(context: IActionContext): Promise<boolean> {
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
                const pathToValidate = message.data?.path;
                let isValid = false;
                try {
                  if (pathToValidate && typeof pathToValidate === 'string') {
                    const stats = fs.statSync(pathToValidate);
                    isValid = stats.isDirectory();
                  }
                } catch (_error) {
                  isValid = false;
                }

                panel.webview.postMessage({
                  command: ExtensionCommand.validatePath,
                  data: {
                    project: ProjectName.createWorkspaceStructure,
                    path: pathToValidate,
                    isValid: isValid,
                  },
                });
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

        // const workspaceWizard: AzureWizard<IFunctionWizardContext> = new AzureWizard(wizardContext, {
        //   title: localize('convertToWorkspace', 'Convert to workspace'),
        //   promptSteps: [new FolderListStep(), new WorkspaceNameStep(), new WorkspaceContentsStep()],
        //   executeSteps: [new OpenFolderStepCodeProject()],
        // });

        // await workspaceWizard.prompt();
        // await workspaceWizard.execute();

        // context.telemetry.properties.createContainingWorkspace = 'true';
        // window.showInformationMessage(localize('finishedConvertingWorkspace', 'Finished converting to workspace.'));
        // return true;
      }
      context.telemetry.properties.createContainingWorkspace = 'false';
      return false;
    }

    context.telemetry.properties.isWorkspace = 'true';
    return true;
  }
}
