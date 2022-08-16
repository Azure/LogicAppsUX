import Constants from '../../../common/constants';
import type { AddNodePayload } from '../../parsers/addNodeToWorkflow';
import type { WorkflowNode } from '../../parsers/models/workflowNode';
import { getConnectionsForConnector } from '../../queries/connections';
import { getOperationManifest } from '../../queries/operation';
import { changeConnectionMapping } from '../../state/connection/connectionSlice';
import type { AddNodeOperationPayload } from '../../state/operation/operationMetadataSlice';
import { initializeNodes, initializeOperationInfo } from '../../state/operation/operationMetadataSlice';
import type { IdsForDiscovery } from '../../state/panel/panelInterfaces';
import { switchToOperationPanel } from '../../state/panel/panelSlice';
import type { NodeTokens, VariableDeclaration } from '../../state/tokensSlice';
import { initializeTokensAndVariables } from '../../state/tokensSlice';
import { addNode } from '../../state/workflow/workflowSlice';
import type { RootState } from '../../store';
import { getTokenNodeIds, getBuiltInTokens, convertOutputsToTokens } from '../../utils/tokens';
import { setVariableMetadata, getVariableDeclarations } from '../../utils/variables';
import { getInputParametersFromManifest, getOutputParametersFromManifest, getParameterDependencies } from './initialize';
import type { NodeDataWithManifest } from './operationdeserializer';
import { getOperationSettings } from './settings';
import { OperationManifestService } from '@microsoft-logic-apps/designer-client-services';
import type { DiscoveryOperation, DiscoveryResultTypes, OperationInfo } from '@microsoft-logic-apps/utils';
import { equals } from '@microsoft-logic-apps/utils';
import type { Dispatch } from '@reduxjs/toolkit';

export const addOperation = (
  operation: DiscoveryOperation<DiscoveryResultTypes> | undefined,
  discoveryIds: IdsForDiscovery,
  nodeId: string,
  dispatch: Dispatch,
  rootState: RootState
) => {
  if (!operation) return; // Just an optional catch, should never happen

  const addPayload: AddNodePayload = {
    operation,
    id: nodeId,
    discoveryIds,
  };
  const connectorId = operation.properties.api.id; // 'api' could be different based on type, could be 'function' or 'config' see old designer 'connectionOperation.ts' this is still pending for danielle
  const operationId = operation.id;
  const operationType = operation.properties.operationType ?? '';
  const operationKind = operation.properties.operationKind ?? '';
  dispatch(addNode(addPayload));
  const operationPayload: AddNodeOperationPayload = {
    id: nodeId,
    type: operationType,
    connectorId,
    operationId,
  };
  dispatch(initializeOperationInfo(operationPayload));

  initializeOperationDetails(nodeId, { connectorId, operationId }, operationType, operationKind, rootState, dispatch);

  getOperationManifest({ connectorId: operation.properties.api.id, operationId: operation.id });
  dispatch(switchToOperationPanel(nodeId));
  return;
};

export const initializeOperationDetails = async (
  nodeId: string,
  operationInfo: OperationInfo,
  operationType: string,
  operationKind: string,
  rootState: RootState,
  dispatch: Dispatch
): Promise<void> => {
  const operationManifestService = OperationManifestService();
  if (operationManifestService.isSupported(operationType)) {
    const manifest = await getOperationManifest(operationInfo);

    // TODO(Danielle) - Please set the isTrigger correctly once we know the added operation is trigger or action.
    const settings = getOperationSettings(false /* isTrigger */, operationType, operationKind, manifest);
    const nodeInputs = getInputParametersFromManifest(nodeId, manifest);
    const nodeOutputs = getOutputParametersFromManifest(manifest, false /* isTrigger */, nodeInputs, settings.splitOn?.value?.value);
    const nodeDependencies = getParameterDependencies(manifest, nodeInputs, nodeOutputs);

    dispatch(initializeNodes([{ id: nodeId, nodeInputs, nodeOutputs, nodeDependencies, settings }]));

    // TODO(Danielle) - Please comment out the below part when state has updated graph and nodesMetadata.
    // We need the graph and nodesMetadata updated with the newly added node for token dependencies to be calculated.
    // addTokensAndVariables(nodeId, operationType, { id: nodeId, nodeInputs, nodeOutputs, settings, manifest }, rootState, dispatch);
  } else {
    // TODO - swagger case here
  }
};

export const setDefaultConnectionForNode = async (nodeId: string, connectorId: string, dispatch: Dispatch) => {
  const connections = await getConnectionsForConnector(connectorId);
  if (connections.length !== 0) {
    dispatch(changeConnectionMapping({ nodeId, connectionId: connections[0].id }));
  }
};

export const addTokensAndVariables = (
  nodeId: string,
  operationType: string,
  nodeData: NodeDataWithManifest,
  rootState: RootState,
  dispatch: Dispatch
): void => {
  const {
    workflow: { graph, nodesMetadata, operations },
  } = rootState;
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
    ...convertOutputsToTokens(nodeId, operationType, nodeOutputs.outputs ?? {}, manifest, settings)
  );

  if (equals(operationType, Constants.NODE.TYPE.INITIALIZE_VARIABLE)) {
    setVariableMetadata(manifest.properties.iconUri, manifest.properties.brandColor);

    const variables = getVariableDeclarations(nodeInputs);
    if (variables.length) {
      tokensAndVariables.variables[nodeId] = variables;
    }
  }

  dispatch(initializeTokensAndVariables(tokensAndVariables));
};
