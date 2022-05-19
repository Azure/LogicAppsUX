import { initializeOperationMetadata } from '../actions/bjsworkflow/operationdeserializer';
import type { DeserializedWorkflow } from './BJSWorkflow/BJSDeserializer';
import { Deserialize as BJSDeserialize } from './BJSWorkflow/BJSDeserializer';
import { createAsyncThunk } from '@reduxjs/toolkit';

export const initializeGraphState = createAsyncThunk(
  'parser/deserialize',
  async (workflow: LogicAppsV2.WorkflowDefinition, thunkAPI): Promise<DeserializedWorkflow> => {
    const currentState: any = thunkAPI.getState() as any;
    const spec = currentState.workflow.workflowSpec;

    if (spec === undefined) {
      throw new Error('Trying to import workflow without specifying the workflow type');
    }
    if (spec === 'BJS') {
      const deserializedWorkflow = BJSDeserialize(workflow);
      initializeOperationMetadata(deserializedWorkflow, thunkAPI.dispatch);
      return deserializedWorkflow;
    } else if (spec === 'CNCF') {
      throw new Error('Spec not implemented.');
    }
    throw new Error('Invalid Workflow Spec');
  }
);
