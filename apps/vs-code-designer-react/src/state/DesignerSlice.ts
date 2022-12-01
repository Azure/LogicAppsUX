import type { IApiHubServiceDetails } from '@microsoft-logic-apps/designer-client-services';
import type { ICallbackUrlResponse, IDesignerPanelMetadata } from '@microsoft-logic-apps/utils';
import type { ConnectionReferences } from '@microsoft/logic-apps-designer';
import type { PayloadAction } from '@reduxjs/toolkit';
import { createSlice } from '@reduxjs/toolkit';

export interface designerState {
  panelMetaData: IDesignerPanelMetadata | null;
  connectionReferences: ConnectionReferences;
  baseUrl: string;
  apiHubServiceDetails: IApiHubServiceDetails;
  readOnly: boolean;
  isLocal: boolean;
  callbackInfo: ICallbackUrlResponse;
}

const initialState: designerState = {
  panelMetaData: null,
  baseUrl: '/url',
  connectionReferences: {},
  apiHubServiceDetails: {
    apiVersion: '2018-07-01-preview',
    baseUrl: '/url',
    subscriptionId: '',
    resourceGroup: '',
    location: '',
  },
  readOnly: true,
  isLocal: true,
  callbackInfo: {
    value: '',
    method: '',
  },
};

export const designerSlice = createSlice({
  name: 'designer',
  initialState,
  reducers: {
    initializeDesigner: (state, action: PayloadAction<any>) => {
      const { panelMetadata, connectionReferences, baseUrl, apiHubServiceDetails, readOnly, isLocal } = action.payload;

      state.panelMetaData = panelMetadata;
      state.connectionReferences = connectionReferences;
      state.baseUrl = baseUrl;
      state.apiHubServiceDetails = apiHubServiceDetails;
      state.readOnly = readOnly;
      state.isLocal = isLocal;
    },
    updateCallbackUrl: (state, action: PayloadAction<any>) => {
      const { callbackInfo } = action.payload;

      state.callbackInfo = callbackInfo;
    },
  },
});

export const { initializeDesigner, updateCallbackUrl } = designerSlice.actions;
