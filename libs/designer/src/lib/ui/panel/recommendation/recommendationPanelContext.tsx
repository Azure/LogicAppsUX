import Constants from '../../../common/constants';
import type { AppDispatch } from '../../../core';
import { addOperation } from '../../../core/actions/bjsworkflow/add';
import { useAllConnectors, useAllOperations } from '../../../core/queries/browse';
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

export const RecommendationPanelContext = (props: CommonPanelProps) => {
  const dispatch = useDispatch<AppDispatch>();
  const isTrigger = useIsAddingTrigger();
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<Record<string, string>>({
    actionType: isTrigger ? 'triggers' : 'actions',
  });
  const [allOperationsForGroup, setAllOperationsForGroup] = useState<DiscoveryOperation<DiscoveryResultTypes>[]>([]);

  const [isGrouped, setIsGrouped] = useState(true);

  const [isSelectingAzureResource, setIsSelectingAzureResource] = useState(false);

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
  }, [selectedOperationGroupId, allOperations]);

  const navigateBack = useCallback(() => {
    dispatch(selectOperationGroupId(''));
    dispatch(selectOperationId(''));
    setIsSelectingAzureResource(false);
  }, [dispatch]);

  const relationshipIds = useRelationshipIds();
  const isParallelBranch = useIsParallelBranch();

  const isAzureResourceActionId = useCallback((id: string) => {
    const azureResourceOperationIds = Object.values(Constants.AZURE_RESOURCE_ACTION_TYPES);
    return azureResourceOperationIds.some((_id) => areApiIdsEqual(id, _id));
  }, []);

  const startAzureResourceSelection = useCallback((operation: DiscoveryOperation<DiscoveryResultTypes>) => {
    console.log('startAzureResourceSelection', operation);
    setIsSelectingAzureResource(true);

    const selectedService = operation.properties.api.id;
    let apiType: string;

    switch (operation.id) {
      case Constants.AZURE_RESOURCE_ACTION_TYPES.SELECT_APIMANAGEMENT_ACTION:
      case Constants.AZURE_RESOURCE_ACTION_TYPES.SELECT_APIMANAGEMENT_TRIGGER:
        apiType = Constants.API_CATEGORIES.API_MANAGEMENT;
        break;

      case Constants.AZURE_RESOURCE_ACTION_TYPES.SELECT_APPSERVICE_ACTION:
      case Constants.AZURE_RESOURCE_ACTION_TYPES.SELECT_APPSERVICE_TRIGGER:
        apiType = Constants.API_CATEGORIES.APP_SERVICES;
        break;

      case Constants.AZURE_RESOURCE_ACTION_TYPES.SELECT_FUNCTION_ACTION:
        apiType = Constants.API_CATEGORIES.AZURE_FUNCTIONS;
        break;

      case Constants.AZURE_RESOURCE_ACTION_TYPES.SELECT_MANUAL_WORKFLOW_ACTION:
        apiType = Constants.API_CATEGORIES.WORKFLOWS;
        break;

      case Constants.AZURE_RESOURCE_ACTION_TYPES.SELECT_BATCH_WORKFLOW_ACTION:
        apiType = Constants.API_CATEGORIES.WORKFLOWS;
        break;

      default:
        throw new Error(`Unexpected API category type '${operation.id}'`);
    }

    console.log('startAzureResourceSelection', selectedService, apiType);
  }, []);

  const onOperationClick = useCallback(
    (id: string) => {
      const operation = (allOperations ?? []).find((o: any) => o.id === id);
      if (!operation) return;
      console.log('onOperationClick', operation);
      dispatch(selectOperationId(operation.id));
      if (isAzureResourceActionId(operation.id)) {
        startAzureResourceSelection(operation);
        return;
      }
      const newNodeId = (operation?.properties?.summary ?? operation?.name ?? guid()).replaceAll(' ', '_');
      dispatch(addOperation({ operation, relationshipIds, nodeId: newNodeId, isParallelBranch, isTrigger }));
    },
    [allOperations, dispatch, isAzureResourceActionId, isParallelBranch, isTrigger, relationshipIds, startAzureResourceSelection]
  );

  const intl = useIntl();
  const returnToSearchText = intl.formatMessage({
    defaultMessage: 'Return to search',
    description: 'Text for the Details page navigation heading',
  });

  return (
    <RecommendationPanel placeholder={''} {...props}>
      {isSelectingAzureResource || selectedOperationGroupId ? (
        <div className={'msla-sub-heading-container'}>
          <Link onClick={navigateBack} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Icon iconName="Back" />
            {returnToSearchText}
          </Link>
        </div>
      ) : null}
      {isSelectingAzureResource && selectedOperation ? (
        <AzureResourceSelection operation={selectedOperation} />
      ) : selectedOperationGroupId && selectedConnector ? (
        <OperationGroupDetailView
          connector={selectedConnector}
          groupOperations={allOperationsForGroup}
          filters={filters}
          onOperationClick={onOperationClick}
          isLoading={isLoadingOperations}
        />
      ) : (
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
      )}
    </RecommendationPanel>
  );
};
