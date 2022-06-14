import { InitConnectionService, InitOperationManifestService, InitSearchService } from '@microsoft-logic-apps/designer-client-services';
import type { IConnectionService, IOperationManifestService, ISearchService } from '@microsoft-logic-apps/designer-client-services';
import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';

export interface DesignerOptionsState {
  readOnly?: boolean;
  isMonitoringView?: boolean;
  servicesInitialized?: boolean;
}

const initialState: DesignerOptionsState = {
  readOnly: false,
  isMonitoringView: false,
  servicesInitialized: false,
};

export interface ServiceOptions {
  connectionService: IConnectionService;
  operationManifestService: IOperationManifestService;
  searchService: ISearchService;
}

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
    initDesignerOptions: (state, action: PayloadAction<Omit<DesignerOptionsState, 'servicesInitialized'>>) => {
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
