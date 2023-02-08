import Constants from '../../../common/constants';
import type { RootState, AppDispatch } from '../../../core';
import { addOperation } from '../../../core/actions/bjsworkflow/add';
import { useAllOperations } from '../../../core/queries/browse';
import { useIsConsumption } from '../../../core/state/designerOptions/designerOptionsSelectors';
import {
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
import { useDispatch, useSelector } from 'react-redux';

export const RecommendationPanelContext = (props: CommonPanelProps) => {
  const dispatch = useDispatch<AppDispatch>();
  const isTrigger = useSelector((state: RootState) => state.panel.addingTrigger);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<Record<string, string>>({
    actionType: isTrigger ? 'triggers' : 'actions',
  });
  const [allOperationsForGroup, setAllOperationsForGroup] = useState<DiscoveryOperation<DiscoveryResultTypes>[]>([]);

  const [isGrouped, setIsGrouped] = useState(true);

  const [isSelectingAzureResource, setIsSelectingAzureResource] = useState(false);

  const selectedOperationGroupId = useSelectedSearchOperationGroupId();
  const selectedOperationId = useSelectedSearchOperationId();

  const allOperations = useAllOperations();
  const selectedOperation = allOperations.data?.find((o) => o.id === selectedOperationId);

  const isConsumption = useIsConsumption();

  useEffect(() => {
    if (allOperations.data && selectedOperationGroupId) {
      const filteredOps = allOperations.data.filter((operation) => {
        const apiId = operation.properties.api.id;
        return areApiIdsEqual(apiId, selectedOperationGroupId);
      });
      setAllOperationsForGroup(filteredOps);
    }
  }, [selectedOperationGroupId, allOperations.data]);

  const onDismiss = useCallback(() => {
    dispatch(selectOperationGroupId(''));
    setSearchTerm('');
    props.toggleCollapse();
  }, [dispatch, props]);

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

  const onOperationClick = useCallback(
    (id: string) => {
      const operation = (allOperations.data ?? []).find((o: any) => o.id === id);
      if (!operation) return;
      dispatch(selectOperationId(operation.id));
      if (isAzureResourceActionId(operation.id)) {
        setIsSelectingAzureResource(true);
        return;
      }
      const newNodeId = (operation?.properties?.summary ?? operation?.name ?? guid()).replaceAll(' ', '_');
      dispatch(addOperation({ operation, relationshipIds, nodeId: newNodeId, isParallelBranch, isTrigger }));
    },
    [allOperations.data, dispatch, isAzureResourceActionId, isParallelBranch, isTrigger, relationshipIds]
  );

  const intl = useIntl();
  const returnToSearchText = intl.formatMessage({
    defaultMessage: 'Return to search',
    description: 'Text for the Details page navigation heading',
  });

  // TODO: Riley - this needs to accept the selected resource somehow
  const selectAzureResourceCallback = useCallback(
    (resource: string) => {
      console.log('selected resource', resource);
      const newNodeId = (selectedOperation?.properties?.summary ?? selectedOperation?.name ?? guid()).replaceAll(' ', '_');
      dispatch(addOperation({ operation: selectedOperation, relationshipIds, nodeId: newNodeId, isParallelBranch, isTrigger }));
    },
    [dispatch, isParallelBranch, isTrigger, relationshipIds, selectedOperation]
  );

  return (
    <RecommendationPanel placeholder={''} {...props}>
      {isSelectingAzureResource || selectedOperationGroupId ? (
        <div className={'msla-search-heading-container'}>
          <Link onClick={navigateBack} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Icon iconName="Back" />
            {returnToSearchText}
          </Link>
        </div>
      ) : null}
      {isSelectingAzureResource && selectedOperation ? (
        <AzureResourceSelection operation={selectedOperation} onSubmit={selectAzureResourceCallback} />
      ) : selectedOperationGroupId ? (
        <OperationGroupDetailView groupOperations={allOperationsForGroup} filters={filters} onOperationClick={onOperationClick} />
      ) : (
        <>
          <OperationSearchHeader
            searchCallback={setSearchTerm}
            onGroupToggleChange={() => setIsGrouped(!isGrouped)}
            isGrouped={isGrouped}
            searchTerm={searchTerm}
            onDismiss={onDismiss}
            filters={filters}
            setFilters={setFilters}
            isTriggerNode={isTrigger}
            isConsumption={isConsumption}
          />
          {searchTerm ? (
            <SearchView
              searchTerm={searchTerm}
              allOperations={allOperations.data ?? []}
              groupByConnector={isGrouped}
              isLoading={allOperations.isLoading}
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
