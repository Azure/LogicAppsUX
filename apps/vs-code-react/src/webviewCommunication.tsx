import {
  type UpdateAccessTokenMessage,
  type UpdateExportPathMessage,
  type AddStatusMessage,
  type SetFinalStatusMessage,
  type FetchSchemaMessage,
  type LoadDataMapMessage,
  type ShowAvailableSchemasMessage,
  type GetAvailableCustomXsltPathsMessage,
  type SetXsltDataMessage,
  type SetRuntimePortMessage,
  type GetConfigurationSettingMessage,
  type InjectValuesMessage,
  type UpdatePanelMetadataMessage,
  type CompleteFileSystemConnectionMessage,
  type ReceiveCallbackMessage,
  ProjectName,
} from './run-service';
import {
  changeCustomXsltPathList,
  changeDataMapMetadata,
  changeMapDefinition,
  changeRuntimePort,
  changeSchemaList,
  changeSourceSchemaFilename,
  changeTargetSchemaFilename,
  changeUseExpandedFunctionCards,
  changeXsltContent,
  changeXsltFilename,
} from './state/DataMapSlice';
import { initializeDesigner, updateCallbackUrl, updateFileSystemConnection, updatePanelMetadata } from './state/DesignerSlice';
import type { InitializePayload } from './state/WorkflowSlice';
import { initializeWorkflow, updateAccessToken, updateTargetDirectory, addStatus, setFinalStatus } from './state/WorkflowSlice';
import { initialize } from './state/projectSlice';
import type { AppDispatch, RootState } from './state/store';
import { SchemaType } from '@microsoft/logic-apps-data-mapper';
import { ExtensionCommand } from '@microsoft/vscode-extension';
import useEventListener from '@use-it/event-listener';
import type { ReactNode } from 'react';
import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { WebviewApi } from 'vscode-webview';

const vscode: WebviewApi<unknown> = acquireVsCodeApi();
export const VSCodeContext = React.createContext(vscode);

type DesignerMessageType = ReceiveCallbackMessage | CompleteFileSystemConnectionMessage | UpdatePanelMetadataMessage;
type DataMapperMessageType =
  | FetchSchemaMessage
  | LoadDataMapMessage
  | ShowAvailableSchemasMessage
  | GetAvailableCustomXsltPathsMessage
  | SetXsltDataMessage
  | SetRuntimePortMessage
  | GetConfigurationSettingMessage;
type WorkflowMessageType = UpdateAccessTokenMessage | UpdateExportPathMessage | AddStatusMessage | SetFinalStatusMessage;
type MessageType = InjectValuesMessage | DesignerMessageType | DataMapperMessageType | WorkflowMessageType;

export const WebViewCommunication: React.FC<{ children: ReactNode }> = ({ children }) => {
  const dispatch: AppDispatch = useDispatch();
  const projectState = useSelector((state: RootState) => state.project);

  useEventListener('message', (event: MessageEvent<MessageType>) => {
    const message = event.data; // The JSON data our extension sent
    if (message.command === ExtensionCommand.initialize_frame) {
      dispatch(initialize(message.data.project));
    }

    switch (projectState?.project ?? message?.data?.project) {
      case ProjectName.designer:
        switch (message.command) {
          case ExtensionCommand.initialize_frame:
            dispatch(initializeDesigner(message.data));
            break;
          case ExtensionCommand.receiveCallback:
            dispatch(updateCallbackUrl(message.data));
            break;
          case ExtensionCommand.completeFileSystemConnection:
            dispatch(updateFileSystemConnection(message.data));
            break;
          case ExtensionCommand.update_panel_metadata:
            dispatch(updatePanelMetadata(message.data));
            break;
          default:
            throw new Error('Unknown post message received');
        }
        break;
      case ProjectName.dataMapper:
        switch (message.command) {
          case ExtensionCommand.setRuntimePort:
            dispatch(changeRuntimePort(message.data));
            break;
          case ExtensionCommand.fetchSchema:
            if (message.data.type === SchemaType.Source) {
              dispatch(changeSourceSchemaFilename(message.data.fileName));
            } else {
              dispatch(changeTargetSchemaFilename(message.data.fileName));
            }
            break;
          case ExtensionCommand.loadDataMap:
            // NOTE: DataMapDataProvider ensures the functions and schemas are loaded before loading the mapDefinition connections
            dispatch(changeSourceSchemaFilename(message.data.sourceSchemaFileName));
            dispatch(changeTargetSchemaFilename(message.data.targetSchemaFileName));
            dispatch(changeMapDefinition(message.data.mapDefinition));
            dispatch(changeDataMapMetadata(message.data.metadata));
            break;
          case ExtensionCommand.showAvailableSchemas:
            dispatch(changeSchemaList(message.data));
            break;
          case ExtensionCommand.getAvailableCustomXsltPaths:
            dispatch(changeCustomXsltPathList(message.data));
            break;
          case ExtensionCommand.setXsltData:
            dispatch(changeXsltFilename(message.data.filename));
            dispatch(changeXsltContent(message.data.fileContents));
            break;
          case ExtensionCommand.getConfigurationSetting:
            dispatch(changeUseExpandedFunctionCards(message.data));
            break;
          default:
            throw new Error('Unknown post message received');
        }
        break;
      default:
        switch (message.command) {
          case ExtensionCommand.initialize_frame:
            dispatch(initializeWorkflow(message.data as InitializePayload));
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
    }
  });
  useEffect(() => {
    console.log('---vscode.postmessage initialize');

    vscode.postMessage({
      command: ExtensionCommand.initialize,
    });
  }, []);
  return <VSCodeContext.Provider value={vscode}>{children}</VSCodeContext.Provider>;
};
