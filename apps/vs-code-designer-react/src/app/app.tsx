import type { RootState } from '../state/Store';
import { DesignerCommandBar } from './DesignerCommandBar';
import { HttpClient } from './httpClient';
import {
  StandardConnectionService,
  StandardGatewayService,
  StandardOAuthService,
  StandardOperationManifestService,
  StandardSearchService,
} from '@@microsoft/logicappsux/designer-client-services';
import { DesignerProvider, BJSWorkflowProvider, Designer, getTheme, useThemeObserver } from '@microsoft/logic-apps-designer';
import { HTTP_METHODS, ResourceIdentityType, Theme } from '@microsoft/utils-logic-apps';
import { useState } from 'react';
import { useSelector } from 'react-redux';

const httpClient = new HttpClient();

export const App = () => {
  const vscodeState = useSelector((state: RootState) => state.designer);
  const { panelMetaData, connectionReferences, baseUrl, apiHubServiceDetails } = vscodeState;
  const codelessApp = panelMetaData?.workflowContent;

  const [theme, setTheme] = useState<Theme>(getTheme(document.body));

  useThemeObserver(document.body, theme, setTheme, {
    attributes: true,
  });

  const connectionService = new StandardConnectionService({
    baseUrl,
    apiVersion: '2018-11-01',
    httpClient,
    apiHubServiceDetails,
    workflowAppDetails: { appName: 'app', identity: { type: ResourceIdentityType.SYSTEM_ASSIGNED } },
    readConnections: () => Promise.resolve({}),
  });

  const operationManifestService = new StandardOperationManifestService({
    apiVersion: '2018-11-01',
    baseUrl,
    httpClient,
  });

  const searchService = new StandardSearchService({
    baseUrl,
    apiVersion: '2018-11-01',
    httpClient,
    apiHubServiceDetails,
    isDev: true,
  });

  const oAuthService = new StandardOAuthService({
    baseUrl,
    apiVersion: '2018-11-01',
    httpClient,
    subscriptionId: '',
    resourceGroup: '',
    location: '',
  });

  const gatewayService = new StandardGatewayService({
    baseUrl,
    httpClient,
    apiVersions: {
      subscription: '2018-11-01',
      gateway: '2016-06-01',
    },
  });

  const workflowService = { getCallbackUrl: () => Promise.resolve({ method: HTTP_METHODS.POST, value: 'Dummy url' }) };

  return (
    <DesignerProvider
      locale="en-US"
      options={{
        isDarkMode: theme === Theme.Dark,
        services: {
          connectionService,
          operationManifestService,
          searchService,
          oAuthService,
          gatewayService,
          workflowService,
        },
      }}
    >
      {codelessApp ? (
        <BJSWorkflowProvider workflow={{ definition: codelessApp.definition, connectionReferences }}>
          <DesignerCommandBar />
          <Designer />
        </BJSWorkflowProvider>
      ) : null}
    </DesignerProvider>
  );
};
