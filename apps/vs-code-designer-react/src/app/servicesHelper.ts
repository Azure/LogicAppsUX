import { HttpClient } from './httpClient';
import {
  StandardConnectionService,
  StandardConnectorService,
  StandardOperationManifestService,
  StandardSearchService,
  StandardOAuthService,
  StandardGatewayService,
  StandardRunService,
} from '@microsoft/designer-client-services-logic-apps';
import type { IApiHubServiceDetails, ContentType, IHostService, IWorkflowService } from '@microsoft/designer-client-services-logic-apps';
import { ResourceIdentityType, HTTP_METHODS } from '@microsoft/utils-logic-apps';

const httpClient = new HttpClient();

export const getDesignerServices = (
  baseUrl: string,
  apiVersion: string,
  apiHubServiceDetails: IApiHubServiceDetails,
  isLocal: boolean
): {
  connectionService: StandardConnectionService;
  connectorService: StandardConnectorService;
  operationManifestService: StandardOperationManifestService;
  searchService: StandardSearchService;
  oAuthService: StandardOAuthService;
  gatewayService: StandardGatewayService;
  workflowService: IWorkflowService;
  hostService: IHostService;
  runService: StandardRunService;
} => {
  const connectionService = new StandardConnectionService({
    baseUrl,
    apiVersion,
    httpClient,
    apiHubServiceDetails,
    workflowAppDetails: { appName: 'app', identity: { type: ResourceIdentityType.SYSTEM_ASSIGNED } },
    readConnections: () => Promise.resolve({}),
  });

  const connectorService = new StandardConnectorService({
    apiVersion,
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
    apiVersion,
    baseUrl,
    httpClient,
  });

  const searchService = new StandardSearchService({
    baseUrl,
    apiVersion,
    httpClient,
    apiHubServiceDetails,
    isDev: true,
  });

  const oAuthService = new StandardOAuthService({
    baseUrl,
    apiVersion,
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
    getCallbackUrl: async () => {
      if (isLocal) {
        return Promise.resolve({
          method: HTTP_METHODS.POST,
          value: 'Url not available during authoring in local project. Check Overview page.',
        });
      } else {
        return Promise.resolve({ method: HTTP_METHODS.POST, value: 'Dummy url' });
      }
    },
  };

  const hostService = { fetchAndDisplayContent: (title: string, url: string, type: ContentType) => console.log(title, url, type) };

  const runService = new StandardRunService({
    apiVersion,
    baseUrl,
    workflowName: 'app',
    httpClient,
    isDev: true,
  });

  return {
    connectionService,
    connectorService,
    operationManifestService,
    searchService,
    oAuthService,
    gatewayService,
    workflowService,
    hostService,
    runService,
  };
};
