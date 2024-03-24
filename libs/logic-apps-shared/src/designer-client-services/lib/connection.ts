import { AssertionErrorCode, AssertionException } from '@microsoft/logic-apps-shared';
import type {
  Connector,
  Connection,
  ConnectionParameter,
  ConnectionParameterSet as ParameterSet,
  ConnectionParameterSetValues,
  ConnectionMetadata,
  OpenAPIV2,
} from '@microsoft/logic-apps-shared';

export interface ConnectorWithSwagger {
  connector: Connector;
  swagger: OpenAPIV2.Document;
}

export interface ConnectionCreationInfo {
  connectionParametersSet?: ConnectionParameterSetValues;
  connectionParameters?: Record<string, any>;
  alternativeParameterValues?: Record<string, any>;
  displayName?: string;
  parameterName?: string;
  appSettings?: Record<string, string>;
  additionalParameterValues?: Record<string, string>;
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
  getConnector(connectorId: string): Promise<Connector>;
  getConnectorAndSwagger(connectorId: string): Promise<ConnectorWithSwagger>;
  getSwaggerFromUri(uri: string): Promise<OpenAPIV2.Document>;
  getConnection(connectionId: string): Promise<Connection>;
  getConnections(connectorId?: string): Promise<Connection[]>;
  createConnection(
    connectionId: string,
    connector: Connector,
    connectionInfo: ConnectionCreationInfo,
    parametersMetadata?: ConnectionParametersMetadata,
    shouldTestConnection?: boolean
  ): Promise<Connection>;
  createAndAuthorizeOAuthConnection(
    connectionId: string,
    connectorId: string,
    connectionInfo: ConnectionCreationInfo,
    parametersMetadata: ConnectionParametersMetadata
  ): Promise<CreateConnectionResult>;
  setupConnectionIfNeeded(connection: Connection, identityId?: string): Promise<void>;
  getUniqueConnectionName(connectorId: string, connectionNames: string[], connectorName: string): Promise<string>;
  getAuthSetHideKeys?(): string[];
}

let service: IConnectionService;

export const InitConnectionService = (connectionService: IConnectionService): void => {
  service = connectionService;
};

export const ConnectionService = (): IConnectionService => {
  if (!service) {
    throw new AssertionException(AssertionErrorCode.SERVICE_NOT_INITIALIZED, 'ConnectionService needs to be initialized before using');
  }

  return service;
};
