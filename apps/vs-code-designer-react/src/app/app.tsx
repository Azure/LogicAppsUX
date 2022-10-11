import type { RootState } from '../state/Store';
import { HttpClient } from './httpClient';
import {
  StandardConnectionService,
  StandardOAuthService,
  StandardOperationManifestService,
  StandardSearchService,
} from '@microsoft-logic-apps/designer-client-services';
import { ResourceIdentityType } from '@microsoft-logic-apps/utils';
import { DesignerProvider, BJSWorkflowProvider, Designer } from '@microsoft/logic-apps-designer';
import { useSelector } from 'react-redux';

const httpClient = new HttpClient();

export const App = () => {
  const vscodeState = useSelector((state: RootState) => state.designer);
  const { panelMetaData, connectionReferences, baseUrl } = vscodeState;
  const codelessApp = panelMetaData?.codelessApp;

  const connectionService = new StandardConnectionService({
    baseUrl,
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

  const searchService = new StandardSearchService({
    baseUrl,
    apiVersion: '2018-11-01',
    httpClient,
    apiHubServiceDetails: {
      apiVersion: '2018-07-01-preview',
      subscriptionId: '',
      location: '',
    },
    isDev: true,
  });

  const operationManifestService = new StandardOperationManifestService({
    apiVersion: '2018-11-01',
    baseUrl,
    httpClient,
  });

  const oAuthService = new StandardOAuthService({
    baseUrl,
    apiVersion: '2018-11-01',
    httpClient,
    subscriptionId: '',
    resourceGroup: '',
    location: '',
  });

  return (
    <DesignerProvider
      locale="en-US"
      options={{
        services: {
          connectionService,
          operationManifestService,
          searchService,
          oAuthService,
        },
      }}
    >
      {codelessApp ? (
        <BJSWorkflowProvider workflow={{ definition: codelessApp.definition, connectionReferences: connectionReferences }}>
          <Designer></Designer>
        </BJSWorkflowProvider>
      ) : null}
    </DesignerProvider>
  );
};
