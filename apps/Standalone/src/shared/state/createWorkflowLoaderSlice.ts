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

const getInitialState = (toolboxOpen: boolean): WorkflowLoadingState => ({
  appId: undefined,
  hostingPlan: 'standard',
  isLocal: false,
  theme: ThemeType.Light,
  language: 'en',
  toolboxOpen,
});

const commonReducers = {
  setAppid: (state: WorkflowLoadingState, action: PayloadAction<string>) => {
    state.appId = action.payload;
  },
  setWorkflowName: (state: WorkflowLoadingState, action: PayloadAction<string>) => {
    state.workflowName = action.payload;
  },
  setResourcePath: (state: WorkflowLoadingState, action: PayloadAction<string>) => {
    state.resourcePath = action.payload;
  },
  clearWorkflowDetails: (state: WorkflowLoadingState) => {
    state.appId = undefined;
    state.workflowName = undefined;
    state.resourcePath = '';
  },
  setLanguage: (state: WorkflowLoadingState, action: PayloadAction<string | undefined>) => {
    state.language = action.payload ?? 'en';
  },
  setIsLocalSelected: (state: WorkflowLoadingState, action: PayloadAction<boolean>) => {
    state.isLocal = action.payload;
    state.appId = undefined;
    state.workflowName = undefined;
    state.resourcePath = '';
  },
  setHostingPlan: (state: WorkflowLoadingState, action: PayloadAction<HostingPlanTypes>) => {
    state.hostingPlan = action.payload;
    state.appId = undefined;
    state.workflowName = undefined;
    state.resourcePath = '';
  },
  changeTheme: (state: WorkflowLoadingState, action: PayloadAction<ThemeType>) => {
    state.theme = action.payload;
  },
  setToolboxOpen: (state: WorkflowLoadingState, action: PayloadAction<boolean>) => {
    state.toolboxOpen = action.payload;
  },
};

export const createWorkflowLoaderSlice = (toolboxOpen = false) =>
  createSlice({
    name: 'workflowLoader',
    initialState: getInitialState(toolboxOpen),
    reducers: commonReducers,
  });

export const createWorkflowLoaderSliceWithRunId = (toolboxOpen = false) =>
  createSlice({
    name: 'workflowLoader',
    initialState: getInitialState(toolboxOpen),
    reducers: {
      ...commonReducers,
      changeRunId: (state, action: PayloadAction<string>) => {
        state.runId = action.payload;
      },
      clearWorkflowDetails: (state) => {
        state.appId = undefined;
        state.workflowName = undefined;
        state.runId = undefined;
        state.resourcePath = '';
      },
    },
  });
