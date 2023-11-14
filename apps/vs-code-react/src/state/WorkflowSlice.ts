import type { ExportData, ITargetDirectory, IValidationData, ManagedConnections, WorkflowsList } from '../run-service';
import { AdvancedOptionsTypes } from '../run-service';
import type { OverviewPropertiesProps } from '@microsoft/designer-ui';
import type { PayloadAction } from '@reduxjs/toolkit';
import { createSlice } from '@reduxjs/toolkit';

export interface InitializePayload {
  apiVersion: string;
  baseUrl: string;
  corsNotice?: string;
  accessToken?: string;
  cloudHost?: string;
  workflowProperties: OverviewPropertiesProps;
  project: string;
  reviewContent?: IValidationData;
  hostVersion?: string;
}

export const Status = {
  InProgress: 'InProgress',
  Succeeded: 'Succeeded',
  Failed: 'Failed',
};
export type Status = (typeof Status)[keyof typeof Status];

export interface InitializedWorkflowState {
  initialized: true;
  accessToken?: string;
  cloudHost?: string;
  corsNotice?: string;
  apiVersion: string;
  baseUrl: string;
  workflowProperties: OverviewPropertiesProps;
  project: string;
  exportData: ExportData;
  statuses?: string[];
  finalStatus?: Status;
  reviewContent?: IValidationData;
  hostVersion?: string;
}

interface UninitializedWorkflowState {
  initialized: false;
  accessToken?: string;
}

export type WorkflowState = UninitializedWorkflowState | InitializedWorkflowState;

const initialState: WorkflowState = {
  initialized: false,
};

export const workflowSlice = createSlice({
  name: 'vscode',
  initialState: initialState as WorkflowState,
  reducers: {
    initialize: (state: WorkflowState, action: PayloadAction<InitializePayload>) => {
      const { apiVersion, baseUrl, corsNotice, accessToken, workflowProperties, project, reviewContent, cloudHost, hostVersion } =
        action.payload;
      state.initialized = true;
      const initializedState = state as InitializedWorkflowState;
      initializedState.project = project;
      initializedState.accessToken = accessToken;
      initializedState.cloudHost = cloudHost;
      initializedState.apiVersion = apiVersion;
      initializedState.baseUrl = baseUrl;
      initializedState.corsNotice = corsNotice;
      initializedState.workflowProperties = workflowProperties;
      initializedState.reviewContent = reviewContent;
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
        selectedAdvanceOptions: [AdvancedOptionsTypes.generateInfrastructureTemplates],
      };
      initializedState.hostVersion = hostVersion;
    },
    updateAccessToken: (state: WorkflowState, action: PayloadAction<string | undefined>) => {
      state.accessToken = action.payload;
    },
    updateSelectedWorkFlows: (state: WorkflowState, action: PayloadAction<{ selectedWorkflows: Array<WorkflowsList> }>) => {
      const { selectedWorkflows } = action.payload;
      (state as InitializedWorkflowState).exportData.selectedWorkflows = selectedWorkflows;
    },
    updateSelectedSubscripton: (state: WorkflowState, action: PayloadAction<{ selectedSubscription: string }>) => {
      const { selectedSubscription } = action.payload;
      (state as InitializedWorkflowState).exportData.selectedSubscription = selectedSubscription;
      (state as InitializedWorkflowState).exportData.selectedIse = '';
      (state as InitializedWorkflowState).exportData.selectedWorkflows = [];
    },
    updateSelectedLocation: (state: WorkflowState, action: PayloadAction<{ selectedIse: string; location: string }>) => {
      const { selectedIse, location } = action.payload;
      (state as InitializedWorkflowState).exportData.selectedIse = selectedIse;
      (state as InitializedWorkflowState).exportData.location = location;
      (state as InitializedWorkflowState).exportData.selectedWorkflows = [];
    },
    updateValidationState: (state: WorkflowState, action: PayloadAction<{ validationState: string }>) => {
      const { validationState } = action.payload;
      (state as InitializedWorkflowState).exportData.validationState = validationState;
    },
    updateTargetDirectory: (state: WorkflowState, action: PayloadAction<{ targetDirectory: ITargetDirectory }>) => {
      const { targetDirectory } = action.payload;
      (state as InitializedWorkflowState).exportData.targetDirectory = targetDirectory;
    },
    updatePackageUrl: (state: WorkflowState, action: PayloadAction<{ packageUrl: string }>) => {
      const { packageUrl } = action.payload;
      (state as InitializedWorkflowState).exportData.packageUrl = packageUrl;
    },
    updateManagedConnections: (state: WorkflowState, action: PayloadAction<ManagedConnections>) => {
      (state as InitializedWorkflowState).exportData.managedConnections = action.payload;
    },
    addStatus: (state: WorkflowState, action: PayloadAction<{ status: string }>): void => {
      const { status } = action.payload;
      const initializedState = state as InitializedWorkflowState;
      initializedState.statuses = [...(initializedState.statuses ?? []), status];
    },
    setFinalStatus: (state: WorkflowState, action: PayloadAction<{ status: Status }>): void => {
      const { status } = action.payload;
      const initializedState = state as InitializedWorkflowState;
      initializedState.finalStatus = status;
      if (status === Status.InProgress) {
        initializedState.statuses = [];
      }
    },
    updateSelectedAdvanceOptions: (
      state: WorkflowState,
      action: PayloadAction<{ selectedAdvanceOptions: Array<AdvancedOptionsTypes> }>
    ) => {
      const { selectedAdvanceOptions } = action.payload;
      (state as InitializedWorkflowState).exportData.selectedAdvanceOptions = selectedAdvanceOptions;
    },
  },
});

// Action creators are generated for each case reducer function
export const {
  initialize,
  updateAccessToken,
  updateSelectedWorkFlows,
  updateSelectedSubscripton,
  updateSelectedLocation,
  updateValidationState,
  updateTargetDirectory,
  updatePackageUrl,
  updateManagedConnections,
  addStatus,
  setFinalStatus,
  updateSelectedAdvanceOptions,
} = workflowSlice.actions;

export default workflowSlice.reducer;
