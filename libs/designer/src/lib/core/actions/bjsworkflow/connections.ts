import Constants from '../../../common/constants';
import { getConnectionsQuery } from '../../queries/connections';
import { getOperationManifest } from '../../queries/operation';
import { initializeConnectionsMappings } from '../../state/connection/connectionSlice';
import type { Operations } from '../../state/workflow/workflowInterfaces';
import type { RootState } from '../../store';
import type { IOperationManifestService } from '@microsoft-logic-apps/designer-client-services';
import { OperationManifestService } from '@microsoft-logic-apps/designer-client-services';
import type { ConnectionParameter, Connector, OperationManifest } from '@microsoft-logic-apps/utils';
import { ConnectionParameterTypes, hasProperty, equals, ConnectionReferenceKeyFormat } from '@microsoft-logic-apps/utils';
import type { Dispatch } from '@reduxjs/toolkit';

export async function getConnectionsMappingForNodes(operations: Operations, getState: () => RootState): Promise<Record<string, string>> {
  let connectionsMapping: Record<string, string> = {};
  const operationManifestService = OperationManifestService();

  const tasks: Promise<Record<string, string> | undefined>[] = [];

  for (const [nodeId, operation] of Object.entries(operations)) {
    tasks.push(getConnectionMappingForNode(operation, nodeId, operationManifestService, getState));
  }

  const mappings = await Promise.all(tasks);
  for (const mapping of mappings) {
    connectionsMapping = { ...connectionsMapping, ...mapping };
  }
  return connectionsMapping;
}

export const getConnectionMappingForNode = (
  operation: LogicAppsV2.OperationDefinition,
  nodeId: string,
  operationManifestService: IOperationManifestService,
  getState: () => RootState
): Promise<Record<string, string> | undefined> => {
  try {
    if (operationManifestService.isSupported(operation.type, operation.kind)) {
      return getManifestBasedConnectionMapping(getState, nodeId, operation);
    } else if (isApiConnectionType(operation.type)) {
      const connectionReferenceKey = getLegacyConnectionReferenceKey(operation);
      if (connectionReferenceKey !== undefined) {
        const mapping = Promise.resolve({ [nodeId]: connectionReferenceKey });
        return mapping;
      }
    }
    return Promise.resolve(undefined);
  } catch (exception) {
    return Promise.resolve(undefined);
    // log exception
  }
};

const isApiConnectionType = (type: string): boolean => {
  return (
    equals(type, Constants.NODE.TYPE.API_CONNECTION) ||
    equals(type, Constants.NODE.TYPE.API_CONNECTION_WEBHOOK) ||
    equals(type, Constants.NODE.TYPE.API_CONNECTION_NOTIFICATION)
  );
};

const isOpenApiConnectionType = (type: string): boolean => {
  return (
    equals(type, Constants.NODE.TYPE.OPEN_API_CONNECTION) ||
    equals(type, Constants.NODE.TYPE.OPEN_API_CONNECTION_WEBHOOK) ||
    equals(type, Constants.NODE.TYPE.OPEN_API_CONNECTION_NOTIFICATION)
  );
};

export async function getConnectionsApiAndMapping(
  operations: Operations,
  getState: () => RootState,
  dispatch: Dispatch,
  operationInfoPromise: Promise<void>
) {
  getConnectionsQuery();
  await operationInfoPromise;
  const connectionsMappings = await getConnectionsMappingForNodes(operations, getState);
  dispatch(initializeConnectionsMappings(connectionsMappings));
  return;
}

export async function getManifestBasedConnectionMapping(
  getState: () => RootState,
  nodeId: string,
  operationDefinition: LogicAppsV2.OperationDefinition
): Promise<Record<string, string> | undefined> {
  try {
    const { operations } = getState();
    const { connectorId, operationId } = operations.operationInfo[nodeId];
    const operationManifest = await getOperationManifest({ connectorId, operationId });
    const connectionReferenceKeyFormat =
      (operationManifest.properties.connectionReference && operationManifest.properties.connectionReference.referenceKeyFormat) ?? '';
    if (connectionReferenceKeyFormat === '') {
      return Promise.resolve(undefined);
    }

    let connectionReferenceKey: string | undefined;
    if (isOpenApiConnectionType(operationDefinition.type) || connectionReferenceKeyFormat !== undefined) {
      connectionReferenceKey = getConnectionReferenceKeyForManifest(connectionReferenceKeyFormat, operationDefinition);
    } else if (isConnectionRequiredForOperation(operationManifest)) {
      connectionReferenceKey = getLegacyConnectionReferenceKey(operationDefinition);
    } else {
      connectionReferenceKey = undefined;
    }

    return connectionReferenceKey ? { [nodeId]: connectionReferenceKey } : undefined;
  } catch (exception) {
    // log exception
    return Promise.resolve(undefined);
  }
}

