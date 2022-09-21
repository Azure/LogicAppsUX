import { dataMapDataLoaderSlice } from './state/DataMapDataLoader';
import type { AppDispatch } from './state/Store';
import type { Schema, DataMap } from '@microsoft/logic-apps-data-mapper';
import { getSelectedSchema } from '@microsoft/logic-apps-data-mapper';
import React, { createContext, useCallback } from 'react';
import { useDispatch } from 'react-redux';
import type { WebviewApi } from 'vscode-webview';

type ReceivingMessageTypes =
  | { command: 'fetchSchema'; data: { fileName: string; type: 'input' | 'output' } }
  | { command: 'loadNewDataMap'; data: DataMap }
  | { command: 'loadDataMap'; data: { dataMap: DataMap; sourceSchemaFileName: string; targetSchemaFileName: string } }
  | { command: 'showAvailableSchemas'; data: string[] };

const vscode: WebviewApi<unknown> = acquireVsCodeApi();
export const VSCodeContext = createContext(vscode);

// To post messages TO VS Code, vscode.postMessage()
export const WebViewMsgHandler: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const dispatch = useDispatch<AppDispatch>();

  // Handle (JSON) messages FROM VS Code
  window.addEventListener('message', (event: MessageEvent<ReceivingMessageTypes>) => {
    const msg = event.data;

    switch (msg.command) {
      case 'fetchSchema':
        getSelectedSchema(msg.data.fileName).then((schema) => {
          if (msg.data.type === 'input') {
            changeSourceSchemaCB(schema as Schema);
          } else {
            changeTargetSchemaCB(schema as Schema);
          }
        });
        break;
      case 'loadNewDataMap':
        changeDataMapCB(msg.data);
        break;
      case 'loadDataMap':
        Promise.all([getSelectedSchema(msg.data.sourceSchemaFileName), getSelectedSchema(msg.data.targetSchemaFileName)]).then((values) => {
          setSchemasBeforeSettingDataMap(values[0], values[1]).then(() => {
            changeDataMapCB(msg.data.dataMap);
          });
        });
        break;
      case 'showAvailableSchemas':
        showAvailableSchemas(msg.data);
        break;
      default:
        console.error(`Unexpected message received: ${msg}`);
    }
  });

  const changeSourceSchemaCB = useCallback(
    (newSchema: Schema) => {
      dispatch(dataMapDataLoaderSlice.actions.changeSourceSchema(newSchema));
    },
    [dispatch]
  );

  const changeTargetSchemaCB = useCallback(
    (newSchema: Schema) => {
      dispatch(dataMapDataLoaderSlice.actions.changeTargetSchema(newSchema));
    },
    [dispatch]
  );

  const changeDataMapCB = useCallback(
    (newDataMap: DataMap) => {
      dispatch(dataMapDataLoaderSlice.actions.changeDataMap(newDataMap));
    },
    [dispatch]
  );

  const showAvailableSchemas = useCallback(
    (files: string[]) => {
      dispatch(dataMapDataLoaderSlice.actions.changeSchemaList(files));
    },
    [dispatch]
  );

  const setSchemasBeforeSettingDataMap = (newSourceSchema: Schema, newTargetSchema: Schema) => {
    changeSourceSchemaCB(newSourceSchema);
    changeTargetSchemaCB(newTargetSchema);

    return Promise.resolve();
  };

  return <VSCodeContext.Provider value={vscode}>{children}</VSCodeContext.Provider>;
};
