import { SearchService } from '@microsoft-logic-apps/designer-client-services';
import { SearchResultsGrid } from '@microsoft/designer-ui';
import React from 'react';
import { useQuery } from 'react-query';

const getSearchResult = (term: string) => {
  const searchService = SearchService();
  const data = searchService.search(term);
  return data;
};

type SearchViewProps = {
  searchTerm: string;
};

// THIS IS CURRENTLY NOT USED ANYWHERE

export const SearchView: React.FC<SearchViewProps> = (props) => {
  // const dispatch = useDispatch();

  // const rootState = useSelector((state: RootState) => state);
  // const { discoveryIds, selectedNode } = useSelector((state: RootState) => {
  //   return state.panel;
  // });

  const searchResponse = useQuery(['searchResult', props.searchTerm], () => getSearchResult(props.searchTerm), {
    enabled: !!props.searchTerm,
    staleTime: 100000,
    cacheTime: 1000 * 60 * 5, // Danielle this is temporary, will move to config
  });

  const searchResults = searchResponse.data;

  // const onOperationClick = async (operation: DiscoveryOperation<DiscoveryResultTypes>) => {
  //   const addPayload: AddNodePayload = {
  //     operation,
  //     id: selectedNode,
  //     parentId: discoveryIds.parentId ?? '',
  //     childId: discoveryIds.childId ?? '',
  //     graphId: discoveryIds.graphId,
  //   };
  //   const connectorId = operation.properties.api.id; // 'api' could be different based on type, could be 'function' or 'config' see old designer 'connectionOperation.ts' this is still pending for danielle
  //   const operationId = operation.id;
  //   const operationType = operation.properties.operationType ?? '';
  //   const operationKind = operation.properties.operationKind ?? '';

  //   dispatch(addNode(addPayload));
  //   const operationPayload: AddNodeOperationPayload = {
  //     id: selectedNode,
  //     type: operationType,
  //     connectorId,
  //     operationId,
  //   };
  //   dispatch(initializeOperationInfo(operationPayload));

  //   initializeOperationDetails(selectedNode, { connectorId, operationId }, operationType, operationKind, rootState, dispatch);
  //   setDefaultConnectionForNode(selectedNode, connectorId, dispatch);

  //   dispatch(switchToOperationPanel(selectedNode));
  // };

  // const setDefaultConnectionForNode = async (nodeId: string, connectorId: string, dispatch: Dispatch) => {
  //   const connections = await getConnectionsForConnector(connectorId);
  //   if (connections.length !== 0) {
  //     dispatch(changeConnectionMapping({ nodeId, connectionId: connections[0].id }));
  //   }
  // };

  const onOperationClick = (id: string) => {
    console.log(id);
  };

  const onConnectorSelected = (id: string): void => {
    console.log(id);
  };

  return (
    <SearchResultsGrid
      onConnectorClick={onConnectorSelected}
      onOperationClick={onOperationClick}
      operationSearchResults={searchResults?.searchOperations || []}
    />
  );
};
