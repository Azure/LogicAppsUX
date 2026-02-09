import type { QueryClient } from '@tanstack/react-query';
import type { Connector, Connection, ConnectionStatus } from '../../../utils/src';
import type { BaseConnectionServiceOptions } from '../base';
import { BaseConnectionService } from '../base';
import type { ConnectionCreationInfo, ConnectionParametersMetadata, CreateConnectionResult } from '../connection';
import { LoggerService } from '../logger';
import { LogEntryLevel, Status } from '../logging/logEntry';
import type { IOAuthPopup } from '../oAuth';
import { OAuthService } from '../oAuth';
import agentLoopConnector from './manifests/agentLoopConnector';
import mcpclientconnector from './manifests/mcpclientconnector';

export interface ConsumptionConnectionServiceOptions extends BaseConnectionServiceOptions {
  getCachedConnector?: (connectorId: string) => Promise<Connector>;
}

export class ConsumptionConnectionService extends BaseConnectionService {
  constructor(private readonly _options: ConsumptionConnectionServiceOptions) {
    super(_options);
    this._vVersion = 'V1';
  }

  private extractParameterValue(val: unknown): unknown {
    if (typeof val === 'object' && val !== null && 'value' in val) {
      return (val as { value: unknown }).value;
    }
    return val;
  }

  private extractAuthParameters(connectionParametersSet: ConnectionCreationInfo['connectionParametersSet']): {
    authenticationType: string;
    authParams: Record<string, unknown>;
  } {
    let authenticationType = 'None';
    const authParams: Record<string, unknown> = {};

    if (connectionParametersSet?.name && connectionParametersSet.name !== 'None') {
      authenticationType = connectionParametersSet.name;
    }

    if (connectionParametersSet?.values) {
      const values = connectionParametersSet.values;
      const authKeys = ['username', 'password', 'key', 'keyHeaderName', 'clientId', 'secret', 'tenant', 'authority', 'audience', 'pfx'];

      for (const key of authKeys) {
        if (values[key] !== undefined) {
          authParams[key] = this.extractParameterValue(values[key]);
        }
      }
    }

    return { authenticationType, authParams };
  }

  async getConnector(connectorId: string, getCached = false): Promise<Connector> {
    let connector: Connector | undefined;
    if (getCached && this._options.getCachedConnector) {
      connector = await this._options.getCachedConnector(connectorId);
    }
    const connectorIdKeyword = connectorId.split('/').at(-1);
    if (connectorIdKeyword === 'agent') {
      return agentLoopConnector;
    }
    if (connectorIdKeyword === 'mcpclient') {
      return mcpclientconnector;
    }
    return connector ?? this._getAzureConnector(connectorId);
  }

