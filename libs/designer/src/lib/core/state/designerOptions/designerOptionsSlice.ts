import type { DesignerOptionsState, ServiceOptions } from './designerOptionsInterfaces';
import type { ILoggerService } from '@microsoft/designer-client-services-logic-apps';
import {
  DevLogger,
  InitLoggerService,
  InitConnectionService,
  InitConnectorService,
  InitGatewayService,
  InitOperationManifestService,
  InitSearchService,
  InitOAuthService,
  InitWorkflowService,
  InitHostService,
  InitApiManagementService,
  InitFunctionService,
  InitAppServiceService,
  InitRunService,
  InitEditorService,
  InitConnectionParameterEditorService,
  InitSearchService2,
} from '@microsoft/designer-client-services-logic-apps';
import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';

const initialState: DesignerOptionsState = {
  readOnly: false,
  isMonitoringView: false,
  isDarkMode: false,
  servicesInitialized: false,
  useLegacyWorkflowParameters: false,
  isXrmConnectionReferenceMode: false,
};

export const initializeServices = createAsyncThunk(
  'initializeDesignerServices',
  async ({
    connectionService,
    operationManifestService,
    searchService,
    searchService2,
    connectorService,
    oAuthService,
    gatewayService,
    loggerService,
    functionService,
    appServiceService,
    workflowService,
    hostService,
    apimService,
    runService,
    editorService,
    connectionParameterEditorService,
  }: ServiceOptions) => {
    const loggerServices: ILoggerService[] = [];
    if (loggerService) {
      loggerServices.push(loggerService);
    }
    if (process.env.NODE_ENV !== 'production') {
      loggerServices.push(new DevLogger());
    }
    InitLoggerService(loggerServices);
    InitConnectionService(connectionService);
    InitOperationManifestService(operationManifestService);
    InitSearchService(searchService);
    InitOAuthService(oAuthService);
    InitWorkflowService(workflowService);

    if (searchService2) InitSearchService2(searchService2);
    if (connectorService) InitConnectorService(connectorService);
    if (gatewayService) InitGatewayService(gatewayService);
    if (apimService) InitApiManagementService(apimService);
    if (functionService) InitFunctionService(functionService);
    if (appServiceService) InitAppServiceService(appServiceService);

    if (hostService) {
      InitHostService(hostService);
    }

    if (runService) {
      InitRunService(runService);
    }

    InitEditorService(editorService);
    InitConnectionParameterEditorService(connectionParameterEditorService);

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
      state.useLegacyWorkflowParameters = action.payload.useLegacyWorkflowParameters;
      state.isXrmConnectionReferenceMode = action.payload.isXrmConnectionReferenceMode;
      state.suppressDefaultNodeSelectFunctionality = action.payload.suppressDefaultNodeSelectFunctionality;
      state.nodeSelectAdditionalCallback = action.payload.nodeSelectAdditionalCallback;
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
