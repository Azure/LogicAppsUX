import Constants from '../../../common/constants';
import type { ApiHubAuthentication } from '../../../common/models/workflow';
import { isOpenApiSchemaVersion } from '../../../common/utilities/Utils';
import { getConnection } from '../../queries/connections';
import { getConnector, getOperationManifest } from '../../queries/operation';
import { changeConnectionMapping, initializeConnectionsMappings } from '../../state/connection/connectionSlice';
import { updateErrorDetails } from '../../state/operation/operationMetadataSlice';
import type { Operations } from '../../state/workflow/workflowInterfaces';
import type { RootState } from '../../store';
import {
  getConnectionReference,
  isConnectionMultiAuthManagedIdentityType,
  isConnectionSingleAuthManagedIdentityType,
} from '../../utils/connectors/connections';
import { isRootNodeInGraph } from '../../utils/graph';
import { updateDynamicDataInNode } from '../../utils/parameters/helper';
import { getAllVariables } from '../../utils/variables';
import type { IOperationManifestService } from '@microsoft/designer-client-services-logic-apps';
import { ConnectionService, WorkflowService, OperationManifestService } from '@microsoft/designer-client-services-logic-apps';
import type { Connection, ConnectionParameter, Connector, OperationManifest, LogicAppsV2 } from '@microsoft/utils-logic-apps';
import {
  ResourceIdentityType,
  optional,
  isHiddenConnectionParameter,
  ConnectionParameterTypes,
  equals,
  ConnectionReferenceKeyFormat,
} from '@microsoft/utils-logic-apps';
import type { Dispatch } from '@reduxjs/toolkit';
import { createAsyncThunk } from '@reduxjs/toolkit';

export interface ConnectionPayload {
  nodeId: string;
  connector: Connector;
  connection: Connection;
  connectionProperties?: Record<string, any>;
  authentication?: ApiHubAuthentication;
}

export interface UpdateConnectionPayload {
  nodeId: string;
  connectorId: string;
  connectionId: string;
  connectionProperties?: Record<string, any>;
  authentication?: ApiHubAuthentication;
  connectionRuntimeUrl?: string;
}

export const updateNodeConnection = createAsyncThunk(
  'updateNodeConnection',
  async (payload: ConnectionPayload, { dispatch, getState }): Promise<void> => {
    const { nodeId, connector, connection, connectionProperties, authentication } = payload;

    dispatch(updateErrorDetails({ id: nodeId, clear: true }));
    return updateNodeConnectionAndProperties(
      {
        nodeId,
        connectorId: connector.id,
        connectionId: connection.id,
        authentication: authentication ?? getApiHubAuthenticationIfRequired(),
        connectionProperties: connectionProperties ?? getConnectionPropertiesIfRequired(connection, connector),
        connectionRuntimeUrl: isOpenApiSchemaVersion((getState() as RootState).workflow.originalDefinition)
          ? connection.properties.connectionRuntimeUrl
          : undefined,
      },
      dispatch,
      getState as () => RootState
    );
  }
);

const updateNodeConnectionAndProperties = async (
  payload: UpdateConnectionPayload,
  dispatch: Dispatch,
  getState: () => RootState
): Promise<void> => {
  const { nodeId } = payload;
  dispatch(changeConnectionMapping(payload));

  const newState = getState() as RootState;
  return updateDynamicDataInNode(
    nodeId,
    isRootNodeInGraph(nodeId, 'root', newState.workflow.nodesMetadata),
    newState.operations.operationInfo[nodeId],
    getConnectionReference(newState.connections, nodeId),
    newState.operations.dependencies[nodeId],
    newState.operations.inputParameters[nodeId],
    newState.operations.settings[nodeId],
    getAllVariables(newState.tokens.variables),
    dispatch,
    getState,
    newState.workflow.newlyAddedOperations[nodeId] ? undefined : newState.workflow.operations[nodeId]
  );
};
const getConnectionPropertiesIfRequired = (connection: Connection, connector: Connector): Record<string, any> | undefined => {
  if (isConnectionMultiAuthManagedIdentityType(connection, connector) || isConnectionSingleAuthManagedIdentityType(connection)) {
    const identity = WorkflowService().getAppIdentity?.();
    const userAssignedIdentity =
      equals(identity?.type, ResourceIdentityType.USER_ASSIGNED) && identity?.userAssignedIdentities
        ? Object.keys(identity?.userAssignedIdentities)[0]
        : undefined;

    return getConnectionProperties(connector, userAssignedIdentity);
  }

  return undefined;
};

export const getConnectionProperties = (connector: Connector, userAssignedIdentity: string | undefined): Record<string, any> => {
  let audience: string | undefined;
  if (WorkflowService().isExplicitAuthRequiredForManagedIdentity?.()) {
    const isMultiAuth = connector.properties.connectionParameterSets !== undefined;
    const parameterType = isMultiAuth
      ? ConnectionParameterTypes[ConnectionParameterTypes.managedIdentity]
      : ConnectionParameterTypes[ConnectionParameterTypes.oauthSetting];
    const parameters = getConnectionParametersWithType(connector, parameterType);
    audience = isMultiAuth
      ? parameters?.[0]?.managedIdentitySettings?.resourceUri
      : parameters?.[0]?.oAuthSettings?.properties?.AzureActiveDirectoryResourceId;
  }

  return {
    authentication: {
      type: 'ManagedServiceIdentity',
      ...optional('identity', userAssignedIdentity),
      ...optional('audience', audience),
    },
  };
};

