import Constants from '../../../common/constants';
import type { WorkflowNode } from '../../parsers/models/workflowNode';
import { getOperationManifest } from '../../queries/operation';
import { initializeNodes } from '../../state/operation/operationMetadataSlice';
import type { NodeTokens, VariableDeclaration } from '../../state/tokensSlice';
import { initializeTokensAndVariables } from '../../state/tokensSlice';
import type { RootState } from '../../store';
import { getTokenNodeIds, getBuiltInTokens, convertOutputsToTokens } from '../../utils/tokens';
import { setVariableMetadata, getVariableDeclarations } from '../../utils/variables';
import { getInputParametersFromManifest, getOutputParametersFromManifest } from './initialize';
import type { NodeDataWithManifest } from './operationdeserializer';
import { getOperationSettings } from './settings';
import { OperationManifestService } from '@microsoft-logic-apps/designer-client-services';
import type { OperationInfo } from '@microsoft-logic-apps/utils';
import { equals } from '@microsoft-logic-apps/utils';
import type { Dispatch } from '@reduxjs/toolkit';

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

    dispatch(initializeNodes([{ id: nodeId, nodeInputs, nodeOutputs, settings }]));

    // TODO(Danielle) - Please comment out the below part when state has updated graph and nodesMetadata.
    // We need the graph and nodesMetadata updated with the newly added node for token dependencies to be calculated.
    // addTokensAndVariables(nodeId, operationType, { id: nodeId, nodeInputs, nodeOutputs, settings, manifest }, rootState, dispatch);
  } else {
    // TODO - swagger case here
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
