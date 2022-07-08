import type { DesignerOptionsState, ServiceOptions } from './designerOptionsInterfaces';
import { InitConnectionService, InitOperationManifestService, InitSearchService } from '@microsoft-logic-apps/designer-client-services';
import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';

const initialState: DesignerOptionsState = {
  readOnly: false,
  isMonitoringView: false,
  servicesInitialized: false,
};

export const initializeServices = createAsyncThunk(
  'initializeDesignerServices',
  async ({ connectionService, operationManifestService, searchService }: ServiceOptions) => {
    InitConnectionService(connectionService);
    InitOperationManifestService(operationManifestService);
    InitSearchService(searchService);
    return true;
  }
);

export const designerOptionsSlice = createSlice({
  name: 'designerOptions',
  initialState,
  reducers: {
    initDesignerOptions: (state: DesignerOptionsState, action: PayloadAction<Omit<DesignerOptionsState, 'servicesInitialized'>>) => {
      state.readOnly = action.payload.readOnly;
      state.isMonitoringView = action.payload.isMonitoringView;
    },
  },
  extraReducers: (builder) => {
    builder.addCase(initializeServices.fulfilled, (state, action) => {
      state.servicesInitialized = action.payload;
    });
  },
});

// Action creators are generated for each case reducer function
export const { initDesignerOptions } = designerOptionsSlice.actions;

export default designerOptionsSlice.reducer;
