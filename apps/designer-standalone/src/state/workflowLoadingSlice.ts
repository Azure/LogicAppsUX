/* eslint-disable @typescript-eslint/no-empty-function */
import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { RootState } from './store';
export interface WorkflowLoadingState {
  armToken?: string;
  resourcePath?: string;
  loadingMethod: 'file' | 'arm';
  workflowDefinition?: LogicAppsV2.WorkflowDefinition | null;
}

const initialState: WorkflowLoadingState = {
  loadingMethod: 'file',
  resourcePath: 'simpleBigworkflow.json',
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
      console.log(wf);
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
  },
  extraReducers: (builder) => {
    builder.addCase(loadWorkflow.fulfilled, (state, action) => {
      state.workflowDefinition = action.payload;
    });
    builder.addCase(loadWorkflow.rejected, (state, action) => {
      state.workflowDefinition = null;
    });
  },
});

export const { changeArmToken, changeResourcePath, changeLoadingMethod } = workflowLoadingSlice.actions;

export default workflowLoadingSlice.reducer;