const getApiHubAuthenticationIfRequired = (): ApiHubAuthentication | undefined => {
  const identity = WorkflowService().getAppIdentity?.();
  const userAssignedIdentity =
    equals(identity?.type, ResourceIdentityType.USER_ASSIGNED) && identity?.userAssignedIdentities
      ? Object.keys(identity.userAssignedIdentities)[0]
      : undefined;
  return getApiHubAuthentication(userAssignedIdentity);
};

export const getApiHubAuthentication = (userAssignedIdentity: string | undefined): ApiHubAuthentication | undefined => {
  return WorkflowService().isExplicitAuthRequiredForManagedIdentity?.()
    ? { type: 'ManagedServiceIdentity', ...optional('identity', userAssignedIdentity) }
    : undefined;
};

export const updateIdentityChangeInConection = createAsyncThunk(
  'updateIdentityChangeInConection',
  async (payload: { nodeId: string; identity: string }, { dispatch, getState }): Promise<void> => {
    const { nodeId, identity } = payload;
    const rootState = getState() as RootState;
    const userAssignedIdentity = identity !== Constants.SYSTEM_ASSIGNED_MANAGED_IDENTITY ? identity : undefined;
    const {
      api: { id: connectorId },
      connection: { id: connectionId },
    } = getConnectionReference(rootState.connections, nodeId);
    const connector = await getConnector(connectorId);
    const connection = await getConnection(connectionId, connectorId);

    await ConnectionService().setupConnectionIfNeeded(connection as Connection, userAssignedIdentity);

    dispatch(updateErrorDetails({ id: nodeId, clear: true }));
    return updateNodeConnectionAndProperties(
      {
        nodeId,
        connectorId,
        connectionId,
        authentication: getApiHubAuthentication(userAssignedIdentity),
        connectionProperties: getConnectionProperties(connector, userAssignedIdentity),
        connectionRuntimeUrl: isOpenApiSchemaVersion(rootState.workflow.originalDefinition)
          ? (connection as Connection).properties.connectionRuntimeUrl
          : undefined,
      },
      dispatch,
      getState as () => RootState
    );
  }
);

async function getConnectionsMappingForNodes(operations: Operations, getState: () => RootState): Promise<Record<string, string>> {
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

export const isOpenApiConnectionType = (type: string): boolean => {
  return (
    equals(type, Constants.NODE.TYPE.OPEN_API_CONNECTION) ||
    equals(type, Constants.NODE.TYPE.OPEN_API_CONNECTION_WEBHOOK) ||
    equals(type, Constants.NODE.TYPE.OPEN_API_CONNECTION_NOTIFICATION)
  );
};

export async function getConnectionsApiAndMapping(operations: Operations, getState: () => RootState, dispatch: Dispatch) {
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

export function needsOAuth(connectionParameters: Record<string, ConnectionParameter>): boolean {
  return (
    Object.keys(connectionParameters || {})
      .filter((connectionParameterKey) => !isHiddenConnectionParameter(connectionParameters, connectionParameterKey))
      .map((connectionParameterKey) => connectionParameters[connectionParameterKey])
      .filter((connectionParameter) => equals(connectionParameter.type, ConnectionParameterTypes[ConnectionParameterTypes.oauthSetting]))
      .length > 0
  );
}

// This only checks if this connector has any OAuth connection, it can be just part of Multi Auth
function needsAuth(connector?: Connector): boolean {
  if (!connector) return false;
  return getConnectionParametersWithType(connector, ConnectionParameterTypes[ConnectionParameterTypes.oauthSetting]).length > 0;
}

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
  if (connector?.properties?.connectionParameters) {
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
    case ConnectionReferenceKeyFormat.ApiManagement:
      return (operationDefinition as any).inputs.apiManagement.connection;

    case ConnectionReferenceKeyFormat.Function:
      return (operationDefinition as LogicAppsV2.FunctionAction).inputs.function.connectionName;

    case ConnectionReferenceKeyFormat.ServiceProvider:
      return (operationDefinition as LogicAppsV2.ServiceProvider).inputs.serviceProviderConfiguration.connectionName;

    case ConnectionReferenceKeyFormat.OpenApi:
    case ConnectionReferenceKeyFormat.OpenApiConnection:
      return getOpenApiConnectionReferenceKey((operationDefinition as LogicAppsV2.OpenApiOperationAction).inputs);

    case ConnectionReferenceKeyFormat.HybridTrigger:
      return getHybridTriggerConnectionReferenceKey((operationDefinition as LogicAppsV2.HybridTriggerOperation).inputs);
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
  let referenceKey = '';
  const connObj = operationDefinition.inputs.host.connection;
  if (typeof connObj === 'string') {
    referenceKey = connObj;
  } else {
    if (connObj?.referenceName)
      // Standard
      referenceKey = connObj.referenceName;
    else if (connObj?.name) {
      // Consumption
      // Example format: "@parameters('$connections')['servicebus']['connectionId']"
      referenceKey = connObj.name.split('[')[1].split(']')[0].replace(/'/g, '');
    }
  }
  return referenceKey;
}

function getHybridTriggerConnectionReferenceKey(operationDefinition: LogicAppsV2.HybridTriggerConnectionInfo): string {
  const hostName = operationDefinition.host.connection.name;
  // hostName of the format: `@parameters('$connections')['${referenceKey}']['connectionId']`
  const startDelimiter = "['";
  const endDelimiter = "']";
  const startIndex = hostName.indexOf(startDelimiter) + startDelimiter.length;
  const endIndex = hostName.indexOf(endDelimiter, startIndex);
  return hostName.substring(startIndex, endIndex);
}
