import type { HttpClient } from './httpClient';
import {
  StandardConnectionService,
  StandardConnectorService,
  StandardOperationManifestService,
  StandardSearchService,
  StandardOAuthService,
  StandardGatewayService,
} from '@microsoft-logic-apps/designer-client-services';
import type { IApiHubServiceDetails } from '@microsoft-logic-apps/designer-client-services';
import { ResourceIdentityType, HTTP_METHODS, ExtensionCommand } from '@microsoft-logic-apps/utils';
import type { WebviewApi } from 'vscode-webview';

export const getDesignerServices = (
  baseUrl: string,
  httpClient: HttpClient,
  apiHubServiceDetails: IApiHubServiceDetails,
  isLocal: boolean,
  vscode: WebviewApi<unknown>
): any => {
  const connectionService = new StandardConnectionService({
    baseUrl,
    apiVersion: '2018-11-01',
    httpClient,
    apiHubServiceDetails,
    workflowAppDetails: { appName: 'app', identity: { type: ResourceIdentityType.SYSTEM_ASSIGNED } },
    readConnections: () => Promise.resolve({}),
  });

  const connectorService = new StandardConnectorService({
    apiVersion: '2018-11-01',
    baseUrl,
    httpClient,
    apiHubServiceDetails,
    clientSupportedOperations: [
      {
        connectorId: 'connectionProviders/localWorkflowOperation',
        operationId: 'invokeWorkflow',
      },
      {
        connectorId: 'connectionProviders/xmlOperations',
        operationId: 'xmlValidation',
      },
      {
        connectorId: 'connectionProviders/xmlOperations',
        operationId: 'xmlTransform',
      },
      {
        connectorId: 'connectionProviders/liquidOperations',
        operationId: 'liquidJsonToJson',
      },
      {
        connectorId: 'connectionProviders/liquidOperations',
        operationId: 'liquidJsonToText',
      },
      {
        connectorId: 'connectionProviders/liquidOperations',
        operationId: 'liquidXmlToJson',
      },
      {
        connectorId: 'connectionProviders/liquidOperations',
        operationId: 'liquidXmlToText',
      },
      {
        connectorId: 'connectionProviders/flatFileOperations',
        operationId: 'flatFileDecoding',
      },
      {
        connectorId: 'connectionProviders/flatFileOperations',
        operationId: 'flatFileEncoding',
      },
      {
        connectorId: 'connectionProviders/swiftOperations',
        operationId: 'SwiftDecode',
      },
      {
        connectorId: 'connectionProviders/swiftOperations',
        operationId: 'SwiftEncode',
      },
    ],
    getConfiguration: () => Promise.resolve({}),
    schemaClient: {
      getWorkflowSwagger: () => Promise.resolve({}),
    },
    valuesClient: {
      getWorkflows: () => Promise.resolve([]),
      getMapArtifacts: () => Promise.resolve([]),
      getSchemaArtifacts: () => Promise.resolve([]),
    },
    workflowReferenceId: '',
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
        return Promise.resolve({
          method: HTTP_METHODS.POST,
          value: 'Url not available during authoring in local project. Check Overview page.',
        });
      } else {
        vscode.postMessage({
          command: ExtensionCommand.getCallbackUrl,
          triggerName,
        });

        return Promise.resolve('');
      }
    },
  };

  return {
    connectionService,
    connectorService,
    operationManifestService,
    searchService,
    oAuthService,
    gatewayService,
    workflowService,
  };
};
