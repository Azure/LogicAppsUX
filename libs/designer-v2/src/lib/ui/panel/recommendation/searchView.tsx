import type { AppDispatch } from '../../../core';
import { selectOperationGroupId } from '../../../core/state/panel/panelSlice';
import { useIsWithinAgenticLoop } from '../../../core/state/workflow/workflowSelectors';
import { equals, type DiscoveryOpArray, type DiscoveryOperation, type DiscoveryResultTypes } from '@microsoft/logic-apps-shared';
import { SearchResultsGridV2 } from '@microsoft/designer-ui';
import { useDebouncedEffect } from '@react-hookz/web';
import type { FC } from 'react';
import { useCallback, useEffect, useState, useMemo } from 'react';
import { useDispatch } from 'react-redux';
import { useDiscoveryPanelRelationshipIds, useIsAddingAgentTool } from '../../../core/state/panel/panelSelectors';
import { useIsA2AWorkflow, useIsAgenticWorkflow } from '../../../core/state/designerView/designerViewSelectors';
import { useEnableNestedAgentLoops } from '../../../core/state/designerOptions/designerOptionsSelectors';
import { DefaultSearchOperationsService } from './SearchOpeationsService';
import constants from '../../../common/constants';
import { ALLOWED_A2A_CONNECTOR_NAMES } from './helpers';
import { useMcpServersQuery } from '../../../core/queries/browse';

type SearchViewProps = {
  searchTerm: string;
  allOperations: DiscoveryOpArray;
  isLoadingOperations?: boolean;
  groupByConnector: boolean;
  setGroupByConnector: (groupedByConnector: boolean) => void;
  isLoading: boolean;
  onOperationClick: (id: string, apiId?: string) => void;
  displayRuntimeInfo: boolean;
};

export const SearchView: FC<SearchViewProps> = ({
  searchTerm,
  allOperations,
  groupByConnector,
  setGroupByConnector,
  isLoading,
  onOperationClick,
  displayRuntimeInfo,
}) => {
  const isAgenticWorkflow = useIsAgenticWorkflow();
  const parentGraphId = useDiscoveryPanelRelationshipIds().graphId;
  const isWithinAgenticLoop = useIsWithinAgenticLoop(parentGraphId);
  const isAgentTool = useIsAddingAgentTool();
  const isRoot = useMemo(() => parentGraphId === 'root', [parentGraphId]);
  const isA2AWorkflow = useIsA2AWorkflow();
  const enableNestedAgentLoops = useEnableNestedAgentLoops();

  const dispatch = useDispatch<AppDispatch>();

  const { data: mcpServersData } = useMcpServersQuery();
  const mcpServers = useMemo(() => mcpServersData?.data ?? [], [mcpServersData?.data]);

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

      // Exclude agent operations unless it's an agentic or A2A workflow
      // When not at root, also require enableNestedAgentLoops to be true
      if (equals(type, constants.NODE.TYPE.AGENT)) {
        if (!isAgenticWorkflow && !isA2AWorkflow) {
          return false;
        }
        if (!isRoot && !enableNestedAgentLoops) {
          return false;
        }
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
    [isA2AWorkflow, isAgentTool, isAgenticWorkflow, isRoot, isWithinAgenticLoop, passesA2AWorkflowFilter, enableNestedAgentLoops]
  );

  useDebouncedEffect(
    () => {
      const operations = isAgentTool ? [...allOperations, ...mcpServers] : allOperations;
      const searchResultsPromise = new DefaultSearchOperationsService(operations).searchOperations(searchTerm, filterAgenticLoops);

      searchResultsPromise.then((results) => {
        setSearchResults(results);
        setIsLoadingSearchResults(false);
      });
    },
    [searchTerm, allOperations, filterAgenticLoops, isAgentTool, mcpServers],
    200
  );

  const onConnectorClick = (connectorId: string) => {
    dispatch(selectOperationGroupId(connectorId));
  };

  return (
    <SearchResultsGridV2
      isLoadingSearch={isLoadingSearchResults}
      isLoadingMore={isLoading}
      searchTerm={searchTerm}
      onConnectorClick={onConnectorClick}
      onOperationClick={onOperationClick}
      operationSearchResults={searchResults}
      groupByConnector={groupByConnector}
      setGroupByConnector={setGroupByConnector}
      displayRuntimeInfo={displayRuntimeInfo}
    />
  );
};
