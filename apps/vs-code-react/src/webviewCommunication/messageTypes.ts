import type { ApiHubServiceDetails, SchemaType } from '@microsoft/logic-apps-shared';
import type { ITargetDirectory } from '../run-service/types';
import type { InitializeUnitTestPayload } from '../state/UnitTestSlice';
import type { InitializePayload, Status } from '../state/WorkflowSlice';
import type { MapDefinitionData, ExtensionCommand, ConnectionsData, IDesignerPanelMetadata } from '@microsoft/vscode-extension';

type FetchSchemaData = { fileName: string; type: SchemaType };
export type XsltData = { filename: string; fileContents: string };

// Data Mapper Message Interfaces
export interface FetchSchemaMessage {
  command: typeof ExtensionCommand.fetchSchema;
  data: FetchSchemaData;
}

export interface LoadDataMapMessage {
  command: typeof ExtensionCommand.loadDataMap;
  data: MapDefinitionData;
}

export interface ShowAvailableSchemasMessage {
  command: typeof ExtensionCommand.showAvailableSchemas;
  data: string[];
}

export interface GetAvailableCustomXsltPathsMessage {
  command: typeof ExtensionCommand.getAvailableCustomXsltPaths;
  data: string[];
}

export interface SetXsltDataMessage {
  command: typeof ExtensionCommand.setXsltData;
  data: XsltData;
}

export interface SetRuntimePortMessage {
  command: typeof ExtensionCommand.setRuntimePort;
  data: string;
}

export interface GetConfigurationSettingMessage {
  command: typeof ExtensionCommand.getConfigurationSetting;
  data: boolean;
}

// Designer Message Interfaces
export interface ReceiveCallbackMessage {
  command: typeof ExtensionCommand.receiveCallback;
  data: any;
}

export interface CompleteFileSystemConnectionMessage {
  command: typeof ExtensionCommand.completeFileSystemConnection;
  data: { connectionName: string; connection: any; error: string };
}

export interface UpdatePanelMetadataMessage {
  command: typeof ExtensionCommand.update_panel_metadata;
  data: {
    panelMetadata: IDesignerPanelMetadata;
    connectionData: ConnectionsData;
    apiHubServiceDetails: ApiHubServiceDetails;
  };
}

// Rest of Message Interfaces
export interface InjectValuesMessage {
  command: typeof ExtensionCommand.initialize_frame;
  data: InitializePayload & {
    project: string;
  };
}

export interface UpdateAccessTokenMessage {
  command: typeof ExtensionCommand.update_access_token;
  data: {
    accessToken?: string;
  };
}

export interface UpdateExportPathMessage {
  command: typeof ExtensionCommand.update_export_path;
  data: {
    targetDirectory: ITargetDirectory;
  };
}

export interface AddStatusMessage {
  command: typeof ExtensionCommand.add_status;
  data: {
    status: string;
  };
}

export interface SetFinalStatusMessage {
  command: typeof ExtensionCommand.set_final_status;
  data: {
    status: Status;
  };
}

// Unit test Message Interfaces
export interface InitializeUnitTestMessage {
  command: typeof ExtensionCommand.initialize_frame;
  data: InitializeUnitTestPayload;
}

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
type UnitTestMessageType = InitializeUnitTestMessage;
export type MessageType = InjectValuesMessage | DesignerMessageType | DataMapperMessageType | WorkflowMessageType | UnitTestMessageType;
