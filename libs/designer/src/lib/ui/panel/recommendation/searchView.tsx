import type { AppDispatch } from '../../../core';
import { selectOperationGroupId } from '../../../core/state/panel/panelSlice';
import { useIsWithinAgenticLoop } from '../../../core/state/workflow/workflowSelectors';
import { SearchService, type DiscoveryOpArray, type DiscoveryOperation, type DiscoveryResultTypes } from '@microsoft/logic-apps-shared';
import { SearchResultsGrid } from '@microsoft/designer-ui';
import { useDebouncedEffect } from '@react-hookz/web';
import type { FC } from 'react';
import { useCallback, useEffect, useState, useMemo } from 'react';
import { useDispatch } from 'react-redux';
import { useDiscoveryPanelRelationshipIds, useIsAgentTool } from '../../../core/state/panel/panelSelectors';
import { useIsAgenticWorkflow } from '../../../core/state/designerView/designerViewSelectors';
import { useShouldEnableParseDocumentWithMetadata } from './hooks';
import { DefaultSearchOperationsService } from './SearchOpeationsService';
import constants from '../../../common/constants';

type SearchViewProps = {
  searchTerm: string;
  allOperations: DiscoveryOpArray;
  isLoadingOperations?: boolean;
  groupByConnector: boolean;
  setGroupByConnector: (groupedByConnector: boolean) => void;
  isLoading: boolean;
  filters: Record<string, string>;
  setFilters: (filters: Record<string, string>) => void;
  onOperationClick: (id: string, apiId?: string) => void;
  displayRuntimeInfo: boolean;
};

export const SearchView: FC<SearchViewProps> = ({
  searchTerm,
  allOperations,
  groupByConnector,
  setGroupByConnector,
  isLoading,
  filters,
  setFilters,
  onOperationClick,
  displayRuntimeInfo,
}) => {
  const isAgenticWorkflow = useIsAgenticWorkflow();
  const shouldEnableParseDocWithMetadata = useShouldEnableParseDocumentWithMetadata();
  const parentGraphId = useDiscoveryPanelRelationshipIds().graphId;
  const isWithinAgenticLoop = useIsWithinAgenticLoop(parentGraphId);
  const isAgentTool = useIsAgentTool();
  const isRoot = useMemo(() => parentGraphId === 'root', [parentGraphId]);

  const dispatch = useDispatch<AppDispatch>();

  const [searchResults, setSearchResults] = useState<DiscoveryOpArray>([]);
  const [isLoadingSearchResults, setIsLoadingSearchResults] = useState<boolean>(false);

  useEffect(() => {
    if (searchTerm !== '') {
      setIsLoadingSearchResults(true);
    }
  }, [searchTerm]);

  const filterAgenticLoops = useCallback(
    (operation: DiscoveryOperation<DiscoveryResultTypes>): boolean => {
      const { type, id } = operation;

      // Exclude agent operations unless it's the root of an agentic workflow
      if ((!isAgenticWorkflow || !isRoot) && type === 'Agent') {
        return false;
      }

      // Exclude variable initialization if not at the root
      if (!isRoot && id === constants.NODE.TYPE.INITIALIZE_VARIABLE) {
        return false;
      }

      // Exclude certain scope flow nodes within agentic loops or tools
      const isControlFlowNode = [
        constants.NODE.TYPE.SWITCH,
        constants.NODE.TYPE.SCOPE,
        constants.NODE.TYPE.IF,
        constants.NODE.TYPE.UNTIL,
        constants.NODE.TYPE.FOREACH,
      ].includes(id);

      if ((isWithinAgenticLoop || isAgentTool) && isControlFlowNode) {
        return false;
      }

      // Only show the handoff operation if it's in an agent loop
      if (type === 'AgentHandOff' && !isWithinAgenticLoop) {
        return false;
      }

      return true;
    },
    [isAgentTool, isAgenticWorkflow, isRoot, isWithinAgenticLoop]
  );

  useDebouncedEffect(
    () => {
      const searchOperations = SearchService().searchOperations?.bind(SearchService());

      const searchResultsPromise = searchOperations
        ? searchOperations(searchTerm, filters['actionType'], filters['runtime'], filterAgenticLoops)
        : new DefaultSearchOperationsService(allOperations, shouldEnableParseDocWithMetadata ?? false).searchOperations(
            searchTerm,
            filters['actionType'],
            filters['runtime'],
            filterAgenticLoops
          );

      searchResultsPromise.then((results) => {
        setSearchResults(results);
        setIsLoadingSearchResults(false);
      });
    },
    [searchTerm, allOperations, filters, filterAgenticLoops, shouldEnableParseDocWithMetadata],
    200
  );

  const onConnectorClick = (connectorId: string) => {
    dispatch(selectOperationGroupId(connectorId));
  };

  return (
    <SearchResultsGrid
      isLoadingSearch={isLoadingSearchResults}
      isLoadingMore={isLoading}
      searchTerm={searchTerm}
      onConnectorClick={onConnectorClick}
      onOperationClick={onOperationClick}
      operationSearchResults={searchResults}
      groupByConnector={groupByConnector}
      setGroupByConnector={setGroupByConnector}
      filters={filters}
      setFilters={setFilters}
      displayRuntimeInfo={displayRuntimeInfo}
    />
  );
};
