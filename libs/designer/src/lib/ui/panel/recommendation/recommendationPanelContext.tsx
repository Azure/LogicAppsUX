import { useSelectedOperationGroupId } from '../../../core/state/panel/panelSelectors';
import { BrowseView } from './browseView';
import { OperationGroupDetailView } from './operationGroupDetailView';
import { SearchView } from './searchView';
import { SearchService } from '@microsoft-logic-apps/designer-client-services';
import type { DiscoveryOperation, DiscoveryResultTypes } from '@microsoft-logic-apps/utils';
import type { CommonPanelProps } from '@microsoft/designer-ui';
import { DesignerSearchBox, RecommendationPanel } from '@microsoft/designer-ui';
import React from 'react';
import { useQuery } from 'react-query';

export const RecommendationPanelContext = (props: CommonPanelProps) => {
  const [searchTerm, setSearchTerm] = React.useState('');
  const [allOperationsForGroup, setAllOperationsForGroup] = React.useState<DiscoveryOperation<DiscoveryResultTypes>[]>([]);

  const selectedOperationGroupId: string = useSelectedOperationGroupId();

  const allOperations = useQuery(
    ['allOperations'],
    () => {
      const searchService = SearchService();
      return searchService.preloadOperations();
    },
    {
      staleTime: 1000 * 60 * 5,
      cacheTime: 1000 * 60 * 5, // Danielle this is temporary, will move to config
    }
  );

  React.useEffect(() => {
    if (allOperations.data && selectedOperationGroupId) {
      const filteredOps = allOperations.data.filter((operation) => operation.properties.api.id === selectedOperationGroupId);
      setAllOperationsForGroup(filteredOps);
    }
  }, [selectedOperationGroupId, allOperations]);

  return (
    <RecommendationPanel placeholder={''} {...props}>
      {selectedOperationGroupId ? (
        <OperationGroupDetailView selectedSearchedOperations={allOperationsForGroup} />
      ) : (
        <>
          <DesignerSearchBox onSearch={setSearchTerm} />
          {searchTerm ? <SearchView searchTerm={searchTerm} /> : <BrowseView />}
        </>
      )}
    </RecommendationPanel>
  );
};
