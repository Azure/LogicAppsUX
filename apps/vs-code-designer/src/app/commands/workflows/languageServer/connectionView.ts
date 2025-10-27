/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { ext } from '../../../../extensionVariables';
import { localize } from '../../../../localize';
import { cacheWebviewPanel, getAzureConnectorDetailsForLocalProject, removeWebviewPanelFromCache } from '../../../utils/codeless/common';
import { callWithTelemetryAndErrorHandling, type IActionContext } from '@microsoft/vscode-azext-utils';
import type { AzureConnectorDetails, IDesignerPanelMetadata } from '@microsoft/vscode-extension-logic-apps';
import { ExtensionCommand, ProjectName, RouteName } from '@microsoft/vscode-extension-logic-apps';
import { OpenDesignerBase } from '../openDesigner/openDesignerBase';
import { startDesignTimeApi } from '../../../utils/codeless/startDesignTimeApi';
import {
  addConnectionData,
  getConnectionsAndSettingsToUpdate,
  getConnectionsFromFile,
  getLogicAppProjectRoot,
  saveConnectionReferences,
} from '../../../utils/codeless/connection';
import path from 'path';
import { localSettingsFileName, managementApiPrefix, workflowAppApiVersion } from '../../../../constants';
import type { WebviewPanel } from 'vscode';
import { env, Uri, ViewColumn, window } from 'vscode';
import { getLocalSettingsJson } from '../../../utils/appSettings/localSettings';
import { getArtifactsInLocalProject } from '../../../utils/codeless/artifacts';
import * as vscode from 'vscode';
import type { Connection } from '@microsoft/logic-apps-shared';
import { getBundleVersionNumber } from '../../../utils/bundleFeed';

type Range = {
  Start: {
    Line: number;
    Character: number;
  };
  End: {
    Line: number;
    Character: number;
  };
};

export default class OpenConnectionView extends OpenDesignerBase {
  private readonly workflowFilePath: string;
  private projectPath: string | undefined;
  private panelMetadata: IDesignerPanelMetadata;
  private readonly methodName: string;
  private readonly connectorName: string;
  private readonly range: Range;
  private readonly connectorType: string;
  private readonly currentConnectionId: string;

