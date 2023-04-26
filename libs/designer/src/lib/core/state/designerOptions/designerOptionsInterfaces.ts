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

// TODO: remove these and use shared types
export type TrackedProperty = {
  name: string;
  type: string;
  token?: string;
};

export interface TokenSelectorViewProps {
  trackedProperties: TrackedProperty[];
  onCompleted: (properties: TrackedProperty[]) => void;
}

export interface DesignerOptionsState {
  readOnly?: boolean;
  isTokenSelectorOnlyView?: boolean;
  tokenSelectorViewProps?: TokenSelectorViewProps;
  isMonitoringView?: boolean;
  isDarkMode?: boolean;
  servicesInitialized?: boolean;
  isConsumption?: boolean;
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
