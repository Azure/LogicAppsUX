import useEventListener from '@use-it/event-listener';
import React, { createContext } from 'react';
import type { WebviewApi } from 'vscode-webview';

// TODO: Figure out contract (of messages) between VSCode and DM app
type MessageType = { command: any; data: any };

const vscode: WebviewApi<unknown> = acquireVsCodeApi();
export const VSCodeContext = createContext(vscode);

// To post messages TO VS Code, vscode.postMessage()
export const WebViewMsgHandler: React.FC = ({ children }) => {
  // Handle (JSON) messages FROM VS Code
  useEventListener('message', (event: MessageEvent<MessageType>) => {
    const msg = event.data;

    switch (msg.command) {
      case 'loadInputSchema':
        break;
      case 'loadOutputSchema':
        break;
      case 'loadDataMap':
        break; // TODO
      default:
        console.log(msg); // TESTING
    }
  });

  return <VSCodeContext.Provider value={vscode}>{children}</VSCodeContext.Provider>;
};
