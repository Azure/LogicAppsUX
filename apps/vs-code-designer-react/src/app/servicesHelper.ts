import { HttpClient } from './httpClient';
import { resolveConnectionsReferences } from './utilities/workflow';
import {
  StandardConnectionService,
  StandardConnectorService,
  StandardOperationManifestService,
  StandardSearchService,
  StandardOAuthService,
  StandardGatewayService,
} from '@microsoft/designer-client-services-logic-apps';
import type { IApiHubServiceDetails } from '@microsoft/designer-client-services-logic-apps';
import { ResourceIdentityType, HTTP_METHODS } from '@microsoft/utils-logic-apps';
import type { ConnectionAndAppSetting, ConnectionsData, FileSystemConnectionInfo } from '@microsoft/vscode-extension';
import { ExtensionCommand } from '@microsoft/vscode-extension';

const httpClient = new HttpClient();

export const getDesignerServices = (
  baseUrl: string,
  apiVersion: string,
  apiHubServiceDetails: IApiHubServiceDetails,
  tenantId: string | undefined,
  isLocal: boolean,
  connectionData: ConnectionsData,
  appSettings: Record<string, string>,
  createFileSystemConnection: (connectionInfo: FileSystemConnectionInfo, connectionName: string) => void,
  vscode: any
): any => {
  const connectionService = new StandardConnectionService({
    baseUrl,
    apiVersion,
    httpClient,
    apiHubServiceDetails,
    tenantId,
    workflowAppDetails: { appName: 'app', identity: { type: ResourceIdentityType.SYSTEM_ASSIGNED } },
    readConnections: () => Promise.resolve(connectionData),
    writeConnections: (connectionAndSetting: ConnectionAndAppSetting) => {
      return vscode.postMessage({
        command: ExtensionCommand.addConnection,
        connectionAndSetting,
      });
    },
    connectionCreationClients: {
      FileSystem: {
        connectionCreationFunc: createFileSystemConnection,
      },
    },
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
    getConfiguration: async (connectionId: string): Promise<any> => {
      if (!connectionId) {
        return Promise.resolve();
      }

      const connectionName = connectionId.split('/').splice(-1)[0];
      const connectionInfo = connectionData?.serviceProviderConnections?.[connectionName];

      if (connectionInfo) {
        const resolvedConnectionInfo = resolveConnectionsReferences(JSON.stringify(connectionInfo), {}, appSettings);
        delete resolvedConnectionInfo.displayName;

        return {
          connection: resolvedConnectionInfo,
        };
      }

      return undefined;
    },
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
