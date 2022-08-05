import Constants from '../../../common/constants';
import { getInputParametersFromManifest, getOutputParametersFromManifest } from '../../../core/actions/bjsworkflow/initialize';
import { getOperationSettings } from '../../../core/actions/bjsworkflow/settings';
import type { AddNodePayload } from '../../../core/parsers/addNodeToWorkflow';
import type { WorkflowNode } from '../../../core/parsers/models/workflowNode';
import { getOperationManifest } from '../../../core/queries/operation';
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

    await initializeOperationDetails(selectedNode, { connectorId, operationId }, operationType, operationKind, rootState, dispatch);

    dispatch(switchToOperationPanel(selectedNode));
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

    const nodeInputs = getInputParametersFromManifest(nodeId, manifest);
    const nodeOutputs = getOutputParametersFromManifest(nodeId, manifest);
    const settings = getOperationSettings(false /* isTrigger */, operationType, operationKind, manifest);

    dispatch(initializeNodes([{ id: nodeId, nodeInputs, nodeOutputs, settings }]));

    const {
      workflow: { graph, nodesMetadata, operations },
    } = rootState;
    const nodeMap = Object.keys(operations).reduce((actionNodes: Record<string, string>, id: string) => ({ ...actionNodes, [id]: id }), {});
    const upstreamNodeIds = getTokenNodeIds(
      nodeId,
      graph as WorkflowNode,
      nodesMetadata,
      { [nodeId]: { id: nodeId, nodeInputs, nodeOutputs, settings, manifest } },
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
  } else {
    // swagger case here
  }
};
