import { getReactQueryClient } from '../ReactQueryProvider';
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

  const operationPromises: Promise<OperationManifest>[] = [];
  const connectionPromises: Promise<Connector>[] = [];
  const operationEntries = Object.entries(operations ? operations : {});
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
  operationPromises: Promise<OperationManifest>[], // Danielle: or do we need regular "operation"
  connectionPromises: Promise<Connector>[]
): Promise<void> => {
  const queryClient = getReactQueryClient();
  const operationManifestService = OperationManifestService();
  const operationInfo = await queryClient.fetchQuery<OperationInfo>(['deserialized', { nodeId: nodeId }], () =>
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
    return undefined;
  }
  const connectorQuery = queryClient.fetchQuery(['connector', { connectorId }], () => connectionService.getConnector(connectorId));
  return connectorQuery;
};

const fetchOperationManifest = (connectorId: string, operationId: string) => {
  const queryClient = getReactQueryClient();
  const operationManifestService = OperationManifestService();
  if (!connectorId || !operationId) {
    return undefined;
  }
  const manifestQuery = queryClient.fetchQuery(['manifest', { connectorId }, { operationId }], () =>
    // Danielle .tolowercase?
    operationManifestService.getOperationManifest(connectorId, operationId)
  );

  return manifestQuery;
};
