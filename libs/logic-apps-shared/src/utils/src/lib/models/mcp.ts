export interface McpServer {
  name: string;
  description: string;
  enabled: boolean;
  tools: {
    name: string;
  }[];
  url?: string;
}
