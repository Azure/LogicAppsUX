import type { RootState } from '../../state/store';
import { HttpClient } from './httpClient';
import { PseudoCommandBar } from './pseudoCommandBar';
import { Chatbot } from '@microsoft/chatbot';
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
} from '@microsoft/designer-client-services-logic-apps';
import type { ContentType } from '@microsoft/designer-client-services-logic-apps';
import { DesignerProvider, BJSWorkflowProvider, Designer } from '@microsoft/logic-apps-designer';
import { ResourceIdentityType } from '@microsoft/utils-logic-apps';
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
  workflowAppDetails: { appName: 'app', identity: { type: ResourceIdentityType.SYSTEM_ASSIGNED } },
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

const workflowService = { getCallbackUrl: () => Promise.resolve({ method: 'POST', value: 'Dummy url' }) };

const hostService = { fetchAndDisplayContent: (title: string, url: string, type: ContentType) => console.log(title, url, type) };

export const LocalDesigner = () => {
  const {
    workflowDefinition,
    isReadOnly,
    isMonitoringView,
    isDarkMode,
    isConsumption,
    connections,
    runInstance,
    showChatBot,
    workflowKind,
    language,
  } = useSelector((state: RootState) => state.workflowLoader);
  const designerProviderProps = {
    services: {
      connectionService: !isConsumption ? connectionServiceStandard : connectionServiceConsumption,
      operationManifestService: !isConsumption ? operationManifestServiceStandard : operationManifestServiceConsumption,
      searchService: !isConsumption ? searchServiceStandard : searchServiceConsumption,
      oAuthService,
      gatewayService,
      functionService,
      appServiceService,
      workflowService,
      hostService,
      runService,
    },
    readOnly: isReadOnly,
    isMonitoringView,
    isDarkMode,
    useLegacyWorkflowParameters: isConsumption,
  };

  return (
    <DesignerProvider locale={language} options={{ ...designerProviderProps }}>
      {workflowDefinition ? (
        <BJSWorkflowProvider
          workflow={{
            definition: workflowDefinition,
            connectionReferences: connections,
            parameters: workflowDefinition.parameters,
            kind: workflowKind,
          }}
          runInstance={runInstance}
        >
          <PseudoCommandBar />
          <Designer />
          {showChatBot ? <Chatbot /> : null}
        </BJSWorkflowProvider>
      ) : null}
    </DesignerProvider>
  );
};
