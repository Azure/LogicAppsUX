import type { PayloadAction } from '@reduxjs/toolkit';
import { createSlice } from '@reduxjs/toolkit';

export interface DeployState {
  selectedSubscription: string;
  selectedLogicApp: string;
  selectedLogicAppName: string;
  selectedResourceGroup: string;
  selectedSlot?: string;
  isLoadingSubscriptions: boolean;
  isLoadingLogicApps: boolean;
  isCreatingNew: boolean;
  newLogicAppName: string;
  newResourceGroupName: string;
  isCreatingNewResourceGroup: boolean;
  selectedLocation: string;
  selectedAppServicePlan: string;
  newAppServicePlanName: string;
  isCreatingNewAppServicePlan: boolean;
  selectedAppServicePlanSku: string;
  selectedStorageAccount: string;
  newStorageAccountName: string;
  isCreatingNewStorageAccount: boolean;
  createAppInsights: boolean;
  newAppInsightsName: string;
  appInsightsNameManuallyChanged: boolean;
  resourceGroups: Array<{ name: string; location: string }>;
  locations: Array<{ name: string; displayName: string }>;
  appServicePlans: Array<{
    id: string;
    name: string;
    location: string;
    sku: { name: string; tier: string; capacity: number; family: string; size: string };
  }>;
  storageAccounts: Array<{ id: string; name: string; location: string }>;
  error?: string;
  deploymentFolderPath?: string;
  isDeploying: boolean;
  deploymentStatus?: 'success' | 'failed';
  deploymentMessage?: string;
}

const initialState: DeployState = {
  selectedSubscription: '',
  selectedLogicApp: '',
  selectedLogicAppName: '',
  selectedResourceGroup: '',
  selectedSlot: undefined,
  isLoadingSubscriptions: false,
  isLoadingLogicApps: false,
  isCreatingNew: false,
  newLogicAppName: '',
  newResourceGroupName: '',
  isCreatingNewResourceGroup: false,
  selectedLocation: '',
  selectedAppServicePlan: '',
  newAppServicePlanName: '',
  isCreatingNewAppServicePlan: true,
  selectedAppServicePlanSku: 'WS1',
  selectedStorageAccount: '',
  newStorageAccountName: '',
  isCreatingNewStorageAccount: true,
  createAppInsights: true,
  newAppInsightsName: '',
  appInsightsNameManuallyChanged: false,
  resourceGroups: [],
  locations: [],
  appServicePlans: [],
  storageAccounts: [],
  error: undefined,
  deploymentFolderPath: undefined,
  isDeploying: false,
  deploymentStatus: undefined,
  deploymentMessage: undefined,
};

