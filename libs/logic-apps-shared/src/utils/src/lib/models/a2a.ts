export interface AgentQueryParams {
  apiKey: string;
  [key: string]: string;
}

export interface AgentURL {
  url: string;
  hostName: string;
  queryParams?: AgentQueryParams;
}
