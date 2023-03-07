import { SettingsBox } from '../../components/settings_box';
import type { RootState } from '../../state/store';
import { HttpClient } from './httpClient';
import { PseudoCommandBar } from './pseudoCommandBar';
import {
  StandardConnectionService,
  StandardOperationManifestService,
  StandardSearchService,
  StandardOAuthService,
  StandardGatewayService,
  StandardRunService,
} from '@microsoft/designer-client-services-logic-apps';
import type { ContentType } from '@microsoft/designer-client-services-logic-apps';
import { DesignerProvider, BJSWorkflowProvider, Designer } from '@microsoft/logic-apps-designer';
import { ResourceIdentityType } from '@microsoft/utils-logic-apps';
import { useSelector } from 'react-redux';

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
  baseUrl: '/url',
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
  apiVersion: '2018-11-01',
  baseUrl: '/url',
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

const runService = new StandardRunService({
  apiVersion: '2018-11-01',
  baseUrl: '/url',
  workflowName: 'app',
  httpClient,
  isDev: true,
});

const workflowService = { getCallbackUrl: () => Promise.resolve({ method: 'POST', value: 'Dummy url' }) };

const hostService = { fetchAndDisplayContent: (title: string, url: string, type: ContentType) => console.log(title, url, type) };

export const DesignerWrapper = () => {
  const { workflowDefinition, readOnly, monitoringView, darkMode, consumption, connections, runInstance } = useSelector(
    (state: RootState) => state.workflowLoader
  );
  const designerProviderProps = {
    services: {
      connectionService,
      operationManifestService,
      searchService,
      oAuthService,
      gatewayService,
      workflowService,
      hostService,
      runService,
    },
    readOnly,
    isMonitoringView: monitoringView,
    isDarkMode: darkMode,
    isConsumption: consumption,
  };

  return (
    <>
      <SettingsBox />
      <DesignerProvider locale="en-US" options={{ ...designerProviderProps }}>
        {workflowDefinition ? (
          <BJSWorkflowProvider
            workflow={{
              definition: workflowDefinition,
              connectionReferences: connections,
              parameters: workflowDefinition.parameters,
            }}
            runInstance={runInstance}
          >
            <PseudoCommandBar />
            <Designer />
          </BJSWorkflowProvider>
        ) : null}
      </DesignerProvider>
    </>
  );
};
