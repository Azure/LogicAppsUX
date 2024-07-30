import type { AppDispatch } from '../../../core';
import { addOperation } from '../../../core/actions/bjsworkflow/add';
import { useAllConnectors, useAllOperations } from '../../../core/queries/browse';
import { useHostOptions } from '../../../core/state/designerOptions/designerOptionsSelectors';
import {
  useIsAddingTrigger,
  useIsParallelBranch,
  useRelationshipIds,
  useSelectedSearchOperationGroupId,
} from '../../../core/state/panel/panelSelectors';
import { selectOperationGroupId, selectOperationId } from '../../../core/state/panel/panelSlice';
import { AzureResourceSelection } from './azureResourceSelection';
import { BrowseView } from './browseView';
import { CustomSwaggerSelection } from './customSwaggerSelection';
import { OperationGroupDetailView } from './operationGroupDetailView';
import { SearchView } from './searchView';
import { Link, Icon } from '@fluentui/react';
import { Button } from '@fluentui/react-components';
import { bundleIcon, Dismiss24Filled, Dismiss24Regular } from '@fluentui/react-icons';
import { SearchService, equals, guid, areApiIdsEqual } from '@microsoft/logic-apps-shared';
import { OperationSearchHeader, XLargeText } from '@microsoft/designer-ui';
import type { CommonPanelProps } from '@microsoft/designer-ui';
import type { DiscoveryOpArray, DiscoveryOperation, DiscoveryResultTypes } from '@microsoft/logic-apps-shared';
import { useDebouncedEffect } from '@react-hookz/web';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useIntl } from 'react-intl';
import { useDispatch } from 'react-redux';

const CloseIcon = bundleIcon(Dismiss24Filled, Dismiss24Regular);

type SelectionState = (typeof SELECTION_STATES)[keyof typeof SELECTION_STATES];
const SELECTION_STATES = {
  SEARCH: 'SEARCH',
  DETAILS: 'DETAILS',
  AZURE_RESOURCE: 'AZURE_RESOURCE',
  CUSTOM_SWAGGER: 'HTTP_SWAGGER',
};

