import { AssertionErrorCode, AssertionException } from '@microsoft/utils-logic-apps';
import type {
  Connector,
  Connection,
  ConnectionParameter,
  ConnectionParameterSet as ParameterSet,
  ConnectionParameterSetValues,
  ConnectionMetadata,
} from '@microsoft/utils-logic-apps';

export interface ConnectorWithSwagger {
  connector: Connector;
  swagger: OpenAPIV2.Document;
}

export interface ConnectionCreationInfo {
  connectionParametersSet?: ConnectionParameterSetValues;
  connectionParameters?: Record<string, any>;
  internalAlternativeParameterValues?: Record<string, any>;
  externalAlternativeParameterValues?: Record<string, any>;
  displayName?: string;
  parameterName?: string;
}

export interface ConnectionParametersMetadata {
  connectionParameters?: Record<string, ConnectionParameter>;
  connectionParameterSet?: ParameterSet;
  connectionMetadata?: ConnectionMetadata;
}

export interface CreateConnectionResult {
  connection?: Connection;
  errorMessage?: string;
}

export interface IConnectionService {
  [x: string]: any;
  dispose(): void;
  getConnector(connectorId: string): Promise<Connector>;
  getConnectorAndSwagger(connectorId: string): Promise<ConnectorWithSwagger>;
  getSwaggerFromUri(uri: string): Promise<OpenAPIV2.Document>;
  getConnection(connectionId: string): Promise<Connection>;
  getConnections(connectorId?: string): Promise<Connection[]>;
  createConnection(
    connectionId: string,
    connector: Connector,
    connectionInfo: ConnectionCreationInfo,
    parametersMetadata?: ConnectionParametersMetadata
  ): Promise<Connection>;
  createAndAuthorizeOAuthConnection(
    connectionId: string,
    connectorId: string,
    connectionInfo: ConnectionCreationInfo,
    parametersMetadata: ConnectionParametersMetadata
  ): Promise<CreateConnectionResult>;
  getUniqueConnectionName(connectorId: string, connectionNames: string[], connectorName: string): Promise<string>;
  fetchFunctionApps(): Promise<any>;
  fetchFunctionAppsFunctions(functionAppId: string): Promise<any>;
  fetchFunctionKey(functionId: string): Promise<any>;
}

let service: IConnectionService;

export const InitConnectionService = (connectionService: IConnectionService): void => {
  service = connectionService;
};

export const ConnectionService = (): IConnectionService => {
  if (!service) {
    throw new AssertionException(AssertionErrorCode.SERVICE_NOT_INITIALIZED, 'ConnectionService need to be initialized before using');
  }

  return service;
};
