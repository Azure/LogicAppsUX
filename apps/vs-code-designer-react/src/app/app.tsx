import type { RootState } from '../state/Store';
import { VSCodeContext } from '../webviewCommunication';
import { DesignerCommandBar } from './DesignerCommandBar';
import { HttpClient } from './httpClient';
import {
  StandardConnectionService,
  StandardGatewayService,
  StandardOAuthService,
  StandardOperationManifestService,
  StandardSearchService,
} from '@microsoft-logic-apps/designer-client-services';
import { ExtensionCommand, ResourceIdentityType, Theme } from '@microsoft-logic-apps/utils';
import { DesignerProvider, BJSWorkflowProvider, Designer, getTheme, useThemeObserver } from '@microsoft/logic-apps-designer';
import { useContext, useState } from 'react';
import { useSelector } from 'react-redux';

const httpClient = new HttpClient();

export const App = () => {
  const vscodeState = useSelector((state: RootState) => state.designer);
  const { panelMetaData, connectionReferences, baseUrl, apiHubServiceDetails, readOnly, callbackInfo, isLocal } = vscodeState;
  const codelessApp = panelMetaData?.codelessApp;
  const vscode = useContext(VSCodeContext);

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

  const workflowService = {
    getCallbackUrl: async (triggerName: any) => {
      if (isLocal) {
        return {
          method: 'POST',
          value: '',
        };
      } else {
        vscode.postMessage({
          command: ExtensionCommand.getCallbackUrl,
          triggerName,
        });

        return Promise.resolve(callbackInfo);
      }
    },
  };

  return (
    <DesignerProvider
      locale="en-US"
      options={{
        isDarkMode: theme === Theme.Dark,
        readOnly,
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
