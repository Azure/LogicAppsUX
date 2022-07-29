import type { Workflow } from '../../common/models/workflow';
import { getConnectionsApiAndMapping } from '../actions/bjsworkflow/connections';
import { initializeOperationMetadata } from '../actions/bjsworkflow/operationdeserializer';
import { initializeConnectionReferences } from '../state/connection/connectionSlice';
import type { WorkflowState } from '../state/workflow/workflowSlice';
import type { RootState } from '../store';
import type { DeserializedWorkflow } from './BJSWorkflow/BJSDeserializer';
import { Deserialize as BJSDeserialize } from './BJSWorkflow/BJSDeserializer';
import { createAsyncThunk } from '@reduxjs/toolkit';

export const initializeGraphState = createAsyncThunk<DeserializedWorkflow, Workflow, { state: RootState }>(
  'parser/deserialize',
  async (workflowDefinition: Workflow, thunkAPI): Promise<DeserializedWorkflow> => {
    const { workflow } = thunkAPI.getState() as { workflow: WorkflowState };
    const spec = workflow.workflowSpec;

    if (spec === undefined) {
      throw new Error('Trying to import workflow without specifying the workflow type');
    }
    if (spec === 'BJS') {
      const deserializedWorkflow = BJSDeserialize(workflowDefinition.definition);
      thunkAPI.dispatch(initializeConnectionReferences(workflowDefinition.connectionReferences ?? {})); // danielle I think we need
      const operationMetadataPromise = initializeOperationMetadata(deserializedWorkflow, thunkAPI.dispatch);
      const actionsAndTriggers = deserializedWorkflow.actionData;
      getConnectionsApiAndMapping(actionsAndTriggers, thunkAPI.getState, thunkAPI.dispatch, operationMetadataPromise);
      return deserializedWorkflow;
    } else if (spec === 'CNCF') {
      throw new Error('Spec not implemented.');
    }
    throw new Error('Invalid Workflow Spec');
  }
);
