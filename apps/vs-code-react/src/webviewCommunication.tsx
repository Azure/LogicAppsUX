import type { InjectValuesMessage, UpdateAccessTokenMessage, UpdateExportPathMessage } from './run-service';
import type { AppDispatch } from './state/store';
import { initialize, updateAccessToken, updateExportPath } from './state/vscodeSlice';
import { ExtensionCommand } from '@microsoft-logic-apps/utils';
import useEventListener from '@use-it/event-listener';
import React, { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import type { WebviewApi } from 'vscode-webview';

const vscode: WebviewApi<unknown> = acquireVsCodeApi();
export const VSCodeContext = React.createContext(vscode);

type MessageType = InjectValuesMessage | UpdateAccessTokenMessage | UpdateExportPathMessage;

export const WebViewCommunication: React.FC = ({ children }) => {
  const dispatch: AppDispatch = useDispatch();
  useEventListener('message', (event: MessageEvent<MessageType>) => {
    const message = event.data; // The JSON data our extension sent
    switch (message.command) {
      case ExtensionCommand.initialize_frame:
        dispatch(initialize(message.data));
        break;
      case ExtensionCommand.update_access_token:
        dispatch(updateAccessToken(message.data.accessToken));
        break;
      case ExtensionCommand.update_export_path:
        console.log('test,data', message.data);
        dispatch(updateExportPath(message.data));
        break;
      default:
        throw new Error('Unknown post message recieved');
    }
  });
  useEffect(() => {
    vscode.postMessage({
      command: ExtensionCommand.initialize,
    });
  }, []);
  return <VSCodeContext.Provider value={vscode}>{children}</VSCodeContext.Provider>;
};
