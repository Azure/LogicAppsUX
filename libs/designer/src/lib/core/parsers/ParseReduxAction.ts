import type { Workflow } from '../../common/models/workflow';
import { getConnectionsApiAndMapping } from '../actions/bjsworkflow/connections';
import { parseWorkflowParameters } from '../actions/bjsworkflow/initialize';
import { initializeOperationMetadata, updateDynamicDataInNodes } from '../actions/bjsworkflow/operationdeserializer';
import { getConnectionsQuery } from '../queries/connections';
import { addInvokerSupport, initializeConnectionReferences } from '../state/connection/connectionSlice';
import { initializeStaticResultProperties } from '../state/staticresultschema/staticresultsSlice';
import type { RootState } from '../store';
import type { DeserializedWorkflow } from './BJSWorkflow/BJSDeserializer';
import { Deserialize as BJSDeserialize } from './BJSWorkflow/BJSDeserializer';
import type { WorkflowNode } from './models/workflowNode';
import type { LogicAppsV2 } from '@microsoft/utils-logic-apps';
import { createAsyncThunk } from '@reduxjs/toolkit';

export const initializeGraphState = createAsyncThunk<
  DeserializedWorkflow,
  { workflowDefinition: Workflow; runInstance: LogicAppsV2.RunInstanceDefinition | null | undefined },
  { state: RootState }
>('parser/deserialize', async (graphState: { workflowDefinition: Workflow; runInstance: any }, thunkAPI): Promise<DeserializedWorkflow> => {
  const { workflowDefinition, runInstance } = graphState;
  const { workflow } = thunkAPI.getState() as RootState;
  const spec = workflow.workflowSpec;

  if (spec === undefined) {
    throw new Error('Trying to import workflow without specifying the workflow type');
  }
  if (spec === 'BJS') {
    getConnectionsQuery();
    const { definition, connectionReferences, parameters } = workflowDefinition;
    const deserializedWorkflow = BJSDeserialize(definition, runInstance);
    // For situations where there is an existing workflow, respect the node heights so that
    // they are not reset
    const previousGraphFlattened = flattenWorkflowNodes(deserializedWorkflow?.graph?.children || []);
    updateChildrenHeight(workflow?.graph?.children || [], previousGraphFlattened);

    thunkAPI.dispatch(initializeConnectionReferences(connectionReferences ?? {}));
    thunkAPI.dispatch(initializeStaticResultProperties(deserializedWorkflow.staticResults ?? {}));
    thunkAPI.dispatch(addInvokerSupport({ connectionReferences }));
    parseWorkflowParameters(parameters ?? {}, thunkAPI.dispatch);

    const asyncInitialize = async () => {
      await initializeOperationMetadata(
        deserializedWorkflow,
        thunkAPI.getState().connections.connectionReferences,
        parameters ?? {},
        thunkAPI.dispatch
      );
      const actionsAndTriggers = deserializedWorkflow.actionData;
      await getConnectionsApiAndMapping(actionsAndTriggers, thunkAPI.getState, thunkAPI.dispatch);
      await updateDynamicDataInNodes(thunkAPI.getState, thunkAPI.dispatch);
    };
    asyncInitialize();

    return deserializedWorkflow;
  } else if (spec === 'CNCF') {
    throw new Error('Spec not implemented.');
  }
  throw new Error('Invalid Workflow Spec');
});

function updateChildrenHeight(currentChildren: WorkflowNode[], previousChildren: WorkflowNode[]) {
  for (const node of currentChildren) {
    const previousNode = previousChildren.find((item) => item.id === node.id);
    if (previousNode?.height && previousNode?.width) {
      node.height = previousNode.height;
      node.width = previousNode.width;
    }
    updateChildrenHeight(node.children || [], previousChildren);
  }
}

function flattenWorkflowNodes(nodes: WorkflowNode[]): WorkflowNode[] {
  const result: WorkflowNode[] = [];

  for (const node of nodes) {
    if (node.children) {
      const flattenedChildren = flattenWorkflowNodes(node.children);
      result.push(...flattenedChildren);
    }

    // make a copy of the current node before modifying its children
    const nodeCopy = { ...node };
    nodeCopy.children = undefined;
    result.push(nodeCopy);
  }

  return result;
}
