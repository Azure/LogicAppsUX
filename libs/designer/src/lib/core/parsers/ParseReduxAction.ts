import { getReactQueryClient } from '../ReactQueryProvider';
import type { DeserializedWorkflow } from './BJSWorkflow/BJSDeserializer';
import { Deserialize as BJSDeserialize } from './BJSWorkflow/BJSDeserializer';
import type { Operation, OperationInfo } from '@microsoft-logic-apps/designer-client-services';
import { ConnectionService, OperationManifestService } from '@microsoft-logic-apps/designer-client-services';
import { createAsyncThunk } from '@reduxjs/toolkit';

export const initializeGraphState = createAsyncThunk(
  'parser/deserialize',
  async (graph: LogicAppsV2.WorkflowDefinition, thunkAPI): Promise<DeserializedWorkflow> => {
    const currentState: any = thunkAPI.getState() as any;
    const spec = currentState.workflow.workflowSpec;

    if (spec === undefined) {
      throw new Error('Trying to import workflow without specifying the workflow type');
    }
    if (spec === 'BJS') {
      const deserialized = BJSDeserialize(graph);
      await createWorkflow(deserialized);
      return deserialized;
    } else if (spec === 'CNCF') {
      throw new Error('Spec not implemented.');
    }
    throw new Error('Invalid Workflow Spec');
  }
);

export const createWorkflow = async (deserialized: DeserializedWorkflow): Promise<void> => {
  const operations = deserialized.actionData;

  const operationPromises: Promise<Operation>[] = [];
  const connectionPromises: Promise<Operation>[] = [];
  const operationEntries = Object.entries(operations ? operations : {});
  for (let i = 0; i < operationEntries.length; i++) {
    await initializeOperationDetailsForManifest(operationEntries[i][1], operationPromises, connectionPromises);
  }
  await Promise.all(operationPromises);
  await Promise.all(connectionPromises);
  return new Promise((resolve) => null);
};

const initializeOperationDetailsForManifest = async (
  operation: LogicAppsV2.ActionDefinition,
  operationPromises: Promise<Operation>[],
  connectionPromises: Promise<Operation>[]
): Promise<void> => {
  const queryClient = getReactQueryClient();
  const connectionService = ConnectionService();
  const operationManifestService = OperationManifestService();
  const operationInfo = await queryClient.fetchQuery<OperationInfo>('deserialized', () =>
    operationManifestService.getOperationInfo(operation)
  );
  operationPromises.push(
    queryClient.fetchQuery(['manifest', { connectorId: operationInfo?.connectorId }, { operationId: operationInfo?.operationId }], () =>
      operationManifestService.getOperationManifest(
        operationInfo ? operationInfo.connectorId : '',
        operationInfo ? operationInfo.operationId : ''
      )
    )
  );

  connectionPromises.push(
    queryClient.fetchQuery(['connection', { connectorId: operationInfo?.connectorId }, { operationId: operationInfo?.operationId }], () =>
      connectionService.getConnector(operationInfo ? operationInfo.connectorId : '')
    )
  );
};

const getWorkflow = (workflow: LogicAppsV2.WorkflowDefinition): Promise<DeserializedWorkflow> => {
  const deserialized = BJSDeserialize(workflow);
  return new Promise((resolve) => deserialized);
};
