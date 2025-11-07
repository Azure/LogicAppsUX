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

// Async function to get Agent URL with authentication tokens (uses React Query for memoization)
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
  console.log('🚀 fetchAgentUrl started with params:', { workflowName, runtimeUrl, clientId, tenantId, subscriptionId, resourceGroup });
  const queryClient = getReactQueryClient();

  return queryClient.fetchQuery(['agentUrl', workflowName, runtimeUrl], async (): Promise<AgentURL> => {
    console.log('📋 React Query executing fetchQuery for agentUrl');

    if (!workflowName || !runtimeUrl) {
      console.log('⚠️ Missing required parameters - workflowName or runtimeUrl');
      return { agentUrl: '', chatUrl: '', hostName: '' };
    }

    try {
      console.log('🔧 Building agent URLs...');
      const baseUrl = `${new URL(runtimeUrl).origin}`;
      const agentBaseUrl = baseUrl.startsWith('http://') ? baseUrl : `http://${baseUrl}`;
      const agentUrl = `${agentBaseUrl}/api/Agents/${workflowName}`;
      const chatUrl = `${agentBaseUrl}/api/agentsChat/${workflowName}/IFrame`;
      console.log('🔗 Generated URLs:', { agentUrl, chatUrl, agentBaseUrl });

      let queryParams: AgentQueryParams | undefined = undefined;

      // Get A2A authentication key
      console.log('🔑 Fetching A2A authentication key...');
      const a2aData = await fetchA2AAuthKey(workflowName, runtimeUrl, httpClient, clientId, tenantId);
      console.log('✅ A2A authentication key fetch completed:', a2aData ? 'Success' : 'Failed');

      // Get OBO data if connections are available
      let oboToken: string | undefined = undefined;
      if (connectionsData) {
        console.log('🔄 Connections data available, fetching OBO data...');
        // Extract site resource ID from runtime URL
        const url = new URL(runtimeUrl);
        const siteName = url.hostname.split('.')[0];
        const siteResourceId = `/subscriptions/${subscriptionId}/resourceGroups/${resourceGroup}/providers/Microsoft.Web/sites/${siteName}`;
        console.log('🏗️ Constructed site resource ID:', siteResourceId);

        const oboData = await fetchOBOData(
          siteResourceId,
          baseUrl,
          httpClient,
          clientId,
          tenantId,
          subscriptionId!,
          resourceGroup!,
          siteName,
          connectionsData
        );
        console.log('✅ OBO data fetch completed');

        // Extract OBO token from response
        if (oboData && oboData?.key) {
          oboToken = oboData.key;
          console.log('🎫 OBO token found and extracted');
        } else {
          console.log('⚠️ No OBO token available in response');
        }
      } else {
        console.log('ℹ️ No connections data provided, skipping OBO fetch');
      }

      // Add authentication tokens if available
      const a2aKey = a2aData?.key;
      if (a2aKey || oboToken) {
        console.log('🗝️ Setting query params with available tokens');
        queryParams = {
          ...(a2aKey && { apiKey: a2aKey }),
          ...(oboToken && { oboUserToken: oboToken }),
        };
        console.log('🔑 Query params set:', { hasApiKey: !!a2aKey, hasOboToken: !!oboToken });
      } else {
        console.log('⚠️ No authentication tokens available');
      }

      const result = {
        agentUrl,
        chatUrl,
        queryParams,
        hostName: runtimeUrl,
      };
      console.log('🎯 fetchAgentUrl returning result:', result);
      return result;
    } catch (error) {
      console.log('❌ Error in fetchAgentUrl:', error);
      LoggerService().log({
        level: LogEntryLevel.Error,
        message: `Failed to get agent URL: ${error}`,
        area: 'vscode: fetchAgentUrl',
      });
      const errorResult = { agentUrl: '', chatUrl: '', hostName: runtimeUrl };
      console.log('🔄 fetchAgentUrl returning error result:', errorResult);
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
// Helper function to fetch OBO (On-Behalf-Of) data
const fetchOBOData = async (
  siteResourceId: string,
  baseUrl: string,
  httpClient: IHttpClient,
  clientId: string,
  tenantId: string,
  azureSubscriptionId: string,
  resourceGroup: string,
  siteName: string,
  connectionsData?: ConnectionsData | undefined
) => {
  try {
    const armBaseUrl = 'https://management.azure.com';
    console.log('🔗 OBO ARM Base URL:', armBaseUrl);
    const siteResourceId = `/subscriptions/${azureSubscriptionId}/resourceGroups/${resourceGroup}/providers/Microsoft.Web/sites/${siteName}`;
    console.log('🏗️ Constructed site resource ID in fetchOBO Data:', siteResourceId);

    const connectionsUri = `${armBaseUrl}${siteResourceId}/workflows/configuration/connections?api-version=2018-11-01`;
    console.log('🔗 OBO Connections Request URI:', connectionsUri);

    // Parse connections data to JSON and print it
    try {
      const connectionsDataJson = JSON.stringify(connectionsData, null, 2);
      console.log('📊 Connections Data (JSON):', connectionsDataJson);
    } catch (error) {
      console.log('❌ Error parsing connections data to JSON:', error);
      console.log('📊 Connections Data (raw):', connectionsData);
    }

    // Find dynamic connection
    const apiConnections = connectionsData?.managedApiConnections ?? {};
    let connectionId = '';
    let connectionId2 = '';

    for (const key of Object.keys(apiConnections)) {
      const connection = apiConnections[key];
      //  // connectionId2 =
      // '/subscriptions/80d4fe69-c95b-4dd2-a938-9250f1c8ab03/resourceGroups/rohithah-brazilus/providers/Microsoft.Web/connections/teams-1';
      // Check for runtimeSource at the root level (new structure after your changes)
      const runtimeSourceAtRoot = connection.runtimeSource;
      // Also check in connectionProperties for backward compatibility
      const runtimeSourceInProperties = connection.connectionProperties?.runtimeSource;

      console.log(`🔍 Checking connection ${key}:`, {
        runtimeSourceAtRoot,
        runtimeSourceInProperties,
        hasConnectionProperties: !!connection.connectionProperties,
      });

      // Check both locations for Dynamic runtime source
      if (equals(runtimeSourceAtRoot ?? '', 'Dynamic', true) || equals(runtimeSourceInProperties ?? '', 'Dynamic', true)) {
        connectionId = connection.connection.id;
        connectionId2 = resolveConnectionIdPlaceholders(connectionId, azureSubscriptionId, resourceGroup);
        console.log('🔍 Found Dynamic Connection ID:', connectionId2);
        break;
      }
    }

    if (!connectionId2) {
      console.log('⚠️ No dynamic connection found in connections data');
      return null;
    }

    const oboKeysUri = `${armBaseUrl}${connectionId2}/listDynamicConnectionKeys?api-version=2015-08-01-preview`;
    console.log('🔗 OBO Keys Request URI:', oboKeysUri);

    const oboResponse = await httpClient.post<any, any>({
      uri: oboKeysUri,
      content: null,
      headers: {
        'x-ms-client-object-id': clientId,
        'x-ms-client-tenant-id': tenantId,
      },
    });

    console.log('✅ OBO Keys Response:', oboResponse);
    return oboResponse;
  } catch (error) {
    // OBO is optional, continue without it
    LoggerService().log({
      level: LogEntryLevel.Error,
      message: `Failed to get OBO data: ${error}`,
      area: 'fetchAgentUrl',
    });
    console.log('❌ OBO Error:', error);
    return null;
  }
};

// Helper function to resolve app settings placeholders in connection IDs
const resolveConnectionIdPlaceholders = (connectionId: string, subscriptionId: string, resourceGroup: string): string => {
  console.log('🔄 Resolving placeholders in connection ID:', connectionId);

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

  // Also handle location placeholder if present
  // Note: You'll need to pass location as a parameter if this is needed
  // resolvedConnectionId = resolvedConnectionId.replace(
  //   /@\{appsetting\('WORKFLOWS_LOCATION_NAME'\)\}/g,
  //   location
  // );

  console.log('✅ Resolved connection ID:', resolvedConnectionId);
  return resolvedConnectionId;
};
