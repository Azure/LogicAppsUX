import type { ProjectName } from '../run-service';
import type { OverviewPropertiesProps } from '@microsoft/designer-ui';
import type { PayloadAction } from '@reduxjs/toolkit';
import { createSlice } from '@reduxjs/toolkit';

export interface InitializePayload {
  apiVersion: string;
  baseUrl: string;
  corsNotice?: string;
  accessToken?: string;
  workflowProperties?: OverviewPropertiesProps;
  project: ProjectName;
}

interface initializedVscodeState {
  initialized: true;
  accessToken?: string;
  corsNotice?: string;
  apiVersion: string;
  baseUrl: string;
  workflowProperties: OverviewPropertiesProps;
  project: ProjectName;
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
      (state as initializedVscodeState).workflowProperties = workflowProperties!;
    },
    updateAccessToken: (state: VscodeState, action: PayloadAction<string | undefined>) => {
      state.accessToken = action.payload;
    },
  },
});

// Action creators are generated for each case reducer function
export const { initialize, updateAccessToken } = vscodeSlice.actions;

export default vscodeSlice.reducer;
