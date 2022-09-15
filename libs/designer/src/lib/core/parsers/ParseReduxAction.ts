import type { Workflow } from '../../common/models/workflow';
import { getConnectionsApiAndMapping } from '../actions/bjsworkflow/connections';
import { initializeOperationMetadata, updateDynamicDataInNodes } from '../actions/bjsworkflow/operationdeserializer';
import { initializeConnectionReferences } from '../state/connection/connectionSlice';
import type { RootState } from '../store';
import type { DeserializedWorkflow } from './BJSWorkflow/BJSDeserializer';
import { Deserialize as BJSDeserialize } from './BJSWorkflow/BJSDeserializer';
import { createAsyncThunk } from '@reduxjs/toolkit';

export const initializeGraphState = createAsyncThunk<DeserializedWorkflow, Workflow, { state: RootState }>(
  'parser/deserialize',
  async (workflowDefinition: Workflow, thunkAPI): Promise<DeserializedWorkflow> => {
    const { workflow } = thunkAPI.getState() as RootState;
    const spec = workflow.workflowSpec;

    if (spec === undefined) {
      throw new Error('Trying to import workflow without specifying the workflow type');
    }
    if (spec === 'BJS') {
      const { definition, connectionReferences } = workflowDefinition;
      const deserializedWorkflow = BJSDeserialize(definition);
      thunkAPI.dispatch(initializeConnectionReferences(connectionReferences ?? {})); // danielle I think we need
      const operationMetadataPromise = initializeOperationMetadata(deserializedWorkflow, connectionReferences, thunkAPI.dispatch);
      const actionsAndTriggers = deserializedWorkflow.actionData;
      const connectionsPromise = getConnectionsApiAndMapping(
        actionsAndTriggers,
        thunkAPI.getState,
        thunkAPI.dispatch,
        operationMetadataPromise
      );

      updateDynamicDataInNodes(connectionsPromise, thunkAPI.getState, thunkAPI.dispatch);
      return deserializedWorkflow;
    } else if (spec === 'CNCF') {
      throw new Error('Spec not implemented.');
    }
    throw new Error('Invalid Workflow Spec');
  }
);
