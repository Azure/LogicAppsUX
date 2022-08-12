import { dataMapDataLoaderSlice } from './state/DataMapDataLoader';
import type { AppDispatch } from './state/Store';
import useEventListener from '@use-it/event-listener';
import React, { createContext } from 'react';
import { useDispatch } from 'react-redux';
import type { WebviewApi } from 'vscode-webview';

// TODO: Figure out contract (of messages) between VSCode and DM app
type MessageType = { command: any; data: any };

const vscode: WebviewApi<unknown> = acquireVsCodeApi();
export const VSCodeContext = createContext(vscode);

// To post messages TO VS Code, vscode.postMessage()
export const WebViewMsgHandler: React.FC = ({ children }) => {
  const dispatch: AppDispatch = useDispatch();

  // Handle (JSON) messages FROM VS Code
  useEventListener('message', (event: MessageEvent<MessageType>) => {
    const msg = event.data;

    switch (msg.command) {
      // TODO: actually handle messages from VS Code (dispatch stuff to component's redux state)
      case 'test':
        dispatch(dataMapDataLoaderSlice.actions.changeResourcePath(''));
        break;
      default:
        console.log(msg.data);
    }
  });

  return <VSCodeContext.Provider value={vscode}>{children}</VSCodeContext.Provider>;
};
