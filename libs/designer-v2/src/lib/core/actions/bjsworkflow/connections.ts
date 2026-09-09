import Constants, { MCP_AUTH_PROPERTY_KEYS, usesMcpManagedIdentityFallback } from '../../../common/constants';
import { isExpressionConnectionMapping, type ApiHubAuthentication, type ConnectionMapping } from '../../../common/models/workflow';
import { getServiceProviderConnectionMapping, isConnectionExpressionValid } from '../../utils/connectors/connectionExpression';
import { canInvokeDynamicConnection } from '../../utils/parameters/dynamicdata';
import { AgentUtils, isOpenApiSchemaVersion } from '../../../common/utilities/Utils';
import type { DeserializedWorkflow } from '../../parsers/BJSWorkflow/BJSDeserializer';
import { getConnection, getUniqueConnectionName, updateNewConnectionInQueryCache } from '../../queries/connections';
import { isBuiltInMcpOperation, isManagedMcpOperation } from '../../state/workflow/helper';
import { getConnector, getOperationInfo, getOperationManifest } from '../../queries/operation';
import {
  changeConnectionMapping,
  changeConnectionMappingsForNodes,
  initializeConnectionsMappings,
  setNodeConnectionMapping,
} from '../../state/connection/connectionSlice';
import { changeConnectionMapping as changeTemplateConnectionMapping } from '../../state/templates/workflowSlice';
import type { NodeOperation } from '../../state/operation/operationMetadataSlice';
import {
  updateErrorDetails,
  updateNodeParameters,
  updateNodeParameterGroups,
  DynamicLoadStatus,
} from '../../state/operation/operationMetadataSlice';
import type { RootState as TemplateRootState } from '../../state/templates/store';
import type { RootState } from '../../store';
import {
  getConnectionReference,
  getManagedIdentityFromConnection,
  isConnectionMultiAuthManagedIdentityType,
  isConnectionSingleAuthManagedIdentityType,
} from '../../utils/connectors/connections';
import { isTriggerNode } from '../../utils/graph';
import { updateDynamicDataInNode, ParameterGroupKeys } from '../../utils/parameters/helper';
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
  foundryServiceConnectionRegex,
  microsoftFoundryModelsRegex,
  isServiceProviderOperation,
} from '@microsoft/logic-apps-shared';
import type { Dispatch } from '@reduxjs/toolkit';
import { createAsyncThunk } from '@reduxjs/toolkit';
import { openPanel, setIsCreatingConnection, setIsPanelLoading } from '../../state/panel/panelSlice';
import type { PanelMode } from '../../state/panel/panelTypes';
import { setIsWorkflowDirty } from '../../state/workflow/workflowSlice';
import { createLiteralValueSegment } from '../../utils/parameters/segment';
import { getCustomSwaggerIfNeeded, getInputParametersFromManifest } from './initialize';
import { serializeOperation } from './serializer';
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

/**
 * Resolves the agent model type for a connection.
 * Precedence:
 * 1. The connection's declared model type when it maps to a known manifest value
 * 2. The connection's cognitiveServiceAccountId resource pattern ('/projects/' -> FoundryAgentServiceV2,
 *    trailing '/models' -> MicrosoftFoundry, any other account-level id -> AzureOpenAI)
 * 3. When the connection carries no resource id to detect from (e.g. key-based connections),
 *    the node's existing valid value is preserved
 */
