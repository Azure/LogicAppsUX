import type CONSTANTS from '../../../common/constants';
import type {
  IConnectionService,
  IConnectorService,
  IGatewayService,
  ITenantService,
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
  ICustomCodeService,
  LogicApps,
  ICopilotService,
} from '@microsoft/logic-apps-shared';
import type { MaximumWaitingRunsMetadata } from '../../../ui/settings';

type PANEL_TAB_NAMES = keyof typeof CONSTANTS.PANEL_TAB_NAMES;

export interface DesignerOptionsState {
  readOnly?: boolean;
  isMonitoringView?: boolean;
  isDarkMode?: boolean;
  servicesInitialized?: boolean;
  designerOptionsInitialized?: boolean;
  useLegacyWorkflowParameters?: boolean;
  isXrmConnectionReferenceMode?: boolean;
  suppressDefaultNodeSelectFunctionality?: boolean;
  hostOptions: {
    displayRuntimeInfo: boolean; // show info about where the action is run(i.e. InApp/Shared/Custom)
    suppressCastingForSerialize?: boolean; // suppress casting for serialize
    recurrenceInterval?: LogicApps.Recurrence;
    maxWaitingRuns?: MaximumWaitingRunsMetadata; // min and max of Maximum Waiting Runs Concurrency Setting
    forceEnableSplitOn?: boolean; // force enable split on (by default it is disabled on stateless workflows)
    hideUTFExpressions?: boolean; // hide UTF expressions in template functions
    stringOverrides?: Record<string, string>; // string overrides for localization
  };
  nodeSelectAdditionalCallback?: (nodeId: string) => any;
  showConnectionsPanel?: boolean;
  panelTabHideKeys?: PANEL_TAB_NAMES[];
  showPerformanceDebug?: boolean;
}

export interface ServiceOptions {
  connectionService: IConnectionService;
  operationManifestService: IOperationManifestService;
  searchService: ISearchService;
  connectorService?: IConnectorService;
  gatewayService?: IGatewayService;
  tenantService?: ITenantService;
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
  customCodeService?: ICustomCodeService;
  copilotService?: ICopilotService;
}
