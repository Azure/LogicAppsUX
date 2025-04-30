import { ext } from "../../../extensionVariables";
import { localize } from "../../../localize";
import { getWebViewHTML } from "../../utils/codeless/getWebViewHTML";
import type {
  AzureConnectorDetails,
  MessageToVsix,
} from "@microsoft/vscode-extension-logic-apps";
import {
  ExtensionCommand,
  ProjectName,
} from "@microsoft/vscode-extension-logic-apps";
import type { WebviewPanel } from "vscode";
import type { CreateConnectionPanel, MessageToCommandWebview } from "./constants";
import { managementApiPrefix } from "../../../constants";
import type { ConnectionsData } from "@microsoft/logic-apps-shared";

export default class ConnectionsPanel {
  public panel: WebviewPanel;
  private baseUrl: string;
  private workflowRuntimeBaseUrl: string;
  private existingConnections: ConnectionsData;
  private azureDetails: AzureConnectorDetails;
  private apiHubServiceDetails: Record<string, any>;

  public connectionName: string;
  public connectionUri: string;

  private telemetryPrefix = "connections-vscode-extension";

  constructor(panel: WebviewPanel,
    createConnectionsPanel :CreateConnectionPanel
  ) {
    this.panel = panel;
    this.connectionName = createConnectionsPanel.connectionId;
    this.existingConnections = createConnectionsPanel.connectionsData;
    this.azureDetails = createConnectionsPanel.azureDetails;
    this.apiHubServiceDetails = createConnectionsPanel.apiHubServiceDetails;

    this.baseUrl = `http://localhost:${ext.designTimePort}${managementApiPrefix}`;
    this.workflowRuntimeBaseUrl = `http://localhost:${ext.workflowRuntimePort}${managementApiPrefix}`;

    this._handleWebviewMsg = this._handleWebviewMsg.bind(this);

    //this.connectionUri = `/subscriptions/${this.azureDetails.subscriptionId}/resourceGroups/${this.azureDetails.resourceGroupName}/providers/Microsoft.Web/connections/${this.connectionName}`
    this.connectionUri = `/subscriptions/${this.azureDetails.subscriptionId}/providers/Microsoft.Web/locations/${this.azureDetails.location}}/managedApis/${this.connectionName}`
//

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

  public sendMsgToWebview(msg: MessageToCommandWebview) {
    this.panel.webview.postMessage(msg);
  }

  private _handleWebviewMsg(msg: MessageToVsix) {
    switch (msg.command) {
      case ExtensionCommand.initialize: {
        this.sendMsgToWebview({
          command: ExtensionCommand.initializeConnectionFrame,
          data: {
            connectionId: this.connectionUri,
            project: ProjectName.connections,
            baseUrl: this.baseUrl,
            workflowRuntimeBaseUrl: this.workflowRuntimeBaseUrl,
            connections: this.existingConnections,
            azureDetails: this.azureDetails,
            apiHubServiceDetails: this.apiHubServiceDetails,
          },
        });
        break;
      }
      //   case ExtensionCommand.webviewLoaded: {
      //     // Send runtime port to webview
      //     this.sendMsgToWebview({
      //       command: ExtensionCommand.setRuntimePort,
      //       data: `${ext.designTimePort}`,
      //     });

      //     break;
      //   }
      case ExtensionCommand.webviewRscLoadError: {
        // Handle DM top-level errors (such as loading schemas added from file, or general function manifest fetching issues)
        ext.showError(
          localize(
            "WebviewRscLoadError",
            `Error loading Data Mapper resource: "{0}"`,
            msg.data
          )
        );
        break;
      }
      //   case ExtensionCommand.addSchemaFromFile: {
      //     this.addSchemaFromFile(msg.data);
      //     break;
      //   }
      case ExtensionCommand.logTelemetry: {
        const eventName = `${this.telemetryPrefix}/${
          msg.data.name ?? msg.data.area
        }`;
        ext.telemetryReporter.sendTelemetryEvent(eventName, { ...msg.data });
        break;
      }
    }
  }
}
