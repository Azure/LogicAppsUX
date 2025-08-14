/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { ext } from '../../../../extensionVariables';
import { localize } from '../../../../localize';
import { cacheWebviewPanel, getAzureConnectorDetailsForLocalProject, removeWebviewPanelFromCache } from '../../../utils/codeless/common';
import type { IActionContext } from '@microsoft/vscode-azext-utils';
import type { AzureConnectorDetails, IDesignerPanelMetadata } from '@microsoft/vscode-extension-logic-apps';
import { ExtensionCommand, ProjectName, RouteName } from '@microsoft/vscode-extension-logic-apps';
import { OpenDesignerBase } from '../openDesigner/openDesignerBase';
import { startDesignTimeApi } from '../../../utils/codeless/startDesignTimeApi';
import { getConnectionsFromFile, getLogicAppProjectRoot } from '../../../utils/codeless/connection';
import path from 'path';
import { localSettingsFileName, managementApiPrefix, workflowAppApiVersion } from '../../../../constants';
import type { WebviewPanel } from 'vscode';
import { env, Uri, ViewColumn, window } from 'vscode';
import { getBundleVersionNumber } from '../../../utils/getDebugSymbolDll';
import { getLocalSettingsJson } from '../../../utils/appSettings/localSettings';
import { getArtifactsInLocalProject } from '../../../utils/codeless/artifacts';
import * as vscode from 'vscode';
import type { Connection } from '@microsoft/logic-apps-shared';

export default class OpenConnectionView extends OpenDesignerBase {
  private readonly workflowFilePath: string;
  private projectPath: string | undefined;
  private panelMetadata: IDesignerPanelMetadata;
  private readonly methodName: string;

  constructor(context: IActionContext, filePath: string, methodName: string) {
    const panelName: string = `Connection view - ${methodName}`;
    const panelGroupKey = ext.webViewKey.languageServer;
    super(context, '', panelName, workflowAppApiVersion, panelGroupKey, false, true, false, '');
    this.workflowFilePath = filePath;
    this.methodName = methodName;
  }

  public async createPanel(): Promise<void> {
    const existingPanel: WebviewPanel | undefined = this.getExistingPanel();

    if (existingPanel) {
      this.panel = existingPanel;
      if (!existingPanel.active) {
        existingPanel.reveal(ViewColumn.Beside);
        return;
      }
      return;
    }

    this.projectPath = await getLogicAppProjectRoot(this.context, this.workflowFilePath);
    if (!this.projectPath) {
      throw new Error(localize('FunctionRootFolderError', 'Unable to determine function project root folder.'));
    }

    await startDesignTimeApi(this.projectPath);

    if (!ext.designTimeInstances.has(this.projectPath)) {
      throw new Error(localize('designTimeNotRunning', `Design time is not running for project ${this.projectPath}.`));
    }
    const designTimePort = ext.designTimeInstances.get(this.projectPath).port;
    if (!designTimePort) {
      throw new Error(localize('designTimePortNotFound', 'Design time port not found.'));
    }
    this.baseUrl = `http://localhost:${designTimePort}${managementApiPrefix}`;
    this.workflowRuntimeBaseUrl = `http://localhost:${ext.workflowRuntimePort}${managementApiPrefix}`;

    this.panel = window.createWebviewPanel(
      this.panelGroupKey, // Key used to reference the panel
      this.panelName, // Title display in the tab
      ViewColumn.Beside, // Editor column to show the new webview panel in.
      this.getPanelOptions()
    );
    this.panel.iconPath = {
      light: Uri.file(path.join(ext.context.extensionPath, 'assets', 'light', 'workflow.svg')),
      dark: Uri.file(path.join(ext.context.extensionPath, 'assets', 'dark', 'workflow.svg')),
    };

    this.panelMetadata = await this._getDesignerPanelMetadata();
    const callbackUri: Uri = await (env as any).asExternalUri(
      Uri.parse(`${env.uriScheme}://ms-azuretools.vscode-azurelogicapps/authcomplete`)
    );
    this.context.telemetry.properties.extensionBundleVersion = this.panelMetadata.extensionBundleVersion;
    this.oauthRedirectUrl = callbackUri.toString(true);

    this.panel.webview.html = await this.getWebviewContent({
      connectionsData: this.panelMetadata.connectionsData,
      parametersData: this.panelMetadata.parametersData || {},
      localSettings: this.panelMetadata.localSettings,
      artifacts: this.panelMetadata.artifacts,
      azureDetails: this.panelMetadata.azureDetails,
      workflowDetails: this.panelMetadata.workflowDetails,
    });
    this.panelMetadata.mapArtifacts = this.mapArtifacts;
    this.panelMetadata.schemaArtifacts = this.schemaArtifacts;

    this.panel.webview.onDidReceiveMessage(async (message) => await this._handleWebviewMsg(message), ext.context.subscriptions);

    this.panel.onDidDispose(
      () => {
        removeWebviewPanelFromCache(this.panelGroupKey, this.panelName);
      },
      null,
      ext.context.subscriptions
    );

    cacheWebviewPanel(this.panelGroupKey, this.panelName, this.panel);
    ext.context.subscriptions.push(this.panel);
  }

