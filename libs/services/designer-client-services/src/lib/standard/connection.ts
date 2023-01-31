import { BaseConnectionService } from '../base';
import type { ConnectionCreationInfo, ConnectionParametersMetadata, CreateConnectionResult } from '../connection';
import { LoggerService } from '../logger';
import { LogEntryLevel } from '../logging/logEntry';
import type { IOAuthPopup } from '../oAuth';
import { OAuthService } from '../oAuth';
import { getIntl } from '@microsoft/intl-logic-apps';
import type { Connection, Connector, ManagedIdentity } from '@microsoft/utils-logic-apps';
import {
  AssertionErrorCode,
  AssertionException,
  ResourceIdentityType,
  equals,
  isArmResourceId,
  isIdentityAssociatedWithLogicApp,
} from '@microsoft/utils-logic-apps';

interface ConnectionAcl {
  id: string;
  location: string;
  name: string;
  properties: {
    principal: {
      type: string;
      identity: {
        objectId: string;
        tenantId: string;
      };
    };
  };
  type: string;
}

export class StandardConnectionService extends BaseConnectionService {
  constructor(options: any) {
    super(options);
    this._vVersion = 'V2';
  }

  async createConnection(
    connectionId: string,
    connector: Connector,
    connectionInfo: ConnectionCreationInfo,
    parametersMetadata?: ConnectionParametersMetadata
  ): Promise<Connection> {
    const connectionName = connectionId.split('/').at(-1) as string;

    try {
      const logId = LoggerService().startTrace({
        action: 'createConnection',
        name: 'Creating Connection',
        source: 'connection.ts',
      });

      if (connector.properties.testConnectionUrl) await this.pretestServiceProviderConnection(connector, connectionInfo);

      const connection = isArmResourceId(connector.id)
        ? await this.createConnectionInApiHub(connectionName, connector.id, connectionInfo)
        : await this.createConnectionInLocal(
            connectionName,
            connector.id,
            connectionInfo,
            parametersMetadata as ConnectionParametersMetadata
          );
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

  protected async createConnectionInLocal(
    connectionName: string,
    connectorId: string,
    connectionInfo: ConnectionCreationInfo,
    parametersMetadata: ConnectionParametersMetadata
  ): Promise<Connection> {
    const { writeConnection, connectionCreationClients } = this.options;
    const connectionCreationClientName = parametersMetadata.connectionMetadata?.connectionCreationClient;
    if (connectionCreationClientName) {
      if (connectionCreationClients?.[connectionCreationClientName]) {
        // eslint-disable-next-line no-param-reassign
        connectionInfo = await connectionCreationClients[connectionCreationClientName].connectionCreationFunc(
          connectionInfo,
          connectionName
        );
      } else {
        throw new AssertionException(
          AssertionErrorCode.CONNECTION_CREATION_CLIENT_NOTREGISTERED,
          `The connection creation client for ${connectionCreationClientName} is not registered`
        );
      }
    }

    if (!writeConnection) {
      throw new AssertionException(AssertionErrorCode.CALLBACK_NOTREGISTERED, 'Callback for write connection is not passed in service.');
    }

    const { connectionsData, connection } = this.getConnectionsConfiguration(
      connectionName,
      connectionInfo,
      connectorId,
      parametersMetadata
    );

    await this.options.writeConnection?.(connectionsData);
    this._connections[connection.id] = connection;

    return connection;
  }

  async createConnectionInApiHub(connectionName: string, connectorId: string, connectionInfo: ConnectionCreationInfo): Promise<Connection> {
    const {
      httpClient,
      apiHubServiceDetails: { apiVersion, baseUrl },
      workflowAppDetails,
    } = this.options;
    const intl = getIntl();

    // NOTE: Block connection creation if identity does not exist on Logic App.
    if (workflowAppDetails && !isIdentityAssociatedWithLogicApp(workflowAppDetails.identity)) {
      throw new Error(
        intl.formatMessage({
          defaultMessage: 'To create and use an API connection, you must have a managed identity configured on this logic app.',
          description: 'Error message to show when logic app does not have managed identity when creating azure connection',
        })
      );
    }

    const connectionId = this.getConnectionRequestPath(connectionName);
    const connection = await httpClient.put<any, Connection>({
      uri: `${baseUrl}${connectionId}`,
      queryParameters: { 'api-version': apiVersion },
      content: connectionInfo?.externalAlternativeParameterValues
        ? this._getRequestForCreateConnectionWithAlternativeParameters(connectorId, connectionName, connectionInfo)
        : this._getRequestForCreateConnection(connectorId, connectionName, connectionInfo),
    });

    try {
      await this.createConnectionAclIfNeeded(connection);
    } catch {
      // NOTE: Delete the connection created in this method if Acl creation failed.
      this.deleteConnection(connectionId);
      const error = new Error(
        intl.formatMessage({
          defaultMessage: 'Acl creation failed for connection. Deleting the connection.',
          description: 'Error while creating acl',
        })
      );
      throw error;
    }

    return connection;
  }

  // Run when assigning a conneciton to an operation
  async setupConnectionIfNeeded(connection: Connection): Promise<void> {
    await this.createConnectionAclIfNeeded(connection);
  }

  protected async createConnectionAclIfNeeded(connection: Connection): Promise<void> {
    const { tenantId, workflowAppDetails } = this.options;
    if (!isArmResourceId(connection.id) || !workflowAppDetails) {
      return;
    }

    const intl = getIntl();

    if (!isIdentityAssociatedWithLogicApp(workflowAppDetails.identity)) {
      throw new Error(
        intl.formatMessage({
          defaultMessage: 'A managed identity is not configured on the logic app.',
          description: 'Error message when no identity is associated',
        })
      );
    }

    const connectionAcls = (await this._getConnectionAcls(connection.id)) || [];
    const { identity, appName } = workflowAppDetails;
    const identityDetailsForApiHubAuth = this._getIdentityDetailsForApiHubAuth(identity as ManagedIdentity, tenantId as string);

    try {
      if (
        !connectionAcls.some((acl) => {
          const { identity: principalIdentity } = acl.properties.principal;
          return principalIdentity.objectId === identityDetailsForApiHubAuth.principalId && principalIdentity.tenantId === tenantId;
        })
      ) {
        await this._createAccessPolicyInConnection(connection.id, appName, identityDetailsForApiHubAuth, connection.location as string);
      }
    } catch {
      LoggerService().log({ level: LogEntryLevel.Error, area: 'ConnectionACLCreate', message: 'Acl creation failed for connection.' });
    }
  }

  private async _getConnectionAcls(connectionId: string): Promise<ConnectionAcl[]> {
    const {
      apiHubServiceDetails: { apiVersion },
      httpClient,
    } = this.options;

    // TODO: Handle nextLink from this response as well.
    const response = await httpClient.get<any>({
      uri: `${connectionId}/accessPolicies`,
      queryParameters: { 'api-version': apiVersion },
      headers: { 'x-ms-command-name': 'LADesigner.getConnectionAcls' },
    });

    return response.value;
  }

  private async _createAccessPolicyInConnection(
    connectionId: string,
    appName: string,
    identityDetails: Record<string, any>,
    location: string
  ): Promise<void> {
    const {
      apiHubServiceDetails: { apiVersion, baseUrl },
      httpClient,
    } = this.options;
    const { principalId: objectId, tenantId } = identityDetails;
    const policyName = `${appName}-${objectId}`;

    await httpClient.put({
      uri: `${baseUrl}${connectionId}/accessPolicies/${policyName}`,
      queryParameters: { 'api-version': apiVersion },
      headers: {
        'If-Match': '*',
        'x-ms-command-name': 'LADesigner.createAccessPolicyInConnection',
      },
      content: {
        name: appName,
        type: 'Microsoft.Web/connections/accessPolicy',
        location,
        properties: {
          principal: {
            type: 'ActiveDirectory',
            identity: { objectId, tenantId },
          },
        },
      },
    });
  }

  // NOTE: Use the system-assigned MI if exists, else use the first user assigned identity.
  private _getIdentityDetailsForApiHubAuth(managedIdentity: ManagedIdentity, tenantId: string): { principalId: string; tenantId: string } {
    return equals(managedIdentity.type, ResourceIdentityType.SYSTEM_ASSIGNED) ||
      equals(managedIdentity.type, ResourceIdentityType.SYSTEM_ASSIGNED_USER_ASSIGNED)
      ? { principalId: managedIdentity.principalId as string, tenantId: managedIdentity.tenantId as string }
      : {
          principalId: managedIdentity.userAssignedIdentities?.[Object.keys(managedIdentity.userAssignedIdentities)[0]]
            .principalId as string,
          tenantId,
        };
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

      await this.createConnectionAclIfNeeded(connection);

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
