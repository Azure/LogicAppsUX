import { BaseConnectionService } from '../base';
import type { ConnectionCreationInfo, ConnectionParametersMetadata, CreateConnectionResult } from '../connection';
import { LoggerService } from '../logger';
import { LogEntryLevel } from '../logging/logEntry';
import type { IOAuthPopup } from '../oAuth';
import { OAuthService } from '../oAuth';
import type { Connector, Connection } from '@microsoft/utils-logic-apps';
import { isArmResourceId } from '@microsoft/utils-logic-apps';

export class ConsumptionConnectionService extends BaseConnectionService {
  constructor(options: any) {
    super(options);
    this._vVersion = 'V1';
  }

  async createConnection(
    connectionId: string,
    connector: Connector,
    connectionInfo: ConnectionCreationInfo,
    _parametersMetadata?: ConnectionParametersMetadata
  ): Promise<Connection> {
    const connectionName = connectionId.split('/').at(-1) as string;

    try {
      const logId = LoggerService().startTrace({
        action: 'createConnection',
        name: 'Creating Connection',
        source: 'connection.ts',
      });

      if (connector.properties.testConnectionUrl) await this.pretestServiceProviderConnection(connector, connectionInfo);

      if (!isArmResourceId(connector.id)) throw 'Connector id is not a valid ARM resource id.';

      const connection = await this.createConnectionInApiHub(connectionName, connector.id, connectionInfo);
      await this.testConnection(connection);
      LoggerService().endTrace(logId);
      return connection;
    } catch (error) {
      this.deleteConnection(connectionId);
      const errorMessage = `Failed to create connection: ${this.tryParseErrorMessage(error)}`;
      LoggerService().log({
        level: LogEntryLevel.Error,
        area: 'createConnection',
        message: errorMessage,
      });
      return Promise.reject(errorMessage);
    }
  }

  async createConnectionInApiHub(connectionName: string, connectorId: string, connectionInfo: ConnectionCreationInfo): Promise<Connection> {
    const {
      httpClient,
      apiHubServiceDetails: { apiVersion, baseUrl },
    } = this.options;

    const connectionId = this.getConnectionRequestPath(connectionName);
    const connection = await httpClient.put<any, Connection>({
      uri: `${baseUrl}${connectionId}`,
      queryParameters: { 'api-version': apiVersion },
      content: connectionInfo?.externalAlternativeParameterValues
        ? this._getRequestForCreateConnectionWithAlternativeParameters(connectorId, connectionName, connectionInfo)
        : this._getRequestForCreateConnection(connectorId, connectionName, connectionInfo),
    });

    return connection;
  }

  // Run when assigning a conneciton to an operation
  async setupConnectionIfNeeded(_connection: Connection): Promise<void> {
    // In standard this is where we set access policies if needed
  }

  async createAndAuthorizeOAuthConnection(
    connectionId: string,
    connectorId: string,
    connectionInfo: ConnectionCreationInfo,
    parametersMetadata?: ConnectionParametersMetadata
  ): Promise<CreateConnectionResult> {
    const connector = await this.getConnector(connectorId);
    const connection = await this.createConnection(connectionId, connector, connectionInfo, parametersMetadata);
    const oAuthService = OAuthService();
    let oAuthPopupInstance: IOAuthPopup | undefined;

    try {
      const consentUrl = await oAuthService.fetchConsentUrlForConnection(connectionId);
      oAuthPopupInstance = oAuthService.openLoginPopup({ consentUrl });

      const loginResponse = await oAuthPopupInstance.loginPromise;
      if (loginResponse.error) {
        throw new Error(atob(loginResponse.error));
      } else if (loginResponse.code) {
        await oAuthService.confirmConsentCodeForConnection(connectionId, loginResponse.code);
      }

      await this.testConnection(connection);

      const fetchedConnection = await this.getConnection(connection.id);
      return { connection: fetchedConnection };
    } catch (error: any) {
      this.deleteConnection(connectionId);
      const errorMessage = `Failed to create OAuth connection: ${this.tryParseErrorMessage(error)}`;
      LoggerService().log({
        level: LogEntryLevel.Error,
        area: 'create oauth connection',
        message: errorMessage,
      });
      return { errorMessage: this.tryParseErrorMessage(error) };
    }
  }
}
