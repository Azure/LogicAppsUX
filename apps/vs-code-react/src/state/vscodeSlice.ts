import type { ExportData, ITargetDirectory, ManagedConnections, ProjectName, WorkflowsList } from '../run-service';
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

export enum Status {
  InProgress = 'InProgress',
  Succeeded = 'Succeeded',
  Failed = 'Failed',
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
  statuses?: string[];
  finalStatus?: Status;
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
      const initializedState = state as InitializedVscodeState;
      initializedState.project = project;
      initializedState.accessToken = accessToken;
      initializedState.apiVersion = apiVersion;
      initializedState.baseUrl = baseUrl;
      initializedState.corsNotice = corsNotice;
      initializedState.workflowProperties = workflowProperties;
      initializedState.exportData = {
        selectedWorkflows: [],
        selectedSubscription: '',
        selectedIse: '',
        location: '',
        validationState: '',
        targetDirectory: {
          fsPath: '',
          path: '',
        },
        packageUrl: '',
        managedConnections: {
          isManaged: false,
          resourceGroup: undefined,
          resourceGroupLocation: undefined,
        },
      };
    },
    updateAccessToken: (state: VscodeState, action: PayloadAction<string | undefined>) => {
      state.accessToken = action.payload;
    },
    updateSelectedWorkFlows: (state: VscodeState, action: PayloadAction<{ selectedWorkflows: Array<WorkflowsList> }>) => {
      const { selectedWorkflows } = action.payload;
      (state as InitializedVscodeState).exportData.selectedWorkflows = selectedWorkflows;
    },
    updateSelectedSubscripton: (state: VscodeState, action: PayloadAction<{ selectedSubscription: string }>) => {
      const { selectedSubscription } = action.payload;
      (state as InitializedVscodeState).exportData.selectedSubscription = selectedSubscription;
      (state as InitializedVscodeState).exportData.selectedIse = '';
      (state as InitializedVscodeState).exportData.selectedWorkflows = [];
    },
    updateSelectedIse: (state: VscodeState, action: PayloadAction<{ selectedIse: string; location: string }>) => {
      const { selectedIse, location } = action.payload;
      (state as InitializedVscodeState).exportData.selectedIse = selectedIse;
      (state as InitializedVscodeState).exportData.location = location;
      (state as InitializedVscodeState).exportData.selectedWorkflows = [];
    },
    updateValidationState: (state: VscodeState, action: PayloadAction<{ validationState: string }>) => {
      const { validationState } = action.payload;
      (state as InitializedVscodeState).exportData.validationState = validationState;
    },
    updateTargetDirectory: (state: VscodeState, action: PayloadAction<{ targetDirectory: ITargetDirectory }>) => {
      const { targetDirectory } = action.payload;
      (state as InitializedVscodeState).exportData.targetDirectory = targetDirectory;
    },
    updatePackageUrl: (state: VscodeState, action: PayloadAction<{ packageUrl: string }>) => {
      const { packageUrl } = action.payload;
      (state as InitializedVscodeState).exportData.packageUrl = packageUrl;
    },
    updateManagedConnections: (state: VscodeState, action: PayloadAction<ManagedConnections>) => {
      (state as InitializedVscodeState).exportData.managedConnections = action.payload;
    },
    addStatus: (state: VscodeState, action: PayloadAction<{ status: string }>): void => {
      const { status } = action.payload;
      const initializedState = state as InitializedVscodeState;
      initializedState.statuses = [...(initializedState.statuses ?? []), status];
    },
    setFinalStatus: (state: VscodeState, action: PayloadAction<{ status: Status }>): void => {
      const { status } = action.payload;
      const initializedState = state as InitializedVscodeState;
      initializedState.finalStatus = status;
      if (status === Status.InProgress) {
        initializedState.statuses = [];
      }
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
  updateTargetDirectory,
  updatePackageUrl,
  updateManagedConnections,
  addStatus,
  setFinalStatus,
} = vscodeSlice.actions;

export default vscodeSlice.reducer;
