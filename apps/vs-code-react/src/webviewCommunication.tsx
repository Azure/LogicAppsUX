import type { AppDispatch } from './state/store';
import type { InitializePayload } from './state/vscodeSlice';
import { initialize, updateAccessToken } from './state/vscodeSlice';
import useEventListener from '@use-it/event-listener';
import React, { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import type { WebviewApi } from 'vscode-webview';

interface InjectValuesMessage {
  command: 'initialize-frame';
  data: InitializePayload;
}

interface UpdateAccessTokenMessage {
  command: 'update-access-token';
  data: {
    accessToken?: string;
  };
}
const vscode: WebviewApi<unknown> = acquireVsCodeApi();
export const VSCodeContext = React.createContext(vscode);

type MessageType = InjectValuesMessage | UpdateAccessTokenMessage;

export const WebViewCommunication: React.FC = ({ children }) => {
  const dispatch: AppDispatch = useDispatch();
  useEventListener('message', (event: MessageEvent<MessageType>) => {
    const message = event.data; // The JSON data our extension sent
    switch (message.command) {
      case 'initialize-frame':
        dispatch(initialize(message.data));
        break;
      case 'update-access-token':
        dispatch(updateAccessToken(message.data.accessToken));
        break;
      default:
        throw new Error('Unknown post message recieved');
    }
  });
  useEffect(() => {
    vscode.postMessage({
      command: 'initialize',
    });
  }, []);
  return <VSCodeContext.Provider value={vscode}>{children}</VSCodeContext.Provider>;
};
