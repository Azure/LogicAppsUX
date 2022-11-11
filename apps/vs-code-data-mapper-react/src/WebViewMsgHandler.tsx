import {
  changeMapDefinition,
  changeRuntimePort,
  changeSchemaList,
  changeSourceSchemaFilename,
  changeTargetSchemaFilename,
  changeXsltFilename,
} from './state/DataMapDataLoader';
import type { AppDispatch } from './state/Store';
import type { MapDefinitionEntry } from '@microsoft/logic-apps-data-mapper';
import React, { createContext } from 'react';
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

    // NOTE: app.tsx handles all API calls (GET schemaTree, GET functions) as it's where DmApiService is initialized
    switch (msg.command) {
      case 'setRuntimePort':
        dispatch(changeRuntimePort(msg.data));
        break;
      case 'fetchSchema':
        if (msg.data.type === 'source') {
          dispatch(changeSourceSchemaFilename(msg.data.fileName));
        } else {
          dispatch(changeTargetSchemaFilename(msg.data.fileName));
        }
        break;
      case 'loadDataMap':
        // NOTE: DataMapDataProvider ensures the functions and schemas are loaded before loading the mapDefinition connections
        dispatch(changeSourceSchemaFilename(msg.data.sourceSchemaFileName));
        dispatch(changeTargetSchemaFilename(msg.data.targetSchemaFileName));
        dispatch(changeMapDefinition(msg.data.mapDefinition));
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

  return <VSCodeContext.Provider value={vscode}>{children}</VSCodeContext.Provider>;
};
