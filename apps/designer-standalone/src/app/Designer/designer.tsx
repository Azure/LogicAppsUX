import { SettingsBox } from '../../components/settings_box';
import type { RootState } from '../../state/store';
import { HttpClient } from './httpClient';
import {
  StandardConnectionService,
  StandardOperationManifestService,
  StandardSearchService,
  StandardOAuthService,
  StandardGatewayService,
} from '@microsoft-logic-apps/designer-client-services';
import { ResourceIdentityType } from '@microsoft-logic-apps/utils';
import { DesignerProvider, BJSWorkflowProvider, Designer } from '@microsoft/logic-apps-designer';
import { useEffect } from 'react';
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

const workflowService = { getCallbackUrl: () => Promise.resolve({ method: 'POST', value: 'Dummy url' }) };

export const DesignerWrapper = () => {
  const { workflowDefinition, readOnly, monitoringView, darkMode, connections } = useSelector((state: RootState) => state.workflowLoader);
  const designerProviderProps = {
    services: { connectionService, operationManifestService, searchService, oAuthService, gatewayService, workflowService },
    readOnly,
    isMonitoringView: monitoringView,
    isDarkMode: darkMode,
  };
  const themeName = darkMode ? 'dark' : 'light';

  useEffect(() => document.body.classList.add('is-standalone'), []);

  return (
    <>
      <SettingsBox />
      <DesignerProvider locale="en-US" options={{ ...designerProviderProps }} themeName={themeName}>
        {workflowDefinition ? (
          <BJSWorkflowProvider
            workflow={{
              definition: workflowDefinition,
              connectionReferences: connections,
            }}
          >
            <Designer />
          </BJSWorkflowProvider>
        ) : null}
      </DesignerProvider>
    </>
  );
};
