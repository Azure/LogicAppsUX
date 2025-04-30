import { ConnectionsData } from "@microsoft/logic-apps-shared";
import type { AzureConnectorDetails, ExtensionCommand } from "@microsoft/vscode-extension-logic-apps";

export const webviewType = "connectionsWebview";

export type InitializeConnection = {
  // danielle move this to be shared by vscode-react
  connectionId: string;
};

type InitializeFrame = {
  project: string;
  connectionId: string;
  baseUrl: string;
  workflowRuntimeBaseUrl: string;
  connections: ConnectionsData;
  azureDetails: AzureConnectorDetails
};

export type MessageToCommandWebview =
  | {
      command: typeof ExtensionCommand.logTelemetry;
      data: any;
    }
  | {
      command: typeof ExtensionCommand.initializeConnectionFrame;
      data: InitializeFrame;
    }
  | {
      command: typeof ExtensionCommand.loadConnection;
      data: InitializeConnection;
    };

export type MessageToCommandVsix = {};
