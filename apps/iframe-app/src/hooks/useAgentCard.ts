import { useQuery } from '@tanstack/react-query';
import type { AgentCard } from '@microsoft/logic-apps-chat';
import { isDirectAgentCardUrl } from '@microsoft/logic-apps-chat';

export interface UseAgentCardConfig {
  apiUrl: string;
  apiKey?: string;
  oboUserToken?: string;
  onUnauthorized?: () => void | Promise<void>;
}

async function fetchAgentCard(config: UseAgentCardConfig): Promise<AgentCard> {
  const url = isDirectAgentCardUrl(config.apiUrl) ? config.apiUrl : `${config.apiUrl}/.well-known/agent-card.json`;

  const requestInit: RequestInit = {};
  const headers: HeadersInit = {};

  if (config.apiKey) {
    headers['X-API-Key'] = config.apiKey;
  }
  if (config.oboUserToken) {
    headers['x-ms-obo-userToken'] = `Key ${config.oboUserToken}`;
  }

  if (headers['X-API-Key'] || headers['x-ms-obo-userToken']) {
    requestInit.headers = headers;
  } else {
    requestInit.credentials = 'include';
  }

  const response = await fetch(url, requestInit);

  if (!response.ok) {
    if (response.statusText === 'Unauthorized') {
      if (config.onUnauthorized) {
        await config.onUnauthorized();
      }
      throw new Error('Unauthorized');
    }
    throw new Error(`Failed to fetch agent card: ${response.statusText}`);
  }

  return (await response.json()) as AgentCard;
}

export function useAgentCard(config: UseAgentCardConfig, enabled = true) {
  return useQuery<AgentCard, Error>({
    queryKey: ['agentCard', config.apiUrl, config.apiKey, config.oboUserToken],
    queryFn: () => fetchAgentCard(config),
    enabled,
    refetchOnMount: false,
    refetchOnReconnect: false,
    refetchOnWindowFocus: false,
  });
}
