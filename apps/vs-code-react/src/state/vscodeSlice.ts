import type { ExportData, ProjectName } from '../run-service';
import type { OverviewPropertiesProps } from '@microsoft/designer-ui';
import type { PayloadAction } from '@reduxjs/toolkit';
import { createSlice } from '@reduxjs/toolkit';

export interface InitializePayload {
  apiVersion: string;
  baseUrl: string;
  corsNotice?: string;
  accessToken?: string;
  workflowProperties: OverviewPropertiesProps;
  project: ProjectName;
}

export interface initializedVscodeState {
  initialized: true;
  accessToken?: string;
  corsNotice?: string;
  apiVersion: string;
  baseUrl: string;
  workflowProperties: OverviewPropertiesProps;
  project: ProjectName;
  selectedWorkflows: Array<any>;
  exportData: ExportData;
}

interface uninitializedVscodeState {
  initialized: false;
  accessToken?: string;
}
export type VscodeState = uninitializedVscodeState | initializedVscodeState;

const initialState: VscodeState = {
  initialized: false,
};

export const vscodeSlice = createSlice({
  name: 'vscode',
  initialState: initialState as VscodeState,
  reducers: {
    initialize: (state: VscodeState, action: PayloadAction<InitializePayload>) => {
      const { apiVersion, baseUrl, corsNotice, accessToken, workflowProperties, project } = action.payload;
      state.initialized = true;
      (state as initializedVscodeState).project = project;
      (state as initializedVscodeState).accessToken = accessToken;
      (state as initializedVscodeState).apiVersion = apiVersion;
      (state as initializedVscodeState).baseUrl = baseUrl;
      (state as initializedVscodeState).corsNotice = corsNotice;
      (state as initializedVscodeState).workflowProperties = workflowProperties;
      (state as initializedVscodeState).selectedWorkflows = [];
      (state as initializedVscodeState).exportData = {
        selectedWorkflows: [],
        selectedSubscription: '',
        selectedIse: '',
      };
    },
    updateAccessToken: (state: VscodeState, action: PayloadAction<string | undefined>) => {
      state.accessToken = action.payload;
    },
    updateSelectedWorkFlows: (state: VscodeState, action: PayloadAction<any>) => {
      const { selectedWorkflows } = action.payload;
      (state as initializedVscodeState).selectedWorkflows = selectedWorkflows;
    },
    updateSelectedSubscripton: (state: VscodeState, action: PayloadAction<any>) => {
      const { selectedSubscription } = action.payload;
      (state as initializedVscodeState).exportData.selectedSubscription = selectedSubscription;
      (state as initializedVscodeState).exportData.selectedIse = '';
    },
    updateSelectedIse: (state: VscodeState, action: PayloadAction<any>) => {
      const { selectedIse } = action.payload;
      (state as initializedVscodeState).exportData.selectedIse = selectedIse;
    },
  },
});

// Action creators are generated for each case reducer function
export const { initialize, updateAccessToken, updateSelectedWorkFlows, updateSelectedSubscripton, updateSelectedIse } = vscodeSlice.actions;

export default vscodeSlice.reducer;
