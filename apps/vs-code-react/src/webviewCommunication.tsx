import { initializeConnection } from './state/ConnectionSlice';
import type {
  UpdateAccessTokenMessage,
  UpdateExportPathMessage,
  AddStatusMessage,
  SetFinalStatusMessage,
  FetchSchemaMessage,
  LoadDataMapMessage,
  ShowAvailableSchemasMessage,
  GetAvailableCustomXsltPathsMessage,
  SetXsltDataMessage,
  SetRuntimePortMessage,
  GetConfigurationSettingMessage,
  InjectValuesMessage,
  UpdatePanelMetadataMessage,
  CompleteFileSystemConnectionMessage,
  ReceiveCallbackMessage,
  GetDataMapperVersionMessage,
  ShowAvailableSchemasMessageV2,
  GetTestFeatureEnablementStatus,
  GetAvailableCustomXsltPathsMessageV2,
  LoadConnection,
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
import {
  changeCustomXsltPathList as changeCustomXsltPathListV2,
  changeDataMapFilename,
  changeDataMapMetadata as changeDataMapMetadataV2,
  changeIsTestDisabledForOS,
  changeMapDefinition as changeMapDefinitionV2,
  changeRuntimePort as changeRuntimePortV2,
  changeSchemaTreeList,
  changeSourceSchemaFilename as changeSourceSchemaFilenameV2,
  changeTargetSchemaFilename as changeTargetSchemaFilenameV2,
  changeUseExpandedFunctionCards as changeUseExpandedFunctionCardsV2,
  changeXsltContent as changeXsltContentV2,
  changeXsltFilename as changeXsltFilenameV2,
} from './state/DataMapSliceV2';
import { initializeDesigner, updateCallbackUrl, updateFileSystemConnection, updatePanelMetadata } from './state/DesignerSlice';
import type { InitializePayload } from './state/WorkflowSlice';
import { initializeWorkflow, updateAccessToken, updateTargetDirectory, addStatus, setFinalStatus } from './state/WorkflowSlice';
import { changeDataMapperVersion, initialize } from './state/projectSlice';
import type { AppDispatch, RootState } from './state/store';
import { SchemaType } from '@microsoft/logic-apps-shared';
import { ExtensionCommand, ProjectName } from '@microsoft/vscode-extension-logic-apps';
import useEventListener from '@use-it/event-listener';
import type { ReactNode } from 'react';
import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { WebviewApi } from 'vscode-webview';

const vscode: WebviewApi<unknown> = acquireVsCodeApi();
export const VSCodeContext = React.createContext(vscode);

type DesignerMessageType = ReceiveCallbackMessage | CompleteFileSystemConnectionMessage | UpdatePanelMetadataMessage;
type ConnectionsMessageType = LoadConnection;
type DataMapperMessageType =
  | FetchSchemaMessage
  | LoadDataMapMessage
  | ShowAvailableSchemasMessage
  | ShowAvailableSchemasMessageV2
  | GetAvailableCustomXsltPathsMessage
  | GetAvailableCustomXsltPathsMessageV2
  | SetXsltDataMessage
  | SetRuntimePortMessage
  | GetConfigurationSettingMessage
  | GetDataMapperVersionMessage
  | GetTestFeatureEnablementStatus;
type WorkflowMessageType = UpdateAccessTokenMessage | UpdateExportPathMessage | AddStatusMessage | SetFinalStatusMessage;
type MessageType = InjectValuesMessage | DesignerMessageType | DataMapperMessageType | WorkflowMessageType | ConnectionsMessageType;

export const WebViewCommunication: React.FC<{ children: ReactNode }> = ({ children }) => {
  const dispatch: AppDispatch = useDispatch();
  const projectState = useSelector((state: RootState) => state.project);
  const dataMapperVersion = projectState.dataMapperVersion;

  useEventListener('message', (event: MessageEvent<MessageType>) => {
    const message = event.data; // The JSON data our extension sent
    if (message.command === ExtensionCommand.initialize_frame) {
      dispatch(initialize(message.data.project));
      console.log('Project initialized:', message.data.project);
    }

    switch (projectState?.project ?? message?.data?.project) {
      case ProjectName.designer: {
        switch (message.command) {
          case ExtensionCommand.initialize_frame: {
            dispatch(initializeDesigner(message.data));
            break;
          }
          case ExtensionCommand.receiveCallback: {
            dispatch(updateCallbackUrl(message.data));
            break;
          }
          case ExtensionCommand.completeFileSystemConnection: {
            dispatch(updateFileSystemConnection(message.data));
            break;
          }
          case ExtensionCommand.update_panel_metadata: {
            dispatch(updatePanelMetadata(message.data));
            break;
          }
          default:
            throw new Error('Unknown post message received');
        }
        break;
      }
      case ProjectName.connections: {
        if (message.command === ExtensionCommand.loadConnection) {
          dispatch(initializeConnection(message.data.connectionId));
          console.log('Connections project initialized');
        }
        break;
      }
      case ProjectName.dataMapper: {
        if (message.command === ExtensionCommand.getDataMapperVersion) {
          dispatch(changeDataMapperVersion(message.data));
        } else if (dataMapperVersion === 2) {
          switch (message.command) {
            case ExtensionCommand.setRuntimePort: {
              dispatch(changeRuntimePortV2(message.data));
              break;
            }
            case ExtensionCommand.fetchSchema: {
              if (message.data.type === SchemaType.Source) {
                dispatch(changeSourceSchemaFilenameV2(message.data.fileName));
              } else {
                dispatch(changeTargetSchemaFilenameV2(message.data.fileName));
              }
              break;
            }
            case ExtensionCommand.loadDataMap: {
              // NOTE: DataMapDataProvider ensures the functions and schemas are loaded before loading the mapDefinition connections
              dispatch(changeSourceSchemaFilenameV2(message.data.sourceSchemaFileName));
              dispatch(changeTargetSchemaFilenameV2(message.data.targetSchemaFileName));
              dispatch(changeMapDefinitionV2(message.data.mapDefinition));
              dispatch(changeDataMapFilename(message.data.mapDefinitionName));
              dispatch(changeDataMapMetadataV2(message.data.metadata));
              break;
            }
            case ExtensionCommand.showAvailableSchemasV2: {
              dispatch(changeSchemaTreeList(message.data));
              break;
            }
            case ExtensionCommand.getAvailableCustomXsltPaths: {
              dispatch(changeCustomXsltPathList(message.data));
              break;
            }
            case ExtensionCommand.getAvailableCustomXsltPathsV2: {
              dispatch(changeCustomXsltPathListV2(message.data));
              break;
            }
            case ExtensionCommand.setXsltData: {
              dispatch(changeXsltFilenameV2(message.data.filename));
              dispatch(changeXsltContentV2(message.data.fileContents));
              break;
            }
            case ExtensionCommand.getConfigurationSetting: {
              dispatch(changeUseExpandedFunctionCardsV2(message.data));
              break;
            }
            case ExtensionCommand.isTestDisabledForOS: {
              dispatch(changeIsTestDisabledForOS(message.data));
              break;
            }
            default:
              throw new Error('Unknown post message received');
          }
        } else {
          switch (message.command) {
            case ExtensionCommand.setRuntimePort: {
              dispatch(changeRuntimePort(message.data));
              break;
            }
            case ExtensionCommand.fetchSchema: {
              if (message.data.type === SchemaType.Source) {
                dispatch(changeSourceSchemaFilename(message.data.fileName));
              } else {
                dispatch(changeTargetSchemaFilename(message.data.fileName));
              }
              break;
            }
            case ExtensionCommand.loadDataMap: {
              // NOTE: DataMapDataProvider ensures the functions and schemas are loaded before loading the mapDefinition connections
              dispatch(changeSourceSchemaFilename(message.data.sourceSchemaFileName));
              dispatch(changeTargetSchemaFilename(message.data.targetSchemaFileName));
              dispatch(changeMapDefinition(message.data.mapDefinition));
              dispatch(changeDataMapMetadata(message.data.metadata));
              break;
            }
            case ExtensionCommand.showAvailableSchemas: {
              dispatch(changeSchemaList(message.data));
              break;
            }
            case ExtensionCommand.getAvailableCustomXsltPaths: {
              dispatch(changeCustomXsltPathList(message.data));
              break;
            }
            case ExtensionCommand.setXsltData: {
              dispatch(changeXsltFilename(message.data.filename));
              dispatch(changeXsltContent(message.data.fileContents));
              break;
            }
            case ExtensionCommand.getConfigurationSetting: {
              dispatch(changeUseExpandedFunctionCards(message.data));
              break;
            }
            default:
              throw new Error('Unknown post message received');
          }
        }
        break;
      }
      default:
        switch (message.command) {
          case ExtensionCommand.initialize_frame: {
            dispatch(initializeWorkflow(message.data as InitializePayload));
            break;
          }
          case ExtensionCommand.update_access_token: {
            dispatch(updateAccessToken(message.data.accessToken));
            break;
          }
          case ExtensionCommand.update_export_path: {
            dispatch(updateTargetDirectory(message.data));
            break;
          }
          case ExtensionCommand.add_status: {
            dispatch(addStatus(message.data));
            break;
          }
          case ExtensionCommand.set_final_status: {
            dispatch(setFinalStatus(message.data));
            break;
          }
          default:
            throw new Error('Unknown post message received');
        }
    }
  });
  useEffect(() => {
    vscode.postMessage({
      command: ExtensionCommand.initialize,
    });
  }, []);
  return <VSCodeContext.Provider value={vscode}>{children}</VSCodeContext.Provider>;
};
