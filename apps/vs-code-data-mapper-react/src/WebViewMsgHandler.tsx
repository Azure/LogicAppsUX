import {
  changeDataMapMetadata,
  changeMapDefinition,
  changeRuntimePort,
  changeSchemaList,
  changeSourceSchemaFilename,
  changeTargetSchemaFilename,
  changeUseExpandedFunctionCards,
  changeXsltContent,
  changeXsltFilename,
} from './state/DataMapDataLoader';
import type { AppDispatch } from './state/Store';
import type { MessageToWebview } from '@microsoft/logic-apps-data-mapper';
import { SchemaType } from '@microsoft/logic-apps-data-mapper';
import React, { createContext } from 'react';
import { useDispatch } from 'react-redux';
import type { WebviewApi } from 'vscode-webview';

const vscode: WebviewApi<unknown> = acquireVsCodeApi();
export const VSCodeContext = createContext(vscode);

interface WebViewMsgHandlerProps {
  children: React.ReactNode;
}

// To post messages TO VS Code, vscode.postMessage()
export const WebViewMsgHandler = ({ children }: WebViewMsgHandlerProps) => {
  const dispatch = useDispatch<AppDispatch>();

  // Handle (JSON) messages FROM VS Code
  window.addEventListener('message', (event: MessageEvent<MessageToWebview>) => {
    const msg = event.data;

    // NOTE: app.tsx handles all API calls (GET schemaTree, GET functions) as it's where DmApiService is initialized
    switch (msg.command) {
      case 'setRuntimePort':
        dispatch(changeRuntimePort(msg.data));
        break;
      case 'fetchSchema':
        if (msg.data.type === SchemaType.Source) {
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
        dispatch(changeDataMapMetadata(msg.data.metadata));
        break;
      case 'showAvailableSchemas':
        dispatch(changeSchemaList(msg.data));
        break;
      case 'setXsltData':
        dispatch(changeXsltFilename(msg.data.filename));
        dispatch(changeXsltContent(msg.data.fileContents));
        break;
      case 'getConfigurationSetting':
        dispatch(changeUseExpandedFunctionCards(msg.data));
        break;
      default:
        console.warn(`Unexpected message received:`);
        console.warn(msg);
    }
  });

  return <VSCodeContext.Provider value={vscode}>{children}</VSCodeContext.Provider>;
};
