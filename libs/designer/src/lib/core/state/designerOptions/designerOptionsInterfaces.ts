import type {
  IConnectionService,
  ILoggerService,
  IOperationManifestService,
  ISearchService,
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
  loggerService?: ILoggerService;
}
