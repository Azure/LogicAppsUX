import type { AppDispatch } from '../../../core';
import { addOperation } from '../../../core/actions/bjsworkflow/add';
import { useAllConnectors, useAllOperations } from '../../../core/queries/browse';
import { useHostOptions } from '../../../core/state/designerOptions/designerOptionsSelectors';
import {
  useDiscoveryPanelFavoriteOperations,
  useDiscoveryPanelIsAddingTrigger,
  useDiscoveryPanelIsParallelBranch,
  useDiscoveryPanelRelationshipIds,
  useDiscoveryPanelSelectedOperationGroupId,
  useDiscoveryPanelSelectedBrowseCategory,
} from '../../../core/state/panel/panelSelectors';
import { selectOperationGroupId, selectOperationId, selectBrowseCategory } from '../../../core/state/panel/panelSlice';
import { AzureResourceSelection } from './azureResourceSelection';
import { CustomSwaggerSelection } from './customSwaggerSelection';
import { ConnectorDetailsView } from './details/connectorDetailsView';
import { SearchView } from './searchView';
import { Button } from '@fluentui/react-components';
import { bundleIcon, Dismiss24Filled, Dismiss24Regular, ArrowLeft24Regular } from '@fluentui/react-icons';
import { SearchService, equals, FavoriteContext, requestOperation } from '@microsoft/logic-apps-shared';
import { OperationSearchHeaderV2, XLargeText } from '@microsoft/designer-ui';
import type { CommonPanelProps } from '@microsoft/designer-ui';
import type { DiscoveryOpArray, DiscoveryOperation, DiscoveryResultTypes } from '@microsoft/logic-apps-shared';
import { useDebouncedEffect } from '@react-hookz/web';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useIntl } from 'react-intl';
import { useDispatch } from 'react-redux';
import { useOnFavoriteClick } from './hooks';
import { BrowseView } from './browse/browseView';
import { useRecommendationPanelContextStyles } from './styles/RecommendationPanelContext.styles';
import { getNodeId } from './helpers';

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
  const classes = useRecommendationPanelContextStyles();
  const isTrigger = useDiscoveryPanelIsAddingTrigger();
  const [searchTerm, setSearchTerm] = useState('');

  const selectedBrowseCategory = useDiscoveryPanelSelectedBrowseCategory();

  const [isGrouped, setIsGrouped] = useState(true);

  const recommendationPanelRef = useRef<HTMLDivElement>(null);
  const favorites = useDiscoveryPanelFavoriteOperations();
  const onFavoriteClick = useOnFavoriteClick();

  const isOperationFavorited = useCallback(
    (connectorId: string, operationId?: string) =>
      favorites.some((favorite) => favorite.connectorId === connectorId && favorite.operationId === operationId),
    [favorites]
  );

  const contextValue = useMemo(() => ({ isOperationFavorited, onFavoriteClick }), [isOperationFavorited, onFavoriteClick]);

  const [selectionState, setSelectionState] = useState<SelectionState>(SELECTION_STATES.SEARCH);

  const { data: preloadedOperations, isLoading: isLoadingOperations } = useAllOperations();
  const [selectedOperation, setSelectedOperation] = useState<DiscoveryOperation<DiscoveryResultTypes> | undefined>(undefined);

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
      const activeSearchResults = SearchService().getActiveSearchOperations?.(searchTerm) ?? Promise.resolve([] as DiscoveryOpArray);
      // Store results
      activeSearchResults.then((results) => {
        setSearchedTerms([...searchedTerms, searchTerm]);
        setActiveSearchOperations(joinAndDeduplicateById(results, activeSearchOperations));
      });
    },
    [searchedTerms, isLoadingOperations, searchTerm, activeSearchOperations],
    300
  );

  const selectedOperationGroupId = useDiscoveryPanelSelectedOperationGroupId();
  const { data: allConnectors } = useAllConnectors();
  const selectedConnector = allConnectors?.find((c) => c.id === selectedOperationGroupId);

  // effect to set the current list of operations by group
  useEffect(() => {
    if (!selectedOperationGroupId) {
      setSelectionState(SELECTION_STATES.SEARCH);
      return;
    }
    setSelectionState(SELECTION_STATES.DETAILS);
  }, [selectedOperationGroupId]);

  const navigateBack = useCallback(() => {
    dispatch(selectOperationGroupId(''));
    dispatch(selectOperationId(''));
    if (!selectedBrowseCategory) {
      dispatch(selectBrowseCategory(undefined));
    }
    // Let the useEffect handle setting the selection state based on selectedOperationGroupId
  }, [dispatch, selectedBrowseCategory]);

  const handleBackToCategories = useCallback(() => {
    dispatch(selectBrowseCategory(undefined));
  }, [dispatch]);

  const relationshipIds = useDiscoveryPanelRelationshipIds();
  const isParallelBranch = useDiscoveryPanelIsParallelBranch();

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

  // Combined handler for both triggers and actions
  const onOperationClick = useCallback(
    (id: string, apiId?: string, forceAsTrigger?: boolean) => {
      const searchResultPromise = Promise.resolve(
        (allOperations ?? []).find((o) => (apiId ? o.id === id && o.properties?.api?.id === apiId : o.id === id))
      );

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

        const shouldAddAsTrigger = forceAsTrigger ?? operation?.properties?.trigger !== undefined;

        if (shouldAddAsTrigger) {
          // Always add as trigger when explicitly requested (for trigger operations)
          const newNodeId = getNodeId(operation);
          dispatch(
            addOperation({
              operation,
              relationshipIds,
              nodeId: newNodeId,
              isParallelBranch,
              isTrigger: true,
            })
          );
        } else if (isTrigger) {
          // In trigger mode: first add request trigger, then add the action
          const requestTriggerNodeId = getNodeId(requestOperation);
          dispatch(
            addOperation({
              operation: requestOperation,
              relationshipIds,
              nodeId: requestTriggerNodeId,
              isParallelBranch: false,
              isTrigger: true,
            })
          );

          // Then add the selected action
          setTimeout(() => {
            const actionNodeId = getNodeId(operation);
            dispatch(
              addOperation({
                operation,
                relationshipIds: { ...relationshipIds, parentId: requestTriggerNodeId },
                nodeId: actionNodeId,
                isParallelBranch: false,
                isTrigger: false,
              })
            );
          }, 100);
        } else {
          // In action mode: just add the action
          const newNodeId = getNodeId(operation);
          dispatch(
            addOperation({
              operation,
              relationshipIds,
              nodeId: newNodeId,
              isParallelBranch,
              isTrigger: false,
            })
          );
        }
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

  // Show category title when in subcategory, otherwise show main heading
  const isInSubcategory = selectedBrowseCategory ?? selectedOperationGroupId;
  const headingText = isInSubcategory
    ? (selectedBrowseCategory?.title ??
      intl.formatMessage({
        defaultMessage: 'Action Details',
        id: 'h2OdHF',
        description: 'Text for the Action Details header',
      }))
    : isTrigger
      ? intl.formatMessage({
          defaultMessage: 'Add a trigger',
          id: '89kLK1',
          description: 'Text for the Trigger page header',
        })
      : intl.formatMessage({
          defaultMessage: 'Add an action',
          id: 'Heod+8',
          description: 'Title text for browse/search experience',
        });

  const closeButtonAriaLabel = intl.formatMessage({
    defaultMessage: 'Close panel',
    id: 'yjjXCQ',
    description: 'Aria label for the close button in the Add Action Panel',
  });

  return (
    <FavoriteContext.Provider value={contextValue}>
      <div className={`msla-app-action-header-v2 ${classes.container}`} ref={recommendationPanelRef}>
        <div className={classes.header}>
          <div className={classes.row}>
            {isInSubcategory && (
              <Button
                aria-label={returnToSearchText}
                appearance="subtle"
                onClick={selectedOperationGroupId ? navigateBack : handleBackToCategories}
                icon={<ArrowLeft24Regular />}
                className={classes.backButton}
              />
            )}
            <XLargeText text={headingText} as="h2" style={{ flexGrow: 1 }} />
            <Button aria-label={closeButtonAriaLabel} appearance="subtle" onClick={toggleCollapse} icon={<CloseIcon />} />
          </div>
        </div>
        <OperationSearchHeaderV2 searchCallback={setSearchTerm} searchTerm={searchTerm} isTriggerNode={isTrigger} />
      </div>
      {
        {
          [SELECTION_STATES.AZURE_RESOURCE]: selectedOperation ? <AzureResourceSelection operation={selectedOperation} /> : null,
          [SELECTION_STATES.CUSTOM_SWAGGER]: selectedOperation ? <CustomSwaggerSelection operation={selectedOperation} /> : null,
          [SELECTION_STATES.DETAILS]: selectedOperationGroupId ? (
            <ConnectorDetailsView connector={selectedConnector} onOperationClick={onOperationClick} />
          ) : null,
          [SELECTION_STATES.SEARCH]: (
            <>
              {searchTerm ? (
                <SearchView
                  searchTerm={searchTerm}
                  allOperations={allOperations ?? []}
                  isLoadingOperations={isLoadingOperations}
                  groupByConnector={isGrouped}
                  setGroupByConnector={(newValue: boolean) => setIsGrouped(newValue)}
                  isLoading={isLoadingOperations}
                  onOperationClick={onOperationClick}
                  displayRuntimeInfo={displayRuntimeInfo}
                />
              ) : (
                <BrowseView isTrigger={isTrigger} onOperationClick={onOperationClick} />
              )}
            </>
          ),
        }[selectionState ?? '']
      }
    </FavoriteContext.Provider>
  );
};

const joinAndDeduplicateById = (arr1: DiscoveryOpArray, arr2: DiscoveryOpArray) => [
  ...new Map([...arr1, ...arr2].map((v) => [`${v?.properties?.api?.id}/${v.id}`, v])).values(),
];
