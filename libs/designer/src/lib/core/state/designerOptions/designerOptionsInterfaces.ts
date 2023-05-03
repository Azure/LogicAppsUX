import type {
  IConnectionService,
  IConnectorService,
  IGatewayService,
  ILoggerService,
  IOperationManifestService,
  ISearchService,
  IOAuthService,
  IWorkflowService,
  IHostService,
  IApiManagementService,
  IFunctionService,
  IAppServiceService,
  IRunService,
  TokenSelectorViewProps,
} from '@microsoft/designer-client-services-logic-apps';

export interface DesignerOptionsState {
  readOnly?: boolean;
  isTokenSelectorOnlyView?: boolean;
  tokenSelectorViewProps?: TokenSelectorViewProps;
  isMonitoringView?: boolean;
  isDarkMode?: boolean;
  servicesInitialized?: boolean;
  isConsumption?: boolean;
  isXrmConnectionReferenceMode?: boolean;
}

export interface ServiceOptions {
  connectionService: IConnectionService;
  operationManifestService: IOperationManifestService;
  searchService: ISearchService;
  connectorService?: IConnectorService;
  gatewayService?: IGatewayService;
  loggerService?: ILoggerService;
  oAuthService: IOAuthService;
  workflowService: IWorkflowService;
  hostService?: IHostService;
  apimService?: IApiManagementService;
  functionService?: IFunctionService;
  appServiceService?: IAppServiceService;
  runService?: IRunService;
}
