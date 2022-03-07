import type { OverviewPropertiesProps } from '@microsoft/designer-ui';
import type { PayloadAction } from '@reduxjs/toolkit';
import { createSlice } from '@reduxjs/toolkit';

export interface InitializePayload {
  apiVersion: string;
  baseUrl: string;
  corsNotice?: string;
  accessToken?: string;
  workflowProperties: OverviewPropertiesProps;
}

interface initializedOverviewState {
  initialized: true;
  accessToken?: string;
  corsNotice?: string;
  apiVersion: string;
  baseUrl: string;
  workflowProperties: OverviewPropertiesProps;
}

interface uninitializedOverviewState {
  initialized: false;
  accessToken?: string;
}
export type OverviewState = uninitializedOverviewState | initializedOverviewState;

const initialState: OverviewState = {
  initialized: false,
};

export const overviewSlice = createSlice({
  name: 'overview',
  initialState: initialState as OverviewState,
  reducers: {
    initialize: (state: OverviewState, action: PayloadAction<InitializePayload>) => {
      const { apiVersion, baseUrl, corsNotice, accessToken, workflowProperties } = action.payload;
      state.initialized = true;
      (state as initializedOverviewState).accessToken = accessToken;
      (state as initializedOverviewState).apiVersion = apiVersion;
      (state as initializedOverviewState).baseUrl = baseUrl;
      (state as initializedOverviewState).corsNotice = corsNotice;
      (state as initializedOverviewState).workflowProperties = workflowProperties;
    },
    updateAccessToken: (state: OverviewState, action: PayloadAction<string | undefined>) => {
      state.accessToken = action.payload;
    },
  },
});

// Action creators are generated for each case reducer function
export const { initialize, updateAccessToken } = overviewSlice.actions;

export default overviewSlice.reducer;
