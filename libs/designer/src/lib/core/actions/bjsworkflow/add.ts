import Constants from '../../../common/constants';
import type { WorkflowNode } from '../../parsers/models/workflowNode';
import { getConnectionsForConnector } from '../../queries/connections';
import { getOperationManifest } from '../../queries/operation';
import { changeConnectionMapping } from '../../state/connection/connectionSlice';
import type { AddNodeOperationPayload, NodeOperation } from '../../state/operation/operationMetadataSlice';
import { initializeNodes, initializeOperationInfo } from '../../state/operation/operationMetadataSlice';
import type { RelationshipIds } from '../../state/panel/panelInterfaces';
import { switchToOperationPanel, isolateTab } from '../../state/panel/panelSlice';
import type { NodeTokens, VariableDeclaration } from '../../state/tokensSlice';
import { initializeTokensAndVariables } from '../../state/tokensSlice';
import type { WorkflowState } from '../../state/workflow/workflowInterfaces';
import { addNode, setFocusNode } from '../../state/workflow/workflowSlice';
import type { RootState } from '../../store';
import { isRootNodeInGraph } from '../../utils/graph';
import { getTokenNodeIds, getBuiltInTokens, convertOutputsToTokens } from '../../utils/tokens';
import { setVariableMetadata, getVariableDeclarations } from '../../utils/variables';
import { isConnectionRequiredForOperation } from './connections';
import { getInputParametersFromManifest, getOutputParametersFromManifest } from './initialize';
import type { NodeDataWithOperationMetadata } from './operationdeserializer';
import { getOperationSettings } from './settings';
import { OperationManifestService } from '@microsoft-logic-apps/designer-client-services';
import type { DiscoveryOperation, DiscoveryResultTypes, OperationInfo } from '@microsoft-logic-apps/utils';
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

  const connectorId = operation.properties.api.id; // 'api' could be different based on type, could be 'function' or 'config' see old designer 'connectionOperation.ts' this is still pending for danielle
  const operationId = operation.id;
  const operationType = operation.properties.operationType ?? '';
  const operationKind = operation.properties.operationKind ?? '';
  dispatch(addNode(newPayload as any));
  const operationPayload: AddNodeOperationPayload = {
    id: nodeId,
    type: operationType,
    connectorId,
    operationId,
  };

  dispatch(initializeOperationInfo(operationPayload));
  const newWorkflowState = (getState() as RootState).workflow;
  initializeOperationDetails(nodeId, { connectorId, operationId }, operationType, operationKind, newWorkflowState, dispatch);

  // Update settings for children and parents

  getOperationManifest({ connectorId: operation.properties.api.id, operationId: operation.id });
  dispatch(setFocusNode(nodeId));
  return;
});

export const initializeOperationDetails = async (
  nodeId: string,
  operationInfo: OperationInfo,
  operationType: string,
  operationKind: string | undefined,
  workflowState: WorkflowState,
  dispatch: Dispatch
): Promise<void> => {
  const nodeOperationInfo = { ...operationInfo, type: operationType, kind: operationKind };
  const operationManifestService = OperationManifestService();
  if (operationManifestService.isSupported(operationType)) {
    const manifest = await getOperationManifest(operationInfo);
    const { iconUri, brandColor } = manifest.properties;

    if (isConnectionRequiredForOperation(manifest)) {
      setDefaultConnectionForNode(nodeId, operationInfo.connectorId, dispatch);
    } else {
      dispatch(switchToOperationPanel(nodeId));
    }

    // TODO(Danielle) - Please set the isTrigger correctly once we know the added operation is trigger or action.
    const settings = getOperationSettings(
      false /* isTrigger */,
      nodeOperationInfo,
      manifest,
      /* swagger */ undefined,
      workflowState.operations[nodeId]
    );
    const { inputs: nodeInputs, dependencies: inputDependencies } = getInputParametersFromManifest(nodeId, manifest);
    const { outputs: nodeOutputs, dependencies: outputDependencies } = getOutputParametersFromManifest(
      manifest,
      false /* isTrigger */,
      nodeInputs,
      settings.splitOn?.value?.value
    );
    const nodeDependencies = { inputs: inputDependencies, outputs: outputDependencies };

    dispatch(initializeNodes([{ id: nodeId, nodeInputs, nodeOutputs, nodeDependencies, settings }]));

    // TODO(Danielle) - Please comment out the below part when state has updated graph and nodesMetadata.
    // We need the graph and nodesMetadata updated with the newly added node for token dependencies to be calculated.
    addTokensAndVariables(
      nodeId,
      operationType,
      { id: nodeId, nodeInputs, nodeOutputs, settings, iconUri, brandColor, manifest, nodeDependencies },
      workflowState,
      dispatch
    );
  } else {
    // TODO - swagger case here
    setDefaultConnectionForNode(nodeId, operationInfo.connectorId, dispatch);
  }
};

