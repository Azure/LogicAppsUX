import { initializeDesigner } from './state/DesignerSlice';
import type { AppDispatch } from './state/Store';
import { ExtensionCommand } from '@microsoft-logic-apps/utils';
import useEventListener from '@use-it/event-listener';
import type { ReactNode } from 'react';
import React, { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import type { WebviewApi } from 'vscode-webview';

const vscode: WebviewApi<unknown> = acquireVsCodeApi();
export const VSCodeContext = React.createContext(vscode);

type MessageType = any;

export const WebViewCommunication: React.FC<{ children: ReactNode }> = ({ children }) => {
  const dispatch: AppDispatch = useDispatch();
  useEventListener('message', (event: MessageEvent<MessageType>) => {
    const message = event.data;
    switch (message.command) {
      case ExtensionCommand.initialize_frame:
        dispatch(initializeDesigner(message.data));
        break;
      default:
        break;
    }
  });
  useEffect(() => {
    vscode.postMessage({
      command: ExtensionCommand.initialize,
    });
  }, []);
  return <VSCodeContext.Provider value={vscode}>{children}</VSCodeContext.Provider>;
};