  override async getConnections(connectorId?: string, queryClient?: QueryClient): Promise<Connection[]> {
    if (connectorId) {
      return this.getConnectionsForConnector(connectorId, queryClient);
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
    const isBuiltInMcpConnection =
      (connector.id?.toLowerCase().includes('mcpclient') || connector.type?.toLowerCase() === 'mcpclient') &&
      connector.properties?.capabilities?.includes('builtin');

    if (isBuiltInMcpConnection) {
      return this.createBuiltInMcpConnection(connectionId, connector, connectionInfo);
    }

    const isManagedMcpConnection =
      (connector.id?.toLowerCase().includes('mcpclient') || connector.type?.toLowerCase() === 'mcpclient') &&
      !connector.properties?.capabilities?.includes('builtin');

    if (isManagedMcpConnection) {
      return this.createManagedMcpConnection(connectionId, connector, connectionInfo);
    }

    const connectionName = connectionId.split('/').at(-1) as string;
    const logId = LoggerService().startTrace({
      action: 'createConnection',
      name: 'Creating Connection',
      source: 'connection.ts',
    });

    try {
      const connection = await this.createConnectionInApiHub(connectionName, connector.id, connectionInfo);
      if (shouldTestConnection) {
        await this.testConnection(connection);
      }
      LoggerService().endTrace(logId, {
        status: Status.Success,
        data: {
          connectorId: connector.id,
        },
      });
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

  private createBuiltInMcpConnection(connectionId: string, connector: Connector, connectionInfo: ConnectionCreationInfo): Connection {
    const logId = LoggerService().startTrace({
      action: 'createBuiltInMcpConnection',
      name: 'Creating Built-in MCP Connection',
      source: 'connection.ts',
    });

    try {
      const connectionName = connectionInfo.displayName || connectionId.split('/').at(-1) || `mcp-${Date.now()}`;

      const connectionParameters = connectionInfo.connectionParameters ?? {};

      let serverUrl = '';
      if (connectionParameters['serverUrl']) {
        serverUrl = this.extractParameterValue(connectionParameters['serverUrl']) as string;
      }

      if (!serverUrl) {
        throw new Error('Server URL is required for MCP connection');
      }

      const { authenticationType, authParams } = this.extractAuthParameters(connectionInfo.connectionParametersSet);

      const connection = {
        id: `connectionProviders/mcpclient/connections/${connectionName}`,
        name: connectionName,
        type: 'connections',
        location: '',
        properties: {
          displayName: connectionName,
          overallStatus: 'Connected',
          statuses: [{ status: 'Connected' }] as ConnectionStatus[],
          api: {
            id: connector.id,
            name: 'mcpclient',
            displayName: connector.properties?.displayName || 'MCP Client',
            iconUri: connector.properties?.iconUri ?? '',
            brandColor: connector.properties?.brandColor ?? '#000000',
            description: connector.properties?.description ?? '',
            category: 'MCP',
            type: 'mcpclient',
          },
          createdTime: new Date().toISOString(),
          parameterValues: {
            mcpServerUrl: serverUrl,
            authenticationType,
            ...authParams,
          },
        },
      };

      LoggerService().endTrace(logId, { status: Status.Success });
      return connection as unknown as Connection;
    } catch (error) {
      const errorMessage = `Failed to create built-in MCP connection: ${this.tryParseErrorMessage(error)}`;
      LoggerService().log({
        level: LogEntryLevel.Error,
        area: 'createBuiltInMcpConnection',
        message: errorMessage,
        error: error instanceof Error ? error : undefined,
        traceId: logId,
      });
      LoggerService().endTrace(logId, { status: Status.Failure });
      throw new Error(errorMessage);
    }
  }

  private async createManagedMcpConnection(
    connectionId: string,
    connector: Connector,
    connectionInfo: ConnectionCreationInfo
  ): Promise<Connection> {
    const connectionName = connectionInfo.displayName || connectionId.split('/').at(-1) || `mcp-${Date.now()}`;

    const parameterValues: Record<string, unknown> = {};
    const connectionParameters = connectionInfo.connectionParameters ?? {};

    if (connectionParameters['serverUrl']) {
      parameterValues['serverUrl'] = this.extractParameterValue(connectionParameters['serverUrl']);
    }

    const { authenticationType, authParams } = this.extractAuthParameters(connectionInfo.connectionParametersSet);
    if (authenticationType !== 'None') {
      parameterValues['authentication'] = {
        type: authenticationType,
        ...authParams,
      };
    }

    const mcpConnectionInfo: ConnectionCreationInfo = {
      displayName: connectionName,
      connectionParameters: parameterValues,
    };

    const logId = LoggerService().startTrace({
      action: 'createManagedMcpConnection',
      name: 'Creating Managed MCP Connection',
      source: 'connection.ts',
    });

    try {
      const connection = await this.createConnectionInApiHub(connectionName, connector.id, mcpConnectionInfo);

      LoggerService().endTrace(logId, {
        status: Status.Success,
        data: { connectorId: connector.id },
      });
      return connection;
    } catch (error) {
      const errorMessage = `Failed to create managed MCP connection: ${this.tryParseErrorMessage(error)}`;
      LoggerService().log({
        level: LogEntryLevel.Error,
        area: 'createManagedMcpConnection',
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
      const oauthKey = parametersMetadata?.connectionParameters
        ? Object.keys(parametersMetadata.connectionParameters).find(
            (key) => parametersMetadata.connectionParameters?.[key]?.type === 'oauthSetting'
          )
        : undefined;
      const consentUrl = await oAuthService.fetchConsentUrlForConnection(connectionId, oauthKey);
      const oAuthPopupInstance: IOAuthPopup = oAuthService.openLoginPopup({ consentUrl });

      const loginResponse = await oAuthPopupInstance.loginPromise;
      if (loginResponse.error) {
        throw new Error(atob(loginResponse.error));
      }
      if (loginResponse.code) {
        await oAuthService.confirmConsentCodeForConnection(connectionId, loginResponse.code);
      }

      const fetchedConnection = await this.getConnection(connection.id);
      await this.testConnection(fetchedConnection);

      return { connection: fetchedConnection };
    } catch (error: any) {
      try {
        this.deleteConnection(connectionId);
      } catch {
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
