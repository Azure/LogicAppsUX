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
  ConsumptionSearchService,
  BaseFunctionService,
  BaseAppServiceService,
} from '@microsoft/designer-client-services-logic-apps';
import { DesignerProvider, BJSWorkflowProvider, Designer } from '@microsoft/logic-apps-designer';
import { ResourceIdentityType } from '@microsoft/utils-logic-apps';
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
});

const searchServiceConsumption = new ConsumptionSearchService({
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

const functionService = new BaseFunctionService({
  baseUrl: '/url',
  apiVersion: '2018-11-01',
  httpClient,
  subscriptionId: '',
});

const appServiceService = new BaseAppServiceService({
  baseUrl: '/url',
  apiVersion: '2018-11-01',
  httpClient,
  subscriptionId: '',
});

const workflowService = { getCallbackUrl: () => Promise.resolve({ method: 'POST', value: 'Dummy url' }) };

export const DesignerWrapper = () => {
  const { workflowDefinition, readOnly, monitoringView, darkMode, consumption, connections, runInstance } = useSelector(
    (state: RootState) => state.workflowLoader
  );
  const designerProviderProps = {
    services: {
      connectionService,
      operationManifestService,
      searchService: !consumption ? searchServiceStandard : searchServiceConsumption,
      oAuthService,
      gatewayService,
      functionService,
      appServiceService,
      workflowService,
    },
    readOnly,
    isMonitoringView: monitoringView,
    isDarkMode: darkMode,
    isConsumption: consumption,
  };

  useEffect(() => document.body.classList.add('is-standalone'), []);

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
