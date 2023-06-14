/* eslint-disable @typescript-eslint/no-empty-function */
import type { RootState } from './store';
import type { ConnectionReferences } from '@microsoft/logic-apps-designer';
import type { LogicAppsV2 } from '@microsoft/utils-logic-apps';
import type { PayloadAction } from '@reduxjs/toolkit';
import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';

export interface WorkflowLoadingState {
  resourcePath?: string;
  appId?: string;
  workflowName?: string;
  runId?: string;
  workflowDefinition: LogicAppsV2.WorkflowDefinition | null;
  runInstance: LogicAppsV2.RunInstanceDefinition | null;
  connections: ConnectionReferences;
  readOnly: boolean;
  monitoringView: boolean;
  darkMode: boolean;
  consumption: boolean;
  isLocalSelected: boolean;
  showChatBot?: boolean;
  language: string;
}

const initialState: WorkflowLoadingState = {
  workflowDefinition: null,
  runInstance: null,
  connections: {},
  resourcePath: '',
  readOnly: false,
  monitoringView: false,
  darkMode: false,
  consumption: false,
  isLocalSelected: false,
  showChatBot: false,
  language: 'en',
};

type WorkflowPayload = {
  workflowDefinition: LogicAppsV2.WorkflowDefinition;
  connectionReferences: ConnectionReferences;
};

type RunPayload = {
  runInstance: LogicAppsV2.RunInstanceDefinition;
};

export const loadWorkflow = createAsyncThunk('workflowLoadingState/loadWorkflow', async (_: void, thunkAPI) => {
  const currentState: RootState = thunkAPI.getState() as RootState;

  const wf = await import(`../../../../__mocks__/workflows/${currentState.workflowLoader.resourcePath}`);
  return {
    workflowDefinition: wf.definition as LogicAppsV2.WorkflowDefinition,
    connectionReferences: {},
  } as WorkflowPayload;
});

export const loadRun = createAsyncThunk('runLoadingState/loadRun', async (_: void, thunkAPI) => {
  const currentState: RootState = thunkAPI.getState() as RootState;
  try {
    const runInstance = await import(`../../../../__mocks__/runs/${currentState.workflowLoader.resourcePath}`);
    return { runInstance: runInstance as LogicAppsV2.RunInstanceDefinition } as RunPayload;
  } catch {
    return thunkAPI.rejectWithValue(null);
  }
});

export const workflowLoadingSlice = createSlice({
  name: 'workflowLoader',
  initialState,
  reducers: {
    changeAppid: (state, action: PayloadAction<string>) => {
      state.appId = action.payload;
    },
    changeWorkflowName: (state, action: PayloadAction<string>) => {
      state.workflowName = action.payload;
    },
    changeRunId: (state, action: PayloadAction<string>) => {
      state.runId = action.payload;
    },
    changeResourcePath: (state, action: PayloadAction<string>) => {
      state.resourcePath = action.payload;
    },
    clearWorkflowDetails: (state) => {
      state.appId = undefined;
      state.workflowName = undefined;
      state.runId = undefined;
      state.resourcePath = '';
    },
    changeLanguage: (state, action: PayloadAction<string | undefined>) => {
      state.language = action.payload ?? 'en';
    },
    setReadOnly: (state, action: PayloadAction<boolean>) => {
      state.readOnly = action.payload;
    },
    setMonitoringView: (state, action: PayloadAction<boolean>) => {
      state.monitoringView = action.payload;
      if (action.payload) {
        state.readOnly = true;
      }
    },
    setDarkMode: (state, action: PayloadAction<boolean>) => {
      state.darkMode = action.payload;
    },
    setConsumption: (state, action: PayloadAction<boolean>) => {
      state.consumption = action.payload;
    },
    setIsLocalSelected: (state, action: PayloadAction<boolean>) => {
      state.isLocalSelected = action.payload;
    },
    setIsChatBotEnabled: (state, action: PayloadAction<boolean>) => {
      state.showChatBot = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder.addCase(loadWorkflow.fulfilled, (state, action: PayloadAction<WorkflowPayload | null>) => {
      if (!action.payload) return;
      state.workflowDefinition = action.payload?.workflowDefinition;
      state.connections = action.payload?.connectionReferences ?? {};
    });
    builder.addCase(loadWorkflow.rejected, (state) => {
      state.workflowDefinition = null;
    });
    builder.addCase(loadRun.fulfilled, (state, action: PayloadAction<RunPayload | null>) => {
      if (!action.payload) return;
      state.runInstance = action.payload?.runInstance;
    });
    builder.addCase(loadRun.rejected, (state) => {
      state.runInstance = null;
    });
  },
});

export const {
  changeResourcePath,
  changeAppid,
  changeWorkflowName,
  clearWorkflowDetails,
  setReadOnly,
  setMonitoringView,
  setDarkMode,
  setConsumption,
  setIsLocalSelected,
  setIsChatBotEnabled,
  changeRunId,
  changeLanguage,
} = workflowLoadingSlice.actions;

export default workflowLoadingSlice.reducer;
