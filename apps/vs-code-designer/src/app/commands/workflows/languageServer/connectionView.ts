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

    this.panelMetadata.mapArtifacts = this.mapArtifacts;
    this.panelMetadata.schemaArtifacts = this.schemaArtifacts;

    // Register message handler BEFORE setting the React webview content.
    // The React app sends "initialize" immediately on boot — if the handler
    // isn't registered yet, the message is silently dropped and the UI stays
    // stuck on "Loading connection data..." forever.
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

    // Set the React content LAST — handler is ready to receive "initialize"
    this.panel.webview.html = await this.getWebviewContent({
      connectionsData: this.panelMetadata.connectionsData,
      parametersData: this.panelMetadata.parametersData || {},
      localSettings: this.panelMetadata.localSettings,
      artifacts: this.panelMetadata.artifacts,
      azureDetails: this.panelMetadata.azureDetails,
      workflowDetails: this.panelMetadata.workflowDetails,
    });
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
        // No-op: saveConnectionReferences in saveConnection handles managed API
        // connection writes. addConnectionData uses a React-generated key from
        // API Hub uniqueness checks that doesn't match the key saveConnectionReferences
        // generates, causing duplicate entries.
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

    // Process connection references FIRST so connections.json is written
    const parametersFromDefinition = {} as any;

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

    // NOW get the connection key from the just-written connections.json
    // This ensures the .cs file uses the same key that saveConnectionReferences generated
    const connectionKey = await this.getConnectionKeyFromConnectionsJson(projectPath, connection.name);

    const connectionId = connectionKey || connection.name;
    updateConnectionIdInSource(connectionId, insertionContext);

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

      for (const [key, connectionData] of Object.entries(managedApiConnections)) {
        const connection = connectionData as any;
        if (connection?.connection?.id) {
          const idParts = connection.connection.id.split('/');
          const lastPart = idParts[idParts.length - 1];
          if (lastPart === connectionName) {
            return key;
          }
        }
      }

      return connectionName;
    } catch {
      return connectionName;
    }
  }
}

/**
 * Updates the connection ID in the source file at the specified range with the new connection ID.
 * @param {string} connectionId - The new connection ID to insert into the source file.
 * @param {{ documentUri: string; range: Range }} insertionContext - The context containing the document URI and the range where the connection ID should be inserted.
 */
function updateConnectionIdInSource(connectionId: string, insertionContext: { documentUri: string; range: Range }) {
  const targetDocument = vscode.workspace.textDocuments.find((doc) => doc.uri.fsPath.toString() === insertionContext.documentUri);

  if (!targetDocument) {
    vscode.window.showErrorMessage('Target document not found. Please ensure the file is still open.');
    return;
  }

  const visibleEditors = vscode.window.visibleTextEditors;
  const targetEditor = visibleEditors.find((editor) => editor.document.uri.fsPath === targetDocument.uri.fsPath);

  if (targetEditor) {
    vscode.window.showTextDocument(targetEditor.document, targetEditor.viewColumn, false).then(
      (editor) => {
        const newText = `"${connectionId}"`;
        replaceText(editor, newText, insertionContext);

        targetEditor.document.save().then(
          () => {},
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
  }
}

/**
 * Replaces text in the editor at the specified range with the new text string.
 * @param {vscode.TextEditor} editor - The text editor instance where the replacement should occur.
 * @param {string} newText - The new text to insert at the specified range.
 * @param {{ documentUri: string; range: Range }} insertionContext - The context containing the document URI and the range where the text should be replaced.
 */
function replaceText(editor: vscode.TextEditor, newText: string, insertionContext: { documentUri: string; range: Range }) {
  const range = insertionContext.range;
  if (!range || !range.Start || !range.End) {
    vscode.window.showErrorMessage('Invalid range provided for connection ID insertion.');
    return;
  }

  const startLine = range.Start.Line;
  const startChar = range.Start.Character;
  const endLine = range.End.Line;
  const endChar = range.End.Character;

  const startPos = new vscode.Position(startLine, startChar);
  const endPos = new vscode.Position(endLine, endChar);
  const rangeToReplace = new vscode.Range(startPos, endPos);

  editor
    .edit((editBuilder) => {
      editBuilder.replace(rangeToReplace, newText);
    })
    .then((success) => {
      if (success) {
        const newCursorPos = new vscode.Position(startLine, startChar + newText.length);
        editor.selection = new vscode.Selection(newCursorPos, newCursorPos);
      } else {
        vscode.window.showErrorMessage('Failed to insert connection ID');
      }
    });
}

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
