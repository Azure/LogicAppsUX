import { AssertionErrorCode, AssertionException } from '@microsoft-logic-apps/utils';

export interface EnvironmentConfig {
  apiOperationsPath: string;
  connectionProvidersPath: string;
  connectionsPath: string;
  flowsConnectorPath?: string;
  gatewaysPath?: string;
  flowsPath?: string;
}

export interface UrlService {
  getListConnectionsUri(connectorId: string): string;
  getConnectionsUri(): string;
}

let service: UrlService;

export const InitUrlService = (urlService: UrlService): void => {
  service = urlService;
};

export const UrlService = (): UrlService => {
  // Danielle: we need this for every service, how do we extract?
  if (!service) {
    throw new AssertionException(AssertionErrorCode.SERVICE_NOT_INITIALIZED, 'ConectionService need to be initialized before using');
  }

  return service;
};
