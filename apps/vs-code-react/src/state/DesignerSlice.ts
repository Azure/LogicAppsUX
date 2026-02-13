import type { ApiHubServiceDetails, ListDynamicValue, UnitTestDefinition } from '@microsoft/logic-apps-shared';
import type {
  CompleteFileSystemConnectionData,
  ConnectionsData,
  ICallbackUrlResponse,
  IDesignerPanelMetadata,
} from '@microsoft/vscode-extension-logic-apps';
import type { PayloadAction } from '@reduxjs/toolkit';
import { createSlice } from '@reduxjs/toolkit';

export interface DesignerState {
  panelMetaData: IDesignerPanelMetadata | null;
  connectionData: ConnectionsData;
  baseUrl: string;
  workflowRuntimeBaseUrl: string;
  apiVersion: string;
  apiHubServiceDetails: ApiHubServiceDetails;
  readOnly: boolean;
  isLocal: boolean;
  isMonitoringView: boolean;
  callbackInfo: ICallbackUrlResponse;
  runId: string;
  fileSystemConnections: Record<string, any>;
  iaMapArtifacts: ListDynamicValue[];
  oauthRedirectUrl: string;
  hostVersion: string;
  isUnitTest: boolean;
  unitTestDefinition: UnitTestDefinition | null;
  isDraftMode: boolean;
  hasDraft: boolean;
  draftWorkflow: any | null;
  draftConnections: any | null;
  draftParameters: any | null;
  lastDraftSaveTime: number | null;
  draftSaveError: string | null;
  isDraftSaving: boolean;
}

const initialState: DesignerState = {
  panelMetaData: null,
  baseUrl: '/url',
  workflowRuntimeBaseUrl: '',
  apiVersion: '2018-11-01',
  connectionData: {},
  apiHubServiceDetails: {
    apiVersion: '2018-07-01-preview',
    baseUrl: '/url',
    subscriptionId: 'subscriptionId',
    resourceGroup: '',
    location: '',
    tenantId: '',
    httpClient: null as any,
  },
  readOnly: false,
  isLocal: true,
  isMonitoringView: false,
  callbackInfo: {
    value: '',
    method: '',
  },
  runId: '',
  fileSystemConnections: {},
  iaMapArtifacts: [],
  oauthRedirectUrl: '',
  hostVersion: '',
  isUnitTest: false,
  unitTestDefinition: null,
  isDraftMode: true,
  hasDraft: false,
  draftWorkflow: null,
  draftConnections: null,
  draftParameters: null,
  lastDraftSaveTime: null,
  draftSaveError: null,
  isDraftSaving: false,
};