  private async _handleWebviewMsg(msg: any) {
    switch (msg.command) {
      case ExtensionCommand.initialize: {
        this.sendMsgToWebview({
          command: ExtensionCommand.initialize_frame,
          data: {
            project: ProjectName.languageServer,
            route: RouteName.connectionView,
            panelMetadata: this.panelMetadata,
            connectionData: this.connectionData,
            baseUrl: this.baseUrl,
            apiHubServiceDetails: this.apiHubServiceDetails,
            isLocal: this.isLocal,
            apiVersion: this.apiVersion,
            oauthRedirectUrl: this.oauthRedirectUrl,
            hostVersion: ext.extensionVersion,
            workflowRuntimeBaseUrl: this.workflowRuntimeBaseUrl,
          },
        });
        break;
      }
      case ExtensionCommand.close_panel: {
        this.panel.dispose();
        break;
      }
      case ExtensionCommand.insert_connection: {
        insertFunctionCallAtLocation(this.methodName, msg.connection, { documentUri: this.workflowFilePath });
        this.panel.dispose();
        break;
      }
      default:
        break;
    }
  }

  private async _getDesignerPanelMetadata(): Promise<any> {
    const connectionsData: string = await getConnectionsFromFile(this.context, this.workflowFilePath);
    const projectPath: string | undefined = await getLogicAppProjectRoot(this.context, this.workflowFilePath);
    const artifacts = await getArtifactsInLocalProject(projectPath);
    const bundleVersionNumber = await getBundleVersionNumber();

    let localSettings: Record<string, string>;
    let azureDetails: AzureConnectorDetails;

    if (projectPath) {
      azureDetails = await getAzureConnectorDetailsForLocalProject(this.context, projectPath);
      localSettings = (await getLocalSettingsJson(this.context, path.join(projectPath, localSettingsFileName))).Values;
    } else {
      throw new Error(localize('FunctionRootFolderError', 'Unable to determine function project root folder.'));
    }

    return {
      panelId: this.panelName,
      appSettingNames: Object.keys(localSettings),
      connectionsData,
      localSettings,
      azureDetails,
      accessToken: azureDetails.accessToken,
      workflowName: this.workflowName,
      artifacts,
      schemaArtifacts: this.schemaArtifacts,
      mapArtifacts: this.mapArtifacts,
      extensionBundleVersion: bundleVersionNumber,
      workflowDetails: {},
    };
  }
}

