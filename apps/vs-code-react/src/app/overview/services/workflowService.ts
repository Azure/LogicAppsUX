import { getReactQueryClient } from '@microsoft/logic-apps-designer';
import type { AgentQueryParams, AgentURL, IHttpClient } from '@microsoft/logic-apps-shared';

export const fetchAgentUrl = (
  workflowName: string,
  runtimeUrl: string,
  httpClient: IHttpClient,
  clientId: string,
  tenantId: string
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
    } catch {
      return { agentUrl: '', chatUrl: '', hostName: runtimeUrl };
    }
  });
};

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
