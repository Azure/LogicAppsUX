import type { AppDispatch } from '../../../core';
import { addOperation } from '../../../core/actions/bjsworkflow/add';
import { useAllConnectors, useAllOperations, useMcpServersQuery, useOperationsByConnector } from '../../../core/queries/browse';
import { useHostOptions } from '../../../core/state/designerOptions/designerOptionsSelectors';
import {
  useDiscoveryPanelFavoriteOperations,
  useDiscoveryPanelIsAddingTrigger,
  useDiscoveryPanelIsParallelBranch,
  useDiscoveryPanelRelationshipIds,
  useDiscoveryPanelSelectedOperationGroupId,
  useIsAddingMcpServer,
} from '../../../core/state/panel/panelSelectors';
import { selectOperationGroupId, selectOperationId } from '../../../core/state/panel/panelSlice';
import { AzureResourceSelection } from './azureResourceSelection';
import { CustomSwaggerSelection } from './customSwaggerSelection';
import { OperationGroupDetailView } from './operationGroupDetailView';
import { SearchView } from './searchView';
import { Link, Icon } from '@fluentui/react';
import { Button } from '@fluentui/react-components';
import { bundleIcon, Dismiss24Filled, Dismiss24Regular } from '@fluentui/react-icons';
import { SearchService, equals, guid, LoggerService, LogEntryLevel, FavoriteContext } from '@microsoft/logic-apps-shared';
import { OperationSearchHeader, XLargeText } from '@microsoft/designer-ui';
import type { CommonPanelProps, OperationsData } from '@microsoft/designer-ui';
import type { DiscoveryOpArray, DiscoveryOperation, DiscoveryResultTypes } from '@microsoft/logic-apps-shared';
import { useDebouncedEffect } from '@react-hookz/web';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useIntl } from 'react-intl';
import { useDispatch } from 'react-redux';
import { ActionSpotlight } from './actionSpotlight';
import { BrowseView } from './browseView';
import { useOnFavoriteClick } from './hooks';
import { getOperationCardDataFromOperation } from './helpers';

const CloseIcon = bundleIcon(Dismiss24Filled, Dismiss24Regular);

type SelectionState = (typeof SELECTION_STATES)[keyof typeof SELECTION_STATES];
const SELECTION_STATES = {
  SEARCH: 'SEARCH',
  DETAILS: 'DETAILS',
  AZURE_RESOURCE: 'AZURE_RESOURCE',
  CUSTOM_SWAGGER: 'HTTP_SWAGGER',
};

const builtinMcpServerOperation = {
  name: 'nativemcpclient',
  id: 'nativemcpclient',
  type: 'nativemcpclient',
  properties: {
    api: {
      id: 'connectionProviders/mcpclient',
      name: 'mcpclient',
      description: 'MCP Client Operations',
      displayName: 'Connect your own MCP server',
      iconUri:
        'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIiB2aWV3Qm94PSIwIDAgMTAwIDEwMCI+DQogIDxyZWN0IHg9IjQwIiB5PSIyMCIgd2lkdGg9IjIwIiBoZWlnaHQ9IjYwIiBmaWxsPSJibGFjayIvPg0KICA8cmVjdCB4PSIyMCIgeT0iNDAiIHdpZHRoPSI2MCIgaGVpZ2h0PSIyMCIgZmlsbD0iYmxhY2siLz4NCjwvc3ZnPg==',
    },
    summary: 'Custom MCP server',
    description: 'Native MCP Client',
    visibility: 'Important',
    operationType: 'McpClientTool',
    operationKind: 'Builtin',
    brandColor: '#709727',
    iconUri:
      'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIiB2aWV3Qm94PSIwIDAgMTAwIDEwMCI+DQogIDxyZWN0IHg9IjQwIiB5PSIyMCIgd2lkdGg9IjIwIiBoZWlnaHQ9IjYwIiBmaWxsPSJibGFjayIvPg0KICA8cmVjdCB4PSIyMCIgeT0iNDAiIHdpZHRoPSI2MCIgaGVpZ2h0PSIyMCIgZmlsbD0iYmxhY2siLz4NCjwvc3ZnPg==',
  },
} as const;

const builtinMcpServerOperationData: OperationsData = {
  type: 'Operation',
  data: getOperationCardDataFromOperation(builtinMcpServerOperation),
};

