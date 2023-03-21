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
  StandardRunService,
  StandardArtifactService,
  ApiManagementInstanceService,
} from '@microsoft/designer-client-services-logic-apps';
import type {
  IApiHubServiceDetails,
  ConnectionCreationInfo,
  ContentType,
  IHostService,
  IWorkflowService,
} from '@microsoft/designer-client-services-logic-apps';
import { HTTP_METHODS } from '@microsoft/utils-logic-apps';
import type { ConnectionAndAppSetting, ConnectionsData, IDesignerPanelMetadata } from '@microsoft/vscode-extension';
import { ExtensionCommand } from '@microsoft/vscode-extension';
import type { WebviewApi } from 'vscode-webview';

export const getDesignerServices = (
  baseUrl: string,
  apiVersion: string,
  apiHubServiceDetails: IApiHubServiceDetails,
  tenantId: string | undefined,
  isLocal: boolean,
  connectionData: ConnectionsData,
  panelMetadata: IDesignerPanelMetadata | null,
  createFileSystemConnection: (connectionInfo: ConnectionCreationInfo, connectionName: string) => Promise<ConnectionCreationInfo>,
  vscode: WebviewApi<unknown>,
  oauthRedirectUrl: string
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
  apimService: ApiManagementInstanceService;
} => {
  let authToken = '',
    panelId = '',
    workflowDetails: Record<string, any> = {},
    appSettings = {};

  const { subscriptionId, resourceGroup, location } = apiHubServiceDetails;

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
  const apimService = new ApiManagementInstanceService({
    apiVersion,
    baseUrl,
    subscriptionId,
    httpClient,
  });

  const artifactService = new StandardArtifactService({
    apiVersion,
    baseUrl,
    httpClient,
    integrationAccountCallbackUrl:
      panelMetadata?.localSettings && panelMetadata?.localSettings['WORKFLOW_INTEGRATION_ACCOUNT_CALLBACK_URL'],
    apiHubServiceDetails,
    schemaArtifacts: panelMetadata?.schemaArtifacts,
    mapArtifacts: panelMetadata?.mapArtifacts,
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
      getMapArtifacts: (args: any) => {
        const { mapType, mapSource } = args.parameters;
        return artifactService.getMapArtifacts(mapType, mapSource);
      },
      getSchemaArtifacts: (args: any) => artifactService.getSchemaArtifacts(args.parameters.schemaSource),
      getApimOperations: (args: any) => {
        const { configuration } = args;
        if (!configuration?.connection?.apiId) {
          throw new Error('Missing api information to make dynamic call');
        }
        return apimService.getOperations(configuration?.connection?.apiId);
      },
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

  // Workflow service needs to be implemented to get the callback url for azure resources
  const workflowService: IWorkflowService = {
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

  const hostService: IHostService = {
    fetchAndDisplayContent: async (title: string, url: string, type: ContentType) => {
      const content = await httpClient.get({ uri: url });
      return vscode.postMessage({
        command: ExtensionCommand.showContent,
        content: JSON.stringify(content, null, 4),
        header: type,
        id: title,
        title,
      });
    },
  };

  const runService = new StandardRunService({
    apiVersion,
    baseUrl,
    workflowName: panelMetadata?.workflowName ?? '',
    httpClient,
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
    apimService,
  };
};
