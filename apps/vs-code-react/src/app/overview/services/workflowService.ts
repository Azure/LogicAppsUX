import { getReactQueryClient } from '@microsoft/logic-apps-designer';
import {
  type AgentURL,
  LogEntryLevel,
  LoggerService,
  type AgentQueryParams,
  type IHttpClient,
  type ConnectionsData,
  equals,
} from '@microsoft/logic-apps-shared';

export const fetchAgentUrl = (
  workflowName: string,
  runtimeUrl: string,
  httpClient: IHttpClient,
  clientId: string,
  tenantId: string,
  connectionsData?: ConnectionsData,
  subscriptionId?: string,
  resourceGroup?: string
): Promise<AgentURL> => {
  const queryClient = getReactQueryClient();

  return queryClient.fetchQuery(['agentUrl', workflowName, runtimeUrl], async (): Promise<AgentURL> => {
    if (!workflowName || !runtimeUrl) {
      return { agentUrl: '', chatUrl: '', hostName: '' };
    }

    try {
      const baseUrl = `${new URL(runtimeUrl).origin}`;
      const agentBaseUrl = baseUrl.startsWith('http://') ? baseUrl : `http://${baseUrl}`;
      const agentUrl = `${agentBaseUrl}/api/Agents/${workflowName}`;
      const chatUrl = `${agentBaseUrl}/api/agentsChat/${workflowName}/IFrame`;

      let queryParams: AgentQueryParams | undefined = undefined;

      // Get A2A authentication key
      const a2aData = await fetchA2AAuthKey(workflowName, runtimeUrl, httpClient, clientId, tenantId);

      // Get OBO data if connections are available
      let oboToken: string | undefined = undefined;
      if (connectionsData) {
        const oboData = await fetchOBOData(baseUrl, httpClient, clientId, tenantId, subscriptionId!, resourceGroup!, connectionsData);

        // Extract OBO token from response
        if (oboData && oboData?.key) {
          oboToken = oboData.key;
        }
      }

      // Add authentication tokens if available
      const a2aKey = a2aData?.key;
      if (a2aKey || oboToken) {
        queryParams = {
          ...(a2aKey && { apiKey: a2aKey }),
          ...(oboToken && { oboUserToken: oboToken }),
        };
      }

      return {
        agentUrl,
        chatUrl,
        queryParams,
        hostName: runtimeUrl,
      };
    } catch (error) {
      LoggerService().log({
        level: LogEntryLevel.Error,
        message: `Failed to get agent URL: ${error}`,
        area: 'vscode: fetchAgentUrl',
      });
      const errorResult = { agentUrl: '', chatUrl: '', hostName: runtimeUrl };
      return errorResult;
    }
  });
};

// Helper function to fetch A2A authentication key
const fetchA2AAuthKey = async (workflowName: string, baseUrl: string, httpClient: IHttpClient, clientId: string, tenantId: string) => {
  const currentDate: Date = new Date();
  const response = await httpClient.post<any, any>({
    uri: `${baseUrl}/workflows/${workflowName}/listApiKeys?api-version=2018-11-01`,
    content: {
      expiry: new Date(currentDate.getTime() + 86400000).toISOString(),
      keyType: 'Primary',
    },
    headers: {
      'x-ms-client-object-id': clientId,
      'x-ms-client-tenant-id': tenantId,
    },
  });

  return response;
};

// Helper function to fetch OBO (On-Behalf-Of) data
const fetchOBOData = async (
  baseUrl: string,
  httpClient: IHttpClient,
  clientId: string,
  tenantId: string,
  azureSubscriptionId: string,
  resourceGroup: string,
  connectionsData?: ConnectionsData | undefined
) => {
  try {
    const armBaseUrl = 'https://management.azure.com';

    // Find dynamic connection
    const apiConnections = connectionsData?.managedApiConnections ?? {};
    let connectionId = '';

    for (const key of Object.keys(apiConnections)) {
      const connection = apiConnections[key];
      // Check for runtimeSource at the root level (new structure after your changes)
      const runtimeSourceAtRoot = connection.runtimeSource;
      // Also check in connectionProperties for backward compatibility
      const runtimeSourceInProperties = connection.connectionProperties?.runtimeSource;

      // Check both locations for Dynamic runtime source
      if (equals(runtimeSourceAtRoot ?? '', 'Dynamic', true) || equals(runtimeSourceInProperties ?? '', 'Dynamic', true)) {
        connectionId = connection.connection.id;
        connectionId = resolveConnectionIdPlaceholders(connectionId, azureSubscriptionId, resourceGroup);
        break;
      }
    }

    if (!connectionId) {
      return null;
    }

    const oboKeysUri = `${armBaseUrl}${connectionId}/listDynamicConnectionKeys?api-version=2015-08-01-preview`;

    const oboResponse = await httpClient.post<any, any>({
      uri: oboKeysUri,
      content: null,
      headers: {
        'x-ms-client-object-id': clientId,
        'x-ms-client-tenant-id': tenantId,
      },
    });

    return oboResponse;
  } catch (error) {
    // OBO is optional, continue without it
    LoggerService().log({
      level: LogEntryLevel.Error,
      message: `Failed to get OBO data: ${error}`,
      area: 'fetchAgentUrl',
    });
    return null;
  }
};

// Helper function to resolve app settings placeholders in connection IDs
const resolveConnectionIdPlaceholders = (connectionId: string, subscriptionId: string, resourceGroup: string): string => {
  let resolvedConnectionId = connectionId;

  // Replace subscription ID placeholder - handle both encoded and non-encoded formats
  // Non-encoded format: @{appsetting('WORKFLOWS_SUBSCRIPTION_ID')}
  resolvedConnectionId = resolvedConnectionId.replace(/@\{appsetting\('WORKFLOWS_SUBSCRIPTION_ID'\)\}/g, subscriptionId);

  // URL-encoded format (just in case): @%7Bappsetting('WORKFLOWS_SUBSCRIPTION_ID')%7D
  resolvedConnectionId = resolvedConnectionId.replace(/@%7Bappsetting\('WORKFLOWS_SUBSCRIPTION_ID'\)%7D/g, subscriptionId);

  // Replace resource group placeholder - handle both encoded and non-encoded formats
  // Non-encoded format: @{appsetting('WORKFLOWS_RESOURCE_GROUP_NAME')}
  resolvedConnectionId = resolvedConnectionId.replace(/@\{appsetting\('WORKFLOWS_RESOURCE_GROUP_NAME'\)\}/g, resourceGroup);

  // URL-encoded format (just in case): @%7Bappsetting('WORKFLOWS_RESOURCE_GROUP_NAME')%7D
  resolvedConnectionId = resolvedConnectionId.replace(/@%7Bappsetting\('WORKFLOWS_RESOURCE_GROUP_NAME'\)%7D/g, resourceGroup);

  return resolvedConnectionId;
};
