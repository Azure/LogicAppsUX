import { AssertionErrorCode, AssertionException } from '@microsoft-logic-apps/utils';
import type { Connector, Connection, OperationDiscoveryResult } from '@microsoft-logic-apps/utils';

export interface IConnectionService {
  [x: string]: any;
  dispose(): void;
  getConnector(connectorId: string): Promise<Connector>;
  getConnection(connectionId: string): Promise<Connection>;
  getConnections(connectorId?: string): Promise<Connection[]>; // Batching can be addressed with future workitem no. 14703398
  getAllOperationsForGroup(connectorId: string): Promise<OperationDiscoveryResult[]>;
  getAllConnectors(): Promise<Connector[]>;
}

let service: IConnectionService;

export const InitConnectionService = (connectionService: IConnectionService): void => {
  service = connectionService;
};

export const ConnectionService = (): IConnectionService => {
  if (!service) {
    throw new AssertionException(AssertionErrorCode.SERVICE_NOT_INITIALIZED, 'ConectionService need to be initialized before using');
  }

  return service;
};
