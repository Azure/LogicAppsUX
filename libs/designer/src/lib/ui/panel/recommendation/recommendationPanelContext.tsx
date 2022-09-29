import { useAllOperations } from '../../../core/queries/browse';
import { useSelectedOperationGroupId } from '../../../core/state/panel/panelSelectors';
import { selectOperationGroupId } from '../../../core/state/panel/panelSlice';
import { BrowseView } from './browseView';
import { OperationGroupDetailView } from './operationGroupDetailView';
import { SearchView } from './searchView';
import type { DiscoveryOperation, DiscoveryResultTypes } from '@microsoft-logic-apps/utils';
import { areApiIdsEqual } from '@microsoft-logic-apps/utils';
import type { CommonPanelProps } from '@microsoft/designer-ui';
import { RecommendationPanel, OperationSearchHeader } from '@microsoft/designer-ui';
import { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';

export const RecommendationPanelContext = (props: CommonPanelProps) => {
  const dispatch = useDispatch();

  const [searchTerm, setSearchTerm] = useState('');
  const [allOperationsForGroup, setAllOperationsForGroup] = useState<DiscoveryOperation<DiscoveryResultTypes>[]>([]);

  const [isGrouped, setIsGrouped] = useState(false);

  const selectedOperationGroupId: string = useSelectedOperationGroupId();

  const allOperations = useAllOperations();

  useEffect(() => {
    if (allOperations.data && selectedOperationGroupId) {
      const filteredOps = allOperations.data.filter((operation) => {
        const apiId = operation.properties.api.id;
        return areApiIdsEqual(apiId, selectedOperationGroupId);
      });
      setAllOperationsForGroup(filteredOps);
    }
  }, [selectedOperationGroupId, allOperations.data]);

  const onDismiss = () => {
    dispatch(selectOperationGroupId(''));
    setSearchTerm('');
    props.toggleCollapse();
  };

  const navigateBack = () => {
    if (selectedOperationGroupId) dispatch(selectOperationGroupId(''));
    else if (searchTerm) setSearchTerm('');
  };

  return (
    <RecommendationPanel placeholder={''} {...props}>
      <OperationSearchHeader
        onSearch={setSearchTerm}
        onGroupToggleChange={() => setIsGrouped(!isGrouped)}
        isGrouped={isGrouped}
        searchTerm={searchTerm}
        selectedGroupId={selectedOperationGroupId}
        onDismiss={onDismiss}
        navigateBack={navigateBack}
      />
      {selectedOperationGroupId ? (
        <OperationGroupDetailView groupOperations={allOperationsForGroup} />
      ) : searchTerm ? (
        <SearchView
          searchTerm={searchTerm}
          allOperations={allOperations.data ?? []}
          groupByConnector={isGrouped}
          isLoading={allOperations.isLoading}
        />
      ) : (
        <BrowseView />
      )}
    </RecommendationPanel>
  );
};