export const deploySlice = createSlice({
  name: 'deploy',
  initialState,
  reducers: {
    setSelectedSubscription: (state, action: PayloadAction<string>) => {
      state.selectedSubscription = action.payload;
      state.selectedLogicApp = '';
      state.selectedLogicAppName = '';
      state.selectedResourceGroup = '';
      state.selectedSlot = undefined;
    },
    setSelectedLogicApp: (state, action: PayloadAction<{ id: string; name: string; resourceGroup: string }>) => {
      state.selectedLogicApp = action.payload.id;
      state.selectedLogicAppName = action.payload.name;
      state.selectedResourceGroup = action.payload.resourceGroup;
      state.isCreatingNew = false;
    },
    setIsCreatingNew: (state, action: PayloadAction<boolean>) => {
      state.isCreatingNew = action.payload;
      if (action.payload) {
        state.selectedLogicApp = '';
        state.selectedLogicAppName = '';
        state.appInsightsNameManuallyChanged = false;
      }
    },
    setNewLogicAppName: (state, action: PayloadAction<string>) => {
      state.newLogicAppName = action.payload;
      state.appInsightsNameManuallyChanged = false;
    },
    setSelectedResourceGroup: (state, action: PayloadAction<string>) => {
      state.selectedResourceGroup = action.payload;
      state.isCreatingNewResourceGroup = action.payload === '__CREATE_NEW__';
    },
    setNewResourceGroupName: (state, action: PayloadAction<string>) => {
      state.newResourceGroupName = action.payload;
    },
    setSelectedLocation: (state, action: PayloadAction<string>) => {
      state.selectedLocation = action.payload;
    },
    setResourceGroups: (state, action: PayloadAction<Array<{ name: string; location: string }>>) => {
      state.resourceGroups = action.payload;
    },
    setLocations: (state, action: PayloadAction<Array<{ name: string; displayName: string }>>) => {
      state.locations = action.payload;
    },
    setSelectedAppServicePlan: (state, action: PayloadAction<string>) => {
      state.selectedAppServicePlan = action.payload;
      state.isCreatingNewAppServicePlan = action.payload === '__CREATE_NEW__';
    },
    setNewAppServicePlanName: (state, action: PayloadAction<string>) => {
      state.newAppServicePlanName = action.payload;
    },
    setSelectedAppServicePlanSku: (state, action: PayloadAction<string>) => {
      state.selectedAppServicePlanSku = action.payload;
    },
    setAppServicePlans: (
      state,
      action: PayloadAction<
        Array<{
          id: string;
          name: string;
          location: string;
          sku: { name: string; tier: string; capacity: number; family: string; size: string };
        }>
      >
    ) => {
      state.appServicePlans = action.payload;
    },
    setSelectedStorageAccount(state, action: PayloadAction<string>) {
      state.selectedStorageAccount = action.payload;
      state.isCreatingNewStorageAccount = action.payload === '__CREATE_NEW__';
    },
    setNewStorageAccountName(state, action: PayloadAction<string>) {
      state.newStorageAccountName = action.payload;
    },
    setCreateAppInsights(state, action: PayloadAction<boolean>) {
      state.createAppInsights = action.payload;
    },
    setNewAppInsightsName(state, action: PayloadAction<string>) {
      state.newAppInsightsName = action.payload;
      state.appInsightsNameManuallyChanged = true;
    },
    setStorageAccounts(state, action: PayloadAction<Array<{ id: string; name: string; location: string }>>) {
      state.storageAccounts = action.payload;
    },
    setSelectedSlot: (state, action: PayloadAction<string | undefined>) => {
      state.selectedSlot = action.payload;
    },
    setLoadingSubscriptions: (state, action: PayloadAction<boolean>) => {
      state.isLoadingSubscriptions = action.payload;
    },
    setLoadingLogicApps: (state, action: PayloadAction<boolean>) => {
      state.isLoadingLogicApps = action.payload;
    },
    setError: (state, action: PayloadAction<string | undefined>) => {
      state.error = action.payload;
    },
    setDeploymentFolderPath: (state, action: PayloadAction<string>) => {
      state.deploymentFolderPath = action.payload;
    },
    setDeploying: (state, action: PayloadAction<boolean>) => {
      state.isDeploying = action.payload;
    },
    setDeploymentStatus: (state, action: PayloadAction<{ status: 'success' | 'failed'; message?: string }>) => {
      state.deploymentStatus = action.payload.status;
      state.deploymentMessage = action.payload.message;
      state.isDeploying = false;
    },
    resetDeployState: () => initialState,
  },
});

export const {
  setSelectedSubscription,
  setSelectedLogicApp,
  setIsCreatingNew,
  setNewLogicAppName,
  setSelectedResourceGroup,
  setNewResourceGroupName,
  setSelectedLocation,
  setResourceGroups,
  setLocations,
  setSelectedAppServicePlan,
  setNewAppServicePlanName,
  setSelectedAppServicePlanSku,
  setAppServicePlans,
  setSelectedStorageAccount,
  setNewStorageAccountName,
  setCreateAppInsights,
  setNewAppInsightsName,
  setStorageAccounts,
  setSelectedSlot,
  setLoadingSubscriptions,
  setLoadingLogicApps,
  setError,
  setDeploymentFolderPath,
  setDeploying,
  setDeploymentStatus,
  resetDeployState,
} = deploySlice.actions;

export default deploySlice.reducer;
