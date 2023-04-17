import Constants from '../../../common/constants';
import type { AppDispatch } from '../../../core';
import { addOperation } from '../../../core/actions/bjsworkflow/add';
import { useAllConnectors, useAllOperations } from '../../../core/queries/browse';
import { useIsConsumption } from '../../../core/state/designerOptions/designerOptionsSelectors';
import {
  useIsAddingTrigger,
  useIsParallelBranch,
  useRelationshipIds,
  useSelectedSearchOperationGroupId,
  useSelectedSearchOperationId,
} from '../../../core/state/panel/panelSelectors';
import { selectOperationGroupId, selectOperationId } from '../../../core/state/panel/panelSlice';
import { AzureResourceSelection } from './azureResourceSelection';
import { BrowseView } from './browseView';
import { CustomSwaggerSelection } from './customSwaggerSelection';
import { OperationGroupDetailView } from './operationGroupDetailView';
import { SearchView } from './searchView';
import { Link, Icon } from '@fluentui/react';
import { RecommendationPanel, OperationSearchHeader } from '@microsoft/designer-ui';
import type { CommonPanelProps } from '@microsoft/designer-ui';
import type { DiscoveryOperation, DiscoveryResultTypes } from '@microsoft/utils-logic-apps';
import { guid, areApiIdsEqual } from '@microsoft/utils-logic-apps';
import { useCallback, useEffect, useState } from 'react';
import { useIntl } from 'react-intl';
import { useDispatch } from 'react-redux';

type SelectionState = (typeof SELECTION_STATES)[keyof typeof SELECTION_STATES];
const SELECTION_STATES = {
  SEARCH: 'SEARCH',
  DETAILS: 'DETAILS',
  AZURE_RESOURCE: 'AZURE_RESOURCE',
  CUSTOM_SWAGGER: 'HTTP_SWAGGER',
};

export const RecommendationPanelContext = (props: CommonPanelProps) => {
  const dispatch = useDispatch<AppDispatch>();
  const isConsumption = useIsConsumption();
  const isTrigger = useIsAddingTrigger();
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<Record<string, string>>({
    actionType: isTrigger ? 'triggers' : 'actions',
  });
  const [allOperationsForGroup, setAllOperationsForGroup] = useState<DiscoveryOperation<DiscoveryResultTypes>[]>([]);

  const [isGrouped, setIsGrouped] = useState(true);

  const [selectionState, setSelectionState] = useState<SelectionState>(SELECTION_STATES.SEARCH);

  const selectedOperationId = useSelectedSearchOperationId();
  const { data: allOperations, isLoading: isLoadingOperations } = useAllOperations();
  const selectedOperation = allOperations.find((o) => o.id === selectedOperationId);

  const selectedOperationGroupId = useSelectedSearchOperationGroupId();
  const { data: allConnectors } = useAllConnectors();
  const selectedConnector = allConnectors?.find((c) => c.id === selectedOperationGroupId);

  useEffect(() => {
    if (!allOperations || !selectedOperationGroupId) return;
    const filteredOps = allOperations.filter((operation) => {
      const apiId = operation.properties.api.id;
      return areApiIdsEqual(apiId, selectedOperationGroupId);
    });
    setAllOperationsForGroup(filteredOps);
    setSelectionState(SELECTION_STATES.DETAILS);
  }, [selectedOperationGroupId, allOperations]);

  const navigateBack = useCallback(() => {
    dispatch(selectOperationGroupId(''));
    dispatch(selectOperationId(''));
    setSelectionState(SELECTION_STATES.SEARCH);
  }, [dispatch]);

  const relationshipIds = useRelationshipIds();
  const isParallelBranch = useIsParallelBranch();

  const isAzureResourceActionId = useCallback((id: string) => {
    const azureResourceOperationIds = Object.values(Constants.AZURE_RESOURCE_ACTION_TYPES);
    return azureResourceOperationIds.some((_id) => areApiIdsEqual(id, _id));
  }, []);

  const startAzureResourceSelection = useCallback(() => {
    setSelectionState(SELECTION_STATES.AZURE_RESOURCE);
  }, []);

  const startHttpSwaggerSelection = useCallback(() => {
    setSelectionState(SELECTION_STATES.CUSTOM_SWAGGER);
  }, []);

  const onOperationClick = useCallback(
    (id: string, apiId?: string) => {
      const operation = (allOperations ?? []).find((o: DiscoveryOperation<DiscoveryResultTypes>) => {
        return apiId ? o.id === id && o.properties?.api?.id === apiId : o.id === id;
      });
      if (!operation) return;
      dispatch(selectOperationId(operation.id));
      if (isAzureResourceActionId(operation.id) && isConsumption) {
        startAzureResourceSelection();
        return;
      }
      if (operation.id === 'httpswaggeraction' || operation.id === 'httpswaggertrigger') {
        startHttpSwaggerSelection();
        return;
      }
      const newNodeId = (operation?.properties?.summary ?? operation?.name ?? guid()).replaceAll(' ', '_');
      dispatch(addOperation({ operation, relationshipIds, nodeId: newNodeId, isParallelBranch, isTrigger }));
    },
    [
      allOperations,
      dispatch,
      isAzureResourceActionId,
      isConsumption,
      isParallelBranch,
      isTrigger,
      relationshipIds,
      startAzureResourceSelection,
      startHttpSwaggerSelection,
    ]
  );

  const intl = useIntl();
  const returnToSearchText = intl.formatMessage({
    defaultMessage: 'Return to search',
    description: 'Text for the Details page navigation heading',
  });

  return (
    <RecommendationPanel placeholder={''} {...props}>
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
              isLoading={isLoadingOperations}
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
              />
              {searchTerm ? (
                <SearchView
                  searchTerm={searchTerm}
                  allOperations={allOperations ?? []}
                  groupByConnector={isGrouped}
                  isLoading={isLoadingOperations}
                  filters={filters}
                  onOperationClick={onOperationClick}
                />
              ) : (
                <BrowseView filters={filters} />
              )}
            </>
          ),
        }[selectionState ?? '']
      }
    </RecommendationPanel>
  );
};
