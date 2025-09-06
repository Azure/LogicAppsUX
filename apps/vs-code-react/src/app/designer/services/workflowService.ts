import { getReactQueryClient } from '@microsoft/logic-apps-designer';
import { type AgentURL, LogEntryLevel, LoggerService, type AgentQueryParams, type IHttpClient } from '@microsoft/logic-apps-shared';

// Async function to get Agent URL with authentication tokens (uses React Query for memoization)
export const fetchAgentUrl = (workflowName: string, runtimeUrl: string, httpClient: IHttpClient): Promise<AgentURL> => {
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
      const a2aData = await fetchA2AAuthKey(workflowName, runtimeUrl, httpClient);

      // Add authentication tokens if available
      const a2aKey = a2aData?.key;
      if (a2aKey) {
        queryParams = { apiKey: a2aKey };
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
        area: 'fetchAgentUrl',
      });
      return { agentUrl: '', chatUrl: '', hostName: runtimeUrl };
    }
  });
};

// Helper function to fetch A2A authentication key
const fetchA2AAuthKey = async (workflowName: string, baseUrl: string, httpClient: IHttpClient) => {
  const currentDate: Date = new Date();
  // http://localhost:7071/runtime/webhooks/workflow/api/management/workflows/TelecomAgents/listApiKeys?api-version=2019-10-01-edge-preview
  // "http://localhost:7071/runtime/webhooks/workflow/api/management"
  const response = await httpClient.post<any, any>({
    uri: `${baseUrl}/workflows/${workflowName}/listApiKeys?api-version=2018-11-01`,
    content: {
      expiry: new Date(currentDate.getTime() + 86400000).toISOString(),
      keyType: 'Primary',
    },
    headers: {
      'x-ms-client-object-id': 'tests',
      'x-ms-client-tenant-id': 'test',
    },
  });

  return response;
};
