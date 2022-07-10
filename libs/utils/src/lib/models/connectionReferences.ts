export interface ConnectionReference {
  api?: {
    id: string;
  };
  connection?: {
    id: string;
  };
  authentication?: ApiHubAuthentication;
  connectionRuntimeUrl: string;
}

export interface ApiHubAuthentication {
  type: string;
  identity?: string;
}

export interface ServiceProviderConnection {
  displayName: string;
  parameterValues: {
    connectionString: string;
  };
  serviceProvider: {
    id: string;
  };
}

export interface FunctionsConnection {
  function: {
    id: string;
  };
  triggerUrl: string;
  authentication: {
    type: string;
    name: string;
    value: string;
  };
  displayName: string;
}

export type ConnectionReferences = Record<string, ConnectionReference>;

export interface ConnectionsJSON {
  managedApiConnections?: { [connectionName: string]: ConnectionReference };
  serviceProviderConnections?: { [connectionName: string]: ServiceProviderConnection };
  functionConnections?: { [connectionName: string]: FunctionsConnection };
}

export const emptyConnections: ConnectionsJSON = {
  managedApiConnections: {},
  serviceProviderConnections: {},
  functionConnections: {},
};
