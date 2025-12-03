export interface AgentQueryParams {
  apiKey?: string;
  oboUserToken?: string;
  [key: string]: string | undefined;
}

export interface AgentURL {
  agentUrl: string;
  chatUrl: string;
  hostName: string;
  authenticationEnabled?: boolean;
  queryParams?: AgentQueryParams;
}
