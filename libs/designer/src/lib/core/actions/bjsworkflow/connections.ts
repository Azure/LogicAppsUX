import Constants from '../../../common/constants';
import type { ApiHubAuthentication } from '../../../common/models/workflow';
import { AgentUtils, isOpenApiSchemaVersion } from '../../../common/utilities/Utils';
import type { DeserializedWorkflow } from '../../parsers/BJSWorkflow/BJSDeserializer';
import { getConnection, getUniqueConnectionName, updateNewConnectionInQueryCache } from '../../queries/connections';
import { getConnector, getOperationInfo, getOperationManifest } from '../../queries/operation';
import {
  changeConnectionMapping,
  changeConnectionMappingsForNodes,
  initializeConnectionsMappings,
} from '../../state/connection/connectionSlice';
import { changeConnectionMapping as changeTemplateConnectionMapping } from '../../state/templates/workflowSlice';
import type { NodeOperation } from '../../state/operation/operationMetadataSlice';
import { updateErrorDetails } from '../../state/operation/operationMetadataSlice';
import type { RootState as TemplateRootState } from '../../state/templates/store';
import type { RootState } from '../../store';
import {
  getConnectionReference,
  isConnectionMultiAuthManagedIdentityType,
  isConnectionSingleAuthManagedIdentityType,
} from '../../utils/connectors/connections';
import { isRootNodeInGraph } from '../../utils/graph';
import { updateDynamicDataInNode } from '../../utils/parameters/helper';
import type {
  IOperationManifestService,
  Connection,
  ConnectionParameter,
  Connector,
  OperationManifest,
  LogicAppsV2,
  ConnectionCreationInfo,
} from '@microsoft/logic-apps-shared';
import {
  ConnectionService,
  WorkflowService,
  OperationManifestService,
  ResourceIdentityType,
  optional,
  isHiddenConnectionParameter,
  hasTermsOfUse,
  getConnectionParametersWithType,
  ConnectionParameterTypes,
  equals,
  ConnectionReferenceKeyFormat,
  getRecordEntry,
  UserPreferenceService,
  LoggerService,
  LogEntryLevel,
} from '@microsoft/logic-apps-shared';
import type { Dispatch } from '@reduxjs/toolkit';
import { createAsyncThunk } from '@reduxjs/toolkit';
import { openPanel, setIsCreatingConnection, setIsPanelLoading } from '../../state/panel/panelSlice';
import type { PanelMode } from '../../state/panel/panelTypes';
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
  connectionParameterValues?: Record<string, any>;
}

export const updateMcpConnection = createAsyncThunk(
  'updateMcpConnection',
  async (payload: Omit<ConnectionPayload, 'nodeId'> & { nodeIds: string[]; reset?: boolean }, { dispatch }): Promise<void> => {
    const { nodeIds, connector, connection, connectionProperties, authentication, reset } = payload;
    dispatch(
      changeConnectionMappingsForNodes({
        reset,
        nodeIds,
        connectorId: connector.id,
        connectionId: connection.id,
        authentication: authentication ?? getApiHubAuthenticationIfRequired(),
        connectionProperties: connectionProperties ?? getConnectionPropertiesIfRequired(connection, connector),
      })
    );
  }
);

export const updateTemplateConnection = createAsyncThunk(
  'updateTemplateConnection',
  async (payload: ConnectionPayload & { connectionKey: string }, { dispatch, getState }): Promise<void> => {
    const { nodeId, connectionKey, connector, connection, connectionProperties, authentication } = payload;
    const workflows = (getState() as TemplateRootState).template.workflows;
    const defaultWorkflow = Object.values(workflows).length > 0 ? Object.values(workflows)[0] : undefined;
    dispatch(
      changeTemplateConnectionMapping({
        nodeId,
        connectionKey,
        connectorId: connector.id,
        connectionId: connection.id,
        authentication: authentication ?? getApiHubAuthenticationIfRequired(),
        connectionProperties: connectionProperties ?? getConnectionPropertiesIfRequired(connection, connector),
        connectionRuntimeUrl: isOpenApiSchemaVersion(defaultWorkflow?.workflowDefinition)
          ? connection.properties.connectionRuntimeUrl
          : undefined,
      })
    );
  }
);

export const updateNodeConnection = createAsyncThunk(
  'updateNodeConnection',
  async (payload: ConnectionPayload, { dispatch, getState }): Promise<void> => {
    const { nodeId, connector, connection, connectionProperties, authentication } = payload;

    dispatch(updateErrorDetails({ id: nodeId, clear: true }));

    UserPreferenceService()?.setMostRecentlyUsedConnectionId(connector.id, connection.id);
    return updateNodeConnectionAndProperties(
      {
        nodeId,
        connectorId: connector.id,
        connectionId: connection.id,
        authentication: authentication ?? getApiHubAuthenticationIfRequired(),
        connectionProperties: connectionProperties ?? getConnectionPropertiesIfRequired(connection, connector),
        connectionRuntimeUrl: isOpenApiSchemaVersion((getState() as RootState).workflow?.originalDefinition)
          ? connection.properties.connectionRuntimeUrl
          : undefined,
      },
      dispatch,
      getState as () => RootState
    );
  }
);

