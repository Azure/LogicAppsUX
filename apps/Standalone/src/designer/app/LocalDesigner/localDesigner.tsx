import type { RootState } from '../../state/store';
import { CustomConnectionParameterEditorService } from './customConnection/customConnectionParameterEditorService';
import { CustomEditorService } from './customEditorService';
import { HttpClient } from './httpClient';
import { PseudoCommandBar } from './pseudoCommandBar';
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
  // Uncomment to use dummy version of copilot expression assistant
  // BaseCopilotService,
  BaseTenantService,
} from '@microsoft/logic-apps-shared';
import type { ContentType } from '@microsoft/logic-apps-shared';
import { DesignerProvider, BJSWorkflowProvider, Designer } from '@microsoft/logic-apps-designer';
import { useSelector } from 'react-redux';

const httpClient = new HttpClient();
const connectionServiceStandard = new StandardConnectionService({
  baseUrl: '/url',
  apiVersion: '2018-11-01',
  httpClient,
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

// Uncomment to use dummy version of copilot expression assistant
// const baseCopilotService = new BaseCopilotService({isDev: true});

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
  const {
    workflowDefinition,
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
    showConnectionsPanel,
    hostOptions,
    suppressDefaultNodeSelect,
  } = useSelector((state: RootState) => state.workflowLoader);
  editorService.areCustomEditorsEnabled = !!areCustomEditorsEnabled;
  connectionParameterEditorService.areCustomEditorsEnabled = !!areCustomEditorsEnabled;
  const isConsumption = hostingPlan === 'consumption';
  const designerProviderProps = {
    services: {
      connectionService: isConsumption ? connectionServiceConsumption : connectionServiceStandard,
      operationManifestService: isConsumption ? operationManifestServiceConsumption : operationManifestServiceStandard,
      searchService: isConsumption ? searchServiceConsumption : searchServiceStandard,
      // Uncomment to use dummy version of copilot expression assistant
      // copilotService: baseCopilotService,
      oAuthService,
      gatewayService,
      tenantService,
      functionService,
      appServiceService,
      workflowService,
      hostService,
      runService,
      editorService,
      connectionParameterEditorService,
      customCodeService,
    },
    readOnly: isReadOnly,
    isMonitoringView,
    isDarkMode,
    useLegacyWorkflowParameters: isConsumption,
    showConnectionsPanel,
    suppressDefaultNodeSelectFunctionality: suppressDefaultNodeSelect,
    hostOptions,
  };

  return (
    <DesignerProvider locale={language} options={{ ...designerProviderProps }}>
      {workflowDefinition ? (
        <BJSWorkflowProvider
          workflow={{
            definition: workflowDefinition,
            connectionReferences: connections,
            parameters: parameters,
            kind: workflowKind,
          }}
          runInstance={runInstance}
        >
          <PseudoCommandBar />
          <Designer />
        </BJSWorkflowProvider>
      ) : null}
    </DesignerProvider>
  );
};
