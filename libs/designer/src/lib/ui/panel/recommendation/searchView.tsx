import type { AddNodePayload } from '../../../core/parsers/addNodeToWorkflow';
import { getOperationManifest } from '../../../core/queries/operation';
import type { AddNodeOperationPayload } from '../../../core/state/operation/operationMetadataSlice';
import { initializeOperationInfo } from '../../../core/state/operation/operationMetadataSlice';
import { switchToOperationPanel } from '../../../core/state/panel/panelSlice';
import { addNode } from '../../../core/state/workflow/workflowSlice';
import type { RootState } from '../../../core/store';
import { SearchService } from '@microsoft-logic-apps/designer-client-services';
import type { OperationDiscoveryResult } from '@microsoft-logic-apps/utils';
import { SearchResultsGrid } from '@microsoft/designer-ui';
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

  const { discoveryIds, selectedNode } = useSelector((state: RootState) => {
    return state.panel;
  });

  const searchResponse = useQuery(['searchResult', props.searchTerm], () => getSearchResult(props.searchTerm), {
    enabled: !!props.searchTerm,
    staleTime: 100000,
    cacheTime: 1000 * 60 * 5, // Danielle this is temporary, will move to config
  });

  const searchResults = searchResponse.data;

  const onOperationClick = (operation: OperationDiscoveryResult) => {
    const addPayload: AddNodePayload = {
      operation,
      id: selectedNode,
      parentId: discoveryIds?.parentId ?? '', // danielle to check upon recompile
      childId: discoveryIds?.childId ?? '',
      graphId: discoveryIds?.graphId ?? '',
    };
    const connectorId = operation.properties.api.id; // 'api' could be different based on type, could be 'function' or 'config' see old designer 'connectionOperation.ts'
    const operationId = operation.id;
    dispatch(addNode(addPayload));
    const operationPayload: AddNodeOperationPayload = {
      id: selectedNode,
      type: operation.properties.api.type,
      connectorId,
      operationId,
    };
    dispatch(initializeOperationInfo(operationPayload));
    getOperationManifest({ connectorId: operation.properties.api.id, operationId: operation.id }); // danielle this will probably need to change
    dispatch(switchToOperationPanel(selectedNode));
    return;
  };

  return (
    <SearchResultsGrid
      onOperationClick={onOperationClick}
      operationSearchResults={searchResults?.searchOperations || []}
    ></SearchResultsGrid>
  );
};
