import { getReactQueryClient } from './ReactQueryProvider';
import type { DeserializedWorkflow } from './parsers/BJSWorkflow/BJSDeserializer';
import { Deserialize } from './parsers/BJSWorkflow/BJSDeserializer';
import type { Operation, OperationInfo } from '@microsoft-logic-apps/designer-client-services';
import { ConnectionService, OperationManifestService } from '@microsoft-logic-apps/designer-client-services';

export const createWorkflow = async (workflow: LogicAppsV2.WorkflowDefinition): Promise<void> => {
  const queryClient = getReactQueryClient();
  const deserialized = workflow;

  const operationManifestService = OperationManifestService();
  const operationInfo = await queryClient.fetchQuery<OperationInfo>('deserialized', () =>
    operationManifestService.getOperationInfo(deserialized)
  );
  const operations = deserialized.actionData;

  const connectionService = ConnectionService();

  const operationPromises: Promise<Operation>[] = [];
  const connectionPromises: Promise<Operation>[] = [];
  Object.entries(operations ? operations : {}).forEach((operation) => {
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
  });
  //await Promise.all(operationPromises);
  //await Promise.all(connectionPromises);
};
