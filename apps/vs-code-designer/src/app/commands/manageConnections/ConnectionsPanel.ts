import { ext } from "../../../extensionVariables";
import { localize } from "../../../localize";
import { getWebViewHTML } from "../../utils/codeless/getWebViewHTML";
import type {
  FileSystemConnectionInfo,
  MessageToVsix,
} from "@microsoft/vscode-extension-logic-apps";
import {
  ExtensionCommand,
  ProjectName,
} from "@microsoft/vscode-extension-logic-apps";
import { env, type WebviewPanel } from "vscode";
import type {
  CreateConnectionPanel,
  MessageToCommandVsix,
  MessageToCommandWebview,
} from "./constants";
import { managementApiPrefix } from "../../../constants";
import { addConnectionData, getConnectionsAndSettingsToUpdate, saveConnectionReferences } from "../../utils/codeless/connection";
import { exec } from "child_process";

export default class ConnectionsPanel {
  public panel: WebviewPanel;
  private baseUrl: string;
  private workflowRuntimeBaseUrl: string;
  private createConnectionsPanel: CreateConnectionPanel;
  public connectionName: string;
  public connectionUri: string;

  private telemetryPrefix = "connections-vscode-extension";

  constructor(
    panel: WebviewPanel,
    createConnectionsPanel: CreateConnectionPanel
  ) {
    this.panel = panel;
    this.connectionName = createConnectionsPanel.connectionId;
    this.createConnectionsPanel = createConnectionsPanel;

    this.baseUrl = `http://localhost:${ext.designTimePort}${managementApiPrefix}`;
    this.workflowRuntimeBaseUrl = `http://localhost:${ext.workflowRuntimePort}${managementApiPrefix}`;

    this._handleWebviewMsg = this._handleWebviewMsg.bind(this);

    this.connectionUri = this.connectionName;  `/subscriptions/${this.createConnectionsPanel.azureDetails.subscriptionId}/providers/Microsoft.Web/locations/${this.createConnectionsPanel.azureDetails.location}}/managedApis/${this.connectionName}`;
    // this.connectionName; 

    ext.context.subscriptions.push(panel);

    this._setWebviewHtml();

    // Handle messages from the webview (Data Mapper component)
    this.panel.webview.onDidReceiveMessage(
      this._handleWebviewMsg,
      undefined,
      ext.context.subscriptions
    );
  }

  private async _setWebviewHtml() {
    this.panel.webview.html = await getWebViewHTML("vs-code-react", this.panel);
  }

  public sendMsgToWebview(msg: MessageToCommandWebview | any) {
    this.panel.webview.postMessage(msg);
  }

  private async _handleWebviewMsg(msg: MessageToVsix | any) {
    switch (msg.command) {
      case ExtensionCommand.initialize: {
        this.sendMsgToWebview({
          command: ExtensionCommand.initializeConnectionFrame,
          data: {
            connectionId: this.connectionUri,
            project: ProjectName.connections,
            baseUrl: this.baseUrl,
            workflowRuntimeBaseUrl: this.workflowRuntimeBaseUrl,
            connections: this.createConnectionsPanel.connectionsData,
            azureDetails: this.createConnectionsPanel.azureDetails,
            apiHubServiceDetails:
              this.createConnectionsPanel.apiHubServiceDetails,
            oauthRedirectUrl: this.createConnectionsPanel.oauthRedirectUrl,
            panelId: this.createConnectionsPanel.panelId,
          },
        });
        break;
      }
      case ExtensionCommand.addConnection: {
        await addConnectionData(
          this.createConnectionsPanel.context,
          this.createConnectionsPanel.projectPath,
          msg.connectionAndSetting
        );
        break;
      }
      case ExtensionCommand.createFileSystemConnection: {
        {
          const connectionName = msg.connectionName;
          const { connection, errorMessage } =
            await this.createFileSystemConnection(msg.connectionInfo);
          this.sendMsgToWebview({
            command: ExtensionCommand.completeFileSystemConnection,
            data: {
              connectionName,
              connection,
              errorMessage,
            },
          });
        }
        break;
      }
      case ExtensionCommand.logTelemetry: {
        const eventName = `${this.telemetryPrefix}/${
          msg.data.name ?? msg.data.area
        }`;
        ext.telemetryReporter.sendTelemetryEvent(eventName, { ...msg.data });
        break;
      }
      case ExtensionCommand.openOauthLoginPopup: {
        await env.openExternal(msg.url);
        break;
      }
      case ExtensionCommand.saveConnection: {
        if (msg.data.connectionReferences) {
          const connectionsAndSettingsToUpdate = await getConnectionsAndSettingsToUpdate(
            this.createConnectionsPanel.context,
            this.createConnectionsPanel.projectPath,
            msg.data.connectionReferences,
            this.createConnectionsPanel.azureDetails.tenantId,
            this.createConnectionsPanel.azureDetails.workflowManagementBaseUrl,
            {}
          );

          await saveConnectionReferences(this.createConnectionsPanel.context, this.createConnectionsPanel.projectPath, connectionsAndSettingsToUpdate);
        }
        break;
      }
    }
  }

  private createFileSystemConnection = (
    connectionInfo: FileSystemConnectionInfo
  ): Promise<any> => {
    // danielle this is duplicate code
    const rootFolder = connectionInfo.connectionParameters?.["rootFolder"];
    const username = connectionInfo.connectionParameters?.["username"];
    const password = connectionInfo.connectionParameters?.["password"];

    return new Promise((resolve) => {
      exec(`net use ${rootFolder} ${password} /user:${username}`, (error) => {
        if (error) {
          resolve({ errorMessage: JSON.stringify(error.message) });
        }
        resolve({
          connection: {
            ...connectionInfo,
            connectionParameters: { mountPath: rootFolder },
          },
        });
      });
    });
  };
}
