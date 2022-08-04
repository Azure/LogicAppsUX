import type { AddNodePayload } from '../../../core/parsers/addNodeToWorkflow';
import { getConnectionsForConnector } from '../../../core/queries/connections';
import { getOperationManifest } from '../../../core/queries/operation';
import { changeConnectionMapping } from '../../../core/state/connection/connectionSlice';
import type { AddNodeOperationPayload } from '../../../core/state/operation/operationMetadataSlice';
import { initializeOperationInfo } from '../../../core/state/operation/operationMetadataSlice';
import { switchToOperationPanel } from '../../../core/state/panel/panelSlice';
import { addNode } from '../../../core/state/workflow/workflowSlice';
import type { RootState } from '../../../core/store';
import { SearchService } from '@microsoft-logic-apps/designer-client-services';
import type { DiscoveryOperation, DiscoveryResultTypes } from '@microsoft-logic-apps/utils';
import { SearchResultsGrid } from '@microsoft/designer-ui';
import React from 'react';
import { useQuery } from 'react-query';
import { useDispatch, useSelector } from 'react-redux';
import type { Dispatch } from 'redux';

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

  const { discoveryIds, selectedNode } = useSelector((state: RootState) => {
    return state.panel;
  });

  const searchResponse = useQuery(['searchResult', props.searchTerm], () => getSearchResult(props.searchTerm), {
    enabled: !!props.searchTerm,
    staleTime: 100000,
    cacheTime: 1000 * 60 * 5, // Danielle this is temporary, will move to config
  });

  const searchResults = searchResponse.data;

  const onOperationClick = (operation: DiscoveryOperation<DiscoveryResultTypes>) => {
    const addPayload: AddNodePayload = {
      operation,
      id: selectedNode,
      parentId: discoveryIds.parentId ?? '',
      childId: discoveryIds.childId ?? '',
      graphId: discoveryIds.graphId,
    };
    const connectorId = operation.properties.api.id; // 'api' could be different based on type, could be 'function' or 'config' see old designer 'connectionOperation.ts' this is still pending for danielle
    const operationId = operation.id;
    dispatch(addNode(addPayload));
    const operationPayload: AddNodeOperationPayload = {
      id: selectedNode,
      type: operation.type,
      connectorId,
      operationId,
    };
    dispatch(initializeOperationInfo(operationPayload));
    setDefaultConnectionForNode(selectedNode, connectorId, dispatch);
    getOperationManifest({ connectorId: operation.properties.api.id, operationId: operation.id });
    dispatch(switchToOperationPanel(selectedNode));
    return;
  };

  const setDefaultConnectionForNode = async (nodeId: string, connectorId: string, dispatch: Dispatch) => {
    const connections = await getConnectionsForConnector(connectorId);
    if (connections.length !== 0) {
      // danielle logic to determine which conn to use
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