export const RecommendationPanelContext = (props: CommonPanelProps) => {
  const { toggleCollapse } = props;
  const { displayRuntimeInfo } = useHostOptions();
  const dispatch = useDispatch<AppDispatch>();
  const isTrigger = useIsAddingTrigger();
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<Record<string, string>>({
    actionType: isTrigger ? 'triggers' : 'actions',
  });
  const [allOperationsForGroup, setAllOperationsForGroup] = useState<DiscoveryOpArray>([]);

  const [isGrouped, setIsGrouped] = useState(true);

  const [selectionState, setSelectionState] = useState<SelectionState>(SELECTION_STATES.SEARCH);

  const { data: preloadedOperations, isLoading: isLoadingOperations } = useAllOperations();
  const [selectedOperation, setSelectedOperation] = useState<DiscoveryOperation<DiscoveryResultTypes> | undefined>(undefined);
  const [isLoadingOperationGroup, setIsLoadingOperationGroup] = useState<boolean>(false);

  // Searched terms, so we don't search the same term twice
  const [searchedTerms, setSearchedTerms] = useState(['']);
  // Array of actively searched operations, to avoid duplicate data storage
  const [activeSearchOperations, setActiveSearchOperations] = useState<DiscoveryOpArray>([]);

  // Remove duplicates from allOperations and activeSearchOperations
  const allOperations: DiscoveryOpArray = useMemo(
    () => joinAndDeduplicateById(preloadedOperations, activeSearchOperations),
    [preloadedOperations, activeSearchOperations]
  );

  // Active search
  useDebouncedEffect(
    () => {
      // if preload is complete, no need to actively search
      if (!isLoadingOperations) {
        return;
      }
      if (searchedTerms.includes(searchTerm)) {
        return;
      }
      // We are still preloading, perform active search
      const activeSearchResults =
        SearchService().getActiveSearchOperations?.(searchTerm, filters['actionType'], filters['runtime']) ??
        Promise.resolve([] as DiscoveryOpArray);
      // Store results
      activeSearchResults.then((results) => {
        setSearchedTerms([...searchedTerms, searchTerm]);
        setActiveSearchOperations(joinAndDeduplicateById(results, activeSearchOperations));
      });
    },
    [searchedTerms, isLoadingOperations, searchTerm, filters, activeSearchOperations],
    300
  );

  const selectedOperationGroupId = useSelectedSearchOperationGroupId();
  const { data: allConnectors } = useAllConnectors();
  const selectedConnector = allConnectors?.find((c) => c.id === selectedOperationGroupId);

  // hide actions type filter if we don't have any operations for the browse view
  const hideActionTypeFilter = (!allOperations || allOperations.length === 0) && !searchTerm;

  // effect to set the current list of operations by group
  useEffect(() => {
    if (!selectedOperationGroupId) {
      return;
    }

    const searchOperation = SearchService().getOperationsByConnector?.bind(SearchService());

    const searchResultPromise = searchOperation
      ? searchOperation(selectedOperationGroupId, hideActionTypeFilter ? undefined : filters['actionType']?.toLowerCase())
      : Promise.resolve(
          (allOperations ?? []).filter((operation) => {
            const apiId = operation.properties.api.id;
            return areApiIdsEqual(apiId, selectedOperationGroupId);
          })
        );

    setIsLoadingOperationGroup(true);
    searchResultPromise
      .then((filteredOps) => {
        setAllOperationsForGroup(filteredOps);
      })
      .finally(() => {
        setIsLoadingOperationGroup(false);
      });
    setSelectionState(SELECTION_STATES.DETAILS);
  }, [selectedOperationGroupId, allOperations, filters, hideActionTypeFilter]);

  const navigateBack = useCallback(() => {
    dispatch(selectOperationGroupId(''));
    dispatch(selectOperationId(''));
    setAllOperationsForGroup([]);
    setSelectionState(SELECTION_STATES.SEARCH);
  }, [dispatch]);

  const relationshipIds = useRelationshipIds();
  const isParallelBranch = useIsParallelBranch();

  const hasAzureResourceSelection = useCallback((operation: DiscoveryOperation<DiscoveryResultTypes>) => {
    return operation.properties.capabilities?.some((capability) => equals(capability, 'azureResourceSelection'));
  }, []);

  const hasSwaggerSelection = useCallback((operation: DiscoveryOperation<DiscoveryResultTypes>) => {
    return operation.properties.capabilities?.some((capability) => equals(capability, 'swaggerSelection'));
  }, []);

  const startAzureResourceSelection = useCallback(() => {
    setSelectionState(SELECTION_STATES.AZURE_RESOURCE);
  }, []);

  const startSwaggerSelection = useCallback(() => {
    setSelectionState(SELECTION_STATES.CUSTOM_SWAGGER);
  }, []);

  const onOperationClick = useCallback(
    (id: string, apiId?: string) => {
      const searchOperation = SearchService().getOperationById?.bind(SearchService());

      const searchResultPromise = searchOperation
        ? searchOperation(id)
        : Promise.resolve((allOperations ?? []).find((o) => (apiId ? o.id === id && o.properties?.api?.id === apiId : o.id === id)));

      searchResultPromise.then((operation) => {
        if (!operation) {
          return;
        }
        dispatch(selectOperationId(operation.id));
        setSelectedOperation(operation);
        dispatch(selectOperationGroupId(''));
        if (hasAzureResourceSelection(operation)) {
          startAzureResourceSelection();
          return;
        }
        if (hasSwaggerSelection(operation)) {
          startSwaggerSelection();
          return;
        }
        const newNodeId = (operation?.properties?.summary ?? operation?.name ?? guid()).replaceAll(' ', '_');
        dispatch(addOperation({ operation, relationshipIds, nodeId: newNodeId, isParallelBranch, isTrigger }));
      });
    },
    [
      allOperations,
      dispatch,
      hasAzureResourceSelection,
      hasSwaggerSelection,
      isParallelBranch,
      isTrigger,
      relationshipIds,
      startAzureResourceSelection,
      startSwaggerSelection,
    ]
  );

  const intl = useIntl();
  const returnToSearchText = intl.formatMessage({
    defaultMessage: 'Return to search',
    id: 'tH2pT1',
    description: 'Text for the Details page navigation heading',
  });

  const headingText = isTrigger
    ? intl.formatMessage({ defaultMessage: 'Add a trigger', id: 'dBxX0M', description: 'Text for the "Add Trigger" page header' })
    : intl.formatMessage({ defaultMessage: 'Add an action', id: 'EUQDM6', description: 'Text for the "Add Action" page header' });

  const closeButtonAriaLabel = intl.formatMessage({
    defaultMessage: 'Close panel',
    id: 'yjjXCQ',
    description: 'Aria label for the close button in the Add Action Panel',
  });

  return (
    <>
      <div className="msla-app-action-header">
        <XLargeText text={headingText} />
        <Button aria-label={closeButtonAriaLabel} appearance="subtle" onClick={toggleCollapse} icon={<CloseIcon />} />
      </div>
      {selectionState !== SELECTION_STATES.SEARCH || selectedOperationGroupId ? (
        <div className={'msla-sub-heading-container'}>
          <Link onClick={navigateBack} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Icon iconName="Back" />
            {returnToSearchText}
          </Link>
        </div>
      ) : null}
      {
        {
          [SELECTION_STATES.AZURE_RESOURCE]: selectedOperation ? <AzureResourceSelection operation={selectedOperation} /> : null,
          [SELECTION_STATES.CUSTOM_SWAGGER]: selectedOperation ? <CustomSwaggerSelection operation={selectedOperation} /> : null,
          [SELECTION_STATES.DETAILS]: selectedConnector ? (
            <OperationGroupDetailView
              connector={selectedConnector}
              groupOperations={allOperationsForGroup}
              filters={filters}
              onOperationClick={onOperationClick}
              isLoading={isLoadingOperations || isLoadingOperationGroup}
              displayRuntimeInfo={displayRuntimeInfo}
              ignoreActionsFilter={hideActionTypeFilter}
            />
          ) : null,
          [SELECTION_STATES.SEARCH]: (
            <>
              <OperationSearchHeader
                searchCallback={setSearchTerm}
                onGroupToggleChange={() => setIsGrouped(!isGrouped)}
                isGrouped={isGrouped}
                searchTerm={searchTerm}
                filters={filters}
                setFilters={setFilters}
                isTriggerNode={isTrigger}
                displayRuntimeInfo={displayRuntimeInfo}
                displayActionType={!hideActionTypeFilter}
              />
              {searchTerm ? (
                <SearchView
                  searchTerm={searchTerm}
                  allOperations={allOperations ?? []}
                  isLoadingOperations={isLoadingOperations}
                  groupByConnector={isGrouped}
                  isLoading={isLoadingOperations}
                  filters={filters}
                  onOperationClick={onOperationClick}
                  displayRuntimeInfo={displayRuntimeInfo}
                />
              ) : (
                <BrowseView filters={filters} isLoadingOperations={isLoadingOperations} displayRuntimeInfo={displayRuntimeInfo} />
              )}
            </>
          ),
        }[selectionState ?? '']
      }
    </>
  );
};

const joinAndDeduplicateById = (arr1: DiscoveryOpArray, arr2: DiscoveryOpArray) => [
  ...new Map([...arr1, ...arr2].map((v) => [`${v?.properties?.api?.id}/${v.id}`, v])).values(),
];
