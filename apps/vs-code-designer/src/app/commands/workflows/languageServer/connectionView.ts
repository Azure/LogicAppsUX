/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { ext } from '../../../../extensionVariables';
import { localize } from '../../../../localize';
import { cacheWebviewPanel, getAzureConnectorDetailsForLocalProject, removeWebviewPanelFromCache } from '../../../utils/codeless/common';
import { callWithTelemetryAndErrorHandling, type IActionContext } from '@microsoft/vscode-azext-utils';
import type { IDesignerPanelMetadata } from '@microsoft/vscode-extension-logic-apps';
import { ExtensionCommand, ProjectName, RouteName } from '@microsoft/vscode-extension-logic-apps';
import { OpenDesignerBase } from '../openDesigner/openDesignerBase';
import { startDesignTimeApi } from '../../../utils/codeless/startDesignTimeApi';
import {
  addConnectionData,
  getConnectionsAndSettingsToUpdate,
  getConnectionsFromFile,
  getLogicAppProjectRoot,
  getParametersFromFile,
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
import { saveWorkflowParameter } from '../../../utils/codeless/parameter';

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

    // Create webview panel first for immediate visual feedback
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

    // Show loading state in webview
    this.panel.webview.html = this.getLoadingHtml();

    // Start design time API and load metadata in parallel
    const [_, panelMetadata] = await Promise.all([startDesignTimeApi(this.projectPath), this._getDesignerPanelMetadata()]);

    if (!ext.designTimeInstances.has(this.projectPath)) {
      throw new Error(localize('designTimeNotRunning', `Design time is not running for project ${this.projectPath}.`));
    }
    const designTimePort = ext.designTimeInstances.get(this.projectPath).port;
    if (!designTimePort) {
      throw new Error(localize('designTimePortNotFound', 'Design time port not found.'));
    }
    this.baseUrl = `http://localhost:${designTimePort}${managementApiPrefix}`;
    this.workflowRuntimeBaseUrl = `http://localhost:${ext.workflowRuntimePort}${managementApiPrefix}`;

    this.panelMetadata = panelMetadata;

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

  private getLoadingHtml(): string {
    return `<!DOCTYPE html>
    <html>
    <head>
        <style>
            body { 
                display: flex; 
                justify-content: center; 
                align-items: center; 
                height: 100vh; 
                margin: 0;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                color: var(--vscode-foreground);
            }
            .loader {
                text-align: center;
            }
            .spinner {
                border: 3px solid var(--vscode-editor-background);
                border-top: 3px solid var(--vscode-progressBar-background);
                border-radius: 50%;
                width: 40px;
                height: 40px;
                animation: spin 1s linear infinite;
                margin: 0 auto 20px;
            }
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
        </style>
    </head>
    <body>
        <div class="loader">
            <div class="spinner"></div>
            <div>Loading connection view...</div>
        </div>
    </body>
    </html>`;
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

    // Get the connection key from connections.json immediately for faster insertion
    const connectionKey = await this.getConnectionKeyFromConnectionsJson(projectPath, connection.name);

    // Insert the connection into the code FIRST for immediate user feedback
    insertFunctionCallAtLocation(functionName, connection, insertionContext, connectionKey);

    // Process connection references asynchronously (don't block the UI)
    const parametersFromDefinition = {} as any;

    if (connectionReferences) {
      // Process connection references in the background
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

    if (parametersFromDefinition) {
      delete parametersFromDefinition.$connections;
      for (const parameterKey of Object.keys(parametersFromDefinition)) {
        const parameter = parametersFromDefinition[parameterKey];
        parameter.value = parameter.value ?? parameter?.defaultValue;
        delete parameter.defaultValue;
      }
      await this.mergeJsonParameters(this.workflowFilePath, parametersFromDefinition);
      await saveWorkflowParameter(this.context, this.workflowFilePath, parametersFromDefinition);
    }
  }

  /**
   * Merges parameters from JSON.
   * @param filePath The file path of the parameters JSON file.
   * @param definitionParameters The parameters from the designer.
   * @param panelParameterRecord The parameters from the panel
   * @returns parameters from JSON file and designer.
   */
  private async mergeJsonParameters(filePath: string, definitionParameters: any): Promise<void> {
    const jsonParameters = await getParametersFromFile(this.context, filePath);

    Object.entries(jsonParameters).forEach(([key, parameter]) => {
      if (!definitionParameters[key]) {
        definitionParameters[key] = parameter;
      }
    });
  }

  private async _getDesignerPanelMetadata(): Promise<any> {
    const projectPath: string | undefined = await getLogicAppProjectRoot(this.context, this.workflowFilePath);

    if (!projectPath) {
      throw new Error(localize('FunctionRootFolderError', 'Unable to determine function project root folder.'));
    }

    // Critical data needed immediately for UI rendering
    const criticalDataPromises = [
      getConnectionsFromFile(this.context, this.workflowFilePath),
      getParametersFromFile(this.context, this.workflowFilePath),
      getLocalSettingsJson(this.context, path.join(projectPath, localSettingsFileName)).then((result) => result.Values),
    ];

    // Less critical data that can load slightly later
    const deferredDataPromises = [
      getArtifactsInLocalProject(projectPath),
      getBundleVersionNumber(),
      getAzureConnectorDetailsForLocalProject(this.context, projectPath),
    ];

    // Load critical data first
    const [connectionsData, parametersData, localSettings] = await Promise.all(criticalDataPromises);

    // Continue loading deferred data in background
    const [artifacts, bundleVersionNumber, azureDetails] = await Promise.all(deferredDataPromises);

    const metadata = {
      panelId: this.panelName,
      appSettingNames: Object.keys(localSettings),
      connectionsData,
      localSettings,
      azureDetails,
      accessToken: azureDetails.accessToken,
      workflowName: this.workflowName,
      artifacts,
      parametersData,
      schemaArtifacts: this.schemaArtifacts,
      mapArtifacts: this.mapArtifacts,
      extensionBundleVersion: bundleVersionNumber,
      workflowDetails: {},
    };

    return metadata;
  }

  /**
   * Finds the key in connections.json that references the given connection name.
   * @param projectPath The project path
   * @param connectionName The connection name to find
   * @returns The key from connections.json that references this connection, or the connection name if not found
   */
  private async getConnectionKeyFromConnectionsJson(projectPath: string | undefined, connectionName: string): Promise<string> {
    if (!projectPath) {
      return connectionName;
    }

    try {
      const connectionsJsonString = await getConnectionsFromFile(this.context, this.workflowFilePath);
      if (!connectionsJsonString) {
        return connectionName;
      }

      const connectionsJson = JSON.parse(connectionsJsonString);
      const managedApiConnections = connectionsJson?.managedApiConnections || {};

      // Find the key where the connection.name matches the provided connectionName
      for (const [key, connectionData] of Object.entries(managedApiConnections)) {
        const connection = connectionData as any;
        // Check if connection.connection.id ends with the connectionName after the last '/'
        if (connection?.connection?.id) {
          const idParts = connection.connection.id.split('/');
          const lastPart = idParts[idParts.length - 1];
          if (lastPart === connectionName) {
            return key;
          }
        }
      }

      // If not found, return the connection name as fallback
      return connectionName;
    } catch {
      // If parsing fails, return the connection name as fallback
      return connectionName;
    }
  }
}

// Helper function to update function parameters at specific location
function insertFunctionCallAtLocation(
  _functionName: string,
  connection: Connection,
  insertionContext: { documentUri: string; range: Range },
  connectionKey?: string
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
        performTextReplacement(editor, connection, insertionContext, connectionKey);
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
  insertionContext: { documentUri: string; range: Range },
  connectionKey?: string
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

    // Use the connection key from connections.json if available, otherwise fall back to connection.name
    const connectionIdToInsert = connectionKey || connection.name;

    // Use the normalized range to replace the text with the connection key
    const startPos = new vscode.Position(startLine, startChar);
    const endPos = new vscode.Position(endLine, endChar);
    const rangeToReplace = new vscode.Range(startPos, endPos);

    editor
      .edit((editBuilder) => {
        editBuilder.replace(rangeToReplace, `"${connectionIdToInsert}"`);
      })
      .then((success) => {
        if (success) {
          // Position cursor after the inserted connection ID
          const newCursorPos = new vscode.Position(startLine, startChar + connectionIdToInsert.length);
          // const newCursorPos = new vscode.Position(startLine, startChar + connection.name.length);
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
