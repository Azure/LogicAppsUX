import {
  changeMapDefinition,
  changeRuntimePort,
  changeSchemaList,
  changeSourceSchema,
  changeTargetSchema,
  changeXsltFilename,
} from './state/DataMapDataLoader';
import type { AppDispatch } from './state/Store';
import type { MapDefinitionEntry, Schema } from '@microsoft/logic-apps-data-mapper';
import { getSelectedSchema } from '@microsoft/logic-apps-data-mapper';
import React, { createContext, useCallback } from 'react';
import { useDispatch } from 'react-redux';
import type { WebviewApi } from 'vscode-webview';

type ReceivingMessageTypes =
  | { command: 'fetchSchema'; data: { fileName: string; type: 'source' | 'target' } }
  | { command: 'loadDataMap'; data: { mapDefinition: MapDefinitionEntry; sourceSchemaFileName: string; targetSchemaFileName: string } }
  | { command: 'showAvailableSchemas'; data: string[] }
  | { command: 'setXsltFilename'; data: string }
  | { command: 'setRuntimePort'; data: string };

const vscode: WebviewApi<unknown> = acquireVsCodeApi();
export const VSCodeContext = createContext(vscode);

// To post messages TO VS Code, vscode.postMessage()
export const WebViewMsgHandler: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const dispatch = useDispatch<AppDispatch>();

  // Handle (JSON) messages FROM VS Code
  window.addEventListener('message', (event: MessageEvent<ReceivingMessageTypes>) => {
    const msg = event.data;

    switch (msg.command) {
      case 'setRuntimePort':
        dispatch(changeRuntimePort(msg.data));
        break;
      case 'fetchSchema':
        getSelectedSchema(msg.data.fileName).then((schema) => {
          if (msg.data.type === 'source') {
            changeSourceSchemaCB(schema as Schema);
          } else {
            changeTargetSchemaCB(schema as Schema);
          }
        });
        break;
      case 'loadDataMap':
        Promise.all([getSelectedSchema(msg.data.sourceSchemaFileName), getSelectedSchema(msg.data.targetSchemaFileName)]).then((values) => {
          setSchemasBeforeSettingDataMap(values[0], values[1])
            .then(() => {
              dispatch(changeMapDefinition(msg.data.mapDefinition));
            })
            .catch((error) => {
              console.error(`Error loading data map:`);
              console.error(error);
            });
        });
        break;
      case 'showAvailableSchemas':
        dispatch(changeSchemaList(msg.data));
        break;
      case 'setXsltFilename':
        dispatch(changeXsltFilename(msg.data));
        break;
      default:
        console.warn(`Unexpected message received:`);
        console.warn(msg);
    }
  });

  const changeSourceSchemaCB = useCallback(
    (newSchema: Schema) => {
      dispatch(changeSourceSchema(newSchema));
    },
    [dispatch]
  );

  const changeTargetSchemaCB = useCallback(
    (newSchema: Schema) => {
      dispatch(changeTargetSchema(newSchema));
    },
    [dispatch]
  );

  const setSchemasBeforeSettingDataMap = async (newSourceSchema: Schema, newTargetSchema: Schema) => {
    changeSourceSchemaCB(newSourceSchema);
    changeTargetSchemaCB(newTargetSchema);
  };

  return <VSCodeContext.Provider value={vscode}>{children}</VSCodeContext.Provider>;
};
