import type { IApiHubServiceDetails } from '@microsoft-logic-apps/designer-client-services';
import type { IDesignerPanelMetadata } from '@microsoft-logic-apps/utils';
import type { ConnectionReferences } from '@microsoft/logic-apps-designer';
import type { PayloadAction } from '@reduxjs/toolkit';
import { createSlice } from '@reduxjs/toolkit';

export interface designerState {
  panelMetaData: IDesignerPanelMetadata | null;
  connectionReferences: ConnectionReferences;
  baseUrl: string;
  apiHubServiceDetails: IApiHubServiceDetails;
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
};

export const designerSlice = createSlice({
  name: 'designer',
  initialState,
  reducers: {
    initializeDesigner: (state, action: PayloadAction<any>) => {
      const { panelMetadata, connectionReferences, baseUrl, apiHubServiceDetails } = action.payload;

      state.panelMetaData = panelMetadata;
      state.connectionReferences = connectionReferences;
      state.baseUrl = baseUrl;
      state.apiHubServiceDetails = apiHubServiceDetails;
    },
  },
});

export const { initializeDesigner } = designerSlice.actions;
