import { AssertionErrorCode, AssertionException } from '@microsoft-logic-apps/utils';

export interface EnvironmentConfig {
  apiOperationsPath: string;
  connectionProvidersPath: string;
  connectionsPath: string;
  flowsConnectorPath?: string;
  gatewaysPath?: string;
  flowsPath?: string;
}

export interface IUrlService {
  getListConnectionsUri(connectorId: string): string;
  getConnectionsUri(): string;
}

let service: IUrlService;

export const InitUrlService = (urlService: IUrlService): void => {
  service = urlService;
};

export const UrlService = (): IUrlService => {
  if (!service) {
    throw new AssertionException(AssertionErrorCode.SERVICE_NOT_INITIALIZED, 'ConectionService need to be initialized before using');
  }

  return service;
};
