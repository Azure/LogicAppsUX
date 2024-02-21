import type { BaseConnectionServiceOptions } from '../base';
import { BaseConnectionService } from '../base';
import type { ConnectionCreationInfo, ConnectionParametersMetadata, CreateConnectionResult } from '../connection';
import { LoggerService } from '../logger';
import { LogEntryLevel, Status } from '../logging/logEntry';
import type { IOAuthPopup } from '../oAuth';
import { OAuthService } from '../oAuth';
import type { Connector, Connection } from '@microsoft/logic-apps-shared';

export class ConsumptionConnectionService extends BaseConnectionService {
  constructor(options: BaseConnectionServiceOptions) {
    super(options);
    this._vVersion = 'V1';
  }

  async getConnector(connectorId: string): Promise<Connector> {
    return this._getAzureConnector(connectorId);
  }

  override async getConnections(connectorId?: string): Promise<Connection[]> {
    if (connectorId) {
      return this.getConnectionsForConnector(connectorId);
    }

    const apiHubConnections = await this.getConnectionsInApiHub();

    this._allConnectionsInitialized = true;
    return apiHubConnections;
  }

  async createConnection(
    connectionId: string,
    connector: Connector,
    connectionInfo: ConnectionCreationInfo,
    _parametersMetadata?: ConnectionParametersMetadata,
    shouldTestConnection = true
  ): Promise<Connection> {
    const connectionName = connectionId.split('/').at(-1) as string;

    const logId = LoggerService().startTrace({
      action: 'createConnection',
      name: 'Creating Connection',
      source: 'connection.ts',
    });

    try {
      const connection = await this.createConnectionInApiHub(connectionName, connector.id, connectionInfo);
      if (shouldTestConnection) await this.testConnection(connection);
      LoggerService().endTrace(logId, { status: Status.Success });
      return connection;
    } catch (error) {
      this.deleteConnection(connectionId);
      const errorMessage = `Failed to create connection: ${this.tryParseErrorMessage(error)}`;
      LoggerService().log({
        level: LogEntryLevel.Error,
        area: 'createConnection',
        message: errorMessage,
        error: error instanceof Error ? error : undefined,
        traceId: logId,
      });
      LoggerService().endTrace(logId, { status: Status.Failure });
      return Promise.reject(errorMessage);
    }
  }

  async createAndAuthorizeOAuthConnection(
    connectionId: string,
    connectorId: string,
    connectionInfo: ConnectionCreationInfo,
    parametersMetadata?: ConnectionParametersMetadata
  ): Promise<CreateConnectionResult> {
    try {
      const connector = await this.getConnector(connectorId);
      const connection = await this.createConnection(
        connectionId,
        connector,
        connectionInfo,
        parametersMetadata,
        /* shouldTestConnection */ false
      );
      const oAuthService = OAuthService();
      const consentUrl = await oAuthService.fetchConsentUrlForConnection(connectionId);
      const oAuthPopupInstance: IOAuthPopup = oAuthService.openLoginPopup({ consentUrl });

      const loginResponse = await oAuthPopupInstance.loginPromise;
      if (loginResponse.error) {
        throw new Error(atob(loginResponse.error));
      } else if (loginResponse.code) {
        await oAuthService.confirmConsentCodeForConnection(connectionId, loginResponse.code);
      }

      const fetchedConnection = await this.getConnection(connection.id);
      await this.testConnection(fetchedConnection);

      return { connection: fetchedConnection };
    } catch (error: any) {
      try {
        this.deleteConnection(connectionId);
      } catch (e) {
        // Ignore error, there may or may not be a connection to delete
      }
      const errorMessage = `Failed to create OAuth connection: ${this.tryParseErrorMessage(error)}`;
      LoggerService().log({
        level: LogEntryLevel.Error,
        area: 'create oauth connection',
        message: errorMessage,
        error: error instanceof Error ? error : undefined,
      });
      return { errorMessage: this.tryParseErrorMessage(error) };
    }
  }
}
