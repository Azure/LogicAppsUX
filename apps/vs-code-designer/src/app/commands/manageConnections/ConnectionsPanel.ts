import { ext } from '../../../extensionVariables';
import { localize } from '../../../localize';
import { getWebViewHTML } from '../../utils/codeless/getWebViewHTML';
import type { MessageToVsix } from '@microsoft/vscode-extension-logic-apps';
import { ExtensionCommand, ProjectName } from '@microsoft/vscode-extension-logic-apps';
import type { WebviewPanel } from 'vscode';
import type { MessageToCommandWebview } from './constants';

export default class ConnectionsPanel {
  public panel: WebviewPanel;

  public connectionName: string;

  private telemetryPrefix = 'connections-vscode-extension';

  constructor(panel: WebviewPanel, connectionName: string) {
    this.panel = panel;
    this.connectionName = connectionName;

    this._handleWebviewMsg = this._handleWebviewMsg.bind(this);

    ext.context.subscriptions.push(panel);

    this._setWebviewHtml();

    // Handle messages from the webview (Data Mapper component)
    this.panel.webview.onDidReceiveMessage(this._handleWebviewMsg, undefined, ext.context.subscriptions);

    // this.sendMsgToWebview({
    //     command: ExtensionCommand.initialize_frame,
    //     data: { connectionId: connectionName, project: ProjectName.connections },
    //   });
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
          command: ExtensionCommand.initialize_frame,
          data: { connectionId: this.connectionName, project: ProjectName.connections },
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
