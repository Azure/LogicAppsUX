import type { AppDispatch, RootState } from '../../state/store';
import { synchronizeAppliedLocalWorkflow } from '../../state/workflowLoadingSlice';
import { CustomConnectionParameterEditorService } from './customConnection/customConnectionParameterEditorService';
import { CustomEditorService } from './customEditorService';
import { HttpClient } from './httpClient';
import { PseudoCommandBarV2 } from './pseudoCommandBar';
import { createLocalWorkflowConnectorService, LocalWorkflowManifestService } from './localWorkflowManifest';
import { localWorkflowPrefix, localWorkflowRegistry } from './localWorkflowRegistry';
import {
  StandardConnectionService,
  StandardOperationManifestService,
  StandardSearchService,
  BaseOAuthService,
  BaseGatewayService,
  ConsumptionSearchService,
  BaseFunctionService,
  BaseAppServiceService,
  StandardRunService,
  ConsumptionOperationManifestService,
  ConsumptionConnectionService,
  StandardCustomCodeService,
  ResourceIdentityType,
  BaseTenantService,
  BaseCognitiveServiceService,
  BaseRoleService,
} from '@microsoft/logic-apps-shared';
import type { ContentType } from '@microsoft/logic-apps-shared';
import {
  DesignerProvider,
  BJSWorkflowProvider,
  Designer,
  CombineInitializeVariableDialog,
  TriggerDescriptionDialog,
  type Workflow,
} from '@microsoft/logic-apps-designer-v2';
import { useDispatch, useSelector } from 'react-redux';
import { useMemo } from 'react';

const httpClient = new HttpClient();
const connectionServiceStandard = new StandardConnectionService({
  baseUrl: '/url',
  apiVersion: '2018-11-01',
  httpClient,
  writeConnection: () => Promise.resolve(),
  apiHubServiceDetails: {
    apiVersion: '2018-07-01-preview',
    baseUrl: '/baseUrl',
    subscriptionId: '',
    resourceGroup: '',
    location: '',
    httpClient,
  },
  workflowAppDetails: {
    appName: 'app',
    identity: { type: ResourceIdentityType.SYSTEM_ASSIGNED },
  },
  readConnections: () => Promise.resolve({}),
});

const connectionServiceConsumption = new ConsumptionConnectionService({
  apiVersion: '2018-07-01-preview',
  baseUrl: '/baseUrl',
  subscriptionId: '',
  resourceGroup: '',
  location: '',
  httpClient,
});

const operationManifestServiceStandard = new StandardOperationManifestService({
  apiVersion: '2018-11-01',
  baseUrl: '/url',
  httpClient,
});
const operationManifestServiceLocal = new LocalWorkflowManifestService(
  {
    apiVersion: '2018-11-01',
    baseUrl: '/url',
    httpClient,
  },
  localWorkflowRegistry
);
const connectorServiceLocal = createLocalWorkflowConnectorService(httpClient, localWorkflowRegistry);

const operationManifestServiceConsumption = new ConsumptionOperationManifestService({
  apiVersion: '2018-11-01',
  baseUrl: '/url',
  httpClient,
  subscriptionId: 'subid',
  location: 'location',
});

const searchServiceStandard = new StandardSearchService({
  baseUrl: '/url',
  apiVersion: '2018-11-01',
  httpClient,
  apiHubServiceDetails: {
    apiVersion: '2018-07-01-preview',
    subscriptionId: '',
    location: '',
  },
  isDev: true,
  showStatefulOperations: true,
});

const searchServiceConsumption = new ConsumptionSearchService({
  httpClient,
  apiHubServiceDetails: {
    apiVersion: '2018-07-01-preview',
    subscriptionId: '',
    location: '',
  },
  isDev: true,
});

const oAuthService = new BaseOAuthService({
  apiVersion: '2018-11-01',
  baseUrl: '/url',
  httpClient,
  subscriptionId: '',
  resourceGroup: '',
  location: '',
});

const gatewayService = new BaseGatewayService({
  baseUrl: '/url',
  httpClient,
  apiVersions: {
    subscription: '2018-11-01',
    gateway: '2016-06-01',
  },
});

const tenantService = new BaseTenantService({
  baseUrl: '/url',
  apiVersion: '2017-08-01',
  httpClient,
});

const uiInteractionsService = {
  getAddButtonMenuItems: () => [],
  getNodeContextMenuItems: () => [],
};

const functionService = new BaseFunctionService({
  baseUrl: '/url',
  apiVersion: '2018-11-01',
  httpClient,
  subscriptionId: 'test',
});

const appServiceService = new BaseAppServiceService({
  baseUrl: '/url',
  apiVersion: '2018-11-01',
  httpClient,
  subscriptionId: 'test',
});

