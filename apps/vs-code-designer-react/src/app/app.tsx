import workflow from '../../../../__mocks__/workflows/Conditionals.json';
import { HttpClient } from './httpClient';
import {
  StandardConnectionService,
  StandardGatewayService,
  StandardOAuthService,
  StandardOperationManifestService,
  StandardSearchService,
} from '@microsoft-logic-apps/designer-client-services';
import { ResourceIdentityType } from '@microsoft-logic-apps/utils';
import { DesignerProvider, BJSWorkflowProvider, Designer } from '@microsoft/logic-apps-designer';

const httpClient = new HttpClient();
const connectionService = new StandardConnectionService({
  baseUrl: '/url',
  apiVersion: '2018-11-01',
  httpClient,
  apiHubServiceDetails: {
    apiVersion: '2018-07-01-preview',
    baseUrl: '/baseUrl',
    subscriptionId: '',
    resourceGroup: '',
    location: '',
  },
  workflowAppDetails: { appName: 'app', identity: { type: ResourceIdentityType.SYSTEM_ASSIGNED } },
  readConnections: () => Promise.resolve({}),
});
const operationManifestService = new StandardOperationManifestService({
  apiVersion: '2018-11-01',
  baseUrl: 'url',
  httpClient,
});
const searchService = new StandardSearchService({
  baseUrl: '/url',
  apiVersion: '2018-11-01',
  httpClient,
  apiHubServiceDetails: {
    apiVersion: '2018-07-01-preview',
    subscriptionId: '',
    location: '',
  },
  isDev: true,
});
const oAuthService = new StandardOAuthService({
  baseUrl: '/url',
  apiVersion: '2018-11-01',
  httpClient,
  subscriptionId: '',
  resourceGroup: '',
  location: '',
});
const gatewayService = new StandardGatewayService({
  baseUrl: '/url',
  httpClient,
  apiVersions: {
    subscription: '2018-11-01',
    gateway: '2016-06-01',
  },
});
const workflowService = { getCallbackUrl: () => Promise.resolve({ method: 'POST', value: 'Dummy url' }) };

export const App = () => {
  return (
    <DesignerProvider
      locale="en-US"
      options={{
        services: {
          connectionService,
          operationManifestService,
          searchService,
          oAuthService,
          gatewayService,
          workflowService
        },
      }}
    >
      {workflow ? (
        <BJSWorkflowProvider workflow={{ definition: workflow.definition, connectionReferences: {} }}>
          <Designer></Designer>
        </BJSWorkflowProvider>
      ) : null}
    </DesignerProvider>
  );
};
