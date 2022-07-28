import { AssertionErrorCode, AssertionException } from '@microsoft-logic-apps/utils';
import type {
  Connector,
  Connection,
  ConnectionParameter,
  ConnectionParameterSet as ParameterSet,
  ConnectionParameterSetValues,
  ConnectionType,
} from '@microsoft-logic-apps/utils';

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
  connectionType: ConnectionType;
}

export interface IConnectionService {
  dispose(): void;
  getConnector(connectorId: string): Promise<Connector>;
  getConnection(connectionId: string): Promise<Connection>;
  getConnections(connectorId?: string): Promise<Connection[]>; // Batching can be addressed with future workitem no. 14703398
  createConnection(
    connectionId: string,
    connectorId: string,
    connectionInfo: ConnectionCreationInfo,
    parametersMetadata?: ConnectionParametersMetadata
  ): Promise<Connection>;
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