export const closeConnectionsFlow = createAsyncThunk(
  'closeConnectionsFlow',
  async ({ nodeId, panelMode }: { nodeId: string; panelMode?: PanelMode }, { dispatch }): Promise<void> => {
    const actualPanelMode = panelMode ?? 'Operation';
    const actualNodeId = actualPanelMode === 'Operation' ? nodeId : undefined;
    dispatch(setIsCreatingConnection(false));
    dispatch(openPanel({ nodeId: actualNodeId, panelMode: actualPanelMode }));
  }
);

export const reloadParametersTab = createAsyncThunk<void, void>('reloadParametersTab', async (_, { dispatch }): Promise<void> => {
  dispatch(setIsCreatingConnection(false));
  dispatch(setIsPanelLoading(true));
  // Wait for 1 second to allow the UI to update
  await new Promise((resolve) => setTimeout(resolve, 1000));
  dispatch(setIsPanelLoading(false));
});

const updateNodeConnectionAndProperties = async (
  payload: UpdateConnectionPayload,
  dispatch: Dispatch,
  getState: () => RootState
): Promise<void> => {
  const { nodeId } = payload;
  dispatch(changeConnectionMapping(payload));

  const newState = getState() as RootState;
  const operationInfo = getRecordEntry(newState.operations.operationInfo, nodeId);
  const dependencies = getRecordEntry(newState.operations.dependencies, nodeId);
  const newlyAddedOperations = getRecordEntry(newState.workflow.newlyAddedOperations, nodeId);
  const operation = getRecordEntry(newState.workflow.operations, nodeId);

  // Shouldn't happen, but required for type checking
  if (!operationInfo || !dependencies) {
    return;
  }

  return updateDynamicDataInNode(
    nodeId,
    isRootNodeInGraph(nodeId, 'root', newState.workflow.nodesMetadata),
    operationInfo,
    getConnectionReference(newState.connections, nodeId),
    dependencies,
    dispatch,
    getState,
    newState.tokens?.variables ?? {},
    newState.workflowParameters?.definitions ?? {},
    !!newState.tokens /* updateTokenMetadata */,
    newlyAddedOperations ? undefined : operation
  );
};

const getConnectionPropertiesIfRequired = (connection: Connection, connector: Connector): Record<string, any> | undefined => {
  if (!isConnectionMultiAuthManagedIdentityType(connection, connector) && !isConnectionSingleAuthManagedIdentityType(connection)) {
    return undefined;
  }

  const identity = WorkflowService().getAppIdentity?.();
  const userAssignedIdentity =
    equals(identity?.type, ResourceIdentityType.USER_ASSIGNED) && identity?.userAssignedIdentities
      ? Object.keys(identity?.userAssignedIdentities)[0]
      : undefined;

  return getConnectionProperties(connector, userAssignedIdentity);
};

