export interface ConnectionReference {
  api?: {
    id: string;
  };
  connection?: {
    id: string;
  };
  authentication?: ApiHubAuthentication;
  connectionRuntimeUrl: string;
  // danielle this might not be right
}

export interface ApiHubAuthentication {
  type: string;
  identity?: string;
}

export interface ServiceProviderConnections {
  displayName: string;
  parameterValues: {
    connectionString: string;
  };
  serviceProvider: {
    id: string;
  };
}

export type ConnectionReferences = Record<string, ConnectionReference>;

export interface ConnectionsJSON {
  managedApiConnections: { [connectionName: string]: ConnectionReference };
  serviceProviderConnections: { [connectionName: string]: ConnectionReference };
}