// TODO: Riley - this is very similar to the init function, but we might want to alter it to not overwrite some data
export const reinitializeOperationDetails = async (
  nodeId: string,
  operationInfo: NodeOperation,
  workflowState: WorkflowState,
  dispatch: Dispatch
): Promise<void> => {
  const operationManifestService = OperationManifestService();
  if (operationManifestService.isSupported(operationInfo.type)) {
    const manifest = await getOperationManifest(operationInfo);
    const { iconUri, brandColor } = manifest.properties;

    // TODO(Danielle) - Please set the isTrigger correctly once we know the added operation is trigger or action.
    const settings = getOperationSettings(
      false /* isTrigger */,
      operationInfo,
      manifest,
      undefined /* swagger */,
      workflowState.operations[nodeId]
    );
    const { inputs: nodeInputs, dependencies: inputDependencies } = getInputParametersFromManifest(nodeId, manifest);
    const { outputs: nodeOutputs, dependencies: outputDependencies } = getOutputParametersFromManifest(
      manifest,
      false /* isTrigger */,
      nodeInputs,
      settings.splitOn?.value?.value
    );
    const nodeDependencies = { inputs: inputDependencies, outputs: outputDependencies };

    dispatch(initializeNodes([{ id: nodeId, nodeInputs, nodeOutputs, nodeDependencies, settings }]));

    addTokensAndVariables(
      nodeId,
      operationInfo.type,
      { id: nodeId, nodeInputs, nodeOutputs, settings, iconUri, brandColor, manifest, nodeDependencies },
      workflowState,
      dispatch
    );
  } else {
    // TODO - swagger case here
  }
};

export const setDefaultConnectionForNode = async (nodeId: string, connectorId: string, dispatch: Dispatch) => {
  const connections = await getConnectionsForConnector(connectorId);
  if (connections.length !== 0) {
    dispatch(changeConnectionMapping({ nodeId, connectionId: connections[0].id }));
  } else {
    dispatch(isolateTab(Constants.PANEL_TAB_NAMES.CONNECTION_CREATE));
  }
  dispatch(switchToOperationPanel(nodeId));
};

// TODO - Figure out whether this is manifest or swagger
export const addTokensAndVariables = (
  nodeId: string,
  operationType: string,
  nodeData: NodeDataWithOperationMetadata,
  workflowState: WorkflowState,
  dispatch: Dispatch
): void => {
  const { graph, nodesMetadata, operations } = workflowState;
  const { nodeInputs, nodeOutputs, settings, manifest } = nodeData;
  const nodeMap = Object.keys(operations).reduce((actionNodes: Record<string, string>, id: string) => ({ ...actionNodes, [id]: id }), {
    [nodeId]: nodeId,
  });
  const upstreamNodeIds = getTokenNodeIds(nodeId, graph as WorkflowNode, nodesMetadata, { [nodeId]: nodeData }, nodeMap);
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
      { iconUri: manifest?.properties.iconUri as string, brandColor: manifest?.properties.brandColor as string },
      settings
    )
  );

  if (equals(operationType, Constants.NODE.TYPE.INITIALIZE_VARIABLE)) {
    setVariableMetadata(manifest?.properties.iconUri as string, manifest?.properties.brandColor as string);

    const variables = getVariableDeclarations(nodeInputs);
    if (variables.length) {
      tokensAndVariables.variables[nodeId] = variables;
    }
  }

  dispatch(initializeTokensAndVariables(tokensAndVariables));
};
