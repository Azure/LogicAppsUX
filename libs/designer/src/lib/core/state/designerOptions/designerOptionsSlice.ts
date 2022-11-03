import type { DesignerOptionsState, ServiceOptions } from './designerOptionsInterfaces';
import type { ILoggerService } from '@microsoft-logic-apps/designer-client-services';
import {
  InitLoggerService,
  DevLogger,
  InitConnectionService,
  InitConnectorService,
  InitGatewayService,
  InitOperationManifestService,
  InitSearchService,
  InitOAuthService,
  InitWorkflowService,
} from '@microsoft-logic-apps/designer-client-services';
import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';

const initialState: DesignerOptionsState = {
  readOnly: false,
  isMonitoringView: false,
  isDarkMode: false,
  servicesInitialized: false,
};

export const initializeServices = createAsyncThunk(
  'initializeDesignerServices',
  async ({
    connectionService,
    operationManifestService,
    searchService,
    connectorService,
    oAuthService,
    gatewayService,
    loggerService,
    workflowService,
  }: ServiceOptions) => {
    const loggerServices: ILoggerService[] = [];
    if (loggerService) {
      loggerServices.push(loggerService);
    }
    if (process.env.NODE_ENV !== 'production') {
      loggerServices.push(new DevLogger());
    }
    InitConnectionService(connectionService);
    InitOperationManifestService(operationManifestService);
    InitSearchService(searchService);
    InitOAuthService(oAuthService);
    InitLoggerService(loggerServices);
    InitWorkflowService(workflowService);

    if (connectorService) {
      InitConnectorService(connectorService);
    }

    if (gatewayService) {
      InitGatewayService(gatewayService);
    }

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
      state.isDarkMode = action.payload.isDarkMode;
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
