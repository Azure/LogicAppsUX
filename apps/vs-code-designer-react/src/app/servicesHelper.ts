import { clientSupportedOperations } from './constants';
import { HttpClient } from './services/httpClient';
import { StandardOAuthService } from './services/oAuth';
import { resolveConnectionsReferences } from './utilities/workflow';
import {
  StandardConnectionService,
  StandardConnectorService,
  StandardOperationManifestService,
  StandardSearchService,
  StandardGatewayService,
} from '@microsoft/designer-client-services-logic-apps';
import type { IApiHubServiceDetails, ConnectionCreationInfo } from '@microsoft/designer-client-services-logic-apps';
import { HTTP_METHODS } from '@microsoft/utils-logic-apps';
import type { ConnectionAndAppSetting, ConnectionsData, IDesignerPanelMetadata } from '@microsoft/vscode-extension';
import { ExtensionCommand } from '@microsoft/vscode-extension';

export const getDesignerServices = (
  baseUrl: string,
  apiVersion: string,
  apiHubServiceDetails: IApiHubServiceDetails,
  tenantId: string | undefined,
  isLocal: boolean,
  connectionData: ConnectionsData,
  panelMetadata: IDesignerPanelMetadata | null,
  createFileSystemConnection: (connectionInfo: ConnectionCreationInfo, connectionName: string) => Promise<ConnectionCreationInfo>,
  vscode: any,
  oauthRedirectUrl: string
): any => {
  let authToken = '',
    panelId = '',
    workflowDetails: Record<string, any> = {},
    appSettings = {};

  if (panelMetadata) {
    authToken = panelMetadata.accessToken ?? '';
    panelId = panelMetadata.panelId;
    workflowDetails = panelMetadata.workflowDetails;
    appSettings = panelMetadata.localSettings;
  }

  const addConnectionData = async (connectionAndSetting: ConnectionAndAppSetting): Promise<void> => {
    return vscode.postMessage({
      command: ExtensionCommand.addConnection,
      connectionAndSetting,
    });
  };

  const httpClient = new HttpClient({ accessToken: authToken, baseUrl, apiHubBaseUrl: apiHubServiceDetails.baseUrl });
  const connectionService = new StandardConnectionService({
    baseUrl,
    apiVersion,
    httpClient,
    apiHubServiceDetails,
    tenantId,
    readConnections: () => Promise.resolve(connectionData),
    writeConnection: (connectionAndSetting: ConnectionAndAppSetting) => {
      return addConnectionData(connectionAndSetting);
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
    // TODO ValuesClient needs to be implemented
    valuesClient: {
      getWorkflows: () => Promise.resolve(manualWorkflows),
      getMapArtifacts: () => Promise.resolve([]),
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
    isDev: false,
  });

  const { subscriptionId, resourceGroup, location } = apiHubServiceDetails;

  const oAuthService = new StandardOAuthService({
    vscode,
    panelId,
    authToken,
    oauthRedirectUrl,
    baseUrl: apiHubServiceDetails.baseUrl,
    apiVersion: '2018-07-01-preview',
    httpClient,
    subscriptionId,
    resourceGroup,
    location,
  });

  const gatewayService = new StandardGatewayService({
    baseUrl,
    httpClient,
    apiVersions: {
      subscription: apiVersion,
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
