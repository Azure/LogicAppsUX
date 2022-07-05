import { getConnectionsApiAndMapping } from '../actions/bjsworkflow/connections';
import { initializeOperationMetadata } from '../actions/bjsworkflow/operationdeserializer';
import { initializeConnectionReferences } from '../state/connectionSlice';
import type { WorkflowState } from '../state/workflowSlice';
import type { RootState } from '../store';
import type { DeserializedWorkflow } from './BJSWorkflow/BJSDeserializer';
import { Deserialize as BJSDeserialize } from './BJSWorkflow/BJSDeserializer';
import type { Workflow } from '@microsoft-logic-apps/utils';
import { emptyConnections } from '@microsoft-logic-apps/utils';
import { createAsyncThunk } from '@reduxjs/toolkit';

export const initializeGraphState = createAsyncThunk<DeserializedWorkflow, Workflow<LogicAppsV2.WorkflowDefinition>, { state: RootState }>(
  'parser/deserialize',
  async (workflowDefinition: Workflow<LogicAppsV2.WorkflowDefinition>, thunkAPI): Promise<DeserializedWorkflow> => {
    const { workflow } = thunkAPI.getState() as { workflow: WorkflowState };
    const spec = workflow.workflowSpec;

    if (spec === undefined) {
      throw new Error('Trying to import workflow without specifying the workflow type');
    }
    if (spec === 'BJS') {
      const deserializedWorkflow = BJSDeserialize(workflowDefinition.definition);
      await initializeOperationMetadata(deserializedWorkflow, thunkAPI.dispatch);
      const actionsAndTriggers = deserializedWorkflow.actionData;
      const connectionReferences = workflowDefinition.connectionReferences;
      console.log(connectionReferences);
      getConnectionsApiAndMapping(actionsAndTriggers, thunkAPI.getState, thunkAPI.dispatch);
      thunkAPI.dispatch(initializeConnectionReferences(workflowDefinition.connectionReferences ?? emptyConnections));
      return deserializedWorkflow;
    } else if (spec === 'CNCF') {
      throw new Error('Spec not implemented.');
    }
    throw new Error('Invalid Workflow Spec');
  }
);
