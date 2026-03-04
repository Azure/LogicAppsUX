import type CONSTANTS from '../../../common/constants';
import type { IConnectionService, IConnectorService, IGatewayService, ITenantService, ILoggerService, IOperationManifestService, ISearchService, IOAuthService, IWorkflowService, IHostService, IApiManagementService, IFunctionService, IAppServiceService, IRunService, IRoleService, IEditorService, IConnectionParameterEditorService, IChatbotService, ICustomCodeService, LogicApps, IDesignerUiInteractionsService, IUserPreferenceService, IExperimentationService, ICognitiveServiceService } from '@microsoft/logic-apps-shared';
import type { MaximumWaitingRunsMetadata } from '../../../ui/settings';
type PANEL_TAB_NAMES = keyof typeof CONSTANTS.PANEL_TAB_NAMES;
export interface DesignerOptionsState {
    readOnly?: boolean;
    isMonitoringView?: boolean;
    isDraft?: boolean;
    isDarkMode?: boolean;
    isUnitTest?: boolean;
    isVSCode?: boolean;
    servicesInitialized?: boolean;
    designerOptionsInitialized?: boolean;
    useLegacyWorkflowParameters?: boolean;
    isXrmConnectionReferenceMode?: boolean;
    suppressDefaultNodeSelectFunctionality?: boolean;
    hostOptions: {
        displayRuntimeInfo: boolean;
        suppressCastingForSerialize?: boolean;
        recurrenceInterval?: LogicApps.Recurrence;
        maxWaitingRuns?: MaximumWaitingRunsMetadata;
        stringOverrides?: Record<string, string>;
        maxStateHistorySize?: number;
        hideContentTransferSettings?: boolean;
        collapseGraphsByDefault?: boolean;
        enableMultiVariable?: boolean;
        enableNestedAgentLoops?: boolean;
    };
    nodeSelectAdditionalCallback?: (nodeId: string) => any;
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
export {};
