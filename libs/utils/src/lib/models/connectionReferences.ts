export interface ConnectionReference {
  api?: {
    id: string;
  };
  connection?: {
    id: string;
  };
  // danielle this might not be right
}

export interface ApiHubAuthentication {
  type: string;
  identity?: string;
}

export type ConnectionReferences = Record<string, ConnectionReference>;
