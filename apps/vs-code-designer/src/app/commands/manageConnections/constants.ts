import type { ConnectionsData, ConnectionType } from '@microsoft/logic-apps-shared';
import type { IActionContext } from '@microsoft/vscode-azext-utils';
import type { AzureConnectorDetails, ExtensionCommand } from '@microsoft/vscode-extension-logic-apps';

export type InitializeConnection = {
  // danielle move this to be shared by vscode-react
  connectionId: string;
};

type OauthLogin = {
  url: string;
};

type InitializeFrame = {
  project: string;
  connectionId: string;
  baseUrl: string;
  workflowRuntimeBaseUrl: string;
  connections: ConnectionsData;
  azureDetails: AzureConnectorDetails;
  apiHubServiceDetails: Record<string, any>;
  oauthRedirectUrl: string;
  panelId: string;
};

export interface CreateConnectionPanel {
  connectionId: string;
  connectionType: ConnectionType;
  connectionsData: ConnectionsData;
  azureDetails: AzureConnectorDetails;
  apiHubServiceDetails: Record<string, any>;
  oauthRedirectUrl: string;
  panelId: string;
  context: IActionContext;
  projectPath: string;
}

export type MessageToCommandVsix = {
  command: typeof ExtensionCommand.openOauthLoginPopup;
  data: OauthLogin;
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
    }
  | {
      command: typeof ExtensionCommand.openOauthLoginPopup;
      data: OauthLogin;
    };
