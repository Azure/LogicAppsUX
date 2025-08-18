import type { AppDispatch } from '../../../core';
import { selectOperationGroupId } from '../../../core/state/panel/panelSlice';
import { useIsWithinAgenticLoop } from '../../../core/state/workflow/workflowSelectors';
import {
  equals,
  SearchService,
  type DiscoveryOpArray,
  type DiscoveryOperation,
  type DiscoveryResultTypes,
} from '@microsoft/logic-apps-shared';
import { SearchResultsGrid } from '@microsoft/designer-ui';
import { useDebouncedEffect } from '@react-hookz/web';
import type { FC } from 'react';
import { useCallback, useEffect, useState, useMemo } from 'react';
import { useDispatch } from 'react-redux';
import { useDiscoveryPanelRelationshipIds, useIsAddingAgentTool } from '../../../core/state/panel/panelSelectors';
import { useIsA2AWorkflow, useIsAgenticWorkflow } from '../../../core/state/designerView/designerViewSelectors';
import { useShouldEnableACASession, useShouldEnableNestedAgent, useShouldEnableParseDocumentWithMetadata } from './hooks';
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
  const shouldEnableACASession = useShouldEnableACASession();
  const shouldEnableNestedAgent = useShouldEnableNestedAgent();
  const parentGraphId = useDiscoveryPanelRelationshipIds().graphId;
  const isWithinAgenticLoop = useIsWithinAgenticLoop(parentGraphId);
  const isAgentTool = useIsAddingAgentTool();
  const isRoot = useMemo(() => parentGraphId === 'root', [parentGraphId]);
  const isA2AWorkflow = useIsA2AWorkflow();

  const dispatch = useDispatch<AppDispatch>();

  const [searchResults, setSearchResults] = useState<DiscoveryOpArray>([]);
  const [isLoadingSearchResults, setIsLoadingSearchResults] = useState<boolean>(false);

  useEffect(() => {
    if (searchTerm !== '') {
      setIsLoadingSearchResults(true);
    }
  }, [searchTerm]);

  const allowedA2AConnectorNamesSet = useMemo(
    () => new Set(['http', 'dataOperationNew', 'variable', 'xmlOperations', 'inlineCode', 'as2Operations', 'datetime']),
    []
  );

  const passesA2AWorkflowFilter = useCallback(
    (operation: DiscoveryOperation<DiscoveryResultTypes>): boolean => {
      // Only apply this filter if it's A2A workflow and adding to root
      if (!isA2AWorkflow || !isRoot) {
        return true;
      }

      const operationType = operation.properties?.api?.type;
      const connectorName = operation.properties?.api?.name;

      if (connectorName && allowedA2AConnectorNamesSet.has(connectorName)) {
        return true;
      }

      // Allow APIConnection or ServiceProvider types
      if (operationType) {
        return equals(operationType, 'Microsoft.Web/locations/managedApis') || equals(operationType, 'ServiceProvider');
      }

      return false;
    },
    [isA2AWorkflow, isRoot, allowedA2AConnectorNamesSet]
  );

  const filterAgenticLoops = useCallback(
    (operation: DiscoveryOperation<DiscoveryResultTypes>): boolean => {
      const { type, id } = operation;

      // Apply A2A workflow filter first
      if (!passesA2AWorkflowFilter(operation)) {
        return false;
      }

      // Exclude handoff operations from search results
      if (equals(type, 'AgentHandoff')) {
        return false;
      }

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

      if (type === constants.NODE.TYPE.NESTED_AGENT && id === 'invokeNestedAgent') {
        if (!shouldEnableNestedAgent) {
          return false;
        }
        if (!(isWithinAgenticLoop || isAgentTool)) {
          return false;
        }
        return true;
      }

      return true;
    },
    [isAgentTool, isAgenticWorkflow, isRoot, isWithinAgenticLoop, shouldEnableNestedAgent, passesA2AWorkflowFilter]
  );

  useDebouncedEffect(
    () => {
      const searchOperations = SearchService().searchOperations?.bind(SearchService());

      const searchResultsPromise = searchOperations
        ? searchOperations(searchTerm, filters['actionType'], filters['runtime'], filterAgenticLoops)
        : new DefaultSearchOperationsService(
            allOperations,
            shouldEnableParseDocWithMetadata ?? false,
            shouldEnableACASession ?? false
          ).searchOperations(searchTerm, filters['actionType'], filters['runtime'], filterAgenticLoops);

      searchResultsPromise.then((results) => {
        setSearchResults(results);
        setIsLoadingSearchResults(false);
      });
    },
    [searchTerm, allOperations, filters, filterAgenticLoops, shouldEnableParseDocWithMetadata, shouldEnableACASession],
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
