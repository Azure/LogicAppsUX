import { createAsyncThunk } from '@reduxjs/toolkit';
import { RootState } from '../store';
import { Deserialize as BJSDeserialize } from './BJSWorkflow/BJSDeserializer';

export const initializeGraphState = createAsyncThunk('users/fetchByIdStatus', async (graph: LogicAppsV2.WorkflowDefinition, thunkAPI) => {
  const currentState: RootState = thunkAPI.getState() as RootState;
  const spec = currentState.workflow.workflowSpec;

  if (spec === undefined) {
    throw new Error('Trying to import workflow without specifying the workflow type');
  }
  if (spec === 'BJS') {
    return BJSDeserialize(graph);
  } else if (spec === 'CNCF') {
    throw new Error('Spec not implemented.');
  }
  throw new Error('Invalid Workflow Spec');
});
