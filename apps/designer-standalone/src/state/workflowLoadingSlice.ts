/* eslint-disable @typescript-eslint/no-empty-function */
import type { RootState } from './store';
import type { PayloadAction } from '@reduxjs/toolkit';
import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';

export interface WorkflowLoadingState {
  armToken?: string;
  resourcePath?: string;
  loadingMethod: 'file' | 'arm';
  workflowDefinition?: LogicAppsV2.WorkflowDefinition | null;
  readOnly: boolean;
  monitoringView: boolean;
}

const initialState: WorkflowLoadingState = {
  loadingMethod: 'file',
  resourcePath: 'simpleBigworkflow.json',
  readOnly: false,
  monitoringView: false,
};

export const loadWorkflow = createAsyncThunk('workflowLoadingState/loadWorkflow', async (_: void, thunkAPI) => {
  const currentState: RootState = thunkAPI.getState() as RootState;
  if (currentState.workflowLoader.loadingMethod === 'arm') {
    const results = await fetch(`https://management.azure.com/${currentState.workflowLoader.resourcePath}?api-version=2020-06-01`, {
      headers: {
        Authorization: `Bearer ${currentState.workflowLoader.armToken}`,
      },
    });
    if (results.status === 200) {
      const wf = await results.json();
      const def = wf.properties.files['workflow.json'].definition;
      return def;
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
    builder.addCase(loadWorkflow.fulfilled, (state, action) => {
      state.workflowDefinition = action.payload;
    });
    builder.addCase(loadWorkflow.rejected, (state) => {
      state.workflowDefinition = null;
    });
  },
});

export const { changeArmToken, changeResourcePath, changeLoadingMethod, setReadOnly, setMonitoringView } = workflowLoadingSlice.actions;

export default workflowLoadingSlice.reducer;