export const resolveAgentModelType = (rawModelType: string, cognitiveServiceId: string, existingValue?: string): string => {
  const validManifestValues = Object.values(AgentUtils.DisplayNameToManifest);

  // Connections store either a display name (e.g. 'Azure OpenAI') or a manifest value (e.g. 'APIMGenAIGateway')
  const declaredValue = AgentUtils.DisplayNameToManifest[rawModelType] ?? (validManifestValues.includes(rawModelType) ? rawModelType : '');
  if (declaredValue) {
    return declaredValue;
  }

  if (foundryServiceConnectionRegex.test(cognitiveServiceId)) {
    return 'FoundryAgentServiceV2';
  }
  if (microsoftFoundryModelsRegex.test(cognitiveServiceId)) {
    return 'MicrosoftFoundry';
  }
  if (cognitiveServiceId) {
    // An account-level resource id without a Foundry marker identifies an Azure OpenAI connection
    return 'AzureOpenAI';
  }

  if (existingValue && validManifestValues.includes(existingValue) && existingValue !== 'AzureOpenAI') {
    return existingValue;
  }
  return 'AzureOpenAI';
};

const updateAgentParametersForConnection = (
  nodeId: string,
  dispatch: Dispatch,
  getState: () => RootState,
  connection: Connection
): void => {
  const state = getState();

  const rawModelType = connection.properties.connectionParameters?.agentModelType?.type?.trim() ?? '';
  const cognitiveServiceId = connection.properties.connectionParameters?.cognitiveServiceAccountId?.metadata?.value ?? '';
  const currentParamGroups = state.operations.inputParameters[nodeId]?.parameterGroups;
  const currentModelTypeParam = currentParamGroups?.[ParameterGroupKeys.DEFAULT]?.parameters?.find(
    (p) => p.parameterKey === 'inputs.$.agentModelType'
  );
  const agentModelTypeValue = resolveAgentModelType(rawModelType, cognitiveServiceId, currentModelTypeParam?.value?.[0]?.value);

  // Get current parameter groups
  const parameterGroups = state.operations.inputParameters[nodeId]?.parameterGroups;
  if (!parameterGroups) {
    return;
  }

  const defaultGroup = parameterGroups[ParameterGroupKeys.DEFAULT];
  if (!defaultGroup) {
    return;
  }

  const agentModelTypeParam = defaultGroup.parameters?.find((p) => p.parameterKey === 'inputs.$.agentModelType');
  const deploymentIdParam = defaultGroup.parameters?.find((p) => p.parameterKey === 'inputs.$.deploymentId');
  const modelIdParam = defaultGroup.parameters?.find((p) => p.parameterKey === 'inputs.$.modelId');

  // Both deploymentId and modelId should exist (they're just conditionally hidden)
  if (!agentModelTypeParam || !deploymentIdParam || !modelIdParam) {
    return;
  }

  const parametersToUpdate = [];

  // Update agentModelType parameter
  parametersToUpdate.push({
    groupId: ParameterGroupKeys.DEFAULT,
    parameterId: agentModelTypeParam.id,
    propertiesToUpdate: {
      value: [createLiteralValueSegment(agentModelTypeValue)],
      preservedValue: undefined,
    },
  });

  // Always clear deploymentId and modelId when switching connections
  parametersToUpdate.push({
    groupId: ParameterGroupKeys.DEFAULT,
    parameterId: deploymentIdParam.id,
    propertiesToUpdate: {
      value: [createLiteralValueSegment('')],
      preservedValue: undefined,
    },
  });
  parametersToUpdate.push({
    groupId: ParameterGroupKeys.DEFAULT,
    parameterId: modelIdParam.id,
    propertiesToUpdate: {
      value: [createLiteralValueSegment('')],
      preservedValue: undefined,
    },
  });

  // Clear deploymentModelProperties (name, format, version) when switching connections
  const deploymentModelPropertiesKeys = [
    'inputs.$.agentModelSettings.deploymentModelProperties.name',
    'inputs.$.agentModelSettings.deploymentModelProperties.format',
    'inputs.$.agentModelSettings.deploymentModelProperties.version',
  ];
  for (const key of deploymentModelPropertiesKeys) {
    const param = defaultGroup.parameters?.find((p) => p.parameterKey === key);
    if (param) {
      parametersToUpdate.push({
        groupId: ParameterGroupKeys.DEFAULT,
        parameterId: param.id,
        propertiesToUpdate: {
          value: [createLiteralValueSegment('')],
          preservedValue: undefined,
        },
      });
    }
  }

  dispatch(
    updateNodeParameters({
      nodeId,
      parameters: parametersToUpdate,
    })
  );
};

