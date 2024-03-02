import type { Connection, ConnectionStatus, ManagedIdentity } from '../models';
import { ResourceIdentityType } from '../models';
import type { ConnectionParameter, Connector } from '../models/connector';
import { ConnectionParameterTypes } from '../models/connector';
import { equals, hasProperty } from './functions';
import type { IntlShape } from 'react-intl';

export const connectorsShownAsAzure = ['builtin/as2', 'builtin/rosettanet'];

export function isArmResourceId(resourceId: string): boolean {
  return resourceId ? resourceId.startsWith('/subscriptions/') : false;
}

export const isBuiltInConnectorId = (connectorId: string) => {
  if (connectorsShownAsAzure.includes(connectorId)) return false;
  return !isArmResourceId(connectorId);
};

export const getConnectorName = (connectorId: string): string => connectorId?.split('/').at(-1) ?? '';

export const isCustomConnectorId = (connectorId: string) => {
  // Note: connectorId format: /subscriptions/{sub}/resourceGroups/{rg}/providers/Microsoft.Web/customApis/{connector}
  const fields = connectorId.split('/');
  if (fields.length !== 9) return false;

  if (!equals(fields[1], 'subscriptions')) return false;
  if (!equals(fields[3], 'resourcegroups')) return false;
  if (!equals(fields[5], 'providers')) return false;
  if (!equals(fields[6], 'microsoft.web')) return false;
  if (!equals(fields[7], 'customApis')) return false;

  return true;
};

