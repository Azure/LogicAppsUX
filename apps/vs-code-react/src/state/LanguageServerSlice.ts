import type { ApiHubServiceDetails, ConnectionsData } from '@microsoft/logic-apps-shared';
import type { CompleteFileSystemConnectionData, IDesignerPanelMetadata } from '@microsoft/vscode-extension-logic-apps';
import type { PayloadAction, Slice } from '@reduxjs/toolkit';
import { createSlice } from '@reduxjs/toolkit';

export interface LanguageServerState {
  panelMetaData: IDesignerPanelMetadata | null;
  connectionData: ConnectionsData;
  baseUrl: string;
  workflowRuntimeBaseUrl: string;
  apiVersion: string;
  apiHubServiceDetails: ApiHubServiceDetails;
  isLocal: boolean;
  fileSystemConnections: Record<string, any>;
  oauthRedirectUrl: string;
  hostVersion: string;
  connector: {
    name: string;
  };
}

const initialState: LanguageServerState = {
  panelMetaData: null,
  baseUrl: '/url',
  workflowRuntimeBaseUrl: '',
  apiVersion: '2018-11-01',
  connectionData: {},
  apiHubServiceDetails: {
    apiVersion: '2018-07-01-preview',
    baseUrl: '/url',
    subscriptionId: 'subscriptionId',
    resourceGroup: '',
    location: '',
    tenantId: '',
    httpClient: null as any,
  },
  isLocal: true,
  fileSystemConnections: {},
  oauthRedirectUrl: '',
  hostVersion: '',
  connector: {
    name: '',
  },
};

export const languageServerSlice: Slice<LanguageServerState> = createSlice({
  name: 'languageServer',
  initialState,
  reducers: {
    initializeLanguageServer: (state, action: PayloadAction<any>) => {
      const {
        panelMetadata,
        connectionData,
        baseUrl,
        apiVersion,
        apiHubServiceDetails,
        oauthRedirectUrl,
        hostVersion,
        workflowRuntimeBaseUrl,
        connector,
      } = action.payload;

      state.panelMetaData = panelMetadata;
      state.connectionData = connectionData;
      state.baseUrl = baseUrl;
      state.workflowRuntimeBaseUrl = workflowRuntimeBaseUrl ?? '';
      state.apiVersion = apiVersion;
      state.apiHubServiceDetails = apiHubServiceDetails;
      state.isLocal = true;
      state.oauthRedirectUrl = oauthRedirectUrl;
      state.hostVersion = hostVersion;
      state.connector = connector;
    },

    createFileSystemConnection: (state, action: PayloadAction<any>) => {
      const { connectionName, resolve, reject } = action.payload;
      state.fileSystemConnections[connectionName] = { resolveConnection: resolve, rejectConnection: reject };
    },
    updateFileSystemConnection: (state, action: PayloadAction<CompleteFileSystemConnectionData>) => {
      const { connectionName, connection, error } = action.payload;
      if (connection && state.fileSystemConnections[connectionName]) {
        state.fileSystemConnections[connectionName].resolveConnection(connection);
      }
      if (error && state.fileSystemConnections[connectionName]) {
        state.fileSystemConnections[connectionName].rejectConnection({ message: error });
      }
      delete state.fileSystemConnections[connectionName];
    },
  },
});

export const { initializeLanguageServer, createFileSystemConnection, updateFileSystemConnection } = languageServerSlice.actions;
