import type {
  IConnectionService,
  IConnectorService,
  ILoggerService,
  IOperationManifestService,
  ISearchService,
  IOAuthService,
} from '@microsoft-logic-apps/designer-client-services';

export interface DesignerOptionsState {
  readOnly?: boolean;
  isMonitoringView?: boolean;
  servicesInitialized?: boolean;
}

export interface ServiceOptions {
  connectionService: IConnectionService;
  operationManifestService: IOperationManifestService;
  searchService: ISearchService;
  connectorService?: IConnectorService;
  loggerService?: ILoggerService;
  oAuthService: IOAuthService;
}