  constructor(
    context: IActionContext,
    filePath: string,
    methodName: string,
    connectorName: string,
    connectorType: string,
    range: Range,
    currentConnectionId: string
  ) {
    const panelName: string = `Connection view - ${connectorName} - ${methodName}`;
    const panelGroupKey = ext.webViewKey.languageServer;
    super(context, '', panelName, workflowAppApiVersion, panelGroupKey, false, true, false, '');
    this.workflowFilePath = filePath;
    this.methodName = methodName;
    this.range = range;
    this.connectorName = connectorName;
    this.connectorType = connectorType;
    this.currentConnectionId = currentConnectionId;
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

  private async _handleWebviewMsg(message: any) {
    switch (message.command) {
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
            apiVersion: this.apiVersion,
            oauthRedirectUrl: this.oauthRedirectUrl,
            hostVersion: ext.extensionVersion,
            workflowRuntimeBaseUrl: this.workflowRuntimeBaseUrl,
            connector: {
              name: this.connectorName,
              type: this.connectorType,
              currentConnectionId: this.currentConnectionId,
            },
          },
        });
        break;
      }
      case ExtensionCommand.close_panel: {
        this.panel.dispose();
        break;
      }
      case ExtensionCommand.insert_connection: {
        await callWithTelemetryAndErrorHandling('InsertConnectionView', async () => {
          const { connection, connectionReferences } = message;

          await this.saveConnection(
            this.methodName,
            connection,
            {
              documentUri: this.workflowFilePath,
              range: this.range,
            },
            connectionReferences,
            this.panelMetadata.azureDetails?.tenantId,
            this.panelMetadata.azureDetails?.workflowManagementBaseUrl
          );
          this.panel.dispose();
        });
        break;
      }
      case ExtensionCommand.openOauthLoginPopup: {
        await env.openExternal(message.url);
        break;
      }
      case ExtensionCommand.logTelemetry: {
        const eventName = message.data.name ?? message.data.area;
        ext.telemetryReporter.sendTelemetryEvent(eventName, { ...message.data });
        break;
      }
      case ExtensionCommand.addConnection: {
        await callWithTelemetryAndErrorHandling('AddConnectionFromDesigner', async (activateContext: IActionContext) => {
          await addConnectionData(activateContext, this.workflowFilePath, message.connectionAndSetting);
        });
        break;
      }
      default:
        break;
    }
  }

  private async saveConnection(
    functionName: string,
    connection: Connection,
    insertionContext: { documentUri: string; range: Range },
    connectionReferences: any,
    azureTenantId?: string,
    workflowBaseManagementUri?: string
  ) {
    const projectPath = await getLogicAppProjectRoot(this.context, this.workflowFilePath);
    const parametersFromDefinition = this.panelMetadata.parametersData || {};

    if (connectionReferences) {
      const connectionsAndSettingsToUpdate = await getConnectionsAndSettingsToUpdate(
        this.context,
        projectPath,
        connectionReferences,
        azureTenantId,
        workflowBaseManagementUri,
        parametersFromDefinition
      );

      await saveConnectionReferences(this.context, projectPath, connectionsAndSettingsToUpdate);
    }

    insertFunctionCallAtLocation(functionName, connection, insertionContext);
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
  insertionContext: { documentUri: string; range: Range }
) {
  // Find the document by URI
  const targetDocument = vscode.workspace.textDocuments.find((doc) => doc.uri.fsPath.toString() === insertionContext.documentUri);

  if (!targetDocument) {
    vscode.window.showErrorMessage('Target document not found. Please ensure the file is still open.');
    return;
  }
  // Check if the document is already visible in an active editor
  const visibleEditors = vscode.window.visibleTextEditors;

  // Check if the target document is already open in any visible editor
  const existingEditor = visibleEditors.find((editor) => editor.document.uri.fsPath === targetDocument.uri.fsPath);

  if (existingEditor) {
    // Document is already open, just focus on it
    vscode.window.showTextDocument(existingEditor.document, existingEditor.viewColumn, false).then(
      (editor) => {
        performTextReplacement(editor, connection, insertionContext);
        // Save the document after successful insertion
        existingEditor.document.save().then(
          () => {
            vscode.window.showInformationMessage('File saved successfully');
          },
          (saveError: any) => {
            const errorMessage =
              saveError instanceof Error ? saveError.message : typeof saveError === 'string' ? saveError : 'Unknown error';
            vscode.window.showWarningMessage(`Text inserted but failed to save file: ${errorMessage}`);
          }
        );
      },
      (error: any) => {
        const errorMessage = error instanceof Error ? error.message : typeof error === 'string' ? error : 'Unknown error';
        vscode.window.showErrorMessage(`Failed to open target document: ${errorMessage}`);
      }
    );
    return;
  }
}

const performTextReplacement = (
  editor: vscode.TextEditor,
  connection: Connection,
  insertionContext: { documentUri: string; range: Range }
) => {
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
        editBuilder.replace(rangeToReplace, `"${connection.name}"`);
      })
      .then((success) => {
        if (success) {
          // Position cursor after the inserted connection ID
          const newCursorPos = new vscode.Position(startLine, startChar + connection.name.length);
          editor.selection = new vscode.Selection(newCursorPos, newCursorPos);
        } else {
          vscode.window.showErrorMessage('Failed to insert connection ID');
        }
      });
  } else {
    vscode.window.showErrorMessage('No range provided for connection ID insertion');
  }
};

export async function openLanguageServerConnectionView(
  context: IActionContext,
  filePath: string,
  methodName: string,
  connectorName: string,
  connectorType: string,
  range: Range,
  currentConnectionId: string
): Promise<void> {
  const connectionViewObj: OpenConnectionView = new OpenConnectionView(
    context,
    filePath,
    methodName,
    connectorName,
    connectorType,
    range,
    currentConnectionId
  );
  await connectionViewObj.createPanel();
}
