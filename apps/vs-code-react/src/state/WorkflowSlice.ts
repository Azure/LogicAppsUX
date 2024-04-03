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
  reviewContent?: IValidationData;
  hostVersion?: string;
  isWorkflowRuntimeRunning?: boolean;
}

export const Status = {
  InProgress: 'InProgress',
  Succeeded: 'Succeeded',
  Failed: 'Failed',
};
export type Status = (typeof Status)[keyof typeof Status];

export interface WorkflowState {
  accessToken?: string;
  cloudHost?: string;
  corsNotice?: string;
  apiVersion: string;
  baseUrl: string;
  workflowProperties: OverviewPropertiesProps;
  exportData: ExportData;
  statuses?: string[];
  finalStatus?: Status;
  reviewContent?: IValidationData;
  hostVersion?: string;
  isWorkflowRuntimeRunning?: boolean;
}

const initialState: WorkflowState = {
  baseUrl: '/url',
  apiVersion: '2018-07-01-preview',
  workflowProperties: {
    name: '',
    stateType: '',
  },
  exportData: {
    selectedWorkflows: [],
    selectedSubscription: 'subscriptionId',
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
    selectedAdvanceOptions: [],
  },
};

export const workflowSlice = createSlice({
  name: 'workflow',
  initialState: initialState as WorkflowState,
  reducers: {
    initializeWorkflow: (state: WorkflowState, action: PayloadAction<InitializePayload>) => {
      const {
        apiVersion,
        baseUrl,
        corsNotice,
        accessToken,
        workflowProperties,
        reviewContent,
        cloudHost,
        hostVersion,
        isWorkflowRuntimeRunning,
      } = action.payload;
      const initializedState = state;
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
      initializedState.isWorkflowRuntimeRunning = isWorkflowRuntimeRunning;
    },
    updateAccessToken: (state: WorkflowState, action: PayloadAction<string | undefined>) => {
      state.accessToken = action.payload;
    },
    updateSelectedWorkFlows: (state: WorkflowState, action: PayloadAction<{ selectedWorkflows: Array<WorkflowsList> }>) => {
      const { selectedWorkflows } = action.payload;
      state.exportData.selectedWorkflows = selectedWorkflows;
    },
    updateSelectedSubscripton: (state: WorkflowState, action: PayloadAction<{ selectedSubscription: string }>) => {
      const { selectedSubscription } = action.payload;
      state.exportData.selectedSubscription = selectedSubscription;
      state.exportData.selectedIse = '';
      state.exportData.selectedWorkflows = [];
    },
    updateSelectedLocation: (state: WorkflowState, action: PayloadAction<{ selectedIse: string; location: string }>) => {
      const { selectedIse, location } = action.payload;
      state.exportData.selectedIse = selectedIse;
      state.exportData.location = location;
      state.exportData.selectedWorkflows = [];
    },
    updateValidationState: (state: WorkflowState, action: PayloadAction<{ validationState: string }>) => {
      const { validationState } = action.payload;
      state.exportData.validationState = validationState;
    },
    updateTargetDirectory: (state: WorkflowState, action: PayloadAction<{ targetDirectory: ITargetDirectory }>) => {
      const { targetDirectory } = action.payload;
      state.exportData.targetDirectory = targetDirectory;
    },
    updatePackageUrl: (state: WorkflowState, action: PayloadAction<{ packageUrl: string }>) => {
      const { packageUrl } = action.payload;
      state.exportData.packageUrl = packageUrl;
    },
    updateManagedConnections: (state: WorkflowState, action: PayloadAction<ManagedConnections>) => {
      state.exportData.managedConnections = action.payload;
    },
    addStatus: (state: WorkflowState, action: PayloadAction<{ status: string }>): void => {
      const { status } = action.payload;
      const initializedState = state;
      initializedState.statuses = [...(initializedState.statuses ?? []), status];
    },
    setFinalStatus: (state: WorkflowState, action: PayloadAction<{ status: Status }>): void => {
      const { status } = action.payload;
      const initializedState = state;
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
      state.exportData.selectedAdvanceOptions = selectedAdvanceOptions;
    },
  },
});

// Action creators are generated for each case reducer function
export const {
  initializeWorkflow,
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
