import { createAsyncThunk } from '@reduxjs/toolkit';

import { Deserialize as BJSDeserialize } from './BJSWorkflow/BJSDeserializer';
import { WorkflowGraph } from './models/workflowNode';

export const initializeGraphState = createAsyncThunk(
  'parser/deserialize',
  async (graph: LogicAppsV2.WorkflowDefinition, thunkAPI): Promise<{ graph: WorkflowGraph; actionData: LogicAppsV2.Actions }> => {
    const currentState: any = thunkAPI.getState() as any;
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
  }
);
