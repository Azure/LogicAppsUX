import type { AppDispatch } from '../../../core';
import { selectOperationGroupId } from '../../../core/state/panel/panelSlice';
import { useIsWithinAgenticLoop } from '../../../core/state/workflow/workflowSelectors';
import {
  a2aRequestOperation,
  equals,
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
import { useShouldEnableParseDocumentWithMetadata, useShouldShowAgentRequestTriggerConsumption } from './hooks';
import { DefaultSearchOperationsService } from './SearchOpeationsService';
import constants from '../../../common/constants';
import { ALLOWED_A2A_CONNECTOR_NAMES } from './helpers';

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
  const isAgentTool = useIsAddingAgentTool();
  const isRoot = useMemo(() => parentGraphId === 'root', [parentGraphId]);
  const isA2AWorkflow = useIsA2AWorkflow();
  const shouldShowAgentRequestTriggerConsumption = useShouldShowAgentRequestTriggerConsumption();

  const dispatch = useDispatch<AppDispatch>();

  const [searchResults, setSearchResults] = useState<DiscoveryOpArray>([]);
  const [isLoadingSearchResults, setIsLoadingSearchResults] = useState<boolean>(false);

  useEffect(() => {
    if (searchTerm !== '') {
      setIsLoadingSearchResults(true);
    }
  }, [searchTerm]);

  const passesA2AWorkflowFilter = useCallback(
    (operation: DiscoveryOperation<DiscoveryResultTypes>): boolean => {
      // Only apply this filter if it's A2A workflow and adding to root
      if (!isA2AWorkflow || !isRoot) {
        return true;
      }

      const operationType = operation.properties?.api?.type;
      const connectorName = operation.properties?.api?.name;

      if (connectorName && ALLOWED_A2A_CONNECTOR_NAMES.has(connectorName)) {
        return true;
      }

      // Allow APIConnection or ServiceProvider types
      if (operationType) {
        return equals(operationType, 'Microsoft.Web/locations/managedApis') || equals(operationType, 'ServiceProvider');
      }

      return false;
    },
    [isA2AWorkflow, isRoot]
  );

  const filterAgenticLoops = useCallback(
    (operation: DiscoveryOperation<DiscoveryResultTypes>): boolean => {
      const { type, id } = operation;
      // Apply A2A workflow filter first
      if (!passesA2AWorkflowFilter(operation)) {
        return false;
      }

      // Exclude handoff operations from search results
      if (equals(type, constants.NODE.TYPE.HANDOFF)) {
        return false;
      }

      // Exclude agent operations unless it's the root of an agentic workflow
      if ((!isAgenticWorkflow || !isRoot) && equals(type, constants.NODE.TYPE.AGENT)) {
        return false;
      }

      // Hide Agent Request trigger if the flag is enabled
      if (
        shouldShowAgentRequestTriggerConsumption === false &&
        equals(type, constants.NODE.TYPE.REQUEST) &&
        id === a2aRequestOperation.id
      ) {
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

      if (equals(type, constants.NODE.TYPE.NESTED_AGENT) && id === 'invokeNestedAgent') {
        if (!(isWithinAgenticLoop || isAgentTool)) {
          return false;
        }
        return true;
      }

      return true;
    },
    [shouldShowAgentRequestTriggerConsumption, isAgentTool, isAgenticWorkflow, isRoot, isWithinAgenticLoop, passesA2AWorkflowFilter]
  );

  useDebouncedEffect(
    () => {
      const searchResultsPromise = new DefaultSearchOperationsService(
        allOperations,
        shouldEnableParseDocWithMetadata ?? false
      ).searchOperations(searchTerm, filters['actionType'], filters['runtime'], filterAgenticLoops);

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
