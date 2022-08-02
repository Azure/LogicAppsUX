import { ConnectionService } from '@microsoft-logic-apps/designer-client-services';

export const getAllOperationsForGroup = (connectorId: string) => {
  const connectionService = ConnectionService();
  const operations = connectionService.getAllOperationsForGroup(connectorId);
  return operations;
};
