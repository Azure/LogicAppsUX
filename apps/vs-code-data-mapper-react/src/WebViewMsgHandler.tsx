import { schemaDataLoaderSlice } from './state/SchemaDataLoader';
import type { AppDispatch } from './state/Store';
import type { Schema, DataMap } from '@microsoft/logic-apps-data-mapper';
import React, { createContext, useCallback } from 'react';
import { useDispatch } from 'react-redux';
import type { WebviewApi } from 'vscode-webview';

// TODO: Figure out contract (of messages) between VSCode and DM app
type MessageType = { command: 'loadInputSchema' | 'loadOutputSchema'; data: Schema } | { command: 'loadDataMap'; data: DataMap };

const vscode: WebviewApi<unknown> = acquireVsCodeApi();
export const VSCodeContext = createContext(vscode);

// To post messages TO VS Code, vscode.postMessage()
export const WebViewMsgHandler: React.FC = ({ children }) => {
  const dispatch = useDispatch<AppDispatch>();

  // Handle (JSON) messages FROM VS Code
  window.addEventListener('message', (event: MessageEvent<MessageType>) => {
    const msg = event.data;

    switch (msg.command) {
      case 'loadInputSchema':
        changeInputSchemaCB(msg.data);
        break;
      case 'loadOutputSchema':
        changeOutputSchemaCB(msg.data);
        break;
      case 'loadDataMap':
        // TODO
        break;
      default:
        console.log(msg); // TESTING
    }
  });

  /* TODO: Examine DataMap format, see what we currently read in, and copy that example file/structure here to use
  const changeDataMapRscPathCB = useCallback(
    (newDataMap: Schema) => {
      dispatch(dataMapDataLoaderSlice.actions.changeResourcePath(newValue ?? ''));
      dispatch(loadDataMap());
    },
    [dispatch]
  );*/

  // TODO: abstract/combine what you can from these
  const changeInputSchemaCB = useCallback(
    (newSchema: Schema) => {
      dispatch(schemaDataLoaderSlice.actions.changeInputSchema(newSchema));
    },
    [dispatch]
  );

  const changeOutputSchemaCB = useCallback(
    (newSchema: Schema) => {
      dispatch(schemaDataLoaderSlice.actions.changeOutputSchema(newSchema));
    },
    [dispatch]
  );

  return <VSCodeContext.Provider value={vscode}>{children}</VSCodeContext.Provider>;
};
