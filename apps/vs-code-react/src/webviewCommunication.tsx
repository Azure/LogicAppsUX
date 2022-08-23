import type {
  InjectValuesMessage,
  UpdateAccessTokenMessage,
  UpdateExportPathMessage,
  AddStatusMessage,
  SetFinalStatusMessage,
} from './run-service';
import type { AppDispatch } from './state/store';
import { initialize, updateAccessToken, updateTargetDirectory, addStatus, setFinalStatus } from './state/vscodeSlice';
import { ExtensionCommand } from '@microsoft-logic-apps/utils';
import useEventListener from '@use-it/event-listener';
import React, { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import type { WebviewApi } from 'vscode-webview';

const vscode: WebviewApi<unknown> = acquireVsCodeApi();
export const VSCodeContext = React.createContext(vscode);

type MessageType = InjectValuesMessage | UpdateAccessTokenMessage | UpdateExportPathMessage | AddStatusMessage | SetFinalStatusMessage;

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
        dispatch(updateTargetDirectory(message.data));
        break;
      case ExtensionCommand.add_status:
        dispatch(addStatus(message.data));
        break;
      case ExtensionCommand.set_final_status:
        dispatch(setFinalStatus(message.data));
        break;
      default:
        throw new Error('Unknown post message received');
    }
  });
  useEffect(() => {
    vscode.postMessage({
      command: ExtensionCommand.initialize,
    });
  }, []);
  return <VSCodeContext.Provider value={vscode}>{children}</VSCodeContext.Provider>;
};
