import { ConnectionParameterTypes } from '../models/connector';
import type { Connector, ConnectionParameter } from '../models/connector';
import { equals, hasProperty } from './functions';

export const isBuiltInConnector = (connectorId: string) => {
  // NOTE(lakshmia): connectorId format: connectionProviders/{connector}
  const fields = connectorId.split('/');
  if (fields.length !== 2) return false;
  return equals(fields[0], 'connectionProviders');
};

export const getConnectorName = (connectorId: string): string => connectorId?.split('/').at(-1) ?? '';

export const isCustomConnector = (connectorId: string) => {
  // NOTE(lakshmia): connectorId format: /subscriptions/{sub}/resourceGroups/{rg}/providers/Microsoft.Web/customApis/{connector}
  const fields = connectorId.split('/');
  if (fields.length !== 9) return false;

  if (!equals(fields[1], 'subscriptions')) return false;
  if (!equals(fields[3], 'resourcegroups')) return false;
  if (!equals(fields[5], 'providers')) return false;
  if (!equals(fields[6], 'microsoft.web')) return false;
  if (!equals(fields[7], 'customApis')) return false;

  return true;
};

export const isManagedConnector = (connectorId: string) => {
  // NOTE(lakshmia): connectorId format: /subscriptions/{sub}/resourceGroups/{rg}/providers/Microsoft.Logic/integrationServiceEnvironments/{ise}/managedApis/{connector}
  const fields = connectorId.split('/');
  if (fields.length !== 11) return false;

  if (!equals(fields[1], 'subscriptions')) return false;
  if (!equals(fields[3], 'resourcegroups')) return false;
  if (!equals(fields[5], 'providers')) return false;
  if (!equals(fields[6], 'microsoft.logic')) return false;
  if (!equals(fields[7], 'integrationserviceenvironments')) return false;
  if (!equals(fields[9], 'managedapis')) return false;

  return true;
};

export const isSharedManagedConnector = (connectorId: string) => {
  // NOTE(lakshmia): connectorId format: /subscriptions/{sub}/providers/Microsoft.Web/locations/{location}/managedApis/{connector}
  const fields = connectorId.split('/');
  if (fields.length !== 9) return false;

  if (!equals(fields[1], 'subscriptions')) return false;
  if (!equals(fields[3], 'providers')) return false;
  if (!equals(fields[4], 'microsoft.web')) return false;
  if (!equals(fields[5], 'locations')) return false;
  if (!equals(fields[7], 'managedapis')) return false;

  return true;
};

export const getUniqueConnectionName = (connectorId: string, connectionNames: string[]): string => {
  const connectorName = getConnectorName(connectorId).replace(/_/g, '-');
  let num = connectionNames.length + 1;
  let connectionName = `${connectorName}-${num}`;
  while (connectionNames.includes(connectionName)) connectionName = `${connectorName}-${++num}`;
  return connectionName;
};

export function getAuthRedirect(connector?: Connector): string | undefined {
  if (!connector) return undefined;
  const authParameters = getConnectionParametersWithType(connector, ConnectionParameterTypes[ConnectionParameterTypes.oauthSetting]);
  if (authParameters?.[0]) return authParameters?.[0].oAuthSettings?.redirectUrl;
  return undefined;
}

export function isFirstPartyConnector(connector: Connector): boolean {
  const oauthParameters = getConnectionParametersWithType(connector, ConnectionParameterTypes[ConnectionParameterTypes.oauthSetting]);

  return (
    !!oauthParameters &&
    oauthParameters.length > 0 &&
    !!oauthParameters[0].oAuthSettings &&
    !!oauthParameters[0].oAuthSettings.properties &&
    equals(oauthParameters[0].oAuthSettings.properties.IsFirstParty, 'true')
  );
}

