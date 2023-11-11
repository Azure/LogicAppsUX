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
  IEditorService,
  IConnectionParameterEditorService,
  IChatbotService,
} from '@microsoft/logic-apps-designer';

export interface DesignerOptionsState {
  readOnly?: boolean;
  isMonitoringView?: boolean;
  isDarkMode?: boolean;
  servicesInitialized?: boolean;
  useLegacyWorkflowParameters?: boolean;
  isXrmConnectionReferenceMode?: boolean;
  suppressDefaultNodeSelectFunctionality?: boolean;
  nodeSelectAdditionalCallback?: (nodeId: string) => any;
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
  editorService?: IEditorService;
  connectionParameterEditorService?: IConnectionParameterEditorService;
  chatbotService?: IChatbotService;
}
