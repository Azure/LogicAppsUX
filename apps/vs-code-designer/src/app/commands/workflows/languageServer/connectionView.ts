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
  private readonly range?: any;

  constructor(context: IActionContext, filePath: string, methodName: string, range?: any) {
    const panelName: string = `Connection view - ${methodName}`;
    const panelGroupKey = ext.webViewKey.languageServer;
    super(context, '', panelName, workflowAppApiVersion, panelGroupKey, false, true, false, '');
    this.workflowFilePath = filePath;
    this.methodName = methodName;
    this.range = range;
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
        insertFunctionCallAtLocation(this.methodName, msg.connection, {
          documentUri: this.workflowFilePath,
          range: this.range,
        });
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
function insertFunctionCallAtLocation(
  _functionName: string,
  connection: Connection,
  insertionContext: { documentUri: string; range?: any }
) {
  // Find the document by URI
  const targetDocument = vscode.workspace.textDocuments.find((doc) => doc.uri.fsPath.toString() === insertionContext.documentUri);

  if (!targetDocument) {
    vscode.window.showErrorMessage('Target document not found. Please ensure the file is still open.');
    return;
  }

  // Open the document in an editor if it's not already active
  vscode.window.showTextDocument(targetDocument).then(
    (editor) => {
      if (insertionContext.range) {
        // Normalize the range format - handle both Start/Line and start/line formats
        const range = insertionContext.range;
        let startLine: number;
        let startChar: number;
        let endLine: number;
        let endChar: number;

        if (range.Start && range.End) {
          // Handle { Start: { Line: 55, Character: 85 }, End: { Line: 55, Character: 99 } } format
          startLine = range.Start.Line;
          startChar = range.Start.Character;
          endLine = range.End.Line;
          endChar = range.End.Character;
        } else if (range.start && range.end) {
          // Handle VS Code standard { start: { line: 55, character: 85 }, end: { line: 55, character: 99 } } format
          startLine = range.start.line;
          startChar = range.start.character;
          endLine = range.end.line;
          endChar = range.end.character;
        } else {
          vscode.window.showErrorMessage('Invalid range format provided');
          return;
        }

        // Use the normalized range to replace the text with the connection.id
        const startPos = new vscode.Position(startLine, startChar);
        const endPos = new vscode.Position(endLine, endChar);
        const rangeToReplace = new vscode.Range(startPos, endPos);

        editor
          .edit((editBuilder) => {
            editBuilder.replace(rangeToReplace, `"${connection.id}"`);
          })
          .then((success) => {
            if (success) {
              console.log('Connection ID inserted successfully');
              // Position cursor after the inserted connection ID
              const newCursorPos = new vscode.Position(startLine, startChar + connection.id.length);
              editor.selection = new vscode.Selection(newCursorPos, newCursorPos);
              vscode.window.showInformationMessage(`Inserted connection ID: ${connection.id}`);
            } else {
              vscode.window.showErrorMessage('Failed to insert connection ID');
            }
          });
      } else {
        vscode.window.showErrorMessage('No range provided for connection ID insertion');
      }
    },
    (error: any) => {
      const errorMessage = error instanceof Error ? error.message : typeof error === 'string' ? error : 'Unknown error';
      vscode.window.showErrorMessage(`Failed to open target document: ${errorMessage}`);
    }
  );
}

export async function openLanguageServerConnectionView(
  context: IActionContext,
  filePath: string,
  methodName: string,
  _className?: string,
  range?: any
): Promise<void> {
  const connectionViewObj: OpenConnectionView = new OpenConnectionView(context, filePath, methodName, range);
  await connectionViewObj.createPanel();
}
