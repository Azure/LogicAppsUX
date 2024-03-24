import type { Workflow } from '../../common/models/workflow';
import { getConnectionsApiAndMapping } from '../actions/bjsworkflow/connections';
import { updateWorkflowParameters } from '../actions/bjsworkflow/initialize';
import { initializeOperationMetadata, updateDynamicDataInNodes } from '../actions/bjsworkflow/operationdeserializer';
import { getConnectionsQuery } from '../queries/connections';
import { initializeConnectionReferences } from '../state/connection/connectionSlice';
import { initializeStaticResultProperties } from '../state/staticresultschema/staticresultsSlice';
import type { RootState } from '../store';
import type { DeserializedWorkflow } from './BJSWorkflow/BJSDeserializer';
import { Deserialize as BJSDeserialize } from './BJSWorkflow/BJSDeserializer';
import type { WorkflowNode } from './models/workflowNode';
import { LoggerService, Status } from '@microsoft/logic-apps-shared';
import type { LogicAppsV2 } from '@microsoft/logic-apps-shared';
import { createAsyncThunk } from '@reduxjs/toolkit';
import { batch } from 'react-redux';

interface InitWorkflowPayload {
  deserializedWorkflow: DeserializedWorkflow;
  originalDefinition: LogicAppsV2.WorkflowDefinition;
}

export const initializeGraphState = createAsyncThunk<
  InitWorkflowPayload,
  { workflowDefinition: Workflow; runInstance: LogicAppsV2.RunInstanceDefinition | null | undefined },
  { state: RootState }
>('parser/deserialize', async (graphState: { workflowDefinition: Workflow; runInstance: any }, thunkAPI): Promise<InitWorkflowPayload> => {
  const { workflowDefinition, runInstance } = graphState;
  const { workflow, designerOptions } = thunkAPI.getState() as RootState;
  const spec = workflow.workflowSpec;

  if (spec === undefined) {
    throw new Error('Trying to import workflow without specifying the workflow type');
  }
  if (spec === 'BJS') {
    const traceId = LoggerService().startTrace({
      name: 'Initialize Graph State',
      action: 'initializeGraphState',
      source: 'ParseReduxAction.ts',
    });

    getConnectionsQuery();
    const { definition, connectionReferences, parameters } = workflowDefinition;
    const deserializedWorkflow = BJSDeserialize(definition, runInstance);
    // For situations where there is an existing workflow, respect the node dimensions so that they are not reset
    const previousGraphFlattened = flattenWorkflowNodes(workflow.graph?.children || []);
    updateChildrenDimensions(deserializedWorkflow?.graph?.children || [], previousGraphFlattened);

    thunkAPI.dispatch(initializeConnectionReferences(connectionReferences ?? {}));
    thunkAPI.dispatch(initializeStaticResultProperties(deserializedWorkflow.staticResults ?? {}));
    updateWorkflowParameters(parameters ?? {}, thunkAPI.dispatch);

    const asyncInitialize = async () => {
      batch(async () => {
        try {
          await Promise.all([
            initializeOperationMetadata(
              deserializedWorkflow,
              thunkAPI.getState().connections.connectionReferences,
              parameters ?? {},
              workflow.workflowKind,
              designerOptions.hostOptions.forceEnableSplitOn ?? false,
              thunkAPI.dispatch
            ),
            getConnectionsApiAndMapping(deserializedWorkflow, thunkAPI.dispatch),
          ]);
          await updateDynamicDataInNodes(thunkAPI.getState, thunkAPI.dispatch);

          LoggerService().endTrace(traceId, { status: Status.Success });
        } catch (e) {
          LoggerService().endTrace(traceId, { status: Status.Failure });
        }
      });
    };
    asyncInitialize();

    return { deserializedWorkflow, originalDefinition: definition };
  } else if (spec === 'CNCF') {
    throw new Error('Spec not implemented.');
  }
  throw new Error('Invalid Workflow Spec');
});

export function updateChildrenDimensions(currentChildren: WorkflowNode[], previousChildren: WorkflowNode[]) {
  for (const node of currentChildren) {
    const previousNode = previousChildren.find((item) => item.id === node.id);
    if (previousNode?.height && previousNode?.width) {
      node.height = previousNode.height;
      node.width = previousNode.width;
    }
    updateChildrenDimensions(node.children || [], previousChildren);
  }
}

export function flattenWorkflowNodes(nodes: WorkflowNode[]): WorkflowNode[] {
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
