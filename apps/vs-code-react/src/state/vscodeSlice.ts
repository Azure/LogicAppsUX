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

export interface InitializedVscodeState {
  initialized: true;
  accessToken?: string;
  corsNotice?: string;
  apiVersion: string;
  baseUrl: string;
  workflowProperties: OverviewPropertiesProps;
  project: ProjectName;
  exportData: ExportData;
}

interface UninitializedVscodeState {
  initialized: false;
  accessToken?: string;
}

export type VscodeState = UninitializedVscodeState | InitializedVscodeState;

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
      (state as InitializedVscodeState).project = project;
      (state as InitializedVscodeState).accessToken = accessToken;
      (state as InitializedVscodeState).apiVersion = apiVersion;
      (state as InitializedVscodeState).baseUrl = baseUrl;
      (state as InitializedVscodeState).corsNotice = corsNotice;
      (state as InitializedVscodeState).workflowProperties = workflowProperties;
      (state as InitializedVscodeState).exportData = {
        selectedWorkflows: [],
        selectedSubscription: '',
        selectedIse: '',
        location: '',
        validationState: '',
        exportPath: '',
      };
    },
    updateAccessToken: (state: VscodeState, action: PayloadAction<string | undefined>) => {
      state.accessToken = action.payload;
    },
    updateSelectedWorkFlows: (state: VscodeState, action: PayloadAction<any>) => {
      const { selectedWorkflows } = action.payload;
      (state as InitializedVscodeState).exportData.selectedWorkflows = selectedWorkflows;
    },
    updateSelectedSubscripton: (state: VscodeState, action: PayloadAction<any>) => {
      const { selectedSubscription } = action.payload;
      (state as InitializedVscodeState).exportData.selectedSubscription = selectedSubscription;
      (state as InitializedVscodeState).exportData.selectedIse = '';
    },
    updateSelectedIse: (state: VscodeState, action: PayloadAction<any>) => {
      const { selectedIse, location } = action.payload;
      (state as InitializedVscodeState).exportData.selectedIse = selectedIse;
      (state as InitializedVscodeState).exportData.location = location;
    },
    updateValidationState: (state: VscodeState, action: PayloadAction<any>) => {
      const { validationState } = action.payload;
      (state as InitializedVscodeState).exportData.validationState = validationState;
    },
    updateExportPath: (state: VscodeState, action: PayloadAction<any>) => {
      const { exportPath } = action.payload;
      (state as InitializedVscodeState).exportData.exportPath = exportPath;
    },
  },
});

// Action creators are generated for each case reducer function
export const {
  initialize,
  updateAccessToken,
  updateSelectedWorkFlows,
  updateSelectedSubscripton,
  updateSelectedIse,
  updateValidationState,
  updateExportPath,
} = vscodeSlice.actions;

export default vscodeSlice.reducer;
