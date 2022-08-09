import Constants from '../../../common/constants';
import { getInputParametersFromManifest, getOutputParametersFromManifest } from '../../../core/actions/bjsworkflow/initialize';
import type { NodeDataWithManifest } from '../../../core/actions/bjsworkflow/operationdeserializer';
import { getOperationSettings } from '../../../core/actions/bjsworkflow/settings';
import type { AddNodePayload } from '../../../core/parsers/addNodeToWorkflow';
import type { WorkflowNode } from '../../../core/parsers/models/workflowNode';
import { getConnectionsForConnector } from '../../../core/queries/connections';
import { getOperationManifest } from '../../../core/queries/operation';
import { changeConnectionMapping } from '../../../core/state/connection/connectionSlice';
import type { AddNodeOperationPayload } from '../../../core/state/operation/operationMetadataSlice';
import { initializeNodes, initializeOperationInfo } from '../../../core/state/operation/operationMetadataSlice';
import { switchToOperationPanel } from '../../../core/state/panel/panelSlice';
import type { NodeTokens, VariableDeclaration } from '../../../core/state/tokensSlice';
import { initializeTokensAndVariables } from '../../../core/state/tokensSlice';
import { addNode } from '../../../core/state/workflow/workflowSlice';
import type { RootState } from '../../../core/store';
import { convertOutputsToTokens, getBuiltInTokens, getTokenNodeIds } from '../../../core/utils/tokens';
import { getVariableDeclarations, setVariableMetadata } from '../../../core/utils/variables';
import { OperationManifestService, SearchService } from '@microsoft-logic-apps/designer-client-services';
import type { DiscoveryOperation, DiscoveryResultTypes, OperationInfo } from '@microsoft-logic-apps/utils';
import { equals } from '@microsoft-logic-apps/utils';
import { SearchResultsGrid } from '@microsoft/designer-ui';
import type { Dispatch } from '@reduxjs/toolkit';
import React from 'react';
import { useQuery } from 'react-query';
import { useDispatch, useSelector } from 'react-redux';

const getSearchResult = (term: string) => {
  const searchService = SearchService();
  const data = searchService.search(term);
  return data;
};

type SearchViewProps = {
  searchTerm: string;
};

export const SearchView: React.FC<SearchViewProps> = (props) => {
  const dispatch = useDispatch();

  const rootState = useSelector((state: RootState) => state);
  const { discoveryIds, selectedNode } = useSelector((state: RootState) => {
    return state.panel;
  });

  const searchResponse = useQuery(['searchResult', props.searchTerm], () => getSearchResult(props.searchTerm), {
    enabled: !!props.searchTerm,
    staleTime: 100000,
    cacheTime: 1000 * 60 * 5, // Danielle this is temporary, will move to config
  });

  const searchResults = searchResponse.data;

  const onOperationClick = async (operation: DiscoveryOperation<DiscoveryResultTypes>) => {
    const addPayload: AddNodePayload = {
      operation,
      id: selectedNode,
      parentId: discoveryIds.parentId ?? '',
      childId: discoveryIds.childId ?? '',
      graphId: discoveryIds.graphId,
    };
    const connectorId = operation.properties.api.id; // 'api' could be different based on type, could be 'function' or 'config' see old designer 'connectionOperation.ts' this is still pending for danielle
    const operationId = operation.id;
    const operationType = operation.properties.operationType ?? '';
    const operationKind = operation.properties.operationKind ?? '';

    dispatch(addNode(addPayload));
    const operationPayload: AddNodeOperationPayload = {
      id: selectedNode,
      type: operationType,
      connectorId,
      operationId,
    };
    dispatch(initializeOperationInfo(operationPayload));

    initializeOperationDetails(selectedNode, { connectorId, operationId }, operationType, operationKind, rootState, dispatch);
    setDefaultConnectionForNode(selectedNode, connectorId, dispatch);

    dispatch(switchToOperationPanel(selectedNode));
  };

  const setDefaultConnectionForNode = async (nodeId: string, connectorId: string, dispatch: Dispatch) => {
    const connections = await getConnectionsForConnector(connectorId);
    if (connections.length !== 0) {
      dispatch(changeConnectionMapping({ nodeId, connectionId: connections[0].id }));
    }
  };

  return (
    <SearchResultsGrid
      onOperationClick={onOperationClick}
      operationSearchResults={searchResults?.searchOperations || []}
    ></SearchResultsGrid>
  );
};

const initializeOperationDetails = async (
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
