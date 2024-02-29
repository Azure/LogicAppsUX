import type { BaseConnectionServiceOptions } from '../base';
import { BaseConnectionService } from '../base';
import { apiManagementConnectorId, azureFunctionConnectorId } from '../base/operationmanifest';
import type { HttpResponse } from '../common/exceptions';
import type { ConnectionCreationInfo, ConnectionParametersMetadata, CreateConnectionResult, IConnectionService } from '../connection';
import type { IHttpClient } from '../httpClient';
import { LoggerService } from '../logger';
import { LogEntryLevel, Status } from '../logging/logEntry';
import type { IOAuthPopup } from '../oAuth';
import { OAuthService } from '../oAuth';
import { getIntl } from '@microsoft/logic-apps-shared';
import type { Connection, ConnectionParameter, Connector, ManagedIdentity } from '@microsoft/logic-apps-shared';
import {
  ArgumentException,
  AssertionErrorCode,
  AssertionException,
  ConnectionParameterSource,
  ConnectionType,
  ResourceIdentityType,
  equals,
  optional,
  isArmResourceId,
  isIdentityAssociatedWithLogicApp,
  safeSetObjectPropertyValue,
  createCopy,
} from '@microsoft/logic-apps-shared';

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

interface ServiceProviderConnectionModel {
  parameterValues: Record<string, any>;
  serviceProvider: {
    id: string;
  };
  parameterSetName?: string;
  displayName?: string;
  additionalParameterValues?: Record<string, string>;
}

interface FunctionsConnectionModel {
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

interface ConnectionAndAppSetting<T> {
  connectionKey: string;
  connectionData: T;
  settings: Record<string, string>;
  pathLocation: string[];
}

interface ConnectionsData {
  managedApiConnections?: any;
  serviceProviderConnections?: Record<string, ServiceProviderConnectionModel>;
  functionConnections?: Record<string, FunctionsConnectionModel>;
  apiManagementConnections?: Record<string, APIManagementConnectionModel>;
}

type LocalConnectionModel = FunctionsConnectionModel | ServiceProviderConnectionModel | APIManagementConnectionModel;
type ReadConnectionsFunc = () => Promise<ConnectionsData>;
type WriteConnectionFunc = (connectionData: ConnectionAndAppSetting<LocalConnectionModel>) => Promise<void>;

const serviceProviderLocation = 'serviceProviderConnections';
const functionsLocation = 'functionConnections';
const apimLocation = 'apiManagementConnections';

export interface StandardConnectionServiceOptions {
  apiVersion: string;
  baseUrl: string;
  httpClient: IHttpClient;
  apiHubServiceDetails: BaseConnectionServiceOptions;
  workflowAppDetails?: {
    appName: string;
    identity?: ManagedIdentity;
  };
  readConnections: ReadConnectionsFunc;
  writeConnection?: WriteConnectionFunc;
  connectionCreationClients?: Record<string, ConnectionCreationClient>;
}

type CreateConnectionFunc = (connectionInfo: ConnectionCreationInfo, connectionName: string) => Promise<ConnectionCreationInfo>;

interface ConnectionCreationClient {
  connectionCreationFunc: CreateConnectionFunc;
}

export class StandardConnectionService extends BaseConnectionService implements IConnectionService {
  constructor(private readonly _options: StandardConnectionServiceOptions) {
    super(_options.apiHubServiceDetails);
    const { apiHubServiceDetails, readConnections } = _options;
    if (!readConnections) {
      throw new ArgumentException('readConnections required');
    } else if (!apiHubServiceDetails) {
      throw new ArgumentException('apiHubServiceDetails required for workflow app');
    }

    this._vVersion = 'V2';
  }

  async getConnector(connectorId: string): Promise<Connector> {
    if (!isArmResourceId(connectorId)) {
      const { apiVersion, baseUrl, httpClient } = this._options;
      return httpClient.get<Connector>({
        uri: `${baseUrl}/operationGroups/${connectorId.split('/').at(-1)}?api-version=${apiVersion}`,
      });
    } else {
      return this._getAzureConnector(connectorId);
    }
  }

