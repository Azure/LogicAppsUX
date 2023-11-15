import type {
  InjectValuesMessage,
  UpdateAccessTokenMessage,
  UpdateExportPathMessage,
  AddStatusMessage,
  SetFinalStatusMessage,
} from './run-service';
import { initializeDesigner } from './state/DesignerSlice';
import {
  initialize as initializeWorkflow,
  updateAccessToken,
  updateTargetDirectory,
  addStatus,
  setFinalStatus,
} from './state/WorkflowSlice';
import { initialize } from './state/projectSlice';
import type { AppDispatch } from './state/store';
import { ExtensionCommand } from '@microsoft/vscode-extension';
import useEventListener from '@use-it/event-listener';
import type { ReactNode } from 'react';
import React, { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import type { WebviewApi } from 'vscode-webview';

const vscode: WebviewApi<unknown> = acquireVsCodeApi();
export const VSCodeContext = React.createContext(vscode);

type MessageType = InjectValuesMessage | UpdateAccessTokenMessage | UpdateExportPathMessage | AddStatusMessage | SetFinalStatusMessage;

export const WebViewCommunication: React.FC<{ children: ReactNode }> = ({ children }) => {
  const dispatch: AppDispatch = useDispatch();
  useEventListener('message', (event: MessageEvent<MessageType>) => {
    const message = event.data; // The JSON data our extension sent
    switch (message.command) {
      case ExtensionCommand.initialize_frame:
        dispatch(initialize(message.data.project));
        if (message.data.project === 'dataMap') {
          // nothing. dataMap doesn't have initialize actions
        } else if (message.data.project === 'designer') {
          dispatch(initializeDesigner(message.data));
        } else {
          // TODO - Elaina : regular ones. maybe we want to take our initialized / projectName from this slice.
          dispatch(initializeWorkflow(message.data));
        }
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