export const RecommendationPanelContext = (props: CommonPanelProps) => {
  const { toggleCollapse } = props;
  const { displayRuntimeInfo } = useHostOptions();
  const dispatch = useDispatch<AppDispatch>();
  const isTrigger = useDiscoveryPanelIsAddingTrigger();
  const isAddingMcpServer = useIsAddingMcpServer();
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<Record<string, string>>({
    actionType: isTrigger ? 'triggers' : 'actions',
  });
  const [mcpFilters, setMcpFilters] = useState<Record<string, string>>({});
  const [allOperationsForGroup, setAllOperationsForGroup] = useState<DiscoveryOpArray>([]);

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

  const { data: mcpServers, isLoading: isLoadingMcpServers } = useMcpServersQuery();
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
      const activeSearchResults =
        SearchService().getActiveSearchOperations?.(searchTerm, filters['actionType'], filters['runtime']) ??
        Promise.resolve([] as DiscoveryOpArray);
      // Store results
      activeSearchResults.then((results) => {
        setSearchedTerms([...searchedTerms, searchTerm]);
        setActiveSearchOperations(joinAndDeduplicateById(results, activeSearchOperations));
      });
    },
    [searchedTerms, isLoadingOperations, searchTerm, filters, activeSearchOperations, isLoadingMcpServers],
    300
  );

  const selectedOperationGroupId = useDiscoveryPanelSelectedOperationGroupId();
  const { data: allConnectors } = useAllConnectors();
  const selectedConnector = allConnectors?.find((c) => c.id === selectedOperationGroupId);

  // Use connector-specific hook to avoid loading all operations
  const { data: operationsByConnector, isLoading: isLoadingOperationsByConnector } = useOperationsByConnector(
    selectedOperationGroupId || '',
    filters?.['actionType'] as 'triggers' | 'actions'
  );

  // hide actions type filter if we don't have any operations for the browse view
  const hideActionTypeFilter = (!allOperations || allOperations.length === 0) && !searchTerm;

  // effect to set the current list of operations by group
  useEffect(() => {
    if (!selectedOperationGroupId) {
      return;
    }

    // Use connector-specific operations instead of filtering all operations
    setAllOperationsForGroup(operationsByConnector || []);
    setSelectionState(SELECTION_STATES.DETAILS);
  }, [selectedOperationGroupId, operationsByConnector]);

  const navigateBack = useCallback(() => {
    dispatch(selectOperationGroupId(''));
    dispatch(selectOperationId(''));
    setAllOperationsForGroup([]);
    setSelectionState(SELECTION_STATES.SEARCH);
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

  const onAddMcpServer = useCallback(
    (id: string, apiId?: string) => {
      if (id === builtinMcpServerOperationData.data.id) {
        dispatch(
          addOperation({
            operation: builtinMcpServerOperation,
            relationshipIds,
            nodeId: builtinMcpServerOperation.properties.summary.replaceAll(' ', '_'),
            isParallelBranch: false,
            isTrigger: false,
            isAddingMcpServer: true,
          })
        );
      } else {
        const searchResultPromise = Promise.resolve(
          (mcpServers?.data ?? []).find((o) => (apiId ? o.id === id && o.properties?.api?.id === apiId : o.id === id))
        );

        searchResultPromise.then((operation) => {
          if (!operation) {
            return;
          }
          dispatch(selectOperationId(operation.id));
          setSelectedOperation(operation);
          dispatch(selectOperationGroupId(''));

          const newNodeId = (operation?.properties?.summary ?? operation?.name ?? guid()).replaceAll(' ', '_');
          dispatch(
            addOperation({
              operation,
              relationshipIds,
              nodeId: newNodeId,
              isParallelBranch: false,
              isTrigger: false,
              isAddingMcpServer: true,
            })
          );
        });
      }
    },
    [dispatch, relationshipIds, mcpServers]
  );

  const onOperationClick = useCallback(
    (id: string, apiId?: string) => {
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
        const newNodeId = (operation?.properties?.summary ?? operation?.name ?? guid()).replaceAll(' ', '_');
        dispatch(
          addOperation({
            operation,
            relationshipIds,
            nodeId: newNodeId,
            isParallelBranch,
            isTrigger,
          })
        );
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

  const onConnectorCardSelected = useCallback(
    (id: string, origin?: string): void => {
      LoggerService().log({
        area: 'recommendationPanelContext.onConnectorCardSelected',
        level: LogEntryLevel.Verbose,
        message: 'Connector card selected from RecommendationPanel',
        args: [`connectorId: ${id}`, `origin: ${origin}`],
      });
      dispatch(selectOperationGroupId(id));
    },
    [dispatch]
  );

  const intl = useIntl();
  const returnToSearchText = intl.formatMessage({
    defaultMessage: 'Return to search',
    id: 'tH2pT1',
    description: 'Text for the Details page navigation heading',
  });

  const headingText = isAddingMcpServer
    ? intl.formatMessage({
        defaultMessage: 'Choose an MCP Server',
        id: 'dBxX8X',
        description: 'Text for the "Add an MCP Server" panel header',
      })
    : isTrigger
      ? intl.formatMessage({
          defaultMessage: 'Add a trigger',
          id: 'dBxX0M',
          description: 'Text for the "Add Trigger" page header',
        })
      : intl.formatMessage({
          defaultMessage: 'Add an action',
          id: 'EUQDM6',
          description: 'Text for the "Add Action" page header',
        });

  const subTitle = intl.formatMessage({
    defaultMessage: 'Select an existing MCP server or connect your own MCP server.',
    id: 'Ta9XGH',
    description: 'sub title for "Add an MCP Server" panel',
  });

  const closeButtonAriaLabel = intl.formatMessage({
    defaultMessage: 'Close panel',
    id: 'yjjXCQ',
    description: 'Aria label for the close button in the Add Action Panel',
  });

  return (
    <FavoriteContext.Provider value={contextValue}>
      <div className="msla-app-action-header" ref={recommendationPanelRef}>
        <XLargeText text={headingText} as="h2" />
        <Button aria-label={closeButtonAriaLabel} appearance="subtle" onClick={toggleCollapse} icon={<CloseIcon />} />
      </div>
      {isAddingMcpServer ? <div className="msla-app-action-subheader">{subTitle}</div> : null}
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
          [SELECTION_STATES.DETAILS]: selectedOperationGroupId ? (
            <OperationGroupDetailView
              connector={selectedConnector}
              groupOperations={allOperationsForGroup}
              filters={filters}
              onOperationClick={onOperationClick}
              isLoading={isLoadingOperationsByConnector}
              ignoreActionsFilter={hideActionTypeFilter}
            />
          ) : null,
          [SELECTION_STATES.SEARCH]: (
            <>
              <OperationSearchHeader
                searchCallback={setSearchTerm}
                searchTerm={searchTerm}
                filters={filters}
                setFilters={setFilters}
                isTriggerNode={isTrigger}
                isAddingMcpServer={isAddingMcpServer}
                onAddMcpServerClick={() => onAddMcpServer(builtinMcpServerOperationData.data.id)}
              />
              {isAddingMcpServer ? (
                <SearchView
                  searchTerm={searchTerm}
                  allOperations={mcpServers?.data ?? []}
                  isLoadingOperations={isLoadingMcpServers}
                  groupByConnector={false}
                  setGroupByConnector={(newValue: boolean) => setIsGrouped(newValue)}
                  isLoading={isLoadingMcpServers}
                  filters={mcpFilters}
                  setFilters={setMcpFilters}
                  onOperationClick={onAddMcpServer}
                  displayRuntimeInfo={displayRuntimeInfo}
                  isAddingMcpServer={isAddingMcpServer}
                />
              ) : searchTerm ? (
                <SearchView
                  searchTerm={searchTerm}
                  allOperations={allOperations ?? []}
                  isLoadingOperations={isLoadingOperations}
                  groupByConnector={isGrouped}
                  setGroupByConnector={(newValue: boolean) => setIsGrouped(newValue)}
                  isLoading={isLoadingOperations}
                  filters={filters}
                  setFilters={setFilters}
                  onOperationClick={onOperationClick}
                  displayRuntimeInfo={displayRuntimeInfo}
                />
              ) : (
                <>
                  <ActionSpotlight
                    onConnectorSelected={onConnectorCardSelected}
                    onOperationSelected={onOperationClick}
                    filters={filters}
                    allOperations={allOperations}
                  />
                  <BrowseView
                    filters={filters}
                    setFilters={setFilters}
                    onConnectorCardSelected={onConnectorCardSelected}
                    displayRuntimeInfo={false}
                  />
                  {/* <ScrollToTop scrollToRef={recommendationPanelRef} /> */}
                </>
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
