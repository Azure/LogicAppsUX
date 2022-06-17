import type { ProjectName } from '../run-service';
import type { PayloadAction } from '@reduxjs/toolkit';
import { createSlice } from '@reduxjs/toolkit';

export interface InitializePayload {
  baseUrl: string;
  corsNotice?: string;
  accessToken?: string;
  project: ProjectName;
}

interface initializedExportState {
  initialized: true;
  accessToken?: string;
  corsNotice?: string;
  baseUrl: string;
  project: ProjectName;
}

interface uninitializedExportState {
  initialized: false;
  accessToken?: string;
}

export type ExportState = uninitializedExportState | initializedExportState;

const initialState: ExportState = {
  initialized: false,
};

export const exportSlice = createSlice({
  name: 'export',
  initialState: initialState as ExportState,
  reducers: {
    initialize: (state: ExportState, action: PayloadAction<InitializePayload>) => {
      const { baseUrl, corsNotice, accessToken, project } = action.payload;
      state.initialized = true;
      (state as initializedExportState).project = project;
      (state as initializedExportState).accessToken = accessToken;
      (state as initializedExportState).baseUrl = baseUrl;
      (state as initializedExportState).corsNotice = corsNotice;
    },
    updateAccessToken: (state: ExportState, action: PayloadAction<string | undefined>) => {
      state.accessToken = action.payload;
    },
  },
});

// Action creators are generated for each case reducer function
export const { initialize, updateAccessToken } = exportSlice.actions;

export default exportSlice.reducer;