export const isManagedConnectorId = (connectorId: string) => {
  // Note: connectorId format: /subscriptions/{sub}/resourceGroups/{rg}/providers/Microsoft.Logic/integrationServiceEnvironments/{ise}/managedApis/{connector}
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

export const isSharedManagedConnectorId = (connectorId: string) => {
  // Note: connectorId format: /subscriptions/{sub}/providers/Microsoft.Web/locations/{location}/managedApis/{connector}
  const fields = connectorId.split('/');
  if (fields.length !== 9) return false;

  if (!equals(fields[1], 'subscriptions')) return false;
  if (!equals(fields[3], 'providers')) return false;
  if (!equals(fields[4], 'microsoft.web')) return false;
  if (!equals(fields[5], 'locations')) return false;
  if (!equals(fields[7], 'managedapis')) return false;

  return true;
};

export const isSharedManagedConnectorIdFromPApps = (connectorId: string) => {
  // Note: connectorId format: /providers/Microsoft.PowerApps/apis/{connector}
  const fields = connectorId.split('/');
  if (fields.length !== 5) return false;

  if (!equals(fields[1], 'providers')) return false;
  if (!equals(fields[2], 'microsoft.powerapps')) return false;
  if (!equals(fields[3], 'apis')) return false;
  if (!fields[4].startsWith('shared_')) return false;

  return true;
};

export function getAuthRedirect(connector?: Connector): string | undefined {
  if (!connector) return undefined;
  const authParameters = getConnectionParametersWithType(connector, ConnectionParameterTypes.oauthSetting);
  if (authParameters?.[0]) return authParameters?.[0].oAuthSettings?.redirectUrl;
  return undefined;
}

export function isFirstPartyConnector(connector: Connector): boolean {
  const oauthParameters = getConnectionParametersWithType(connector, ConnectionParameterTypes.oauthSetting);

  return (
    !!oauthParameters &&
    oauthParameters.length > 0 &&
    !!oauthParameters[0].oAuthSettings &&
    !!oauthParameters[0].oAuthSettings.properties &&
    equals(oauthParameters[0].oAuthSettings.properties.IsFirstParty, 'true')
  );
}

export function getConnectionParametersWithType(
  connector: Connector,
  connectionParameterType: string,
  showServicePrincipal = false
): ConnectionParameter[] {
  if (connector && connector.properties) {
    const connectionParameters =
      connector.properties.connectionParameterSets !== undefined
        ? _getConnectionParameterSetParametersUsingType(connector, connectionParameterType)
        : connector.properties.connectionParameters;
    if (!connectionParameters) return [];
    return Object.keys(connectionParameters || {})
      .filter((connectionParameterKey) => !isHiddenConnectionParameter(connectionParameters, connectionParameterKey, showServicePrincipal))
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
  connectionParameterKey: string,
  showServicePrincipal = false
): boolean {
  const isServicePrincipalParameter =
    isServicePrinicipalConnectionParameter(connectionParameterKey) &&
    connectorContainsAllServicePrinicipalConnectionParameters(connectionParameters);
  return showServicePrincipal === isServicePrincipalParameter && _isConnectionParameterHidden(connectionParameters[connectionParameterKey]);
}

export const SERVICE_PRINCIPLE_CONSTANTS = {
  CONFIG_ITEM_KEYS: {
    TOKEN_CLIENT_ID: 'token:clientId',
    TOKEN_CLIENT_SECRET: 'token:clientSecret',
    TOKEN_RESOURCE_URI: 'token:resourceUri',
    TOKEN_GRANT_TYPE: 'token:grantType',
    TOKEN_TENANT_ID: 'token:tenantId',
  },
  CONFIG_ITEM_KEYS_PREFIX: 'token:',
  GRANT_TYPE_VALUES: {
    CODE: 'code',
    CLIENT_CREDENTIALS: 'client_credentials',
  },
};

export function isServicePrinicipalConnectionParameter(connectionParameterKey: string): boolean {
  return Object.values(SERVICE_PRINCIPLE_CONSTANTS.CONFIG_ITEM_KEYS)
    .map((key) => key.toLowerCase())
    .includes(connectionParameterKey.toLowerCase());
}

export function connectorContainsAllServicePrinicipalConnectionParameters(
  connectionParameters: Record<string, ConnectionParameter>
): boolean {
  return (
    hasProperty(connectionParameters, SERVICE_PRINCIPLE_CONSTANTS.CONFIG_ITEM_KEYS.TOKEN_CLIENT_ID) &&
    hasProperty(connectionParameters, SERVICE_PRINCIPLE_CONSTANTS.CONFIG_ITEM_KEYS.TOKEN_CLIENT_SECRET) &&
    hasProperty(connectionParameters, SERVICE_PRINCIPLE_CONSTANTS.CONFIG_ITEM_KEYS.TOKEN_RESOURCE_URI) &&
    hasProperty(connectionParameters, SERVICE_PRINCIPLE_CONSTANTS.CONFIG_ITEM_KEYS.TOKEN_GRANT_TYPE) &&
    hasProperty(connectionParameters, SERVICE_PRINCIPLE_CONSTANTS.CONFIG_ITEM_KEYS.TOKEN_TENANT_ID)
  );
}

export function usesLegacyManagedIdentity(alternativeParameters?: Record<string, ConnectionParameter>): boolean {
  return (
    alternativeParameters?.['authentication']?.uiDefinition?.schema?.['x-ms-editor-options']?.supportedAuthTypes?.[0] ===
    'ManagedServiceIdentity'
  );
}

export function getIdentityDropdownOptions(managedIdentity: ManagedIdentity | undefined, intl: IntlShape): any[] {
  const options: any[] = [];
  if (!managedIdentity) return options;
  const { type, userAssignedIdentities } = managedIdentity;
  const systemAssigned = intl.formatMessage({
    defaultMessage: 'System-assigned managed identity',
    description: 'Text for system assigned managed identity',
  });

  if (equals(type, ResourceIdentityType.SYSTEM_ASSIGNED) || equals(type, ResourceIdentityType.SYSTEM_ASSIGNED_USER_ASSIGNED)) {
    options.push({ key: 'SystemAssigned_Managed_Identity', text: systemAssigned });
  }

  if (equals(type, ResourceIdentityType.USER_ASSIGNED) || equals(type, ResourceIdentityType.SYSTEM_ASSIGNED_USER_ASSIGNED)) {
    for (const identity of Object.keys(userAssignedIdentities ?? {})) {
      options.push({ key: identity, text: identity.split('/').at(-1) ?? identity });
    }
  }

  return options;
}

function _isConnectionParameterHidden(connectionParameter: ConnectionParameter): boolean {
  return connectionParameter?.uiDefinition?.constraints?.hidden === 'true';
}

export const getUniqueName = (keys: string[], prefix: string): { name: string; index: number } => {
  const set = new Set(keys.map((name) => name.split('::')[0]));

  let index = 0;
  let name = prefix;
  while (set.has(name)) {
    name = `${prefix}-${++index}`;
  }

  return { name, index };
};

export const isIdentityAssociatedWithLogicApp = (managedIdentity: ManagedIdentity | undefined): boolean => {
  return (
    !!managedIdentity &&
    (equals(managedIdentity.type, ResourceIdentityType.SYSTEM_ASSIGNED_USER_ASSIGNED) ||
      equals(managedIdentity.type, ResourceIdentityType.SYSTEM_ASSIGNED) ||
      (equals(managedIdentity.type, ResourceIdentityType.USER_ASSIGNED) &&
        !!managedIdentity.userAssignedIdentities &&
        Object.keys(managedIdentity.userAssignedIdentities).length > 0))
  );
};

export function getConnectionErrors(connection: Connection): ConnectionStatus[] {
  return (connection?.properties?.statuses ?? []).filter((status) => status.status.toLowerCase() === 'error');
}

export function fallbackConnectorIconUrl(iconUrl?: string): string {
  const fallbackUrl =
    'data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0idXRmLTgiPz4NCjxzdmcgdmVyc2lvbj0iMS4xIiBpZD0iTGF5ZXJfMSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiB4bWxuczp4bGluaz0iaHR0cDovL3d3dy53My5vcmcvMTk5OS94bGluayIgeD0iMHB4IiB5PSIwcHgiDQoJIHdpZHRoPSIzMnB4IiBoZWlnaHQ9IjMycHgiIHZpZXdCb3g9IjAgMCAzMiAzMiIgc3R5bGU9ImVuYWJsZS1iYWNrZ3JvdW5kOm5ldyAwIDAgMzIgMzI7IiB4bWw6c3BhY2U9InByZXNlcnZlIj4NCjxzdHlsZSB0eXBlPSJ0ZXh0L2NzcyI+DQoJLnN0MHtmaWxsOiM0RTRGNEY7fQ0KCS5zdDF7ZmlsbDojRkZGRkZGO30NCjwvc3R5bGU+DQo8ZyBpZD0iWE1MSURfMzM4XyI+DQoJPHJlY3QgeD0iMCIgeT0iMCIgY2xhc3M9InN0MCIgd2lkdGg9IjMyIiBoZWlnaHQ9IjMyIi8+DQo8L2c+DQo8cGF0aCBjbGFzcz0ic3QxIiBkPSJNMTEuODgsNXY1LjVIOS4xM3Y0LjEzYzAsMy41NiwyLjcyLDYuNDksNi4xOSw2Ljg0VjI3aDEuMzd2LTUuNTNjMy40Ny0wLjM1LDYuMTktMy4yOCw2LjE5LTYuODRWMTAuNWgtMi43NVY1DQoJaC0xLjM4djUuNWgtNS41VjVIMTEuODh6IE0yMS41LDE0LjYzYzAsMy4wMy0yLjQ3LDUuNS01LjUsNS41cy01LjUtMi40Ny01LjUtNS41di0yLjc1aDExVjE0LjYzeiIvPg0KPC9zdmc+DQo=';
  return iconUrl?.includes('/Content/retail/assets/default-connection-icon') ? fallbackUrl : iconUrl ?? fallbackUrl;
}
