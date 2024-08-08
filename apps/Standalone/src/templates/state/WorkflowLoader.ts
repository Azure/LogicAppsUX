/* eslint-disable @typescript-eslint/no-empty-function */
import type { PayloadAction } from '@reduxjs/toolkit';
import { createSlice } from '@reduxjs/toolkit';
import { Theme as ThemeType } from '@microsoft/logic-apps-shared';
import type { HostingPlanTypes } from '../../designer/state/workflowLoadingSlice';

export interface WorkflowLoadingState {
  resourcePath?: string;
  appId?: string;
  workflowName?: string;
  runId?: string;
  hostingPlan: HostingPlanTypes;
  theme: ThemeType;
}

const initialState: WorkflowLoadingState = {
  appId: undefined,
  hostingPlan: 'standard',
  theme: ThemeType.Light,
};

export const workflowLoaderSlice = createSlice({
  name: 'workflowLoader',
  initialState,
  reducers: {
    setAppid: (state, action: PayloadAction<string>) => {
      state.appId = action.payload;
    },
    setWorkflowName: (state, action: PayloadAction<string>) => {
      state.workflowName = action.payload;
    },
    changeRunId: (state, action: PayloadAction<string>) => {
      state.runId = action.payload;
    },
    setResourcePath: (state, action: PayloadAction<string>) => {
      state.resourcePath = action.payload;
    },
    clearWorkflowDetails: (state) => {
      state.appId = undefined;
      state.workflowName = undefined;
      state.runId = undefined;
      state.resourcePath = '';
    },
    setHostingPlan: (state, action: PayloadAction<HostingPlanTypes>) => {
      state.hostingPlan = action.payload;
      state.appId = undefined;
      state.workflowName = undefined;
      state.resourcePath = '';
    },
    changeTheme: (state, action: PayloadAction<ThemeType>) => {
      state.theme = action.payload;
    },
  },
});

export const { setResourcePath, setAppid, setWorkflowName, clearWorkflowDetails, setHostingPlan, changeRunId } =
  workflowLoaderSlice.actions;

export default workflowLoaderSlice.reducer;
