import { dataMapDataLoaderSlice } from './state/DataMapDataLoader';
import { schemaDataLoaderSlice } from './state/SchemaDataLoader';
import type { AppDispatch } from './state/Store';
import type { Schema, DataMap } from '@microsoft/logic-apps-data-mapper';
import React, { createContext, useCallback } from 'react';
import { useDispatch } from 'react-redux';
import type { WebviewApi } from 'vscode-webview';

type ReceivingMessageTypes = { command: 'loadInputSchema' | 'loadOutputSchema'; data: Schema } | { command: 'loadDataMap'; data: DataMap };

const vscode: WebviewApi<unknown> = acquireVsCodeApi();
export const VSCodeContext = createContext(vscode);

// To post messages TO VS Code, vscode.postMessage()
export const WebViewMsgHandler: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const dispatch = useDispatch<AppDispatch>();

  // Handle (JSON) messages FROM VS Code
  window.addEventListener('message', (event: MessageEvent<ReceivingMessageTypes>) => {
    const msg = event.data;

    switch (msg.command) {
      case 'loadInputSchema':
        changeInputSchemaCB(msg.data);
        break;
      case 'loadOutputSchema':
        changeOutputSchemaCB(msg.data);
        break;
      case 'loadDataMap':
        changeDataMapCB(msg.data);
        break;
      default:
        console.error(`Unexpected message received: ${msg}`);
    }
  });

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

  const changeDataMapCB = useCallback(
    (newDataMap: DataMap) => {
      dispatch(dataMapDataLoaderSlice.actions.changeDataMap(newDataMap));
    },
    [dispatch]
  );

  return <VSCodeContext.Provider value={vscode}>{children}</VSCodeContext.Provider>;
};
