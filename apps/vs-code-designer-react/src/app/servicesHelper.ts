import { clientSupportedOperations } from './constants';
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

export const getDesignerServices = (
  baseUrl: string,
  apiVersion: string,
  apiHubServiceDetails: IApiHubServiceDetails,
  tenantId: string | undefined,
  isLocal: boolean,
  connectionData: ConnectionsData,
  appSettings: Record<string, string>,
  workflowDetails: Record<string, any>,
  authToken: string,
  createFileSystemConnection: (connectionInfo: FileSystemConnectionInfo, connectionName: string) => void,
  vscode: any
): any => {
  const httpClient = new HttpClient({ accessToken: authToken, baseUrl: apiHubServiceDetails.baseUrl });
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

  const manualWorkflows = Object.keys(workflowDetails).map((name) => ({ value: name, displayName: name }));

  const connectorService = new StandardConnectorService({
    apiVersion,
    baseUrl,
    httpClient,
    clientSupportedOperations: clientSupportedOperations,
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
      getWorkflowSwagger: (args) => {
        const workflowName = args.parameters.name;
        const workflowSchemas = JSON.stringify(workflowDetails);
        return Promise.resolve(workflowSchemas[workflowName] || {});
      },
    },
    valuesClient: {
      getWorkflows: () => Promise.resolve(manualWorkflows),
      getMapArtifacts: () => Promise.resolve([]),
      // getMapArtifacts: (args) => {
      //   if (args.mapSource === integrationAccount) {
      //     // if (!iaMapArtifacts) {
      //     //   const settings = JSON.stringify(localSettings);
      //     //   vscode.postMessage({
      //     //     command: 'GetMapArtifacts',
      //     //     callbackUrl: settings && settings['WORKFLOW_INTEGRATION_ACCOUNT_CALLBACK_URL'],
      //     //   });
      //     // }

      //     // const promise = new Promise((resolve, reject) => {
      //     //   resolveMapArtifacts = () => {
      //     //     if (iaMapArtifacts) {
      //     //       resolve(iaMapArtifacts[args.mapType.toLowerCase()] || []);
      //     //     } else {
      //     //       resolve([]);
      //     //     }
      //     //   };
      //     //   rejectMapArtifacts = (errorMessage) => {
      //     //     reject({ message: errorMessage });
      //     //   };
      //     // });

      //     // if (iaMapArtifacts) {
      //     //   resolveMapArtifacts();
      //     //   resolveMapArtifacts = null;
      //     //   rejectMapArtifacts = null;
      //     // }

      //     // return promise;
      //     return []
      //   } else {
      //     const extensionName = args.mapType;
      //     const allMaps = JSON.stringify(mapArtifacts);
      //     return Promise.resolve(allMaps[extensionName] || []);
      //   }
      // },
      getSchemaArtifacts: () => Promise.resolve([]),
    },
    apiHubServiceDetails,
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
