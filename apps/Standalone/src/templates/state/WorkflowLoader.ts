/* eslint-disable @typescript-eslint/no-empty-function */
import type { ConnectionReferences } from '@microsoft/logic-apps-designer';
import type { RootState } from './Store';
import type { LogicAppsV2 } from '@microsoft/logic-apps-shared';
import type { PayloadAction } from '@reduxjs/toolkit';
import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';

export interface WorkflowLoadingState {
  resourcePath?: string;
  appId?: string;
  workflowName?: string;
  runId?: string;
  isConsumption: boolean;
}

const initialState: WorkflowLoadingState = {
  appId: undefined,
  isConsumption: false,
};

type WorkflowPayload = {
  workflowDefinition: LogicAppsV2.WorkflowDefinition;
  connectionReferences: ConnectionReferences;
};

type RunPayload = {
  runInstance: LogicAppsV2.RunInstanceDefinition;
};

export const loadWorkflow = createAsyncThunk('workflowLoadingState/loadWorkflow', async (_: unknown, thunkAPI) => {
  const currentState: RootState = thunkAPI.getState() as RootState;

  const wf = await import(`../../../../../__mocks__/workflows/${currentState.workflowLoader.resourcePath?.split('.')[0]}.json`);
  return {
    workflowDefinition: wf.definition as LogicAppsV2.WorkflowDefinition,
    connectionReferences: {},
  } as WorkflowPayload;
});

export const loadRun = createAsyncThunk('runLoadingState/loadRun', async (_: unknown, thunkAPI) => {
  const currentState: RootState = thunkAPI.getState() as RootState;
  try {
    const runInstance = await import(`../../../../../__mocks__/runs/${currentState.workflowLoader.resourcePath?.split('.')[0]}.json`);
    return { runInstance: runInstance as LogicAppsV2.RunInstanceDefinition } as RunPayload;
  } catch {
    return thunkAPI.rejectWithValue(null);
  }
});

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
  },
});

export const { setResourcePath, setAppid, setWorkflowName, clearWorkflowDetails, setConsumption, changeRunId } =
  workflowLoaderSlice.actions;

export default workflowLoaderSlice.reducer;
