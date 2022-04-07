import { AssertionErrorCode, AssertionException } from '@microsoft-logic-apps/utils';
import type { Connector } from '@microsoft-logic-apps/utils';

export interface IConnectionService {
  dispose(): void;
  getConnector(connectorId: string): Promise<Connector>;
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
