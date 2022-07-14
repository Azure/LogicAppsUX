/* eslint-disable @typescript-eslint/no-empty-function */
import type { RootState } from './store';
import type { ConnectionsJSON } from '@microsoft-logic-apps/utils';
import type { PayloadAction } from '@reduxjs/toolkit';
import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';

export interface WorkflowLoadingState {
  armToken?: string;
  resourcePath?: string;
  loadingMethod: 'file' | 'arm';
  workflowDefinition: LogicAppsV2.WorkflowDefinition | null;
  connections: ConnectionsJSON | null;
  readOnly: boolean;
  monitoringView: boolean;
}

const initialState: WorkflowLoadingState = {
  workflowDefinition: null,
  connections: null,
  loadingMethod: 'file',
  resourcePath: 'simpleBigworkflow.json',
  readOnly: false,
  monitoringView: false,
};

type WorkflowPayload = {
  workflowDefinition: LogicAppsV2.WorkflowDefinition;
  connections: ConnectionsJSON;
};

export const loadWorkflow = createAsyncThunk('workflowLoadingState/loadWorkflow', async (_: void, thunkAPI) => {
  const currentState: RootState = thunkAPI.getState() as RootState;
  if (currentState.workflowLoader.loadingMethod === 'arm') {
    const results = await fetch(
      `https://management.azure.com/${currentState.workflowLoader.resourcePath}?api-version=2020-06-01&$expand=connections.json`,
      {
        headers: {
          Authorization: `Bearer ${currentState.workflowLoader.armToken}`,
        },
      }
    );
    if (results.status === 200) {
      const wf = await results.json();
      const workflowDefinition = wf.properties.files['workflow.json'].definition;
      const connections = wf.properties.files['connections.json'] as ConnectionsJSON;
      return { workflowDefinition, connections } as WorkflowPayload;
    } else {
      return null;
    }
  } else {
    try {
      const wf = await import(`../../../../__mocks__/workflows/${currentState.workflowLoader.resourcePath}`);
      return wf.definition;
    } catch {
      return null;
    }
  }
});
export const workflowLoadingSlice = createSlice({
  name: 'workflowLoader',
  initialState,
  reducers: {
    changeArmToken: (state, action: PayloadAction<string>) => {
      state.armToken = action.payload;
    },
    changeResourcePath: (state, action: PayloadAction<string>) => {
      state.resourcePath = action.payload;
    },
    changeLoadingMethod: (state, action: PayloadAction<'file' | 'arm'>) => {
      state.loadingMethod = action.payload;
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
  },
  extraReducers: (builder) => {
    builder.addCase(loadWorkflow.fulfilled, (state, action: PayloadAction<WorkflowPayload>) => {
      state.workflowDefinition = action.payload?.workflowDefinition;
      state.connections = action.payload?.connections;
    });
    builder.addCase(loadWorkflow.rejected, (state) => {
      state.workflowDefinition = null;
    });
  },
});

export const { changeArmToken, changeResourcePath, changeLoadingMethod, setReadOnly, setMonitoringView } = workflowLoadingSlice.actions;

export default workflowLoadingSlice.reducer;
