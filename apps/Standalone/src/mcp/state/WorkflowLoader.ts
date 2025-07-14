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
  isLocal: boolean;
  theme: ThemeType;
  language: string;
  enableResourceSelection?: boolean;
  toolboxOpen?: boolean;
}

const initialState: WorkflowLoadingState = {
  appId: undefined,
  hostingPlan: 'standard',
  isLocal: false,
  theme: ThemeType.Light,
  language: 'en',
  toolboxOpen: false,
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
    setLanguage: (state, action: PayloadAction<string | undefined>) => {
      state.language = action.payload ?? 'en';
    },
    setIsLocalSelected: (state, action: PayloadAction<boolean>) => {
      state.isLocal = action.payload;
      state.appId = undefined;
      state.workflowName = undefined;
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
    setToolboxOpen: (state, action: PayloadAction<boolean>) => {
      state.toolboxOpen = action.payload;
    },
  },
});

export const { setResourcePath, setAppid, setWorkflowName, clearWorkflowDetails, setHostingPlan, changeRunId, setToolboxOpen } =
  workflowLoaderSlice.actions;

export default workflowLoaderSlice.reducer;
