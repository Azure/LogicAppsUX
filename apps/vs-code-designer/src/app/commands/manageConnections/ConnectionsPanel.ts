import { ext } from '../../../extensionVariables';
import { localize } from '../../../localize';
import { getWebViewHTML } from '../../utils/codeless/getWebViewHTML';
import type { AzureConnectorDetails, MessageToVsix } from '@microsoft/vscode-extension-logic-apps';
import { ExtensionCommand, ProjectName } from '@microsoft/vscode-extension-logic-apps';
import type { WebviewPanel } from 'vscode';
import type { MessageToCommandWebview } from './constants';
import { managementApiPrefix } from '../../../constants';
import type { ConnectionsData } from '@microsoft/logic-apps-shared';

export default class ConnectionsPanel {
  public panel: WebviewPanel;
  private baseUrl: string;
  private workflowRuntimeBaseUrl: string;
  private existingConnections: ConnectionsData;
  private azureDetails: AzureConnectorDetails;

  public connectionName: string;

  private telemetryPrefix = 'connections-vscode-extension';

  constructor(panel: WebviewPanel, connectionName: string, connectionData: ConnectionsData, azureDetails: AzureConnectorDetails) {
    this.panel = panel;
    this.connectionName = connectionName;
    this.existingConnections = connectionData;
    this.azureDetails = azureDetails;
   
    this.baseUrl = `http://localhost:${ext.designTimePort}${managementApiPrefix}`;
    this.workflowRuntimeBaseUrl = `http://localhost:${ext.workflowRuntimePort}${managementApiPrefix}`;
    
    this._handleWebviewMsg = this._handleWebviewMsg.bind(this);

    ext.context.subscriptions.push(panel);

    this._setWebviewHtml();

    // Handle messages from the webview (Data Mapper component)
    this.panel.webview.onDidReceiveMessage(this._handleWebviewMsg, undefined, ext.context.subscriptions);

  }

  private async _setWebviewHtml() {
    this.panel.webview.html = await getWebViewHTML('vs-code-react', this.panel);
  }

  public sendMsgToWebview(msg: MessageToCommandWebview) {
    this.panel.webview.postMessage(msg);
  }

  private _handleWebviewMsg(msg: MessageToVsix) {
    switch (msg.command) {
      case ExtensionCommand.initialize: {
        this.sendMsgToWebview({
          command: ExtensionCommand.initializeConnectionFrame,
          data: { connectionId: this.connectionName, project: ProjectName.connections,
            baseUrl: this.baseUrl,
            workflowRuntimeBaseUrl: this.workflowRuntimeBaseUrl,
            connections: this.existingConnections,
            azureDetails: this.azureDetails,
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
        ext.showError(localize('WebviewRscLoadError', `Error loading Data Mapper resource: "{0}"`, msg.data));
        break;
      }
      //   case ExtensionCommand.addSchemaFromFile: {
      //     this.addSchemaFromFile(msg.data);
      //     break;
      //   }
      case ExtensionCommand.logTelemetry: {
        const eventName = `${this.telemetryPrefix}/${msg.data.name ?? msg.data.area}`;
        ext.telemetryReporter.sendTelemetryEvent(eventName, { ...msg.data });
        break;
      }
    }
  }
}
