import Constants from '../../../common/constants';
import type { AddNodePayload } from '../../parsers/addNodeToWorkflow';
import type { WorkflowNode } from '../../parsers/models/workflowNode';
import { getConnectionsForConnector } from '../../queries/connections';
import { getOperationManifest } from '../../queries/operation';
import { changeConnectionMapping } from '../../state/connection/connectionSlice';
import type { AddNodeOperationPayload } from '../../state/operation/operationMetadataSlice';
import { initializeNodes, initializeOperationInfo } from '../../state/operation/operationMetadataSlice';
import type { IdsForDiscovery } from '../../state/panel/panelInterfaces';
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
import { getInputParametersFromManifest, getOutputParametersFromManifest, getParameterDependencies } from './initialize';
import type { NodeDataWithManifest } from './operationdeserializer';
import { getOperationSettings } from './settings';
import { OperationManifestService } from '@microsoft-logic-apps/designer-client-services';
import type { DiscoveryOperation, DiscoveryResultTypes, OperationInfo } from '@microsoft-logic-apps/utils';
import { equals } from '@microsoft-logic-apps/utils';
import type { Dispatch } from '@reduxjs/toolkit';
import { createAsyncThunk } from '@reduxjs/toolkit';

type AddOperationPayload = {
  operation: DiscoveryOperation<DiscoveryResultTypes> | undefined;
  discoveryIds: IdsForDiscovery;
  nodeId: string;
};
export const addOperation = createAsyncThunk(
  'addOperation',
  async ({ operation, discoveryIds, nodeId: id }: AddOperationPayload, { dispatch, getState }) => {
    if (!operation) throw new Error('Operation does not exist'); // Just an optional catch, should never happen
    let count = 1;
    let nodeId = id;
    while ((getState() as RootState).workflow.operations[nodeId]) {
      nodeId = `${id}_${count}`;
      count++;
    }

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
    const newWorkflowState = (getState() as RootState).workflow;
    initializeOperationDetails(nodeId, { connectorId, operationId }, operationType, operationKind, newWorkflowState, dispatch);

    getOperationManifest({ connectorId: operation.properties.api.id, operationId: operation.id });
    dispatch(setFocusNode(nodeId));
    return;
  }
);

export const initializeOperationDetails = async (
  nodeId: string,
  operationInfo: OperationInfo,
  operationType: string,
  operationKind: string,
  workflowState: WorkflowState,
  dispatch: Dispatch
): Promise<void> => {
  const operationManifestService = OperationManifestService();
  if (operationManifestService.isSupported(operationType)) {
    const manifest = await getOperationManifest(operationInfo);

    if (isConnectionRequiredForOperation(manifest)) {
      setDefaultConnectionForNode(nodeId, operationInfo.connectorId, dispatch);
    } else {
      dispatch(switchToOperationPanel(nodeId));
    }

    // TODO(Danielle) - Please set the isTrigger correctly once we know the added operation is trigger or action.
    const settings = getOperationSettings(false /* isTrigger */, operationType, operationKind, manifest, workflowState.operations[nodeId]);
    const nodeInputs = getInputParametersFromManifest(nodeId, manifest);
    const { nodeOutputs, dynamicOutput } = getOutputParametersFromManifest(
      manifest,
      false /* isTrigger */,
      nodeInputs,
      settings.splitOn?.value?.value
    );
    const nodeDependencies = getParameterDependencies(manifest, nodeInputs, nodeOutputs, dynamicOutput);

    dispatch(initializeNodes([{ id: nodeId, nodeInputs, nodeOutputs, nodeDependencies, settings }]));

    // TODO(Danielle) - Please comment out the below part when state has updated graph and nodesMetadata.
    // We need the graph and nodesMetadata updated with the newly added node for token dependencies to be calculated.
    addTokensAndVariables(
      nodeId,
      operationType,
      { id: nodeId, nodeInputs, nodeOutputs, settings, manifest, nodeDependencies },
      workflowState,
      dispatch
    );
  } else {
    // TODO - swagger case here
    setDefaultConnectionForNode(nodeId, operationInfo.connectorId, dispatch);
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

export const addTokensAndVariables = (
  nodeId: string,
  operationType: string,
  nodeData: NodeDataWithManifest,
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
      manifest,
      settings
    )
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