export const designerSlice = createSlice({
  name: 'designer',
  initialState,
  reducers: {
    /// TODO(ccastrotrejo): Update missing types
    initializeDesigner: (state, action: PayloadAction<any>) => {
      const {
        panelMetadata,
        connectionData,
        baseUrl,
        apiVersion,
        apiHubServiceDetails,
        readOnly,
        isLocal,
        oauthRedirectUrl,
        isMonitoringView,
        runId,
        hostVersion,
        isUnitTest,
        unitTestDefinition,
        workflowRuntimeBaseUrl,
        draftInfo,
      } = action.payload;

      state.panelMetaData = panelMetadata;
      state.connectionData = connectionData;
      state.baseUrl = baseUrl;
      state.workflowRuntimeBaseUrl = workflowRuntimeBaseUrl ?? '';
      state.apiVersion = apiVersion;
      state.apiHubServiceDetails = apiHubServiceDetails;
      state.readOnly = readOnly;
      state.isLocal = isLocal;
      state.isMonitoringView = isMonitoringView;
      state.runId = runId;
      state.oauthRedirectUrl = oauthRedirectUrl;
      state.hostVersion = hostVersion;
      state.isUnitTest = isUnitTest;
      state.unitTestDefinition = unitTestDefinition;

      // Process draft info if included in initialization
      if (draftInfo?.hasDraft) {
        state.hasDraft = true;
        state.isDraftMode = true;
        state.draftWorkflow = draftInfo.draftWorkflow ?? null;
        state.draftConnections = draftInfo.draftConnections ?? null;
        state.draftParameters = draftInfo.draftParameters ?? null;
      } else {
        // No draft exists - still in draft mode (editable) but no draft files
        state.hasDraft = false;
        state.isDraftMode = true;
        state.draftWorkflow = null;
        state.draftConnections = null;
        state.draftParameters = null;
      }
    },
    updateRuntimeBaseUrl: (state, action: PayloadAction<string | undefined>) => {
      state.workflowRuntimeBaseUrl = action.payload ?? '';
    },
    updateCallbackUrl: (state, action: PayloadAction<any>) => {
      const { callbackInfo } = action.payload;
      state.callbackInfo = callbackInfo;
    },
    updatePanelMetadata: (
      state,
      action: PayloadAction<{
        panelMetadata: IDesignerPanelMetadata;
        connectionData: ConnectionsData;
        apiHubServiceDetails: ApiHubServiceDetails;
      }>
    ) => {
      const { panelMetadata, connectionData, apiHubServiceDetails } = action.payload;
      state.panelMetaData = panelMetadata;
      state.connectionData = connectionData;
      state.apiHubServiceDetails = apiHubServiceDetails;
    },
    createFileSystemConnection: (state, action: PayloadAction<any>) => {
      const { connectionName, resolve, reject } = action.payload;
      state.fileSystemConnections[connectionName] = { resolveConnection: resolve, rejectConnection: reject };
    },
    updateFileSystemConnection: (state, action: PayloadAction<CompleteFileSystemConnectionData>) => {
      const { connectionName, connection, error } = action.payload;
      if (connection && state.fileSystemConnections[connectionName]) {
        state.fileSystemConnections[connectionName].resolveConnection(connection);
      }
      if (error && state.fileSystemConnections[connectionName]) {
        state.fileSystemConnections[connectionName].rejectConnection({ message: error });
      }
      delete state.fileSystemConnections[connectionName];
    },
    updateUnitTestDefinition: (state, action: PayloadAction<{ unitTestDefinition: UnitTestDefinition }>) => {
      const { unitTestDefinition } = action.payload;
      state.unitTestDefinition = unitTestDefinition;
    },
    loadDraftState: (
      state,
      action: PayloadAction<{
        hasDraft: boolean;
        draftWorkflow?: any;
        draftConnections?: any;
        draftParameters?: any;
      }>
    ) => {
      state.hasDraft = action.payload.hasDraft;
      state.draftWorkflow = action.payload.draftWorkflow ?? null;
      state.draftConnections = action.payload.draftConnections ?? null;
      state.draftParameters = action.payload.draftParameters ?? null;
    },
    updateDraftSaveResult: (
      state,
      action: PayloadAction<{
        success: boolean;
        timestamp: number;
        error?: string;
      }>
    ) => {
      state.isDraftSaving = false;
      if (action.payload.success) {
        state.lastDraftSaveTime = action.payload.timestamp;
        state.draftSaveError = null;
        state.hasDraft = true;
      } else {
        state.draftSaveError = action.payload.error ?? 'Unknown error';
      }
    },
    setDraftSaving: (state, action: PayloadAction<boolean>) => {
      state.isDraftSaving = action.payload;
    },
    updateDraftWorkflow: (state, action: PayloadAction<any>) => {
      state.draftWorkflow = action.payload;
    },
    updateDraftConnections: (state, action: PayloadAction<any>) => {
      state.draftConnections = action.payload;
    },
    updateDraftParameters: (state, action: PayloadAction<any>) => {
      state.draftParameters = action.payload;
    },
    setDraftMode: (state, action: PayloadAction<boolean>) => {
      state.isDraftMode = action.payload;
    },
    clearDraftState: (state) => {
      state.hasDraft = false;
      state.draftWorkflow = null;
      state.draftConnections = null;
      state.draftParameters = null;
      state.lastDraftSaveTime = null;
      state.draftSaveError = null;
      state.isDraftSaving = false;
      state.isDraftMode = true;
    },
  },
});

export const {
  initializeDesigner,
  updateRuntimeBaseUrl,
  updateCallbackUrl,
  createFileSystemConnection,
  updateFileSystemConnection,
  updatePanelMetadata,
  updateUnitTestDefinition,
  loadDraftState,
  updateDraftSaveResult,
  setDraftSaving,
  updateDraftWorkflow,
  updateDraftConnections,
  updateDraftParameters,
  setDraftMode,
  clearDraftState,
} = designerSlice.actions;
