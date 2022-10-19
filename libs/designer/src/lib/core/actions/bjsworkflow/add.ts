import Constants from '../../../common/constants';
import type { WorkflowNode } from '../../parsers/models/workflowNode';
import { getConnectionsForConnector, getConnectorWithSwagger } from '../../queries/connections';
import { getOperationManifest } from '../../queries/operation';
import { changeConnectionMapping } from '../../state/connection/connectionSlice';
import type { NodeOperation } from '../../state/operation/operationMetadataSlice';
import { initializeNodes, initializeOperationInfo } from '../../state/operation/operationMetadataSlice';
import type { RelationshipIds } from '../../state/panel/panelInterfaces';
import { isolateTab, switchToOperationPanel } from '../../state/panel/panelSlice';
import type { NodeTokens, VariableDeclaration } from '../../state/tokensSlice';
import { initializeTokensAndVariables } from '../../state/tokensSlice';
import { addNode, setFocusNode } from '../../state/workflow/workflowSlice';
import type { RootState } from '../../store';
import { getBrandColorFromConnector, getIconUriFromConnector } from '../../utils/card';
import { isRootNodeInGraph } from '../../utils/graph';
import { getInputParametersFromSwagger, getOutputParametersFromSwagger } from '../../utils/swagger/operation';
import { getTokenNodeIds, getBuiltInTokens, convertOutputsToTokens } from '../../utils/tokens';
import { setVariableMetadata, getVariableDeclarations } from '../../utils/variables';
import { isConnectionRequiredForOperation } from './connections';
import { getInputParametersFromManifest, getOutputParametersFromManifest } from './initialize';
import type { NodeDataWithOperationMetadata } from './operationdeserializer';
import { getOperationSettings } from './settings';
import { ConnectionService, OperationManifestService } from '@microsoft-logic-apps/designer-client-services';
import type {
  DiscoveryOperation,
  DiscoveryResultTypes,
  OperationManifest,
  SomeKindOfAzureOperationDiscovery,
} from '@microsoft-logic-apps/utils';
import { equals } from '@microsoft-logic-apps/utils';
import type { Dispatch } from '@reduxjs/toolkit';
import { createAsyncThunk } from '@reduxjs/toolkit';

type AddOperationPayload = {
  operation: DiscoveryOperation<DiscoveryResultTypes> | undefined;
  relationshipIds: RelationshipIds;
  nodeId: string;
  isParallelBranch?: boolean;
};

export const addOperation = createAsyncThunk('addOperation', async (payload: AddOperationPayload, { dispatch, getState }) => {
  const { operation, nodeId: actionId } = payload;
  if (!operation) throw new Error('Operation does not exist'); // Just an optional catch, should never happen
  let count = 1;
  let nodeId = actionId;
  while ((getState() as RootState).workflow.operations[nodeId]) {
    nodeId = `${actionId}_${count}`;
    count++;
  }

  const newPayload = { ...payload, nodeId };

  dispatch(addNode(newPayload as any));

  const nodeOperationInfo = {
    connectorId: operation.properties.api.id, // 'api' could be different based on type, could be 'function' or 'config' see old designer 'connectionOperation.ts' this is still pending for danielle
    operationId: operation.name,
    type: getOperationType(operation),
    kind: operation.properties.operationKind,
  };

  dispatch(initializeOperationInfo({ id: nodeId, ...nodeOperationInfo }));
  initializeOperationDetails(nodeId, nodeOperationInfo, getState() as RootState, dispatch);

  // Update settings for children and parents

  dispatch(setFocusNode(nodeId));
  return;
});

const initializeOperationDetails = async (
  nodeId: string,
  operationInfo: NodeOperation,
  state: RootState,
  dispatch: Dispatch
): Promise<void> => {
  const isTrigger = isRootNodeInGraph(nodeId, 'root', state.workflow.nodesMetadata);
  const { type, connectorId } = operationInfo;
  const operationManifestService = OperationManifestService();

  dispatch(switchToOperationPanel(nodeId));

  if (operationManifestService.isSupported(type)) {
    const manifest = await getOperationManifest(operationInfo);
    if (isConnectionRequiredForOperation(manifest)) await trySetDefaultConnectionForNode(nodeId, connectorId, dispatch);

    const { iconUri, brandColor } = manifest.properties;
    const settings = getOperationSettings(isTrigger, operationInfo, manifest, /* swagger */ undefined);
    const { inputs: nodeInputs, dependencies: inputDependencies } = getInputParametersFromManifest(nodeId, manifest);
    const { outputs: nodeOutputs, dependencies: outputDependencies } = getOutputParametersFromManifest(
      manifest,
      isTrigger,
      nodeInputs,
      settings.splitOn?.value?.enabled ? settings.splitOn.value.value : undefined
    );
    const nodeDependencies = { inputs: inputDependencies, outputs: outputDependencies };
    const initData = { id: nodeId, nodeInputs, nodeOutputs, nodeDependencies, settings };
    dispatch(initializeNodes([initData]));
    addTokensAndVariables(nodeId, type, { ...initData, iconUri, brandColor, manifest }, state, dispatch);
  } else {
    const [, { connector, parsedSwagger }] = await Promise.all([
      trySetDefaultConnectionForNode(nodeId, connectorId, dispatch),
      getConnectorWithSwagger(connectorId),
    ]);
    const iconUri = getIconUriFromConnector(connector);
    const brandColor = getBrandColorFromConnector(connector);

    const settings = getOperationSettings(isTrigger, operationInfo, /* manifest */ undefined, parsedSwagger);
    const { inputs: nodeInputs, dependencies: inputDependencies } = getInputParametersFromSwagger(
      nodeId,
      isTrigger,
      parsedSwagger,
      operationInfo
    );
    const { outputs: nodeOutputs, dependencies: outputDependencies } = getOutputParametersFromSwagger(
      parsedSwagger,
      operationInfo,
      nodeInputs,
      settings.splitOn?.value?.enabled ? settings.splitOn.value.value : undefined
    );
    const nodeDependencies = { inputs: inputDependencies, outputs: outputDependencies };

    dispatch(initializeNodes([{ id: nodeId, nodeInputs, nodeOutputs, nodeDependencies, settings }]));
    addTokensAndVariables(
      nodeId,
      type,
      { id: nodeId, nodeInputs, nodeOutputs, settings, iconUri, brandColor, nodeDependencies },
      state,
      dispatch
    );
  }
};

