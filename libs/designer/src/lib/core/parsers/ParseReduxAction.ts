import { getReactQueryClient } from '../ReactQueryProvider';
import type { Actions } from '../state/workflowSlice';
import type { DeserializedWorkflow } from './BJSWorkflow/BJSDeserializer';
import { Deserialize as BJSDeserialize } from './BJSWorkflow/BJSDeserializer';
import type { Connector, Operation, OperationInfo, OperationManifest } from '@microsoft-logic-apps/designer-client-services';
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
      createWorkflow(deserialized.actionData);
      return deserialized;
    } else if (spec === 'CNCF') {
      throw new Error('Spec not implemented.');
    }
    throw new Error('Invalid Workflow Spec');
  }
);

export const createWorkflow = async (actions: Actions): Promise<void> => {
  const operationPromises: Promise<OperationManifest>[] = [];
  const connectionPromises: Promise<Connector>[] = [];
  const operationEntries = Object.entries(actions ? actions : {});
  for (let i = 0; i < operationEntries.length; i++) {
    await initializeOperationDetailsForManifest(operationEntries[i][0], operationEntries[i][1], operationPromises, connectionPromises);
  }
  await Promise.all(operationPromises);
  await Promise.all(connectionPromises);
  return new Promise((resolve) => null);
};

const initializeOperationDetailsForManifest = async (
  nodeId: string,
  operation: LogicAppsV2.ActionDefinition,
  operationPromises: Promise<OperationManifest>[],
  connectionPromises: Promise<Connector>[]
): Promise<void> => {
  const queryClient = getReactQueryClient();
  const operationManifestService = OperationManifestService();
  nodeId = nodeId.toLowerCase();
  const operationInfo = await queryClient.fetchQuery<OperationInfo>(['operationIds', { nodeId }], () =>
    // this is sync
    operationManifestService.getOperationInfo(operation)
  );
  if (operationInfo) {
    const operationManifest = fetchOperationManifest(operationInfo.connectorId, operationInfo.operationId);
    if (operationManifest) {
      operationPromises.push(operationManifest);
    }
    const connector = fetchConnector(operationInfo.connectorId);
    if (connector) {
      connectionPromises.push(connector);
    }
  }
};

const fetchConnector = (connectorId: string) => {
  const queryClient = getReactQueryClient();
  const connectionService = ConnectionService();
  if (!connectorId) {
    throw new Error('ConnectorId must be defined');
  }
  connectorId = connectorId.toLowerCase();
  const connectorQuery = queryClient.fetchQuery(['connector', { connectorId }], () => connectionService.getConnector(connectorId));
  return connectorQuery;
};

const fetchOperationManifest = (connectorId: string, operationId: string) => {
  const queryClient = getReactQueryClient();
  const operationManifestService = OperationManifestService();
  if (!connectorId || !operationId) {
    return undefined;
  }
  connectorId = connectorId.toLowerCase();
  operationId = operationId.toLowerCase();
  const manifestQuery = queryClient.fetchQuery(['manifest', { connectorId }, { operationId }], () =>
    operationManifestService.getOperationManifest(connectorId, operationId)
  );

  return manifestQuery;
};
