import type { IApiHubServiceDetails } from '@microsoft/designer-client-services-logic-apps';
import type { ConnectionReferences } from '@microsoft/logic-apps-designer';
import type { ICallbackUrlResponse, IDesignerPanelMetadata } from '@microsoft/vscode-extension';
import type { PayloadAction } from '@reduxjs/toolkit';
import { createSlice } from '@reduxjs/toolkit';

export interface designerState {
  panelMetaData: IDesignerPanelMetadata | null;
  connectionReferences: ConnectionReferences;
  baseUrl: string;
  apiVersion: string;
  apiHubServiceDetails: IApiHubServiceDetails;
  readOnly: boolean;
  isLocal: boolean;
  isMonitoringView: boolean;
  callbackInfo: ICallbackUrlResponse;
  runId: string;
}

const initialState: designerState = {
  panelMetaData: null,
  baseUrl: '/url',
  apiVersion: '2018-11-01',
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
  isMonitoringView: false,
  callbackInfo: {
    value: '',
    method: '',
  },
  runId: '',
};

export const designerSlice = createSlice({
  name: 'designer',
  initialState,
  reducers: {
    initializeDesigner: (state, action: PayloadAction<any>) => {
      const { panelMetadata, connectionReferences, baseUrl, apiVersion, apiHubServiceDetails, readOnly, isLocal, isMonitoringView, runId } =
        action.payload;

      state.panelMetaData = panelMetadata;
      state.connectionReferences = connectionReferences;
      state.baseUrl = baseUrl;
      state.apiVersion = apiVersion;
      state.apiHubServiceDetails = apiHubServiceDetails;
      state.readOnly = readOnly;
      state.isLocal = isLocal;
      state.isMonitoringView = isMonitoringView;
      state.runId = runId;
    },
    updateCallbackUrl: (state, action: PayloadAction<any>) => {
      const { callbackInfo } = action.payload;

      state.callbackInfo = callbackInfo;
    },
  },
});

export const { initializeDesigner, updateCallbackUrl } = designerSlice.actions;