  override async getConnections(connectorId?: string): Promise<Connection[]> {
    if (connectorId) {
      return this.getConnectionsForConnector(connectorId);
    }

    const [localConnections, apiHubConnections] = await Promise.all([this._options.readConnections(), this.getConnectionsInApiHub()]);
    const serviceProviderConnections = (localConnections[serviceProviderLocation] || {}) as Record<string, ServiceProviderConnectionModel>;
    const functionConnections = (localConnections[functionsLocation] || {}) as Record<string, FunctionsConnectionModel>;
    const apimConnections = (localConnections[apimLocation] || {}) as Record<string, APIManagementConnectionModel>;

    this._allConnectionsInitialized = true;
    return [
      ...Object.keys(serviceProviderConnections).map((key) => {
        const connection = convertServiceProviderConnectionDataToConnection(key, serviceProviderConnections[key]);
        this._connections[connection.id] = connection;
        return connection;
      }),
      ...Object.keys(functionConnections).map((key) => {
        const connection = convertFunctionsConnectionDataToConnection(key, functionConnections[key]);
        this._connections[connection.id] = connection;
        return connection;
      }),
      ...Object.keys(apimConnections).map((key) => {
        const connection = convertApimConnectionDataToConnection(key, apimConnections[key]);
        this._connections[connection.id] = connection;
        return connection;
      }),
      ...apiHubConnections,
    ];
  }

