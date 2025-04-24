import type { ExtensionCommand } from '@microsoft/vscode-extension-logic-apps';

export const webviewType = 'dataMapperWebview';

export type InitializeConnection = {
  // danielle move this to be shared by vscode-react
  connectionId: string;
};

type InitializeFrame = { project: string; connectionId: string };

export type MessageToCommandWebview =
  | {
      command: typeof ExtensionCommand.logTelemetry;
      data: any;
    }
  | { command: typeof ExtensionCommand.initialize_frame; data: InitializeFrame }
  | { command: typeof ExtensionCommand.loadConnection; data: InitializeConnection };

export type MessageToCommandVsix = {};
