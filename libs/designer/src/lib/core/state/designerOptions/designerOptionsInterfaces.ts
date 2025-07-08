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
  IRoleService,
  IEditorService,
  IConnectionParameterEditorService,
  IChatbotService,
  ICustomCodeService,
  LogicApps,
  IDesignerUiInteractionsService,
  IUserPreferenceService,
  IExperimentationService,
  ICognitiveServiceService,
} from '@microsoft/logic-apps-shared';
import type { MaximumWaitingRunsMetadata } from '../../../ui/settings';

type PANEL_TAB_NAMES = keyof typeof CONSTANTS.PANEL_TAB_NAMES;

export interface DesignerOptionsState {
  readOnly?: boolean;
  isMonitoringView?: boolean;
  isDarkMode?: boolean;
  isUnitTest?: boolean;
  isVSCode?: boolean;
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
    stringOverrides?: Record<string, string>; // string overrides for localization
    maxStateHistorySize?: number; // maximum number of states to save in history for undo/redo (default is 0)
    hideContentTransferSettings?: boolean; // hide content transfer settings in the designer
    collapseGraphsByDefault?: boolean; // collapse scope by default
    enableMultiVariable?: boolean; // prevent creating multiple variables in one action
  };
  nodeSelectAdditionalCallback?: (nodeId: string) => any;
  showConnectionsPanel?: boolean;
  showEdgeDrawing?: boolean;
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
  roleService?: IRoleService;
  editorService?: IEditorService;
  connectionParameterEditorService?: IConnectionParameterEditorService;
  chatbotService?: IChatbotService;
  customCodeService?: ICustomCodeService;
  uiInteractionsService?: IDesignerUiInteractionsService;
  userPreferenceService?: IUserPreferenceService;
  experimentationService?: IExperimentationService;
  cognitiveServiceService?: ICognitiveServiceService;
}