  async createConnection(
    connectionId: string,
    connector: Connector,
    connectionInfo: ConnectionCreationInfo,
    parametersMetadata?: ConnectionParametersMetadata,
    shouldTestConnection = true
  ): Promise<Connection> {
    const connectionName = connectionId.split('/').at(-1) as string;

    const logId = LoggerService().startTrace({
      action: 'createConnection',
      name: 'Creating Connection',
      source: 'connection.ts',
    });

    try {
      const connection = isArmResourceId(connector.id)
        ? await this._createConnectionInApiHub(connectionName, connector.id, connectionInfo, shouldTestConnection)
        : await this.createConnectionInLocal(connectionName, connector, connectionInfo, parametersMetadata as ConnectionParametersMetadata);

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

  private async createConnectionInLocal(
    connectionName: string,
    connector: Connector,
    connectionInfo: ConnectionCreationInfo,
    parametersMetadata: ConnectionParametersMetadata
  ): Promise<Connection> {
    const { writeConnection, connectionCreationClients } = this._options;
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

    const { connectionsData, connection } = await this._getConnectionsConfiguration(
      connectionName,
      connectionInfo,
      connector,
      parametersMetadata
    );

    await this._options.writeConnection?.(connectionsData);
    this._connections[connection.id] = connection;

    return connection;
  }

  private async _createConnectionInApiHub(
    connectionName: string,
    connectorId: string,
    connectionInfo: ConnectionCreationInfo,
    shouldTestConnection: boolean
  ): Promise<Connection> {
    const { workflowAppDetails } = this._options;
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

    const connectionId = this.getAzureConnectionRequestPath(connectionName);
    const connection = await this.createConnectionInApiHub(connectionName, connectorId, connectionInfo);

    try {
      await this._createConnectionAclIfNeeded(connection);
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

    if (shouldTestConnection) {
      await this.testConnection(connection);
    }

    return connection;
  }

  // Run when assigning a conneciton to an operation
  override async setupConnectionIfNeeded(connection: Connection, identityId?: string): Promise<void> {
    await this._createConnectionAclIfNeeded(connection, identityId);
  }

  private async _createConnectionAclIfNeeded(connection: Connection, identityId?: string): Promise<void> {
    const {
      apiHubServiceDetails: { tenantId },
      workflowAppDetails,
    } = this._options;
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
    const identityDetailsForApiHubAuth = this._getIdentityDetailsForApiHubAuth(identity as ManagedIdentity, tenantId as string, identityId);

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
      LoggerService().log({
        level: LogEntryLevel.Error,
        area: 'ConnectionACLCreate',
        message: 'Acl creation failed for connection.',
      });
    }
  }

  private async _getConnectionAcls(connectionId: string): Promise<ConnectionAcl[]> {
    const {
      apiHubServiceDetails: { apiVersion },
      httpClient,
    } = this._options;

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
    } = this._options;
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

  // NOTE: Use the system-assigned MI if exists, else use the first user assigned identity if identity is not specified.
  private _getIdentityDetailsForApiHubAuth(
    managedIdentity: ManagedIdentity,
    tenantId: string,
    identityIdForConnection: string | undefined
  ): { principalId: string; tenantId: string } {
    if (
      !identityIdForConnection &&
      (equals(managedIdentity.type, ResourceIdentityType.SYSTEM_ASSIGNED) ||
        equals(managedIdentity.type, ResourceIdentityType.SYSTEM_ASSIGNED_USER_ASSIGNED))
    ) {
      return { principalId: managedIdentity.principalId as string, tenantId: managedIdentity.tenantId as string };
    } else {
      const identityKeys = Object.keys(managedIdentity.userAssignedIdentities ?? {});
      const selectedIdentity = identityKeys.find((identityKey) => equals(identityKey, identityIdForConnection)) ?? identityKeys[0];
      return {
        principalId: managedIdentity.userAssignedIdentities?.[selectedIdentity].principalId as string,
        tenantId,
      };
    }
  }

  async createAndAuthorizeOAuthConnection(
    connectionId: string,
    connectorId: string,
    connectionInfo: ConnectionCreationInfo,
    parametersMetadata?: ConnectionParametersMetadata
  ): Promise<CreateConnectionResult> {
    const connector = await this.getConnector(connectorId);
    const connection = await this.createConnection(
      connectionId,
      connector,
      connectionInfo,
      parametersMetadata,
      /* shouldTestConnection */ false
    );
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

      await this._createConnectionAclIfNeeded(connection);

      const fetchedConnection = await this.getConnection(connection.id);
      await this.testConnection(fetchedConnection);

      return { connection: fetchedConnection };
    } catch (error: any) {
      this.deleteConnection(connectionId);
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

  private async _getConnectionsConfiguration(
    connectionName: string,
    connectionInfo: ConnectionCreationInfo,
    connector: Connector,
    parametersMetadata: ConnectionParametersMetadata
  ): Promise<{
    connectionsData: ConnectionAndAppSetting<LocalConnectionModel>;
    connection: Connection;
  }> {
    const connectionType = parametersMetadata?.connectionMetadata?.type;
    let connectionsData;
    let connection;
    switch (connectionType) {
      case ConnectionType.Function: {
        connectionsData = convertToFunctionsConnectionsData(connectionName, connectionInfo);
        connection = convertFunctionsConnectionDataToConnection(
          connectionsData.connectionKey,
          connectionsData.connectionData as FunctionsConnectionModel
        );
        break;
      }
      case ConnectionType.ApiManagement: {
        connectionsData = convertToApimConnectionsData(connectionName, connectionInfo);
        connection = convertApimConnectionDataToConnection(
          connectionsData.connectionKey,
          connectionsData.connectionData as APIManagementConnectionModel
        );
        break;
      }
      default: {
        const { connectionAndSettings, rawConnection } = convertToServiceProviderConnectionsData(
          connectionName,
          connector.id,
          connectionInfo,
          parametersMetadata
        );
        connectionsData = connectionAndSettings;
        connection = convertServiceProviderConnectionDataToConnection(
          connectionsData.connectionKey,
          connectionsData.connectionData as ServiceProviderConnectionModel
        );

        if (connector.properties.testConnectionUrl) {
          await this._testServiceProviderConnection(connector.properties.testConnectionUrl, rawConnection);
        }
        break;
      }
    }
    return { connectionsData, connection };
  }

  private async _testServiceProviderConnection(
    requestUrl: string,
    connectionData: ServiceProviderConnectionModel
  ): Promise<HttpResponse<any>> {
    try {
      const { httpClient, baseUrl, apiVersion } = this._options;
      const response = await httpClient.post<any, any>({
        uri: `${baseUrl.replace('/runtime/webhooks/workflow/api/management', '')}${requestUrl}`,
        queryParameters: { 'api-version': apiVersion },
        content: connectionData,
      });

      if (!response || response.status < 200 || response.status >= 300) {
        throw response;
      }

      return response;
    } catch (e: any) {
      return Promise.reject(e);
    }
  }
}

function convertServiceProviderConnectionDataToConnection(
  connectionKey: string,
  connectionData: ServiceProviderConnectionModel
): Connection {
  const {
    displayName,
    serviceProvider: { id: apiId },
  } = connectionData;

  return {
    name: connectionKey,
    id: `${apiId}/connections/${connectionKey}`,
    type: 'connections',
    properties: {
      api: { id: apiId } as any,
      createdTime: '',
      connectionParameters: {},
      displayName: displayName as string,
      statuses: [{ status: 'Connected' }],
      overallStatus: 'Connected',
      testLinks: [],
    },
  };
}

function convertApimConnectionDataToConnection(connectionKey: string, connectionData: APIManagementConnectionModel): Connection {
  const { displayName } = connectionData;

  return {
    name: connectionKey,
    id: `${apiManagementConnectorId}/connections/${connectionKey}`,
    type: 'connections',
    properties: {
      api: { id: apiManagementConnectorId } as any,
      createdTime: '',
      connectionParameters: {},
      displayName: displayName as string,
      overallStatus: 'Connected',
      statuses: [{ status: 'Connected' }],
      testLinks: [],
    },
  };
}

function convertFunctionsConnectionDataToConnection(connectionKey: string, connectionData: FunctionsConnectionModel): Connection {
  const { displayName } = connectionData;

  return {
    name: connectionKey,
    id: `${azureFunctionConnectorId}/connections/${connectionKey}`,
    type: 'connections',
    properties: {
      api: { id: azureFunctionConnectorId } as any,
      createdTime: '',
      connectionParameters: {},
      displayName: displayName as string,
      overallStatus: 'Connected',
      statuses: [{ status: 'Connected' }],
      testLinks: [],
    },
  };
}

function convertToServiceProviderConnectionsData(
  connectionKey: string,
  connectorId: string,
  connectionInfo: ConnectionCreationInfo,
  connectionParameterMetadata: ConnectionParametersMetadata
): { connectionAndSettings: ConnectionAndAppSetting<ServiceProviderConnectionModel>; rawConnection: ServiceProviderConnectionModel } {
  const {
    displayName,
    connectionParameters: connectionParameterValues,
    connectionParametersSet: connectionParametersSetValues,
    additionalParameterValues,
  } = connectionInfo;
  const connectionParameters = connectionParametersSetValues
    ? connectionParameterMetadata.connectionParameterSet?.parameters
    : (connectionParameterMetadata.connectionParameters as Record<string, ConnectionParameter>);
  const parameterValues = connectionParametersSetValues
    ? Object.keys(connectionParametersSetValues.values).reduce(
        (result: Record<string, any>, currentKey: string) => ({
          ...result,
          [currentKey]: connectionParametersSetValues.values[currentKey].value,
        }),
        {}
      )
    : (connectionParameterValues as Record<string, any>);

  const connectionsData: ConnectionAndAppSetting<ServiceProviderConnectionModel> = {
    connectionKey,
    connectionData: {
      parameterValues: {},
      ...optional('parameterSetName', connectionParametersSetValues?.name),
      serviceProvider: { id: connectorId },
      displayName,
      ...optional('additionalParameterValues', additionalParameterValues),
    },
    settings: connectionInfo.appSettings ?? {},
    pathLocation: [serviceProviderLocation],
  };
  const rawConnection = createCopy(connectionsData.connectionData);

  for (const parameterKey of Object.keys(parameterValues)) {
    const connectionParameter = connectionParameters?.[parameterKey] as ConnectionParameter;
    let parameterValue = parameterValues[parameterKey];
    const rawValue = parameterValue;
    if (connectionParameter?.parameterSource === ConnectionParameterSource.AppConfiguration) {
      const appSettingName = `${escapeSpecialChars(connectionKey)}_${escapeSpecialChars(parameterKey)}`;
      connectionsData.settings[appSettingName] = parameterValues[parameterKey];

      parameterValue = `@appsetting('${appSettingName}')`;
    }

    safeSetObjectPropertyValue(
      connectionsData.connectionData.parameterValues,
      [...(connectionParameter?.uiDefinition?.constraints?.propertyPath ?? []), parameterKey],
      parameterValue
    );
    safeSetObjectPropertyValue(
      rawConnection.parameterValues,
      [...(connectionParameter?.uiDefinition?.constraints?.propertyPath ?? []), parameterKey],
      rawValue
    );
  }

  return { connectionAndSettings: connectionsData, rawConnection };
}

function convertToFunctionsConnectionsData(
  connectionKey: string,
  connectionInfo: ConnectionCreationInfo
): ConnectionAndAppSetting<FunctionsConnectionModel> {
  const { displayName, connectionParameters } = connectionInfo;
  const authentication = connectionParameters?.['authentication'];
  const functionAppKey = authentication.value;
  const appSettingName = `${escapeSpecialChars(connectionKey)}_functionAppKey`;

  authentication.value = `@appsetting('${appSettingName}')`;

  return {
    connectionKey,
    connectionData: {
      function: connectionParameters?.['function'],
      triggerUrl: connectionParameters?.['triggerUrl'],
      authentication,
      displayName,
    },
    settings: { [appSettingName]: functionAppKey },
    pathLocation: [functionsLocation],
  };
}

function convertToApimConnectionsData(
  connectionKey: string,
  connectionInfo: ConnectionCreationInfo
): ConnectionAndAppSetting<APIManagementConnectionModel> {
  const { displayName, connectionParameters } = connectionInfo;
  const subscriptionKey = connectionParameters?.['subscriptionKey'];
  const appSettingName = `${escapeSpecialChars(connectionKey)}_SubscriptionKey`;

  return {
    connectionKey,
    connectionData: {
      apiId: connectionParameters?.['apiId'],
      baseUrl: connectionParameters?.['baseUrl'],
      subscriptionKey: `@appsetting('${appSettingName}')`,
      authentication: connectionParameters?.['authentication'],
      displayName,
    },
    settings: { [appSettingName]: subscriptionKey },
    pathLocation: [apimLocation],
  };
}

function escapeSpecialChars(value: string): string {
  const escapedUnderscore = value.replace(/_/g, '__');
  return escapedUnderscore.replace(/-/g, '_1');
}
