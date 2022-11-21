export interface ConnectionReferenceModel {
  connection: {
    id: string;
  };
  api: {
    id: string;
  };
  connectionRuntimeUrl: string;
  authentication: {
    type: string;
    audience?: string;
    credentialType?: string;
    clientId?: string;
    tenant?: string;
    secret?: string;
    scheme?: string;
    parameter?: string;
  };
}

export interface FunctionConnectionModel {
  function: {
    id: string;
  };
  triggerUrl: string;
  authentication: {
    type: string;
    name: string;
    value: string;
  };
  displayName?: string;
}

export interface ServiceProviderConnectionModel {
  parameterValues: Record<string, any>;
  serviceProvider: {
    id: string;
  };
  displayName?: string;
}

export interface ConnectionsData {
  functionConnections?: Record<string, FunctionConnectionModel>;
  managedApiConnections?: Record<string, ConnectionReferenceModel>;
  serviceProviderConnections?: Record<string, ServiceProviderConnectionModel>;
}

export interface ConnectionAndSettings {
  connections: ConnectionsData;
  settings: Record<string, string>;
}
