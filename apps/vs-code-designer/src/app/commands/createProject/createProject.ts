/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { callWithTelemetryAndErrorHandling, type IActionContext } from '@microsoft/vscode-azext-utils';
import { ExtensionCommand, ProjectName } from '@microsoft/vscode-extension-logic-apps';
import { convertToWorkspace2 } from '../convertToWorkspace';
import { localize } from '../../../localize';
import { ext } from '../../../extensionVariables';
import { cacheWebviewPanel, removeWebviewPanelFromCache, tryGetWebviewPanel } from '../../utils/codeless/common';
import * as vscode from 'vscode';
import path from 'path';
import { getWebViewHTML } from '../../utils/codeless/getWebViewHTML';
import { createLogicAppProject } from '../createNewCodeProject/CodeProjectBase/CreateLogicAppProjects';
import { getLogicAppWithoutCustomCodeNew } from '../../utils/workspace';

// export async function createNewProjectFromCommand(
//   context: IActionContext,
//   folderPath?: string | undefined,
//   language?: ProjectLanguage,
//   version?: ProjectVersion,
//   openFolder = true,
//   templateId?: string,
//   functionName?: string,
//   functionSettings?: { [key: string]: string | undefined }
// ): Promise<void> {
//   if (await convertToWorkspace(context)) {
//     await createNewProjectInternalBase(
//       context,
//       {
//         folderPath: isString(folderPath) ? folderPath : undefined,
//         templateId,
//         functionName,
//         functionSettings,
//         suppressOpenFolder: !openFolder,
//         language,
//         version,
//       },
//       'createNewProject',
//       'Create new project',
//       [
//         new ExistingWorkspaceStep(),
//         new NewProjectLogicAppTypeStep(),
//         new TargetFrameworkStep(),
//         new LogicAppNameStep(),
//         new NewCodeProjectTypeStep(templateId, functionSettings, false),
//         new WorkspaceSettingsStep(),
//       ]
//     );
//   }
// }
const workspaceParentDialogOptions: vscode.OpenDialogOptions = {
  canSelectMany: false,
  openLabel: localize('selectWorkspaceParentFolder', 'Select workspace parent folder'),
  canSelectFiles: false,
  canSelectFolders: true,
};

export async function createNewProjectFromCommand(context: IActionContext): Promise<void> {
  // determine if in workspace, if not in workspace but there is a logic app project found,
  // promt to see if they want to move the project over to a logic app workspace
  // if they cancel do nothing, if they say yes then generate a webview to convert their project over to a logic app workspace.
  // Provide text that says logic app workspace created in new window
  // if we are in a workspace then we want to generate the webview for creating a new project
  let workspaceRootFolder = '';
  if (vscode.workspace.workspaceFile) {
    // Get the directory containing the .code-workspace file
    workspaceRootFolder = path.dirname(vscode.workspace.workspaceFile.fsPath);
    // need to get logic app in projects
  } else {
    // Fall back to the newly created workspace folder if not in a workspace
    // vscode.window.showErrorMessage(localize('notInWorkspace', 'Please open an existing logic app workspace before trying to add a new logic app project.'));
    await convertToWorkspace2(context);

    return;
  }

  const panelName: string = localize('createLogicAppProject', 'Create Project');
  const panelGroupKey = ext.webViewKey.createLogicApp;
  const apiVersion = '2021-03-01';
  const existingPanel: vscode.WebviewPanel | undefined = tryGetWebviewPanel(panelGroupKey, panelName);

  const workspaceFileContent = await vscode.workspace.fs.readFile(vscode.workspace.workspaceFile);
  const workspaceFileJson = JSON.parse(workspaceFileContent.toString());
  const logicAppsWithoutCustomCode = await getLogicAppWithoutCustomCodeNew(context);

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
    'CreateLogicAppProject',
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

  panel.webview.onDidReceiveMessage(async (message) => {
    switch (message.command) {
      case ExtensionCommand.initialize: {
        panel.webview.postMessage({
          command: ExtensionCommand.initialize_frame,
          data: {
            apiVersion,
            project: ProjectName.createLogicApp,
            hostVersion: ext.extensionVersion,
            workspaceFileJson: workspaceFileJson,
            logicAppsWithoutCustomCode: logicAppsWithoutCustomCode,
          },
        });
        break;
      }
      case ExtensionCommand.createLogicApp: {
        await callWithTelemetryAndErrorHandling('CreateLogicAppProject', async (activateContext: IActionContext) => {
          await createLogicAppProject(activateContext, message.data, workspaceRootFolder);
        });
        // Close the webview panel after successful creation
        panel.dispose();
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