export function getConnectionParametersWithType(connector: Connector, connectionParameterType: string): ConnectionParameter[] {
  if (connector && connector.properties) {
    const connectionParameters =
      connector.properties.connectionParameterSets !== undefined
        ? _getConnectionParameterSetParametersUsingType(connector, connectionParameterType)
        : connector.properties.connectionParameters;
    if (!connectionParameters) return [];
    return Object.keys(connectionParameters || {})
      .filter((connectionParameterKey) => !isHiddenConnectionParameter(connectionParameters, connectionParameterKey))
      .map((connectionParameterKey) => connectionParameters[connectionParameterKey])
      .filter((connectionParameter) => equals(connectionParameter.type, connectionParameterType));
  }

  return [];
}

function _getConnectionParameterSetParametersUsingType(connector: Connector, parameterType: string): Record<string, ConnectionParameter> {
  for (const parameterSet of connector.properties?.connectionParameterSets?.values ?? []) {
    for (const parameterKey in parameterSet.parameters) {
      if (parameterSet.parameters[parameterKey].type === parameterType) {
        return parameterSet.parameters;
      }
    }
  }
  return {};
}

export function isHiddenConnectionParameter(
  connectionParameters: Record<string, ConnectionParameter>,
  connectionParameterKey: string
): boolean {
  return (
    !(
      _isServicePrinicipalConnectionParameter(connectionParameterKey) &&
      _connectorContainsAllServicePrinicipalConnectionParameters(connectionParameters)
    ) && _isConnectionParameterHidden(connectionParameters[connectionParameterKey])
  );
}

const Constants = {
  SERVICE_PRINCIPLE_CONFIG_ITEM_KEYS: {
    TOKEN_CLIENT_ID: 'token:clientId',
    TOKEN_CLIENT_SECRET: 'token:clientSecret',
    TOKEN_RESOURCE_URI: 'token:resourceUri',
    TOKEN_GRANT_TYPE: 'token:grantType',
    TOKEN_TENANT_ID: 'token:tenantId',
  },
  SERVICE_PRINCIPLE_CONFIG_ITEM_KEYS_PREFIX: 'token:',
  SERVICE_PRINCIPLE_GRANT_TYPE_VALUES: {
    CODE: 'code',
    CLIENT_CREDENTIALS: 'client_credentials',
  },
};

function _isServicePrinicipalConnectionParameter(connectionParameterKey: string): boolean {
  return (
    equals(connectionParameterKey, Constants.SERVICE_PRINCIPLE_CONFIG_ITEM_KEYS.TOKEN_CLIENT_ID) ||
    equals(connectionParameterKey, Constants.SERVICE_PRINCIPLE_CONFIG_ITEM_KEYS.TOKEN_CLIENT_SECRET) ||
    equals(connectionParameterKey, Constants.SERVICE_PRINCIPLE_CONFIG_ITEM_KEYS.TOKEN_RESOURCE_URI) ||
    equals(connectionParameterKey, Constants.SERVICE_PRINCIPLE_CONFIG_ITEM_KEYS.TOKEN_GRANT_TYPE) ||
    equals(connectionParameterKey, Constants.SERVICE_PRINCIPLE_CONFIG_ITEM_KEYS.TOKEN_TENANT_ID)
  );
}

function _connectorContainsAllServicePrinicipalConnectionParameters(connectionParameters: Record<string, ConnectionParameter>): boolean {
  return (
    hasProperty(connectionParameters, Constants.SERVICE_PRINCIPLE_CONFIG_ITEM_KEYS.TOKEN_CLIENT_ID) &&
    hasProperty(connectionParameters, Constants.SERVICE_PRINCIPLE_CONFIG_ITEM_KEYS.TOKEN_CLIENT_SECRET) &&
    hasProperty(connectionParameters, Constants.SERVICE_PRINCIPLE_CONFIG_ITEM_KEYS.TOKEN_RESOURCE_URI) &&
    hasProperty(connectionParameters, Constants.SERVICE_PRINCIPLE_CONFIG_ITEM_KEYS.TOKEN_GRANT_TYPE) &&
    hasProperty(connectionParameters, Constants.SERVICE_PRINCIPLE_CONFIG_ITEM_KEYS.TOKEN_TENANT_ID)
  );
}

function _isConnectionParameterHidden(connectionParameter: ConnectionParameter): boolean {
  return connectionParameter?.uiDefinition?.constraints?.hidden === 'true';
}
