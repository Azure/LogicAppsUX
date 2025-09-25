import type { PayloadAction } from '@reduxjs/toolkit';
import { createSlice } from '@reduxjs/toolkit';
import { resetMcpState } from '../global';

interface CreateDetails {
  createStatus?: 'inprogress' | 'failed' | 'succeeded';
  errorMessage?: string;
}

interface ResourceDetails extends CreateDetails {
  id: string;
  isNew?: boolean;
}

export interface LogicAppConfigDetails extends CreateDetails {
  isValid: boolean;
  appName: string;
  appServicePlan: ResourceDetails & { sku: string };
  storageAccount: ResourceDetails;
  appInsights?: ResourceDetails;
}

export interface ResourceState {
  subscriptionId: string;
  resourceGroup: string;
  location: string;
  logicAppName?: string;
  newLogicAppDetails?: LogicAppConfigDetails;
}

const initialState: ResourceState = {
  subscriptionId: '',
  resourceGroup: '',
  location: '',
};

interface InitialResourceState {
  subscriptionId: string;
  resourceGroup: string;
  location: string;
}

export const resourceSlice = createSlice({
  name: 'resource',
  initialState,
  reducers: {
    setInitialData: (state, action: PayloadAction<InitialResourceState>) => {
      const { subscriptionId, resourceGroup, location } = action.payload;

      state.subscriptionId = subscriptionId;
      state.resourceGroup = resourceGroup;
      state.location = location;
    },
    setLogicApp: (state, action: PayloadAction<{ resourceGroup: string; location: string; logicAppName: string; isNew?: boolean }>) => {
      const { resourceGroup, location, logicAppName, isNew } = action.payload;
      state.resourceGroup = resourceGroup;
      state.location = location;
      state.logicAppName = logicAppName;

      if (isNew) {
        state.newLogicAppDetails = {
          ...state.newLogicAppDetails,
          createStatus: 'succeeded',
        } as LogicAppConfigDetails;
      }
    },
    setNewLogicAppDetails: (state, action: PayloadAction<Partial<LogicAppConfigDetails>>) => {
      state.newLogicAppDetails = {
        ...state.newLogicAppDetails,
        ...action.payload,
      } as LogicAppConfigDetails;
    },
    clearNewLogicAppDetails: (state) => {
      state.newLogicAppDetails = undefined;
    },
  },
  extraReducers: (builder) => {
    builder.addCase(resetMcpState, () => initialState);
  },
});

export const { setInitialData, setLogicApp, setNewLogicAppDetails, clearNewLogicAppDetails } = resourceSlice.actions;
export default resourceSlice.reducer;