export function isConnectionRequiredForOperation(manifest: OperationManifest): boolean {
  return !!manifest.properties.connection?.required;
}

export function getConnectionMetadata(manifest?: OperationManifest) {
  return manifest?.properties.connection;
}

export function needsConnection(connector: Connector | undefined): boolean {
  if (!connector) return false;
  return (
    needsAuth(connector) || hasPrerequisiteConnection(connector) || needsSimpleConnection(connector) || needsConfigConnection(connector)
  );
}

export function needsAuth(connector: Connector): boolean {
  return getConnectionParametersWithType(connector, ConnectionParameterTypes[ConnectionParameterTypes.oauthSetting]).length > 0;
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

export function hasPrerequisiteConnection(connector: Connector): boolean {
  return getConnectionParametersWithType(connector, ConnectionParameterTypes[ConnectionParameterTypes.connection]).length > 0;
}

export function needsSimpleConnection(connector: Connector): boolean {
  if (!connector) return false;

  if (connector.properties) {
    const connectionParameters = connector.properties.connectionParameters;
    if (connectionParameters) {
      return (
        Object.keys(connectionParameters).filter(
          (connectionParameterKey) => !isHiddenConnectionParameter(connectionParameters, connectionParameterKey)
        ).length === 0
      );
    } else {
      return true;
    }
  }

  return false;
}

export function needsConfigConnection(connector: Connector): boolean {
  if (connector && connector.properties && connector.properties.connectionParameters) {
    const connectionParameters = connector.properties.connectionParameters;
    return Object.keys(connectionParameters)
      .filter((connectionParameterKey) => !isHiddenConnectionParameter(connectionParameters, connectionParameterKey))
      .some((connectionParameterKey) => {
        const connectionParameter = connectionParameters[connectionParameterKey];
        return isConfigConnectionParameter(connectionParameter);
      });
  }

  return false;
}

export const SupportedConfigConnectionParameterTypes = [
  ConnectionParameterTypes.array,
  ConnectionParameterTypes.bool,
  ConnectionParameterTypes.gatewaySetting,
  ConnectionParameterTypes.int,
  ConnectionParameterTypes.object,
  ConnectionParameterTypes.secureObject,
  ConnectionParameterTypes.secureString,
  ConnectionParameterTypes.string,
];

export function isConfigConnectionParameter(connectionParameter: ConnectionParameter): boolean {
  if (connectionParameter && connectionParameter.type) {
    return SupportedConfigConnectionParameterTypes.some((connectionParameterType) => {
      return equals(connectionParameter.type, ConnectionParameterTypes[connectionParameterType]);
    });
  }

  return false;
}

function getConnectionReferenceKeyForManifest(referenceFormat: string, operationDefinition: LogicAppsV2.OperationDefinition): string {
  switch (referenceFormat) {
    case ConnectionReferenceKeyFormat.Function:
      return (operationDefinition as LogicAppsV2.FunctionAction).inputs.function.connectionName;

    case ConnectionReferenceKeyFormat.ServiceProvider:
      return (operationDefinition as LogicAppsV2.ServiceProvider).inputs.serviceProviderConfiguration.connectionName;

    case ConnectionReferenceKeyFormat.OpenApi:
      return getOpenApiConnectionReferenceKey((operationDefinition as LogicAppsV2.OpenApiOperationAction).inputs);
    default:
      throw Error('No known connection reference key type');
  }
}

function getOpenApiConnectionReferenceKey(operationDefinition: LogicAppsV2.OpenApiOperationInputs): string {
  let connectionName: string;
  if (typeof operationDefinition.host.connection === 'string') {
    connectionName = operationDefinition.host.connection;
  } else {
    connectionName = operationDefinition.host.connection.referenceName;
  }
  return connectionName;
}

export function getLegacyConnectionReferenceKey(operationDefinition: any): string | undefined {
  let referenceKey: string;
  if (typeof operationDefinition.inputs.host.connection === 'string') {
    referenceKey = operationDefinition.inputs.host.connection;
  } else {
    referenceKey = operationDefinition.inputs.host.connection.referenceName;
  }
  return referenceKey;
}
