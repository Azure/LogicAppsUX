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
  connectionProperties?: Record<string, unknown>;
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

interface APIManagementConnectionModel {
  apiId: string;
  baseUrl: string;
  subscriptionKey: string;
  authentication?: {
    type: string;
    name: string;
    value: string;
  };
  displayName?: string;
}

export interface ConnectionAndAppSetting {
  connectionKey: string;
  connectionData: ServiceProviderConnectionModel | FunctionConnectionModel | APIManagementConnectionModel;
  settings: Record<string, string>;
  pathLocation: string[];
}

export interface ConnectionsData {
  functionConnections?: Record<string, FunctionConnectionModel>;
  managedApiConnections?: Record<string, ConnectionReferenceModel>;
  serviceProviderConnections?: Record<string, ServiceProviderConnectionModel>;
  apiManagementConnections?: Record<string, APIManagementConnectionModel>;
}

export interface ConnectionAndSettings {
  connections: ConnectionsData;
  settings: Record<string, string>;
}

export const StorageOptions = {
  AzureStorage: 'Azure Storage',
  SQL: 'SQL',
} as const;
export type StorageOptions = (typeof StorageOptions)[keyof typeof StorageOptions];

export interface IConnectionsFileContent {
  name: string;
  content: ConnectionReferenceModel | FunctionConnectionModel | ServiceProviderConnectionModel;
  isManaged: boolean;
}

export interface ConnectionAcl {
  id: string;
  name: string;
  type: string;
  location: string;
  properties: {
    principal: {
      type: string;
      identity: {
        objectId: string;
        tenantId: string;
      };
    };
  };
}

export interface ConnectionStrings {
  sqlConnectionStringValue: string;
  azureWebJobsStorageKeyValue: string;
  azureWebJobsDashboardValue: string;
  websiteContentAzureFileValue: string;
}

export interface FileSystemConnectionInfo {
  connectionParametersSet?: any;
  connectionParameters?: Record<string, any>;
  internalAlternativeParameterValues?: Record<string, any>;
  externalAlternativeParameterValues?: Record<string, any>;
  displayName?: string;
  parameterName?: string;
}