export const updateNodeConnection = createAsyncThunk(
  'updateNodeConnection',
  async (payload: ConnectionPayload, { dispatch, getState }): Promise<void> => {
    const { nodeId, connector, connection, connectionProperties, authentication } = payload;

    dispatch(updateErrorDetails({ id: nodeId, clear: true }));

    // For agent connections, update agentModelType and clear inappropriate deployment/model parameters
    if (AgentUtils.isConnector(connector.id)) {
      updateAgentParametersForConnection(nodeId, dispatch, getState as () => RootState, connection);
    }

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

export const updateNodeConnectionExpression = createAsyncThunk(
  'updateNodeConnectionExpression',
  async (
    { nodeId, expression, designTimeReferenceKey }: { nodeId: string; expression: string; designTimeReferenceKey?: string },
    { dispatch, getState }
  ): Promise<void> => {
    const state = getState() as RootState;
    if (
      !state.designerOptions.hostOptions.enableServiceProviderConnectionExpressions ||
      state.designerOptions.readOnly ||
      state.designerOptions.isMonitoringView
    ) {
      throw new Error('Connection expression editing is not enabled.');
    }
    const operationInfo = getRecordEntry(state.operations.operationInfo, nodeId);
    if (
      !operationInfo ||
      !isServiceProviderOperation(operationInfo.type) ||
      !state.workflow.workflowKind ||
      isTriggerNode(nodeId, state.workflow.nodesMetadata)
    ) {
      throw new Error('Connection expressions are only supported on Standard service provider actions.');
    }
    if (!isConnectionExpressionValid(expression)) {
      throw new Error('Invalid connection expression.');
    }
    const reference =
      designTimeReferenceKey && Object.hasOwn(state.connections.connectionReferences, designTimeReferenceKey)
        ? state.connections.connectionReferences[designTimeReferenceKey]
        : undefined;
    if (
      designTimeReferenceKey &&
      (!reference || !equals(reference.api.id, operationInfo.connectorId) || !canInvokeDynamicConnection(operationInfo, reference))
    ) {
      throw new Error('Select an existing connection for this service provider.');
    }
    dispatch(
      setNodeConnectionMapping({
        nodeId,
        mapping: { kind: 'expression', expression, ...(designTimeReferenceKey ? { designTimeReferenceKey } : {}) },
      })
    );
    const dependencies = state.operations.dependencies[nodeId]?.inputs ?? {};
    const parameters = Object.entries(state.operations.inputParameters[nodeId]?.parameterGroups ?? {}).flatMap(([groupId, group]) =>
      group.parameters
        .filter((parameter) => parameter.info.isDynamic || parameter.dynamicData || dependencies[parameter.parameterKey])
        .map((parameter) => ({
          groupId,
          parameterId: parameter.id,
          propertiesToUpdate: {
            dynamicData: { status: DynamicLoadStatus.NOTSTARTED },
            ...(dependencies[parameter.parameterKey]?.dependencyType === 'ListValues'
              ? { editorOptions: { ...parameter.editorOptions, options: [] } }
              : {}),
          },
        }))
    );
    if (parameters.length) {
      dispatch(updateNodeParameters({ nodeId, parameters }));
    }
    dispatch(updateErrorDetails({ id: nodeId, clear: true }));
    dispatch(setIsWorkflowDirty(true));
    if (reference) {
      await refreshConnectionMetadata(nodeId, dispatch, getState as () => RootState, true);
    } else {
      const currentInputs = (getState() as RootState).operations.inputParameters[nodeId];
      const currentParameters = Object.values(currentInputs?.parameterGroups ?? {}).flatMap((group) => group.parameters);
      const missingSchemaKeys = Object.entries(dependencies)
        .filter(
          ([key, dependency]) =>
            dependency.dependencyType === 'ApiSchema' &&
            !currentParameters.some((parameter) => parameter.parameterKey === key || parameter.info.dynamicParameterReference === key)
        )
        .map(([key]) => key);
      if (currentInputs && missingSchemaKeys.length) {
        const originalOperation = state.workflow.operations[nodeId];
        const originalInputs = currentInputs.preservedConnectionInputs ?? (originalOperation as LogicAppsV2.ServiceProvider)?.inputs;
        const definition = {
          ...originalOperation,
          type: operationInfo.type,
          inputs: {
            ...originalInputs,
            serviceProviderConfiguration: { ...originalInputs?.serviceProviderConfiguration, connectionName: expression },
          },
        };
        const manifest = await getOperationManifest(operationInfo);
        const customSwagger = await getCustomSwaggerIfNeeded(manifest.properties, definition);
        const { inputs } = getInputParametersFromManifest(nodeId, operationInfo, manifest, undefined, customSwagger, definition);
        const groups = { ...currentInputs.parameterGroups };
        for (const [groupId, group] of Object.entries(inputs.parameterGroups)) {
          const missing = group.parameters.filter((parameter) => missingSchemaKeys.includes(parameter.parameterKey));
          if (missing.length) {
            const current = groups[groupId] ?? { ...group, parameters: [], rawInputs: [] };
            groups[groupId] = {
              ...current,
              parameters: [...current.parameters, ...missing],
              rawInputs: [...current.rawInputs, ...group.rawInputs.filter((input) => missingSchemaKeys.includes(input.key))],
            };
          }
        }
        dispatch(updateNodeParameterGroups({ nodeId, parameterGroups: groups }));
      }
    }
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

export const updateNodeConnectionAndProperties = async (
  payload: UpdateConnectionPayload,
  dispatch: Dispatch,
  getState: () => RootState
): Promise<void> => {
  const { nodeId } = payload;
  const preserveInputs = isExpressionConnectionMapping(getState().connections.connectionsMapping[nodeId]);
  dispatch(changeConnectionMapping(payload));
  dispatch(setIsWorkflowDirty(true));
  await refreshConnectionMetadata(nodeId, dispatch, getState, preserveInputs);
};

const refreshConnectionMetadata = async (
  nodeId: string,
  dispatch: Dispatch,
  getState: () => RootState,
  preserveInputs = false
): Promise<void> => {
  const newState = getState() as RootState;
  const previousGroups = newState.operations.inputParameters[nodeId]?.parameterGroups;
  const operationInfo = getRecordEntry(newState.operations.operationInfo, nodeId);
  const dependencies = getRecordEntry(newState.operations.dependencies, nodeId);
  const newlyAddedOperations = getRecordEntry(newState.workflow.newlyAddedOperations, nodeId);
  const operation = getRecordEntry(newState.workflow.operations, nodeId);

  // Shouldn't happen, but required for type checking
  if (!operationInfo || !dependencies) {
    return;
  }

  const hasManualSchemaInput =
    preserveInputs &&
    Object.values(previousGroups ?? {}).some((group) =>
      group.parameters.some((parameter) => parameter.info.isDynamic && parameter.info.dynamicParameterReference === parameter.parameterKey)
    );
  const inputSnapshot = hasManualSchemaInput ? await serializeOperation(newState, nodeId, { skipValidation: true }) : undefined;
  try {
    await updateDynamicDataInNode(
      nodeId,
      isTriggerNode(nodeId, newState.workflow.nodesMetadata),
      operationInfo,
      getConnectionReference(newState.connections, nodeId),
      dependencies,
      dispatch,
      getState,
      newState.tokens?.variables ?? {},
      newState.workflowParameters?.definitions ?? {},
      !!newState.tokens /* updateTokenMetadata */,
      inputSnapshot ?? (newlyAddedOperations ? undefined : operation),
      true,
      !preserveInputs
    );
  } finally {
    if (preserveInputs && previousGroups) {
      const groups = { ...getState().operations.inputParameters[nodeId]?.parameterGroups };
      for (const [groupId, previousGroup] of Object.entries(previousGroups)) {
        const currentGroup = groups[groupId] ?? previousGroup;
        const previousByKey = new Map(previousGroup.parameters.map((parameter) => [parameter.parameterKey, parameter]));
        const currentKeys = new Set(currentGroup.parameters.map((parameter) => parameter.parameterKey));
        groups[groupId] = {
          ...currentGroup,
          parameters: [
            ...currentGroup.parameters.map((parameter) => {
              const previous = previousByKey.get(parameter.parameterKey);
              return previous
                ? {
                    ...parameter,
                    value: previous.value,
                    preservedValue: previous.preservedValue,
                    editorViewModel: previous.editorViewModel,
                  }
                : parameter;
            }),
            ...previousGroup.parameters.filter(
              (parameter) =>
                !currentKeys.has(parameter.parameterKey) &&
                !(
                  parameter.info.dynamicParameterReference === parameter.parameterKey &&
                  currentGroup.parameters.some((current) => current.info.dynamicParameterReference === parameter.parameterKey)
                )
            ),
          ],
        };
      }
      dispatch(
        updateNodeParameterGroups({
          nodeId,
          parameterGroups: groups,
          ...(inputSnapshot ? { preservedConnectionInputs: { ...(inputSnapshot as LogicAppsV2.ServiceProvider).inputs } } : {}),
        })
      );
    }
    dispatch(setIsWorkflowDirty(true));
  }
};

export const getConnectionPropertiesIfRequired = (connection: Connection, connector: Connector): Record<string, any> | undefined => {
  // Managed MCP connectors that declare no auth of their own rely on the generic MCP auth parameter
  // sets, which are managed identity based, so they always need MSI auth properties when the Logic
  // App has a managed identity. They don't follow the standard multi-auth/single-auth MSI detection
  // patterns. Connectors that declare their own auth (e.g. OAuth-backed `foundrygithubmcp`) must
  // fall through to the standard detection so their credentials aren't replaced by an MSI token.
  if (
    !usesMcpManagedIdentityFallback(connector) &&
    !isConnectionMultiAuthManagedIdentityType(connection, connector) &&
    !isConnectionSingleAuthManagedIdentityType(connection)
  ) {
    return undefined;
  }

  // Prefer the identity stored on the connection so a UAMI selection isn't lost on hybrid 'SystemAssigned, UserAssigned' apps.
  const connectionIdentity = getManagedIdentityFromConnection(connection);
  if (connectionIdentity) {
    return getConnectionProperties(connector, connectionIdentity);
  }

  const identity = WorkflowService().getAppIdentity?.();
  if (!identity) {
    return undefined;
  }

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
    const reference = getConnectionReference(rootState.connections, nodeId);
    if (!reference) {
      return;
    }
    const {
      api: { id: connectorId },
      connection: { id: connectionId },
    } = reference;
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

export async function getConnectionsMappingForNodes(deserializedWorkflow: DeserializedWorkflow): Promise<ConnectionMapping> {
  const { actionData, nodesMetadata } = deserializedWorkflow;
  let connectionsMapping: ConnectionMapping = {};
  const operationManifestService = OperationManifestService();

  const tasks: Promise<ConnectionMapping | undefined>[] = [];

  for (const [nodeId, operation] of Object.entries(actionData)) {
    const isTrigger = getRecordEntry(nodesMetadata, nodeId)?.isTrigger ?? false;
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
): Promise<ConnectionMapping | undefined> => {
  try {
    if (isServiceProviderOperation(operation.type)) {
      const connectionName = (operation as LogicAppsV2.ServiceProvider).inputs?.serviceProviderConfiguration?.connectionName;
      return Promise.resolve(
        typeof connectionName === 'string' ? { [nodeId]: getServiceProviderConnectionMapping(connectionName) } : undefined
      );
    }
    if (operationManifestService.isSupported(operation.type, operation.kind)) {
      return getManifestBasedConnectionMapping(nodeId, isTrigger, operation);
    }
    if (isManagedMcpOperation(operation)) {
      const connectionReferenceKey = (operation as any).inputs.connectionReference.connectionName;
      if (connectionReferenceKey !== undefined) {
        const mapping = Promise.resolve({ [nodeId]: connectionReferenceKey });
        return mapping;
      }
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

  // Reconstruct built-in MCP connections from inline Connection data in the workflow definition.
  // Built-in MCP connections are serialized inline (inputs.Connection.McpServerUrl) rather than
  // in $connections/connectionReferences, so we need to recreate them during deserialization.
  const { actionData } = deserializedWorkflow;
  for (const [nodeId, operation] of Object.entries(actionData)) {
    if (!isBuiltInMcpOperation(operation) || connectionsMappings[nodeId]) {
      continue;
    }
    const connectionInput = (operation as any)?.inputs?.Connection;
    const mcpServerUrl = connectionInput?.McpServerUrl;
    if (!mcpServerUrl) {
      continue;
    }
    try {
      const connectionName = `mcp-${nodeId}`;
      const connectorId = 'connectionProviders/mcpclient';
      const connectionId = `/connectionProviders/mcpclient/connections/${connectionName}`;

      // Skip if this connection was already reconstructed (e.g., repeated deserialization)
      const connectionService = ConnectionService();
      const existingConnection = (connectionService as any)._connections?.[connectionId];
      if (existingConnection) {
        dispatch(changeConnectionMapping({ nodeId, connectorId, connectionId }));
        continue;
      }

      const connection = {
        id: connectionId,
        name: connectionName,
        type: 'connections',
        location: '',
        properties: {
          displayName: connectionName,
          overallStatus: 'Connected',
          statuses: [{ status: 'Connected' }],
          api: {
            id: connectorId,
            name: 'mcpclient',
            displayName: 'MCP Client',
            iconUri: '',
            brandColor: '#000000',
            description: '',
            category: 'MCP',
            type: 'mcpclient',
          },
          createdTime: new Date().toISOString(),
          parameterValues: (() => {
            const auth = connectionInput?.Authentication;
            const values: Record<string, any> = { mcpServerUrl };
            if (typeof auth === 'object' && auth !== null) {
              values.authenticationType = auth.type ?? 'None';
              // Extract all auth-related properties back to flat parameterValues
              for (const prop of MCP_AUTH_PROPERTY_KEYS) {
                if (auth[prop] !== undefined) {
                  values[prop] = auth[prop];
                }
              }
            } else {
              values.authenticationType = auth ?? 'None';
            }
            return values;
          })(),
        },
      } as any;
      // Store in ConnectionService so getConnection() can find it later
      (connectionService as any)._connections[connection.id] = connection;
      // Create the connection mapping and reference in Redux
      dispatch(changeConnectionMapping({ nodeId, connectorId, connectionId: connection.id }));
    } catch {
      // If reconstruction fails, the node will show "Invalid connection" — user can re-configure
    }
  }
}

export async function getManifestBasedConnectionMapping(
  nodeId: string,
  isTrigger: boolean,
  operationDefinition: LogicAppsV2.OperationDefinition
): Promise<ConnectionMapping | undefined> {
  if (isServiceProviderOperation(operationDefinition.type)) {
    const connectionName = (operationDefinition as LogicAppsV2.ServiceProvider).inputs?.serviceProviderConfiguration?.connectionName;
    return typeof connectionName === 'string' ? { [nodeId]: getServiceProviderConnectionMapping(connectionName) } : undefined;
  }
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

    case ConnectionReferenceKeyFormat.McpConnection:
      return (operationDefinition as any).inputs.connectionReference.connectionName;
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
