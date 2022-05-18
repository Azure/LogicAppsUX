import { AssertionErrorCode, AssertionException } from '@microsoft-logic-apps/utils';
import type { Connector , Connection } from '@microsoft-logic-apps/utils';

export interface IConnectionService {
  dispose(): void;
  getConnector(connectorId: string): Promise<Connector>;
  getConnections(connectorId?: string, /*batchable?: boolean  danielle to do */): Promise<Connection[]>;
  getListConnectionsUri(input: string): string;
}

let service: IConnectionService;

export const InitConnectionService = (connectionService: IConnectionService): void => {
  service = connectionService;
};

export const ConnectionService = (): IConnectionService => {
  // Danielle: we need this for every service, how do we extract?
  if (!service) {
    throw new AssertionException(AssertionErrorCode.SERVICE_NOT_INITIALIZED, 'ConectionService need to be initialized before using');
  }

  return service;
};
