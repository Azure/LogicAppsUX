import type CONSTANTS from '../../../common/constants';
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
} from '@microsoft/designer-client-services-logic-apps';

type PANEL_TAB_NAMES = keyof typeof CONSTANTS.PANEL_TAB_NAMES;

export interface DesignerOptionsState {
  readOnly?: boolean;
  isMonitoringView?: boolean;
  isDarkMode?: boolean;
  servicesInitialized?: boolean;
  useLegacyWorkflowParameters?: boolean;
  isXrmConnectionReferenceMode?: boolean;
  suppressDefaultNodeSelectFunctionality?: boolean;
  hostOptions: {
    displayRuntimeInfo: boolean; // show info about where the action is run(i.e. InApp/Shared/Custom)
    suppressCastingForSerialize?: boolean; // suppress casting for serialize
  };
  nodeSelectAdditionalCallback?: (nodeId: string) => any;
  showConnectionsPanel?: boolean;
  hidePanelTabs?: PANEL_TAB_NAMES[];
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