export const initializeSwitchCaseFromManifest = async (id: string, manifest: OperationManifest, dispatch: Dispatch): Promise<void> => {
  const { inputs: nodeInputs, dependencies: inputDependencies } = getInputParametersFromManifest(id, manifest);
  const { outputs: nodeOutputs, dependencies: outputDependencies } = getOutputParametersFromManifest(
    manifest,
    false,
    nodeInputs,
    undefined
  );
  const nodeDependencies = { inputs: inputDependencies, outputs: outputDependencies };
  const initData = { id, nodeInputs, nodeOutputs, nodeDependencies };
  dispatch(initializeNodes([initData]));
};

export const reinitializeOperationDetails = async (
  nodeId: string,
  operationInfo: NodeOperation,
  state: RootState,
  dispatch: Dispatch
): Promise<void> => {
  const { type, connectorId } = operationInfo;
  const nodeInputs = state.operations.inputParameters[nodeId];
  const nodeOutputs = state.operations.outputParameters[nodeId];
  const settings = state.operations.settings[nodeId];
  const nodeDependencies = state.operations.dependencies[nodeId];
  if (OperationManifestService().isSupported(type)) {
    const manifest = await getOperationManifest(operationInfo);
    const { iconUri, brandColor } = manifest.properties;

    addTokensAndVariables(
      nodeId,
      type,
      { id: nodeId, nodeInputs, nodeOutputs, settings, iconUri, brandColor, manifest, nodeDependencies },
      state,
      dispatch
    );
  } else {
    const { connector } = await getConnectorWithSwagger(connectorId);
    const iconUri = getIconUriFromConnector(connector);
    const brandColor = getBrandColorFromConnector(connector);

    addTokensAndVariables(
      nodeId,
      type,
      { id: nodeId, nodeInputs, nodeOutputs, settings, iconUri, brandColor, nodeDependencies },
      state,
      dispatch
    );
  }
};

export const trySetDefaultConnectionForNode = async (nodeId: string, connectorId: string, dispatch: Dispatch) => {
  const connections = await getConnectionsForConnector(connectorId);
  if (connections.length > 0) {
    dispatch(changeConnectionMapping({ nodeId, connectionId: connections[0].id, connectorId }));
    await ConnectionService().createConnectionAclIfNeeded(connections[0]);
  } else {
    dispatch(isolateTab(Constants.PANEL_TAB_NAMES.CONNECTION_CREATE));
  }

  dispatch(switchToOperationPanel(nodeId));
};

export const addTokensAndVariables = (
  nodeId: string,
  operationType: string,
  nodeData: NodeDataWithOperationMetadata,
  state: RootState,
  dispatch: Dispatch
): void => {
  const { graph, nodesMetadata, operations } = state.workflow;
  const { nodeInputs, nodeOutputs, settings, iconUri, brandColor, manifest } = nodeData;
  const nodeMap = Object.keys(operations).reduce((actionNodes: Record<string, string>, id: string) => ({ ...actionNodes, [id]: id }), {
    [nodeId]: nodeId,
  });
  const upstreamNodeIds = getTokenNodeIds(
    nodeId,
    graph as WorkflowNode,
    nodesMetadata,
    { [nodeId]: nodeData },
    state.operations.operationInfo,
    nodeMap
  );
  const tokensAndVariables = {
    outputTokens: {
      [nodeId]: { tokens: [], upstreamNodeIds } as NodeTokens,
    },
    variables: {} as Record<string, VariableDeclaration[]>,
  };

  tokensAndVariables.outputTokens[nodeId].tokens.push(...getBuiltInTokens(manifest));
  tokensAndVariables.outputTokens[nodeId].tokens.push(
    ...convertOutputsToTokens(
      isRootNodeInGraph(nodeId, 'root', nodesMetadata) ? undefined : nodeId,
      operationType,
      nodeOutputs.outputs ?? {},
      { iconUri, brandColor },
      settings
    )
  );

  if (equals(operationType, Constants.NODE.TYPE.INITIALIZE_VARIABLE)) {
    setVariableMetadata(iconUri, brandColor);

    const variables = getVariableDeclarations(nodeInputs);
    if (variables.length) {
      tokensAndVariables.variables[nodeId] = variables;
    }
  }

  dispatch(initializeTokensAndVariables(tokensAndVariables));
};

const getOperationType = (operation: DiscoveryOperation<DiscoveryResultTypes>): string => {
  const operationType = operation.properties.operationType;
  return !operationType
    ? (operation.properties as SomeKindOfAzureOperationDiscovery).isWebhook
      ? Constants.NODE.TYPE.API_CONNECTION_WEBHOOK
      : (operation.properties as SomeKindOfAzureOperationDiscovery).isNotification
      ? Constants.NODE.TYPE.API_CONNECTION_NOTIFICATION
      : Constants.NODE.TYPE.API_CONNECTION
    : operationType;
};
