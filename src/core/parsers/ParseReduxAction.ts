import { createAsyncThunk } from '@reduxjs/toolkit';
import { RootState } from '../store';

export const initializeGraphState = createAsyncThunk('users/fetchByIdStatus', async (graph: LogicAppsV2.WorkflowDefinition, thunkAPI) => {
  const currentState: RootState = thunkAPI.getState() as RootState;
  const spec = currentState.workflow.workflowSpec;

  if (spec === undefined) {
    throw new Error('Trying to import workflow without specifying the workflow type');
  }
  console.log(spec);
  if (spec === 'BJS') {
    console.log(graph);
    return null;
  } else if (spec === 'CNCF') {
    console.log('NYI');
  }
  return null;
});