// Helper function to update function parameters at specific location
function insertFunctionCallAtLocation(functionName: string, connection: Connection, insertionContext: { documentUri: string }) {
  console.log('insertFunctionCallAtLocation called with:', functionName, connection);

  // Find the document by URI
  const targetDocument = vscode.workspace.textDocuments.find((doc) => doc.uri.toString() === insertionContext.documentUri);

  if (!targetDocument) {
    console.log('Target document not found:', insertionContext.documentUri);
    vscode.window.showErrorMessage('Target document not found. Please ensure the file is still open.');
    return;
  }

  // // Open the document in an editor if it's not already active
  // vscode.window.showTextDocument(targetDocument).then(editor => {
  //     const targetLine = insertionContext.line;
  //     const lineText = editor.document.lineAt(targetLine).text;

  //     // biome-ignore lint/style/useTemplate: <explanation>
  //             console.log('Analyzing line', targetLine + ':', lineText);

  //     // Find the function call on this line, looking for the exact function name
  //     const functionCallRegex = new RegExp(`\\b${functionName}\\s*\\([^)]*\\)`, 'g');
  //     const match = functionCallRegex.exec(lineText);

  //     // Also try to find just the function name if there's no parentheses yet
  //     const functionNameRegex = new RegExp(`\\b${functionName}\\b`, 'g');
  //     const nameMatch = functionNameRegex.exec(lineText);

  //     if (match) {
  //         // Replace existing function call with updated parameters
  //         const startPos = new vscode.Position(targetLine, match.index);
  //         const endPos = new vscode.Position(targetLine, match.index + match[0].length);
  //         const updatedFunctionCall = `${functionName}(${parameters.join(', ')})`;

  //         console.log('Replacing existing function call:', match[0], '→', updatedFunctionCall);

  //         editor.edit(editBuilder => {
  //             editBuilder.replace(new vscode.Range(startPos, endPos), updatedFunctionCall);
  //         }).then(success => {
  //             if (success) {
  //                 console.log('Function parameters updated successfully');
  //                 // Position cursor after the updated function call
  //                 const newCursorPos = new vscode.Position(targetLine, match.index + updatedFunctionCall.length);
  //                 editor.selection = new vscode.Selection(newCursorPos, newCursorPos);
  //                 vscode.window.showInformationMessage(`Updated: ${updatedFunctionCall}`);
  //             } else {
  //                 console.log('Failed to update function parameters');
  //                 vscode.window.showErrorMessage('Failed to update function parameters');
  //             }
  //         });
  //     } else if (nameMatch) {
  //         // Found function name but no parentheses, add parameters after the function name
  //         const functionCall = `${functionName}(${parameters.join(', ')})`;
  //         const startPos = new vscode.Position(targetLine, nameMatch.index);
  //         const endPos = new vscode.Position(targetLine, nameMatch.index + nameMatch[0].length);

  //         console.log('Completing function name:', nameMatch[0], '→', functionCall);

  //         editor.edit(editBuilder => {
  //             editBuilder.replace(new vscode.Range(startPos, endPos), functionCall);
  //         }).then(success => {
  //             if (success) {
  //                 console.log('Function completed successfully');
  //                 // Position cursor after the completed function call
  //                 const newCursorPos = new vscode.Position(targetLine, nameMatch.index + functionCall.length);
  //                 editor.selection = new vscode.Selection(newCursorPos, newCursorPos);
  //                 vscode.window.showInformationMessage(`Completed: ${functionCall}`);
  //             } else {
  //                 console.log('Failed to complete function');
  //                 vscode.window.showErrorMessage('Failed to complete function call');
  //             }
  //         });
  //     } else {
  //         // No existing function call found, insert new one at the specified position
  //         const functionCall = `${functionName}(${parameters.join(', ')})`;
  //         const position = new vscode.Position(insertionContext.line, insertionContext.character);

  //         console.log('No existing function found, inserting new at line', targetLine, ':', functionCall);

  //         editor.edit(editBuilder => {
  //             editBuilder.insert(position, functionCall);
  //         }).then(success => {
  //             if (success) {
  //                 console.log('Function inserted successfully');
  //                 // Move cursor to end of inserted function
  //                 const newPosition = new vscode.Position(
  //                     insertionContext.line,
  //                     insertionContext.character + functionCall.length
  //                 );
  //                 editor.selection = new vscode.Selection(newPosition, newPosition);
  //                 vscode.window.showInformationMessage(`Inserted: ${functionCall}`);
  //             } else {
  //                 console.log('Failed to insert function');
  //                 vscode.window.showErrorMessage('Failed to insert function call');
  //             }
  //         });
  //     }
  // }, (error: any) => {
  //     console.log('Error opening document:', error);
  //     vscode.window.showErrorMessage('Failed to open target document');
  // });
}

export async function openLanguageServerConnectionView(
  context: IActionContext,
  filePath: string,
  methodName: string,
  _className?: string
): Promise<void> {
  const connectionViewObj: OpenConnectionView = new OpenConnectionView(context, filePath, methodName);
  await connectionViewObj.createPanel();
}
