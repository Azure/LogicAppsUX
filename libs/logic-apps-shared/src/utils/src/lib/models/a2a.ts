export interface AgentQueryParams {
  apiKey?: string;
  [key: string]: string | undefined;
}

export interface AgentURL {
  agentUrl: string;
  chatUrl: string;
  hostName: string;
  queryParams?: AgentQueryParams;
}
