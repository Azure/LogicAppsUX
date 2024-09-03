import type { DesignerOptionsState, ServiceOptions } from './designerOptionsInterfaces';
import type { ILoggerService } from '@microsoft/logic-apps-shared';
import {
  DevLogger,
  InitLoggerService,
  InitConnectionService,
  InitConnectorService,
  InitGatewayService,
  InitTenantService,
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
  InitChatbotService,
  InitCustomCodeService,
  InitCopilotService,
  InitUiInteractionsService,
} from '@microsoft/logic-apps-shared';
import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import CONSTANTS from '../../../common/constants';

export const initialDesignerOptionsState: DesignerOptionsState = {
  readOnly: false,
  isMonitoringView: false,
  isDarkMode: false,
  servicesInitialized: false,
  designerOptionsInitialized: false,
  useLegacyWorkflowParameters: false,
  isXrmConnectionReferenceMode: false,
  showConnectionsPanel: false,
  panelTabHideKeys: [],
  hostOptions: {
    displayRuntimeInfo: true,
    suppressCastingForSerialize: false,
    recurrenceInterval: undefined,
    maxStateHistorySize: CONSTANTS.DEFAULT_MAX_STATE_HISTORY_SIZE,
  },
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
    tenantService,
    loggerService,
    functionService,
    appServiceService,
    workflowService,
    hostService,
    apimService,
    runService,
    editorService,
    connectionParameterEditorService,
    chatbotService,
    customCodeService,
    copilotService,
    uiInteractionsService,
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

    if (connectorService) {
      InitConnectorService(connectorService);
    }
    if (gatewayService) {
      InitGatewayService(gatewayService);
    }
    if (tenantService) {
      InitTenantService(tenantService);
    }
    if (apimService) {
      InitApiManagementService(apimService);
    }
    if (functionService) {
      InitFunctionService(functionService);
    }
    if (appServiceService) {
      InitAppServiceService(appServiceService);
    }
    if (chatbotService) {
      InitChatbotService(chatbotService);
    }
    if (copilotService) {
      InitCopilotService(copilotService);
    }
    if (customCodeService) {
      InitCustomCodeService(customCodeService);
    }

    if (hostService) {
      InitHostService(hostService);
    }

    if (runService) {
      InitRunService(runService);
    }

    if (uiInteractionsService) {
      InitUiInteractionsService(uiInteractionsService);
    }

    InitEditorService(editorService);
    InitConnectionParameterEditorService(connectionParameterEditorService);

    return true;
  }
);

export const designerOptionsSlice = createSlice({
  name: 'designerOptions',
  initialState: initialDesignerOptionsState,
  reducers: {
    initDesignerOptions: (state: DesignerOptionsState, action: PayloadAction<Omit<DesignerOptionsState, 'servicesInitialized'>>) => {
      state.readOnly = action.payload.readOnly;
      state.isMonitoringView = action.payload.isMonitoringView;
      state.isDarkMode = action.payload.isDarkMode;
      state.useLegacyWorkflowParameters = action.payload.useLegacyWorkflowParameters;
      state.isXrmConnectionReferenceMode = action.payload.isXrmConnectionReferenceMode;
      state.suppressDefaultNodeSelectFunctionality = action.payload.suppressDefaultNodeSelectFunctionality;
      state.nodeSelectAdditionalCallback = action.payload.nodeSelectAdditionalCallback;
      state.showConnectionsPanel = action.payload.showConnectionsPanel;
      state.panelTabHideKeys = action.payload.panelTabHideKeys;
      state.hostOptions = {
        ...state.hostOptions,
        ...action.payload.hostOptions,
      };
      state.showPerformanceDebug = action.payload.showPerformanceDebug;
      state.designerOptionsInitialized = true;
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
