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
import { AzureResourcePicker } from './azureResourcePicker';
import { BrowseView } from './browseView';
import { OperationGroupDetailView } from './operationGroupDetailView';
import { SearchView } from './searchView';
import type { CommonPanelProps } from '@microsoft/designer-ui';
import { RecommendationPanel, OperationSearchHeader } from '@microsoft/designer-ui';
import type { DiscoveryOperation, DiscoveryResultTypes } from '@microsoft/utils-logic-apps';
import { guid, areApiIdsEqual } from '@microsoft/utils-logic-apps';
import { useCallback, useEffect, useState } from 'react';
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
      const operation = (allOperations.data ?? []).find((o: any) => o.id === id);
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
    [allOperations.data, dispatch, isAzureResourceActionId, isParallelBranch, isTrigger, relationshipIds, startAzureResourceSelection]
  );

  return (
    <RecommendationPanel placeholder={''} {...props}>
      <OperationSearchHeader
        searchCallback={setSearchTerm}
        onGroupToggleChange={() => setIsGrouped(!isGrouped)}
        isGrouped={isGrouped}
        searchTerm={searchTerm}
        selectedGroupId={selectedOperationGroupId}
        onDismiss={onDismiss}
        navigateBack={navigateBack}
        filters={filters}
        setFilters={setFilters}
        isTriggerNode={isTrigger}
        isConsumption={isConsumption}
      />
      {isSelectingAzureResource && selectedOperation ? (
        <AzureResourcePicker operation={selectedOperation} />
      ) : selectedOperationGroupId ? (
        <OperationGroupDetailView groupOperations={allOperationsForGroup} filters={filters} onOperationClick={onOperationClick} />
      ) : searchTerm ? (
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
    </RecommendationPanel>
  );
};
