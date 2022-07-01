import { getConnectionsApiAndMapping } from '../actions/bjsworkflow/connections';
import { initializeOperationMetadata } from '../actions/bjsworkflow/operationdeserializer';
import type { WorkflowState } from '../state/workflow/workflowSlice';
import type { RootState } from '../store';
import type { DeserializedWorkflow } from './BJSWorkflow/BJSDeserializer';
import { Deserialize as BJSDeserialize } from './BJSWorkflow/BJSDeserializer';
import { createAsyncThunk } from '@reduxjs/toolkit';

export const initializeGraphState = createAsyncThunk<DeserializedWorkflow, LogicAppsV2.WorkflowDefinition, { state: RootState }>(
  'parser/deserialize',
  async (workflowDefinition: LogicAppsV2.WorkflowDefinition, thunkAPI): Promise<DeserializedWorkflow> => {
    const { workflow } = thunkAPI.getState() as { workflow: WorkflowState };
    const spec = workflow.workflowSpec;

    if (spec === undefined) {
      throw new Error('Trying to import workflow without specifying the workflow type');
    }
    if (spec === 'BJS') {
      const deserializedWorkflow = BJSDeserialize(workflowDefinition);
      await initializeOperationMetadata(deserializedWorkflow, thunkAPI.dispatch);
      const actionsAndTriggers = deserializedWorkflow.actionData;
      getConnectionsApiAndMapping(actionsAndTriggers, thunkAPI.getState, thunkAPI.dispatch);
      return deserializedWorkflow;
    } else if (spec === 'CNCF') {
      throw new Error('Spec not implemented.');
    }
    throw new Error('Invalid Workflow Spec');
  }
);
