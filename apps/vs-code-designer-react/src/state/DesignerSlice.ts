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
  },
});

export const { initializeDesigner, updateCallbackUrl } = designerSlice.actions;
