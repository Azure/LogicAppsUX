/* eslint-disable @typescript-eslint/no-empty-function */
import type { PayloadAction } from '@reduxjs/toolkit';
import { createSlice } from '@reduxjs/toolkit';
import { Theme as ThemeType } from '@microsoft/logic-apps-shared';

export interface WorkflowLoadingState {
  resourcePath?: string;
  appId?: string;
  workflowName?: string;
  runId?: string;
  isConsumption: boolean;
  theme: ThemeType;
}

const initialState: WorkflowLoadingState = {
  appId: undefined,
  isConsumption: false,
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
    setConsumption: (state, action: PayloadAction<boolean>) => {
      state.isConsumption = action.payload;
      state.appId = undefined;
      state.workflowName = undefined;
      state.resourcePath = '';
    },
    changeTheme: (state, action: PayloadAction<ThemeType>) => {
      state.theme = action.payload;
    },
  },
});

export const { setResourcePath, setAppid, setWorkflowName, clearWorkflowDetails, setConsumption, changeRunId } =
  workflowLoaderSlice.actions;

export default workflowLoaderSlice.reducer;
