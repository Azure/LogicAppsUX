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
} from '@microsoft/designer-client-services-logic-apps';

export interface DesignerOptionsState {
  readOnly?: boolean;
  isMonitoringView?: boolean;
  isDarkMode?: boolean;
  servicesInitialized?: boolean;
  useLegacyWorkflowParameters?: boolean;
  isXrmConnectionReferenceMode?: boolean;
  suppressDefaultNodeSelectFunctionality?: boolean;
  addedNodeSelectCallback?: (any: any) => any;
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