export const getConnectionProperties = (connector: Connector, userAssignedIdentity: string | undefined): Record<string, any> => {
  let audience: string | undefined;
  let additionalAudiences: string[] | undefined;
  if (WorkflowService().isExplicitAuthRequiredForManagedIdentity?.()) {
    const isMultiAuth = connector.properties.connectionParameterSets !== undefined;
    const parameterType = isMultiAuth ? ConnectionParameterTypes.managedIdentity : ConnectionParameterTypes.oauthSetting;
    const parameters = getConnectionParametersWithType(connector, parameterType);

    if (isMultiAuth) {
      audience = parameters?.[0]?.managedIdentitySettings?.resourceUri;
      additionalAudiences = parameters?.[0]?.managedIdentitySettings?.additionalResourceUris;
    } else {
      audience = parameters?.[0]?.oAuthSettings?.properties?.AzureActiveDirectoryResourceId;
    }
  }

  return {
    authentication: {
      type: 'ManagedServiceIdentity',
      ...optional('identity', userAssignedIdentity),
      ...optional('audience', audience),
      ...optional('additionalAudiences', additionalAudiences),
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
    ? {
        type: 'ManagedServiceIdentity',
        ...optional('identity', userAssignedIdentity),
      }
    : undefined;
};

export const updateIdentityChangeInConnection = createAsyncThunk(
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

export const autoCreateConnectionIfPossible = async (payload: {
  connector: Connector;
  referenceKeys: string[];
  operationInfo?: NodeOperation;
  applyNewConnection: (connection: Connection) => void;
  onSuccess: (connection: Connection) => void;
  onManualConnectionCreation: () => void;
  skipOAuth?: boolean;
}): Promise<void> => {
  const { connector, operationInfo, referenceKeys, skipOAuth, applyNewConnection, onSuccess, onManualConnectionCreation } = payload;

  if (connectorHasMultiAuth(connector) || AgentUtils.isConnector(connector.id)) {
    return onManualConnectionCreation();
  }

  const operationManifest = operationInfo
    ? await getOperationManifest({
        connectorId: connector.id,
        operationId: operationInfo.operationId ?? '',
      })
    : undefined;

  const connectionInfo: ConnectionCreationInfo = { connectionParameters: {} };
  const parametersMetadata = {
    connectionMetadata: getConnectionMetadata(operationManifest),
    connectionParameters: connector?.properties.connectionParameters,
  };
  const newName = await getUniqueConnectionName(connector.id, referenceKeys);
  let connection: Connection | undefined;

  if (needsSimpleConnection(connector) && !hasTermsOfUse(connector)) {
    connection = await ConnectionService().createConnection(newName, connector, connectionInfo, parametersMetadata);
  } else if (!skipOAuth && hasOnlyOAuthParameters(connector)) {
    // TODO: First party connections were never created for LA, so would need separate implementation and testing if we need to include this.

    const connectionResult = await ConnectionService().createAndAuthorizeOAuthConnection(
      newName,
      connector.id,
      connectionInfo,
      parametersMetadata
    );
    connection = connectionResult.connection;
  }

  if (connection) {
    updateNewConnectionInQueryCache(connector.id, connection as Connection);
    applyNewConnection(connection);
    onSuccess(connection);
  } else {
    onManualConnectionCreation();
  }
};

export async function getConnectionsMappingForNodes(deserializedWorkflow: DeserializedWorkflow): Promise<Record<string, string>> {
  const { actionData, nodesMetadata } = deserializedWorkflow;
  let connectionsMapping: Record<string, string> = {};
  const operationManifestService = OperationManifestService();

  const tasks: Promise<Record<string, string> | undefined>[] = [];

  for (const [nodeId, operation] of Object.entries(actionData)) {
    const isTrigger = getRecordEntry(nodesMetadata, nodeId)?.isRoot ?? false;
    tasks.push(getConnectionMappingForNode(operation, nodeId, isTrigger, operationManifestService));
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
  isTrigger: boolean,
  operationManifestService: IOperationManifestService
): Promise<Record<string, string> | undefined> => {
  try {
    if (operationManifestService.isSupported(operation.type, operation.kind)) {
      return getManifestBasedConnectionMapping(nodeId, isTrigger, operation);
    }
    if (isApiConnectionType(operation.type)) {
      const connectionReferenceKey = getLegacyConnectionReferenceKey(operation);
      if (connectionReferenceKey !== undefined) {
        const mapping = Promise.resolve({ [nodeId]: connectionReferenceKey });
        return mapping;
      }
    }
    return Promise.resolve(undefined);
  } catch (error) {
    const errorMessage = `Failed to get connection mapping for node: ${error}`;
    LoggerService().log({
      level: LogEntryLevel.Error,
      area: 'getConnectionMappingForNode',
      message: errorMessage,
      error: error instanceof Error ? error : undefined,
    });
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

export async function getConnectionsApiAndMapping(deserializedWorkflow: DeserializedWorkflow, dispatch: Dispatch) {
  const connectionsMappings = await getConnectionsMappingForNodes(deserializedWorkflow);
  dispatch(initializeConnectionsMappings(connectionsMappings));
  return;
}

export async function getManifestBasedConnectionMapping(
  nodeId: string,
  isTrigger: boolean,
  operationDefinition: LogicAppsV2.OperationDefinition
): Promise<Record<string, string> | undefined> {
  try {
    const { connectorId, operationId } = await getOperationInfo(nodeId, operationDefinition, isTrigger);
    const operationManifest = await getOperationManifest({
      connectorId,
      operationId,
    });
    const connectionReferenceKeyFormat =
      (operationManifest.properties.connectionReference && operationManifest.properties.connectionReference.referenceKeyFormat) ?? '';
    if (connectionReferenceKeyFormat === '') {
      return Promise.resolve(undefined);
    }

    let connectionReferenceKey: string | undefined = undefined;
    if (isOpenApiConnectionType(operationDefinition.type) || connectionReferenceKeyFormat !== undefined) {
      connectionReferenceKey = getConnectionReferenceKeyForManifest(connectionReferenceKeyFormat, operationDefinition);
    } else if (isConnectionRequiredForOperation(operationManifest)) {
      connectionReferenceKey = getLegacyConnectionReferenceKey(operationDefinition);
    }

    return connectionReferenceKey ? { [nodeId]: connectionReferenceKey } : undefined;
  } catch (error) {
    const errorMessage = `Failed to get manifest based connection mapping: ${error}`;
    LoggerService().log({
      level: LogEntryLevel.Error,
      area: 'getManifestBasedConnectionMapping',
      message: errorMessage,
      error: error instanceof Error ? error : undefined,
    });
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
  if (!connector) {
    return false;
  }
  return (
    needsAuth(connector) || hasPrerequisiteConnection(connector) || needsSimpleConnection(connector) || needsConfigConnection(connector)
  );
}

export function needsOAuth(connectionParameters: Record<string, ConnectionParameter>): boolean {
  return (
    Object.keys(connectionParameters || {})
      .filter((connectionParameterKey) => !isHiddenConnectionParameter(connectionParameters, connectionParameterKey))
      .map((connectionParameterKey) => connectionParameters[connectionParameterKey])
      .filter((connectionParameter) => equals(connectionParameter.type, ConnectionParameterTypes.oauthSetting)).length > 0
  );
}

export function hasOnlyOAuthParameters(connector: Connector): boolean {
  if (
    connector.properties?.connectionParameters &&
    connector.properties?.connectionParameterSets === undefined &&
    !connector.properties?.connectionAlternativeParameters
  ) {
    const connectionParameters = connector.properties.connectionParameters;
    const filteredConnectionParametersKeys = Object.keys(connectionParameters).filter(
      (connectionParameterKey) => !isHiddenConnectionParameter(connectionParameters, connectionParameterKey)
    );
    if (filteredConnectionParametersKeys.length === 0) {
      return false;
    }

    // Check if all the parameters are OAuth only.
    return filteredConnectionParametersKeys.every((connectionParameterKey) => {
      const connectionParameter = connectionParameters[connectionParameterKey];
      return equals(connectionParameter.type, ConnectionParameterTypes.oauthSetting);
    });
  }

  return false;
}

function connectorHasMultiAuth(connector: Connector): boolean {
  return connector !== undefined && connector.properties?.connectionParameterSets !== undefined;
}

// This only checks if this connector has any OAuth connection, it can be just part of Multi Auth
function needsAuth(connector?: Connector): boolean {
  if (!connector) {
    return false;
  }
  return getConnectionParametersWithType(connector, ConnectionParameterTypes.oauthSetting).length > 0;
}

function hasPrerequisiteConnection(connector: Connector): boolean {
  return getConnectionParametersWithType(connector, ConnectionParameterTypes.connection).length > 0;
}

function needsSimpleConnection(connector: Connector): boolean {
  if (!connector || connectorHasMultiAuth(connector)) {
    return false;
  }

  if (connector.properties) {
    const connectionParameters = connector.properties.connectionParameters;
    if (connectionParameters) {
      return (
        Object.keys(connectionParameters).filter(
          (connectionParameterKey) => !isHiddenConnectionParameter(connectionParameters, connectionParameterKey)
        ).length === 0
      );
    }
    return true;
  }

  return false;
}

function needsConfigConnection(connector: Connector): boolean {
  const connectionParameters = connector?.properties?.connectionParameters;
  if (connectionParameters) {
    return Object.keys(connectionParameters)
      .filter((connectionParameterKey) => !isHiddenConnectionParameter(connectionParameters, connectionParameterKey))
      .some((connectionParameterKey) => {
        const connectionParameter = connectionParameters[connectionParameterKey];
        return isConfigConnectionParameter(connectionParameter);
      });
  }

  return false;
}

const SupportedConfigConnectionParameterTypes = [
  ConnectionParameterTypes.array,
  ConnectionParameterTypes.bool,
  ConnectionParameterTypes.gatewaySetting,
  ConnectionParameterTypes.int,
  ConnectionParameterTypes.object,
  ConnectionParameterTypes.secureObject,
  ConnectionParameterTypes.secureString,
  ConnectionParameterTypes.string,
];

function isConfigConnectionParameter(connectionParameter: ConnectionParameter): boolean {
  if (connectionParameter && connectionParameter.type) {
    return SupportedConfigConnectionParameterTypes.some((connectionParameterType) => {
      return equals(connectionParameter.type, connectionParameterType);
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

    case ConnectionReferenceKeyFormat.AgentConnection:
      return (operationDefinition as any).inputs.modelConfigurations.model1.referenceName;

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
  } else if (connObj?.referenceName) {
    // Standard
    referenceKey = connObj.referenceName;
  } else if (connObj?.name) {
    // Consumption
    // Example format: "@parameters('$connections')['servicebus']['connectionId']"
    referenceKey = connObj.name.split('[')[1].split(']')[0].replace(/'/g, '');
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
