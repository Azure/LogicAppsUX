import type { IApiHubServiceDetails } from '@microsoft/designer-client-services-logic-apps';
import type { ConnectionsData, ICallbackUrlResponse, IDesignerPanelMetadata } from '@microsoft/vscode-extension';
import type { PayloadAction } from '@reduxjs/toolkit';
import { createSlice } from '@reduxjs/toolkit';

export interface designerState {
  panelMetaData: IDesignerPanelMetadata | null;
  connectionData: ConnectionsData;
  baseUrl: string;
  apiVersion: string;
  apiHubServiceDetails: IApiHubServiceDetails;
  readOnly: boolean;
  isLocal: boolean;
  callbackInfo: ICallbackUrlResponse;
  tenantId: string;
  fileSystemConnections: Record<string, any>;
}

const initialState: designerState = {
  panelMetaData: null,
  baseUrl: '/url',
  apiVersion: '2018-11-01',
  connectionData: {},
  apiHubServiceDetails: {
    apiVersion: '2018-07-01-preview',
    baseUrl: '/url',
    subscriptionId: '',
    resourceGroup: '',
    location: '',
  },
  readOnly: false,
  isLocal: true,
  callbackInfo: {
    value: '',
    method: '',
  },
  tenantId: '',
  fileSystemConnections: {},
};

export const designerSlice = createSlice({
  name: 'designer',
  initialState,
  reducers: {
    initializeDesigner: (state, action: PayloadAction<any>) => {
      const { panelMetadata, connectionData, baseUrl, apiVersion, apiHubServiceDetails, readOnly, isLocal } = action.payload;
      state.panelMetaData = panelMetadata;
      state.connectionData = connectionData;
      state.baseUrl = baseUrl;
      state.apiVersion = apiVersion;
      state.apiHubServiceDetails = apiHubServiceDetails;
      state.readOnly = readOnly;
      state.isLocal = isLocal;
      state.tenantId = apiHubServiceDetails?.tenantId;
    },
    updateCallbackUrl: (state, action: PayloadAction<any>) => {
      const { callbackInfo } = action.payload;
      state.callbackInfo = callbackInfo;
    },
    createFileSystemConnection: (state, action: PayloadAction<any>) => {
      const { connectionName, resolve, reject } = action.payload;
      state.fileSystemConnections[connectionName] = { resolveConnection: resolve, rejectConnection: reject };
    },
    updateFileSystemConnection: (state, action: PayloadAction<{ connectionName: string; connection: any; error: string }>) => {
      const { connectionName, connection, error } = action.payload;
      if (connection && state.fileSystemConnections[connectionName]) {
        state.fileSystemConnections[connectionName].resolveConnection(connection);
      }
      if (error && state.fileSystemConnections[connectionName]) {
        state.fileSystemConnections[connectionName].rejectConnection(error);
      }
      delete state.fileSystemConnections[connectionName];
    },
  },
});

export const { initializeDesigner, updateCallbackUrl, createFileSystemConnection, updateFileSystemConnection } = designerSlice.actions;