const runService = new StandardRunService({
  apiVersion: '2018-11-01',
  baseUrl: '/url',
  workflowName: 'app',
  httpClient,
  isDev: true,
});

const roleService = new BaseRoleService({
  baseUrl: '/url',
  apiVersion: '2022-05-01-preview',
  httpClient,
  subscriptionId: 'test',
  tenantId: 'test',
  userIdentityId: 'test',
  appIdentityId: 'test',
});

const cognitiveServiceService = new BaseCognitiveServiceService({
  apiVersion: '2023-10-01-preview',
  baseUrl: '/url',
  httpClient,
});

const customCodeService = new StandardCustomCodeService({
  apiVersion: '2018-11-01',
  baseUrl: '/url',
  subscriptionId: 'test',
  resourceGroup: 'test',
  appName: 'app',
  workflowName: 'workflow',
  httpClient,
});

const workflowService = {
  getCallbackUrl: () => Promise.resolve({ method: 'POST', value: 'Dummy url' }),
};

const hostService = {
  fetchAndDisplayContent: (title: string, url: string, type: ContentType) => console.log(title, url, type),
  openWorkflowParametersBlade: () => console.log('openWorkflowParametersBlade'),
  openConnectionResource: (connectionId: string) => console.log('openConnectionResource:', connectionId),
};
const editorService = new CustomEditorService();

const connectionParameterEditorService = new CustomConnectionParameterEditorService();

export const LocalDesigner = () => {
  const dispatch = useDispatch<AppDispatch>();
  const {
    workflowDefinition,
    appliedWorkflow,
    resourcePath,
    workflowLoadError,
    notes,
    parameters,
    isReadOnly,
    isMonitoringView,
    isDarkMode,
    hostingPlan,
    connections,
    runInstance,
    workflowKind,
    language,
    areCustomEditorsEnabled,
    showEdgeDrawing,
    hostOptions,
    suppressDefaultNodeSelect,
  } = useSelector((state: RootState) => state.workflowLoader);
  editorService.areCustomEditorsEnabled = !!areCustomEditorsEnabled;
  connectionParameterEditorService.areCustomEditorsEnabled = !!areCustomEditorsEnabled;
  const isConsumption = hostingPlan === 'consumption';
  const enableWorkflowExtraction = hostingPlan === 'standard' && !!hostOptions.enableWorkflowExtraction;
  const workflowExtractionService = useMemo(
    () =>
      enableWorkflowExtraction && resourcePath
        ? {
            ...localWorkflowRegistry.createService(
              resourcePath,
              resourcePath.replace(new RegExp(`^${localWorkflowPrefix}`), '').replace(/\.json$/, '')
            ),
            onApplied: (workflow: Workflow) => dispatch(synchronizeAppliedLocalWorkflow({ sourceId: resourcePath, workflow })),
          }
        : undefined,
    [enableWorkflowExtraction, resourcePath, dispatch]
  );
  const designerProviderProps = {
    services: {
      connectionService: isConsumption ? connectionServiceConsumption : connectionServiceStandard,
      operationManifestService: isConsumption
        ? operationManifestServiceConsumption
        : enableWorkflowExtraction
          ? operationManifestServiceLocal
          : operationManifestServiceStandard,
      connectorService: enableWorkflowExtraction ? connectorServiceLocal : undefined,
      workflowExtractionService,
      searchService: isConsumption ? searchServiceConsumption : searchServiceStandard,
      oAuthService,
      gatewayService,
      tenantService,
      functionService,
      appServiceService,
      workflowService,
      hostService,
      runService,
      roleService,
      editorService,
      connectionParameterEditorService,
      customCodeService,
      uiInteractionsService,
      cognitiveServiceService,
    },
    readOnly: isReadOnly,
    isMonitoringView,
    isDarkMode,
    useLegacyWorkflowParameters: isConsumption,
    showEdgeDrawing,
    suppressDefaultNodeSelectFunctionality: suppressDefaultNodeSelect,
    hostOptions,
  };

  return (
    <DesignerProvider locale={language} options={{ ...designerProviderProps }}>
      {workflowLoadError ? <div role="alert">{workflowLoadError}</div> : null}
      {workflowDefinition ? (
        <BJSWorkflowProvider
          externallyAppliedWorkflow={appliedWorkflow}
          workflow={{
            definition: workflowDefinition,
            connectionReferences: connections,
            parameters: parameters,
            notes: notes,
            kind: workflowKind,
          }}
          runInstance={runInstance}
          isMultiVariableEnabled={hostOptions.enableMultiVariable}
        >
          <PseudoCommandBarV2 />
          <Designer />
          <CombineInitializeVariableDialog />
          <TriggerDescriptionDialog workflowId={'local'} />
        </BJSWorkflowProvider>
      ) : null}
    </DesignerProvider>
  );
};
